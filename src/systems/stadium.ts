import Phaser from 'phaser';
import { FIELD, FONT_LABEL, FONT_TITLE, MATCH_SEED, TEAMS } from '../config';
import { drawFan, makeFan, type Fan } from './crowd';
import { fillQuad } from './ground';
import { shadeNum } from './pixelart';
import type { Projection, ScreenPoint } from './projection';
import { Rng } from './rng';

/*
 * Estádio em formato de tigela: um retângulo de cantos arredondados em volta do gramado.
 * A arquibancada é gerada ao longo do perímetro em "colunas" (uma cadeira por jarda) e
 * "fileiras" que sobem para fora. Cada coluna tem uma normal (para fora do campo).
 */

const BOWL = { x0: -14, x1: FIELD.width + 14, y0: -24, y1: 124, r: 14 };
const SPACING = 1.0; // jardas entre cadeiras
const ROWS = 26;
const ROW_D = 1.0; // profundidade de cada degrau
const ROW_RISE = 1.3; // altura de cada degrau
const FIRST_OFF = 0.9; // corredor entre o muro e a 1ª fileira
const WALL_H = 1.8;
const GROUP = 4; // colunas por bloco de concreto
const CROWD_SCALE = 1.3; // torcedores um pouco maiores que o real, para ler bem
const EXIT_R0 = 6;
const EXIT_R1 = 9;

const rowOff = (r: number) => FIRST_OFF + r * ROW_D;
const rowH = (r: number) => WALL_H + 0.35 + r * ROW_RISE;
const TOP_H = rowH(ROWS - 1);

interface Col {
  x: number;
  y: number;
  nx: number;
  ny: number;
  tx: number; // tangente (ao longo do perímetro)
  ty: number;
  aisle: boolean;
  exit: boolean;
  away: boolean;
  cornerMid: boolean;
}

interface Group {
  i0: number;
  i1: number;
  key: number; // y médio, para ordenar do mais distante ao mais perto
  away: boolean;
}

interface Flash {
  c: number;
  r: number;
  life: number;
}

/** Amostra o perímetro do retângulo arredondado. */
function buildPerimeter(): Col[] {
  const { x0, x1, y0, y1, r } = BOWL;
  type Seg = { len: number; corner: boolean; straight: boolean; at: (t: number) => [number, number, number, number] };
  const segs: Seg[] = [];
  const line = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ len, corner: false, straight: true, at: (t) => [ax + ((bx - ax) * t) / len, ay + ((by - ay) * t) / len, nx, ny] });
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const len = Math.abs(a1 - a0) * r;
    segs.push({
      len,
      corner: true,
      straight: false,
      at: (t) => {
        const a = a0 + ((a1 - a0) * t) / len;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)];
      },
    });
  };
  const P = Math.PI;
  line(x0 + r, y1, x1 - r, y1, 0, 1); // fundo (atrás da end zone adversária)
  arc(x1 - r, y1 - r, P / 2, 0);
  line(x1, y1 - r, x1, y0 + r, 1, 0); // lateral direita
  arc(x1 - r, y0 + r, 0, -P / 2);
  line(x1 - r, y0, x0 + r, y0, 0, -1); // fundo atrás de nós
  arc(x0 + r, y0 + r, -P / 2, -P);
  line(x0, y0 + r, x0, y1 - r, -1, 0); // lateral esquerda
  arc(x0 + r, y1 - r, P, P / 2);

  const total = segs.reduce((a, s) => a + s.len, 0);
  const n = Math.round(total / SPACING / GROUP) * GROUP;
  const step = total / n;
  const cols: Col[] = [];
  let si = 0;
  let base = 0;
  for (let k = 0; k < n; k++) {
    let t = k * step - base;
    while (t > segs[si].len) {
      base += segs[si].len;
      t -= segs[si].len;
      si++;
    }
    const seg = segs[si];
    const [x, y, nx, ny] = seg.at(t);
    const cornerMid = seg.corner && Math.abs(t - seg.len / 2) < step / 2;
    const aisle = cornerMid || (seg.straight && t > 4 && t < seg.len - 4 && t % 18 < step);
    const exit = seg.straight && !aisle && t > 4 && t < seg.len - 4 && t % 36 >= step && t % 36 < step * 3;
    cols.push({ x, y, nx, ny, tx: -ny, ty: nx, aisle, exit, away: y > 100 && x > 36, cornerMid });
  }
  return cols;
}

const pa: ScreenPoint = { x: 0, y: 0, s: 0 };
const pb: ScreenPoint = { x: 0, y: 0, s: 0 };
const pc: ScreenPoint = { x: 0, y: 0, s: 0 };
const pd: ScreenPoint = { x: 0, y: 0, s: 0 };

const C = {
  rim: 0x0e101b,
  concreteA: 0x5a5d6c,
  concreteB: 0x525565,
  riser: 0x383a48,
  seatHome: shadeNum(TEAMS.home.color, -0.45),
  seatAway: shadeNum(TEAMS.away.color, -0.2),
  wall: 0x171a2b,
  walkway: 0x464958,
  step: 0x8b8f9c,
  nosing: 0xe6c34a,
  rail: 0xc9ced8,
  tunnel: 0x06070c,
  exitSign: 0x1f9d4a,
};

export class Stadium {
  private g: Phaser.GameObjects.Graphics;
  private cols: Col[];
  private groups: Group[];
  private fans: Fan[]; // [col * ROWS + row]
  private flashes: Flash[] = [];
  private fx = new Rng(MATCH_SEED + 7);
  private wallTexts: { t: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private exitTexts: Phaser.GameObjects.Text[] = [];
  private exitTextUsed = 0;
  private time = 0;
  /** Empolgação da torcida (0..1): faz pular e aumenta os flashes. */
  excite = 0;

  constructor(private scene: Phaser.Scene, private proj: Projection) {
    this.g = scene.add.graphics().setDepth(2);
    this.cols = buildPerimeter();

    const rng = new Rng(MATCH_SEED);
    this.fans = [];
    for (const col of this.cols) for (let r = 0; r < ROWS; r++) this.fans.push(makeFan(rng, col.away));

    const n = this.cols.length;
    this.groups = [];
    for (let i = 0; i < n; i += GROUP) {
      const a = this.cols[i];
      const b = this.cols[(i + GROUP) % n];
      this.groups.push({ i0: i, i1: (i + GROUP) % n, key: (a.y + b.y) / 2, away: a.away });
    }
    this.groups.sort((a, b) => b.key - a.key);

    // "QB CAREER" no muro atrás da end zone adversária
    for (const x of [6, FIELD.width / 2, FIELD.width - 6]) {
      const t = scene.add
        .text(0, 0, 'QB CAREER', { fontFamily: FONT_TITLE, fontSize: '32px', color: '#ffffff' })
        .setOrigin(0.5, 1)
        .setDepth(2.1);
      this.wallTexts.push({ t, x, y: BOWL.y1 });
    }
    for (let i = 0; i < 10; i++) {
      this.exitTexts.push(
        scene.add
          .text(0, 0, 'SAÍDA', { fontFamily: FONT_LABEL, fontSize: '24px', color: '#ffffff' })
          .setOrigin(0.5, 0.5)
          .setDepth(2.1)
          .setVisible(false),
      );
    }
  }

  /** Big play: a torcida pula. */
  cheer(amount = 1) {
    this.excite = Math.min(1, this.excite + amount);
  }

  private P(col: Col, off: number, h: number, out: ScreenPoint, along = 0) {
    return this.proj.project(col.x + col.nx * off + col.tx * along, col.y + col.ny * off + col.ty * along, h, out);
  }

  /** Faixa entre duas colunas na distância `off`: deitada (h fixa) ou em pé (h0→h1). */
  private band(a: Col, b: Col, off0: number, off1: number, h0: number, h1: number, color: number) {
    this.P(a, off0, h0, pa);
    this.P(b, off0, h0, pb);
    this.P(b, off1, h1, pc);
    this.P(a, off1, h1, pd);
    this.g.fillStyle(color, 1);
    fillQuad(this.g, pa, pb, pc, pd);
  }

  update(dt: number) {
    this.time += dt;
    this.excite = Math.max(0, this.excite - dt * 0.45);

    // Flashes de câmera aleatórios (mais em big plays)
    const rate = 1.2 + this.excite * 14;
    if (this.fx.next() < rate * dt) {
      this.flashes.push({ c: this.fx.int(0, this.cols.length - 1), r: this.fx.int(0, ROWS - 1), life: 0.14 });
    }
    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter((f) => f.life > 0);

    this.draw();
  }

  private draw() {
    const g = this.g;
    const proj = this.proj;
    const near = proj.nearY + 1;
    g.clear();
    this.exitTextUsed = 0;

    this.drawLightTowers();

    for (const grp of this.groups) {
      const a = this.cols[grp.i0];
      const b = this.cols[grp.i1];
      if (a.y < near || b.y < near) continue;
      // Recorte: bloco das laterais totalmente fora da tela
      proj.project(a.x, a.y, 0, pa);
      proj.project(b.x, b.y, 0, pb);
      if (a.nx < -0.5 && Math.max(pa.x, pb.x) < -4) continue;
      if (a.nx > 0.5 && Math.min(pa.x, pb.x) > proj.w + 4) continue;

      const seat = grp.away ? C.seatAway : C.seatHome;
      // Borda de cima da arquibancada
      this.band(a, b, rowOff(ROWS), rowOff(ROWS), TOP_H, TOP_H + 3.2, C.rim);

      for (let r = ROWS - 1; r >= 0; r--) {
        const off = rowOff(r);
        const h = rowH(r);
        this.band(a, b, off, off + ROW_D, h, h, r % 2 ? C.concreteA : C.concreteB); // piso do degrau
        this.band(a, b, off, off, h - ROW_RISE, h, C.riser); // espelho do degrau
        this.band(a, b, off + 0.62, off + 0.62, h, h + 0.42, seat); // encosto das cadeiras

        for (let i = grp.i0; i !== grp.i1; i = (i + 1) % this.cols.length) {
          const col = this.cols[i];
          if (col.aisle) {
            this.drawStep(col, r);
            continue;
          }
          if (col.exit && r >= EXIT_R0 && r <= EXIT_R1) {
            if (r === EXIT_R0) this.drawExit(col);
            continue;
          }
          this.P(col, off + 0.45, h, pa);
          if (pa.x < -6 || pa.x > proj.w + 6) continue;
          drawFan(g, this.fans[i * ROWS + r], pa.x, pa.y, pa.s * 6.75 * CROWD_SCALE, this.excite, this.time);
        }
      }
      // Corrimãos das escadas
      for (let i = grp.i0; i !== grp.i1; i = (i + 1) % this.cols.length) {
        const col = this.cols[i];
        if (!col.aisle) continue;
        this.P(col, rowOff(0), rowH(0) + 0.9, pa);
        this.P(col, rowOff(ROWS - 1), rowH(ROWS - 1) + 0.9, pb);
        g.lineStyle(Math.max(1, pa.s * 0.6), C.rail, 0.9);
        g.lineBetween(pa.x, pa.y, pb.x, pb.y);
      }
      // Corredor e muro com faixas nas cores dos times
      this.band(a, b, 0, FIRST_OFF, WALL_H, WALL_H, C.walkway);
      this.band(a, b, 0, 0, 0, WALL_H, C.wall);
      this.band(a, b, 0, 0, WALL_H - 0.5, WALL_H - 0.12, TEAMS.home.color);
      this.band(a, b, 0, 0, 0.15, 0.4, TEAMS.away.color);
    }

    this.drawFlashes();
    this.updateTexts();
  }

  /** Degrau da escada (mais claro, com faixa amarela na borda). */
  private drawStep(col: Col, r: number) {
    const off = rowOff(r);
    const h = rowH(r);
    const g = this.g;
    this.P(col, off, h, pa, -0.45);
    this.P(col, off, h, pb, 0.45);
    this.P(col, off + ROW_D, h, pc, 0.45);
    this.P(col, off + ROW_D, h, pd, -0.45);
    g.fillStyle(C.step, 1);
    fillQuad(g, pa, pb, pc, pd);
    g.lineStyle(Math.max(1, pa.s * 0.5), C.nosing, 1);
    g.lineBetween(pa.x, pa.y, pb.x, pb.y);
  }

  /** Saída: túnel escuro com placa verde "SAÍDA". */
  private drawExit(col: Col) {
    const g = this.g;
    const off = rowOff(EXIT_R0);
    const hTop = rowH(EXIT_R1);
    this.P(col, off, rowH(EXIT_R0 - 1), pa, -1.3);
    this.P(col, off, rowH(EXIT_R0 - 1), pb, 1.3);
    this.P(col, off, hTop, pc, 1.3);
    this.P(col, off, hTop, pd, -1.3);
    g.fillStyle(C.tunnel, 1);
    fillQuad(g, pa, pb, pc, pd);
    // Placa
    this.P(col, off, hTop + 0.75, pa);
    const u = pa.s * 6.75;
    const w = 2.0 * u;
    const h = 0.75 * u;
    g.fillStyle(C.exitSign, 1);
    g.fillRect(pa.x - w / 2, pa.y - h / 2, w, h);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(pa.x - w / 2, pa.y - h / 2, w, Math.max(1, h * 0.12));
    if (u > 2.6 && this.exitTextUsed < this.exitTexts.length) {
      const t = this.exitTexts[this.exitTextUsed++];
      t.setVisible(true).setPosition(pa.x, pa.y).setScale((h * 0.7) / 24);
    }
  }

  /** Torres de refletores nos cantos, com brilho no céu. */
  private drawLightTowers() {
    const g = this.g;
    for (const col of this.cols) {
      if (!col.cornerMid || col.y < this.proj.nearY + 4) continue;
      const off = rowOff(ROWS) + 1.5;
      this.P(col, off, 0, pa);
      this.P(col, off, TOP_H + 16, pb);
      const u = pb.s * 6.75;
      g.lineStyle(Math.max(1, u * 0.5), 0x2a2d3a, 1);
      g.lineBetween(pa.x, pa.y, pb.x, pb.y);
      // Brilho
      for (const [rad, al] of [
        [14, 0.05],
        [9, 0.07],
        [5, 0.12],
      ] as const) {
        g.fillStyle(0xfff3c4, al);
        g.fillCircle(pb.x, pb.y - u * 1.5, rad * u);
      }
      // Painel de lâmpadas
      const w = 5 * u;
      const h = 3 * u;
      g.fillStyle(0x2a2d3a, 1);
      g.fillRect(pb.x - w / 2 - u * 0.3, pb.y - h - u * 0.3, w + u * 0.6, h + u * 0.6);
      g.fillStyle(0xfff8e0, 1);
      for (let iy = 0; iy < 3; iy++)
        for (let ix = 0; ix < 5; ix++) g.fillRect(pb.x - w / 2 + ix * u + u * 0.12, pb.y - h + iy * u + u * 0.12, u * 0.76, u * 0.76);
    }
  }

  private drawFlashes() {
    const g = this.g;
    for (const f of this.flashes) {
      const col = this.cols[f.c];
      if (col.aisle || col.y < this.proj.nearY + 1) continue;
      this.P(col, rowOff(f.r) + 0.45, rowH(f.r) + 1.1, pa);
      if (pa.x < 0 || pa.x > this.proj.w) continue;
      const u = pa.s * 6.75;
      const k = f.life / 0.14;
      g.fillStyle(0xffffff, 0.35 * k);
      g.fillCircle(pa.x, pa.y, u * 1.6 * k + 1);
      g.fillStyle(0xffffff, k);
      g.fillRect(pa.x - u * 1.2 * k, pa.y - 0.5, u * 2.4 * k, 1);
      g.fillRect(pa.x - 0.5, pa.y - u * 1.2 * k, 1, u * 2.4 * k);
    }
  }

  private updateTexts() {
    for (const w of this.wallTexts) {
      this.proj.project(w.x, w.y, 0.55, pa);
      const u = pa.s * 6.75;
      w.t.setPosition(pa.x, pa.y).setScale((0.9 * u) / 32).setVisible(w.y > this.proj.nearY);
    }
    for (let i = this.exitTextUsed; i < this.exitTexts.length; i++) this.exitTexts[i].setVisible(false);
  }
}
