import Phaser from 'phaser';
import { FONT_TITLE, MATCH_SEED, TEAMS } from '../config';
import { wallQuad } from './ground';
import { hex, shade } from './pixelart';
import type { Projection, ScreenPoint } from './projection';
import { Rng } from './rng';

/*
 * Arquibancada só no FUNDO do campo (atrás da end zone adversária), como no design.
 * Cada fileira é um objeto no mundo (posição + altura) projetado pela mesma câmera do campo:
 * quando a câmera avança, a arquibancada cresce e se aproxima.
 *
 * Os cantos são arredondados: cada fileira segue o muro — reta no fundo e um arco de 90°
 * em cada canto, até encostar na lateral. Quanto mais alta a fileira, maior o raio.
 * A posição ao longo da fileira é `u` (jardas), da ponta esquerda até a direita.
 */

const CX_L = -2; // centro do arco do canto esquerdo (x)
const CX_R = 55.3; // centro do arco do canto direito (x)
const CY = 103.2; // y dos centros dos arcos (onde a arquibancada encosta na lateral)
const R0 = 16.9; // raio da 1ª fileira (logo atrás do muro)
const ROWS = 70;
const DEPTH = 1.0; // jardas entre fileiras
const RISE = 1.15; // quanto cada fileira sobe
const TPY = 8; // texels por jarda na textura das fileiras
const ROW_TEX_H = 14;
const WALL_H = 1.6;
const ARC_SEGS = 12; // pedaços de cada arco
const STAIR_W = 1.8;
const EXIT_W = 3.6;
const EXIT_ROWS = 3;

const STRAIGHT = CX_R - CX_L;

/** Geometria de uma fileira de raio r. */
function rowGeom(r: number) {
  const arc = (r * Math.PI) / 2;
  return { r, arc, len: arc * 2 + STRAIGHT };
}

/** Ponto no chão da fileira, na posição u (jardas desde a ponta esquerda). */
function pointAt(r: number, u: number): [number, number] {
  const arc = (r * Math.PI) / 2;
  if (u < arc) {
    const t = Math.PI - u / r;
    return [CX_L + r * Math.cos(t), CY + r * Math.sin(t)];
  }
  if (u < arc + STRAIGHT) return [CX_L + (u - arc), CY + r];
  const t = Math.PI / 2 - (u - arc - STRAIGHT) / r;
  return [CX_R + r * Math.cos(t), CY + r * Math.sin(t)];
}

/** Posições das escadas (u) numa fileira: radiais nos cantos + duas no fundo. */
function stairsU(r: number) {
  const { arc } = rowGeom(r);
  const onArcL = (deg: number) => r * (Math.PI - (deg * Math.PI) / 180); // ângulo → u no arco esquerdo
  const onArcR = (deg: number) => arc + STRAIGHT + r * (Math.PI / 2 - (deg * Math.PI) / 180);
  return [onArcL(150), onArcL(118), arc + 8.6, arc + 47, onArcR(62), onArcR(30)];
}

/** Saídas: túnel colado numa escada (lado +1/−1), ocupando 3 fileiras. */
const EXITS = [
  { stair: 0, row: 14, side: 1 },
  { stair: 1, row: 30, side: -1 },
  { stair: 2, row: 14, side: 1 },
  { stair: 3, row: 30, side: -1 },
  { stair: 4, row: 14, side: 1 },
  { stair: 5, row: 30, side: -1 },
  { stair: 0, row: 46, side: 1 },
  { stair: 2, row: 46, side: -1 },
  { stair: 3, row: 46, side: 1 },
  { stair: 5, row: 46, side: -1 },
];
/** Setor visitante: entre a 4ª e a 5ª escada, nas fileiras do meio. */
const AWAY_ROWS = [18, 40];

const SKIN = ['#f1c7a5', '#d9a07a', '#c68b59', '#8d5524', '#6b3f1f'];
const HAIR = ['#2a1a10', '#5a3a1a', '#111111', '#b8862e', '#3b2412', '#8a8a8a'];
const OTHER = ['#f2f2f2', '#1d1d24', '#6b6f7a', '#2a9d8f', '#b33a3a', '#e6c34a', '#5c2a86'];

/** Desenha a textura de uma fileira: degrau, cadeiras, torcedores, escadas e saídas. */
function makeRowTexture(scene: Phaser.Scene, key: string, row: number, r: number, rng: Rng) {
  const { len } = rowGeom(r);
  const W = Math.ceil(len * TPY);
  const H = ROW_TEX_H;
  const tex = scene.textures.createCanvas(key, W, H)!;
  const ctx = tex.getContext();
  const tx = (u: number) => Math.round(u * TPY);
  const home = [hex(TEAMS.home.color), shade(TEAMS.home.color, 0.25), shade(TEAMS.home.color, -0.2)];
  const away = [hex(TEAMS.away.color), shade(TEAMS.away.color, 0.3), shade(TEAMS.away.color, -0.25)];
  const stairs = stairsU(r);
  const awayRow = row >= AWAY_ROWS[0] && row <= AWAY_ROWS[1];
  const awayA = stairs[3] + STAIR_W / 2;
  const awayB = stairs[4] - STAIR_W / 2;
  const isAway = (u: number) => awayRow && u > awayA && u < awayB;
  const exitRange = (e: (typeof EXITS)[number]) => {
    const a = stairs[e.stair] + (e.side * STAIR_W) / 2;
    return e.side > 0 ? [a, a + EXIT_W] : [a - EXIT_W, a];
  };

  // Degrau azul-acinzentado + encosto das cadeiras
  ctx.fillStyle = row % 2 ? '#3e4560' : '#394058';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#4a5270';
  ctx.fillRect(0, H - 6, W, 3);
  ctx.fillStyle = '#262a3d';
  ctx.fillRect(0, H - 3, W, 3);
  if (awayRow) {
    ctx.fillStyle = shade(TEAMS.away.color, -0.3);
    ctx.fillRect(tx(awayA), H - 6, tx(awayB) - tx(awayA), 3);
  }

  const blocked = (u: number) =>
    stairs.some((s) => Math.abs(u - s) < STAIR_W / 2 + 0.35) ||
    EXITS.some((e) => {
      const [a, b] = exitRange(e);
      return row >= e.row && row < e.row + EXIT_ROWS && u > a - 0.3 && u < b + 0.3;
    });

  // Torcedores (cada um sorteado)
  for (let px = 3; px < W - 4; px += rng.int(6, 8)) {
    const u = px / TPY;
    if (blocked(u) || rng.chance(0.06)) continue;
    const team = isAway(u) ? away : home;
    const rr = rng.next();
    const shirt = rr < 0.68 ? rng.pick(team) : rr < 0.8 ? '#f2f2f2' : rng.pick(OTHER);
    const skin = rng.pick(SKIN);
    const bodyH = rng.chance(0.3) ? 6 : 4;
    const top = H - 3 - bodyH;
    ctx.fillStyle = shirt;
    ctx.fillRect(px - 2, top, 5, bodyH);
    ctx.fillStyle = skin;
    ctx.fillRect(px - 1, top - 3, 3, 3);
    ctx.fillStyle = rng.chance(0.3) ? rng.pick([...team, '#1d1d24']) : rng.pick(HAIR);
    ctx.fillRect(px - 1, top - 4, 3, 1);
    if (rng.chance(0.07)) {
      ctx.fillStyle = skin; // braços para cima
      ctx.fillRect(px - 3, top - 3, 1, 3);
      ctx.fillRect(px + 3, top - 3, 1, 3);
    }
  }

  // Escadas: cinza com degrau escuro e bordas claras (corrimão)
  for (const s of stairs) {
    const a = tx(s - STAIR_W / 2);
    const b = tx(s + STAIR_W / 2);
    ctx.fillStyle = '#6e7389';
    ctx.fillRect(a, 0, b - a, H);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(a, H - 4, b - a, 3);
    ctx.fillStyle = '#a9aec2';
    ctx.fillRect(a - 1, 0, 1, H);
    ctx.fillRect(b, 0, 1, H);
  }

  // Saídas: túnel escuro colado na escada + placa verde "SAÍDA" na fileira de cima
  for (const e of EXITS) {
    const [ua, ub] = exitRange(e);
    const a = tx(ua);
    const b = tx(ub);
    if (row >= e.row && row < e.row + EXIT_ROWS) {
      ctx.fillStyle = '#8c91a8';
      ctx.fillRect(a, 0, b - a, H);
      ctx.fillStyle = '#07080d';
      ctx.fillRect(a + 2, 0, b - a - 4, row === e.row ? H - 2 : H);
    }
    if (row === e.row + EXIT_ROWS) {
      ctx.fillStyle = '#8c91a8';
      ctx.fillRect(a, H - 3, b - a, 3);
      ctx.fillStyle = '#1f9d55';
      ctx.fillRect(a + 1, 1, b - a - 2, H - 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = '7px Silkscreen';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SAÍDA', (a + b) / 2, (H - 4) / 2 + 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Pedaços (frames) da fileira: arcos em vários pedaços, a reta inteira
  const g = rowGeom(r);
  const cuts: number[] = [];
  for (let i = 0; i <= ARC_SEGS; i++) cuts.push((g.arc * i) / ARC_SEGS);
  for (let i = 1; i <= ARC_SEGS; i++) cuts.push(g.arc + STRAIGHT + (g.arc * i) / ARC_SEGS);
  const pieces: { frame: string; u0: number; u1: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = tx(cuts[i]);
    const b = Math.min(W, tx(cuts[i + 1]) + 1); // 1 texel de sobra evita frestas
    const frame = `p${i}`;
    tex.add(frame, 0, a, 0, b - a, H);
    pieces.push({ frame, u0: cuts[i], u1: cuts[i + 1] });
  }
  return pieces;
}

const pa: ScreenPoint = { x: 0, y: 0, s: 0 };
const pb: ScreenPoint = { x: 0, y: 0, s: 0 };

interface Piece {
  img: Phaser.GameObjects.Image;
  k: number;
  r: number;
  u0: number;
  u1: number;
}

export class Grandstand {
  private pieces: Piece[] = [];
  private phases: number[] = [];
  private g: Phaser.GameObjects.Graphics; // muro da frente + flashes
  private wallText: Phaser.GameObjects.Text;
  private fx = new Rng(MATCH_SEED + 9);
  private flashes: { k: number; u: number; life: number }[] = [];
  private time = 0;
  /** Empolgação (0..1): as fileiras pulam e os flashes aumentam. */
  excite = 0;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    const rng = new Rng(MATCH_SEED);
    for (let k = 0; k < ROWS; k++) {
      const r = R0 + 0.5 + k * DEPTH;
      const key = `stand_row_${k}`;
      const pieces = makeRowTexture(scene, key, k, r, rng);
      for (const p of pieces) {
        const img = scene.add.image(0, 0, key, p.frame).setOrigin(0, 1);
        this.pieces.push({ img, k, r, u0: p.u0, u1: p.u1 });
      }
      this.phases.push(rng.range(0, Math.PI * 2));
    }
    this.g = scene.add.graphics().setDepth(3.9);
    this.wallText = scene.add
      .text(0, 0, 'QB CAREER :: QB CAREER :: QB CAREER', { fontFamily: FONT_TITLE, fontSize: '32px', color: TEAMS.home.colorHex })
      .setOrigin(0.5, 0.5)
      .setDepth(3.95);
  }

  cheer(amount = 1) {
    this.excite = Math.min(1, this.excite + amount);
  }

  private rowH(k: number) {
    return WALL_H + k * RISE;
  }

  update(dt: number) {
    this.time += dt;
    this.excite = Math.max(0, this.excite - dt * 0.45);
    const proj = this.proj;
    const near = proj.nearY;

    // Cada pedaço: ponta esquerda projetada, largura até a ponta direita, altura pela profundidade
    for (const p of this.pieces) {
      const [x0, y0] = pointAt(p.r, p.u0);
      const [x1, y1] = pointAt(p.r, p.u1);
      if (Math.max(y0, y1) < near) {
        p.img.setVisible(false);
        continue;
      }
      const jump = this.excite > 0.01 ? Math.max(0, Math.sin(this.time * 11 + this.phases[p.k])) * 0.35 * this.excite : 0;
      const h = this.rowH(p.k) + jump;
      proj.project(x0, y0, h, pa);
      proj.project(x1, y1, h, pb);
      const w = p.img.frame.width;
      const sy = (pa.s * 10) / TPY;
      const sx = Math.max(0.0001, (pb.x - pa.x) / w);
      // Mais perto da câmera (y menor) na frente; fileira de fora atrás
      const ymid = (y0 + y1) / 2;
      p.img
        .setVisible(pa.y > -40 && pa.x < proj.w + 20 && pb.x > -20)
        .setPosition(pa.x, Math.max(pa.y, pb.y))
        .setScale(sx, sy)
        .setDepth(3 + (300 - ymid) * 0.001 - p.k * 0.00001);
    }

    // Muro escuro na frente, seguindo a curva dos cantos
    const g = this.g;
    g.clear();
    const wr = R0;
    const wl = rowGeom(wr).len;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const [ax, ay] = pointAt(wr, (wl * i) / N);
      const [bx, by] = pointAt(wr, (wl * (i + 1)) / N);
      wallQuad(g, proj, ax, ay, bx, by, 0, WALL_H + 0.4, 0x0d0d12);
      wallQuad(g, proj, ax, ay, bx, by, WALL_H + 0.25, WALL_H + 0.4, 0x555b73);
    }
    proj.project((CX_L + CX_R) / 2, CY + wr, WALL_H * 0.5, pa);
    this.wallText.setPosition(pa.x, pa.y).setScale((WALL_H * 0.55 * pa.s * 10) / 32);

    // Flashes de câmera aleatórios na torcida
    if (this.fx.next() < (2 + this.excite * 16) * dt) {
      const k = this.fx.int(0, ROWS - 1);
      this.flashes.push({ k, u: this.fx.range(0, rowGeom(R0 + 0.5 + k * DEPTH).len), life: 0.14 });
    }
    for (const f of this.flashes) {
      f.life -= dt;
      if (f.life <= 0) continue;
      const [x, y] = pointAt(R0 + 0.5 + f.k * DEPTH, f.u);
      if (y < near) continue;
      proj.project(x, y, this.rowH(f.k) + 1, pa);
      if (pa.x < 0 || pa.x > proj.w || pa.y < 0) continue;
      const k = f.life / 0.14;
      const fu = pa.s * 10;
      g.fillStyle(0xffffff, 0.35 * k);
      g.fillCircle(pa.x, pa.y, fu * 0.9 * k + 1);
      g.fillStyle(0xffffff, k);
      g.fillRect(pa.x - fu * k, pa.y - 0.5, fu * 2 * k, 1);
      g.fillRect(pa.x - 0.5, pa.y - fu * k, 1, fu * 2 * k);
    }
    this.flashes = this.flashes.filter((f) => f.life > 0);
  }
}
