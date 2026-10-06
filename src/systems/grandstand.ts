import Phaser from 'phaser';
import { FONT_TITLE, MATCH_SEED, TEAMS } from '../config';
import { wallQuad } from './ground';
import { hex, shade } from './pixelart';
import type { Projection, ScreenPoint } from './projection';
import { Rng } from './rng';

/*
 * Arquibancada só no FUNDO do campo (atrás da end zone adversária), como no design.
 * Não é um fundo parado: cada fileira é um objeto no mundo (posição + altura), projetado
 * pela mesma câmera do campo. Quando a câmera avança, a arquibancada cresce e se aproxima.
 *
 * Fileiras sobem em degraus: a fileira k fica em y = FRONT_Y + k·DEPTH e altura k·RISE.
 * Escadas verticais atravessam todas as fileiras; as SAÍDAS são túneis colados nas escadas.
 */

const FRONT_Y = 114; // primeira fileira (4 jd depois da linha de fundo)
const X0 = -75; // largura total da arquibancada (jardas)
const X1 = 128;
const ROWS = 70;
const DEPTH = 1.0; // jardas entre fileiras
const RISE = 1.15; // quanto cada fileira sobe
const TPY = 8; // texels por jarda na textura das fileiras
const ROW_TEX_H = 14; // altura de cada fileira na textura (texels)
const W_TEX = Math.round((X1 - X0) * TPY);
const WALL_H = 1.6;

/** Escadas (x central, em jardas) — mesmas posições do design. */
const STAIRS = [-35, -11, 6.6, 45, 64, 88];
const STAIR_W = 1.8;
/** Saídas: túnel ao lado de uma escada, ocupando 3 fileiras. */
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
const EXIT_W = 3.6;
const EXIT_ROWS = 3;
/** Setor visitante: entre as escadas de x=45 e x=64, nas fileiras do meio. */
const AWAY = { x0: 45 + STAIR_W / 2, x1: 64 - STAIR_W / 2, r0: 18, r1: 40 };

const SKIN = ['#f1c7a5', '#d9a07a', '#c68b59', '#8d5524', '#6b3f1f'];
const HAIR = ['#2a1a10', '#5a3a1a', '#111111', '#b8862e', '#3b2412', '#8a8a8a'];
const OTHER = ['#f2f2f2', '#1d1d24', '#6b6f7a', '#2a9d8f', '#b33a3a', '#e6c34a', '#5c2a86'];

const tx = (x: number) => Math.round((x - X0) * TPY); // jarda → texel

function exitRange(e: (typeof EXITS)[number]) {
  const sx = STAIRS[e.stair];
  const a = sx + (e.side * STAIR_W) / 2;
  return e.side > 0 ? [a, a + EXIT_W] : [a - EXIT_W, a];
}

/** Desenha a textura de uma fileira: degrau, cadeiras, torcedores, escadas e saídas. */
function makeRowTexture(scene: Phaser.Scene, key: string, row: number, rng: Rng) {
  const tex = scene.textures.createCanvas(key, W_TEX, ROW_TEX_H)!;
  const ctx = tex.getContext();
  const H = ROW_TEX_H;
  const home = [hex(TEAMS.home.color), shade(TEAMS.home.color, 0.25), shade(TEAMS.home.color, -0.2)];
  const away = [hex(TEAMS.away.color), shade(TEAMS.away.color, 0.3), shade(TEAMS.away.color, -0.25)];
  const isAway = (x: number) => x > AWAY.x0 && x < AWAY.x1 && row >= AWAY.r0 && row <= AWAY.r1;

  // Degrau azul-acinzentado + encosto das cadeiras
  ctx.fillStyle = row % 2 ? '#3e4560' : '#394058';
  ctx.fillRect(0, 0, W_TEX, H);
  ctx.fillStyle = '#4a5270';
  ctx.fillRect(0, H - 6, W_TEX, 3);
  ctx.fillStyle = '#262a3d';
  ctx.fillRect(0, H - 3, W_TEX, 3);
  // Encosto azul no setor visitante, com bordas escuras separando
  if (row >= AWAY.r0 && row <= AWAY.r1) {
    ctx.fillStyle = shade(TEAMS.away.color, -0.3);
    ctx.fillRect(tx(AWAY.x0), H - 6, tx(AWAY.x1) - tx(AWAY.x0), 3);
  }

  const blocked = (x: number) =>
    STAIRS.some((s) => Math.abs(x - s) < STAIR_W / 2 + 0.35) ||
    EXITS.some((e) => {
      const [a, b] = exitRange(e);
      return row >= e.row && row < e.row + EXIT_ROWS && x > a - 0.3 && x < b + 0.3;
    });

  // Torcedores (cada um sorteado)
  for (let px = 3; px < W_TEX - 4; px += rng.int(6, 8)) {
    const x = X0 + px / TPY;
    if (blocked(x) || rng.chance(0.06)) continue;
    const team = isAway(x) ? away : home;
    const r = rng.next();
    const shirt = r < 0.68 ? rng.pick(team) : r < 0.8 ? '#f2f2f2' : rng.pick(OTHER);
    const skin = rng.pick(SKIN);
    const standing = rng.chance(0.3);
    const bodyH = standing ? 6 : 4;
    const top = H - 3 - bodyH;
    ctx.fillStyle = shirt;
    ctx.fillRect(px - 2, top, 5, bodyH);
    ctx.fillStyle = skin;
    ctx.fillRect(px - 1, top - 3, 3, 3);
    ctx.fillStyle = rng.chance(0.3) ? rng.pick([...team, '#1d1d24']) : rng.pick(HAIR);
    ctx.fillRect(px - 1, top - 4, 3, 1);
    if (rng.chance(0.07)) {
      // braços para cima
      ctx.fillStyle = skin;
      ctx.fillRect(px - 3, top - 3, 1, 3);
      ctx.fillRect(px + 3, top - 3, 1, 3);
    }
  }

  // Escadas: cinza com degrau escuro e bordas claras (corrimão)
  for (const s of STAIRS) {
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
    const [xa, xb] = exitRange(e);
    const a = tx(xa);
    const b = tx(xb);
    if (row >= e.row && row < e.row + EXIT_ROWS) {
      ctx.fillStyle = '#8c91a8';
      ctx.fillRect(a, 0, b - a, H);
      ctx.fillStyle = '#07080d';
      ctx.fillRect(a + 2, row === e.row ? 0 : 0, b - a - 4, row === e.row ? H - 2 : H);
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
}

const pa: ScreenPoint = { x: 0, y: 0, s: 0 };

export class Grandstand {
  private rows: { img: Phaser.GameObjects.Image; k: number; phase: number }[] = [];
  private g: Phaser.GameObjects.Graphics; // muro da frente + flashes
  private wallText: Phaser.GameObjects.Text;
  private fx = new Rng(MATCH_SEED + 9);
  private flashes: { k: number; x: number; life: number }[] = [];
  private time = 0;
  /** Empolgação (0..1): as fileiras pulam e os flashes aumentam. */
  excite = 0;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    const rng = new Rng(MATCH_SEED);
    for (let k = 0; k < ROWS; k++) {
      const key = `stand_row_${k}`;
      if (!scene.textures.exists(key)) makeRowTexture(scene, key, k, rng);
      // A fileira de trás é desenhada primeiro (profundidade menor)
      const img = scene.add.image(0, 0, key).setOrigin(0, 1).setDepth(3 - k * 0.001);
      this.rows.push({ img, k, phase: rng.range(0, Math.PI * 2) });
    }
    this.g = scene.add.graphics().setDepth(3.5);
    this.wallText = scene.add
      .text(0, 0, 'QB CAREER :: QB CAREER :: QB CAREER :: QB CAREER :: QB CAREER', {
        fontFamily: FONT_TITLE,
        fontSize: '32px',
        color: TEAMS.home.colorHex,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(3.6);
  }

  cheer(amount = 1) {
    this.excite = Math.min(1, this.excite + amount);
  }

  update(dt: number) {
    this.time += dt;
    this.excite = Math.max(0, this.excite - dt * 0.45);
    const proj = this.proj;

    // Fileiras: canto esquerdo da fileira projetado no mundo, escala pela profundidade
    for (const r of this.rows) {
      const y = FRONT_Y + r.k * DEPTH;
      const jump = this.excite > 0.01 ? Math.max(0, Math.sin(this.time * 11 + r.phase)) * 0.35 * this.excite : 0;
      proj.project(X0, y, WALL_H + r.k * RISE + jump, pa);
      const sc = (pa.s * 10) / TPY; // texel → px na tela
      r.img.setPosition(pa.x, pa.y).setScale(sc);
    }

    // Muro escuro na frente da arquibancada, com faixa e "QB CAREER"
    const g = this.g;
    g.clear();
    wallQuad(g, proj, X0, FRONT_Y - 0.3, X1, FRONT_Y - 0.3, 0, WALL_H + 0.4, 0x0d0d12);
    wallQuad(g, proj, X0, FRONT_Y - 0.3, X1, FRONT_Y - 0.3, WALL_H + 0.25, WALL_H + 0.4, 0x555b73);
    proj.project(26.65, FRONT_Y - 0.3, WALL_H * 0.5, pa);
    const u = pa.s * 10;
    this.wallText.setPosition(pa.x, pa.y).setScale((WALL_H * 0.55 * u) / 32);

    // Flashes de câmera aleatórios na torcida
    if (this.fx.next() < (2 + this.excite * 16) * dt) {
      this.flashes.push({ k: this.fx.int(0, ROWS - 1), x: this.fx.range(X0 + 2, X1 - 2), life: 0.14 });
    }
    for (const f of this.flashes) {
      f.life -= dt;
      if (f.life <= 0) continue;
      proj.project(f.x, FRONT_Y + f.k * DEPTH, WALL_H + f.k * RISE + 1, pa);
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
