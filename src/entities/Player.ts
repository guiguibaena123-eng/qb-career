import { difficulty } from '../systems/difficulty';
import Phaser from 'phaser';
import { FONT_TITLE, SPRITE_SCALE, TEAMS, TEX_PX } from '../config';
import type { RecvKey, Role, Side, Slot } from '../data/plays';
import type { Billboard, BillboardLayer } from '../systems/billboards';
import { hex } from '../systems/pixelart';

/*
 * Jogador: posição no mundo (jardas), atributos e o sprite de pixel art.
 * O sprite segue o design: caixa de 28×44 px, desenhada em 2x.
 * Defesa vista de FRENTE (rosto, grade, eye black); ataque visto de COSTAS (faixa do capacete, número nas costas).
 */

const SKINS = ['#8D5524', '#C68B59', '#F1C27D', '#6B3F1F', '#E0AC69'];
const OUTLINE = '#141414';
const PX = TEX_PX + 1; // desenhado em alta resolução (detalhes do corpo)
const BOX_W = 28;
const BOX_H = 50; // 44 do design + espaço para a bola erguida

export interface Attributes {
  speed: number;
  strength: number;
  hands: number;
  coverage: number;
  tackle: number;
}

/** Atributos base por posição (0–100). */
const BASE: Record<Role, Attributes> = {
  C: { speed: 45, strength: 82, hands: 30, coverage: 10, tackle: 30 },
  G: { speed: 44, strength: 84, hands: 25, coverage: 10, tackle: 30 },
  T: { speed: 46, strength: 86, hands: 25, coverage: 10, tackle: 30 },
  TE: { speed: 70, strength: 70, hands: 74, coverage: 20, tackle: 40 },
  WR: { speed: 88, strength: 50, hands: 80, coverage: 25, tackle: 25 },
  QB: { speed: 66, strength: 55, hands: 60, coverage: 10, tackle: 20 },
  RB: { speed: 86, strength: 66, hands: 66, coverage: 15, tackle: 30 },
  DL: { speed: 60, strength: 84, hands: 30, coverage: 20, tackle: 76 },
  LB: { speed: 72, strength: 72, hands: 45, coverage: 62, tackle: 80 },
  CB: { speed: 87, strength: 48, hands: 58, coverage: 80, tackle: 62 },
  NB: { speed: 84, strength: 48, hands: 55, coverage: 74, tackle: 60 },
  S: { speed: 82, strength: 58, hands: 60, coverage: 76, tackle: 74 },
};

/** Poses (frames) desenhadas para cada jogador. */
// (novas poses sempre no fim: o replay guarda o índice)
export const POSES = ['idle', 'run1', 'run2', 'throw', 'catch', 'carry', 'carrySide', 'carryTurn', 'diveUp', 'dive', 'diveFlat', 'run3', 'run4', 'carry1', 'carry2', 'stance', 'ready'] as const;
export type Pose = (typeof POSES)[number];
const MARGIN = PX;
const FRAME_W = BOX_W * PX + 2 * MARGIN;
const FRAME_H = BOX_H * PX + 2 * MARGIN;
/** Espaço vazio entre as poses na textura (sem ele, a borda de uma pose vaza na vizinha ao filtrar). */
const GAP = 4 * PX;

export interface Look {
  front: boolean;
  helmet: string;
  jersey: string;
  pants: string;
  trim: string;
  sock: string;
  skin: string;
  glove: string;
  num: string;
  numColor: string;
  /** Combine: camiseta, bermuda e chuteira, sem capacete nem ombreiras. `hair` = cor do cabelo. */
  casual?: boolean;
  hair?: string;
}

/*
 * Corpo desenhado com formas orgânicas (cápsulas, curvas, elipses) sobre um "esqueleto" por pose.
 * Unidades do design (caixa 28×50), y medido de baixo para cima; PX pixels por unidade.
 */
type Pt = [number, number];
const LINE = 0.75; // espessura do contorno (unidades)
const BALL = '#7A3E16';

interface Rig {
  view: 'back' | 'front' | 'side';
  hipL: Pt; hipR: Pt; kneeL: Pt; kneeR: Pt; ankL: Pt; ankR: Pt;
  /** Sola aparecendo (pé levantado / deitado). */
  soleL?: boolean; soleR?: boolean;
  /** Tronco: centro x, cintura (y), peito (y) e larguras. */
  cx: number; waist: number; chest: number; wWaist: number; wChest: number;
  /** Ombreiras: altura (y) e meia-largura. */
  padY: number; padW: number;
  shL: Pt; shR: Pt; elL: Pt; elR: Pt; hdL: Pt; hdR: Pt;
  /** Braços levantados (desenhados por cima do capacete). */
  upL?: boolean; upR?: boolean;
  head: Pt; headR: number; headRy?: number;
  ball?: { at: Pt; rx: number; ry: number; rot: number; under?: 'R' | 'L' };
  numSize: number;
  grass?: boolean;
}

const T = (b: number) => BOX_H - b;

function tone(c: string, k: number): string {
  // k < 0 escurece, k > 0 clareia
  const m = /^#?([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

/** Cápsula afinando de `a` (raio ra) até `c` (raio rc). */
function capsule(a: Pt, c: Pt, ra: number, rc: number): Path2D {
  const ax = a[0], ay = T(a[1]), cx = c[0], cy = T(c[1]);
  const ang = Math.atan2(cy - ay, cx - ax);
  const p = new Path2D();
  p.arc(cx, cy, rc, ang - Math.PI / 2, ang + Math.PI / 2);
  p.arc(ax, ay, ra, ang + Math.PI / 2, ang + (3 * Math.PI) / 2);
  p.closePath();
  return p;
}
function ellipse(c: Pt, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(c[0], T(c[1]), rx, ry, rot, 0, Math.PI * 2);
  return p;
}
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

class Pen {
  constructor(private ctx: CanvasRenderingContext2D) {}
  /** Contorno de várias peças de uma vez (assim as juntas não ficam riscadas) e depois o preenchimento. */
  group(parts: [Path2D, string | CanvasGradient][], outline = true) {
    const c = this.ctx;
    if (outline) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = LINE * 2;
      c.lineJoin = 'round';
      for (const [p] of parts) c.stroke(p);
    }
    for (const [p, col] of parts) {
      c.fillStyle = col;
      c.fill(p);
    }
  }
  /** Luz de cima/esquerda e sombra à direita, recortadas na forma. */
  shade(p: Path2D, x0: number, x1: number, k = 1, yTop?: number, yBot?: number) {
    const c = this.ctx;
    c.save();
    c.clip(p);
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, `rgba(255,255,255,${0.16 * k})`);
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${0.3 * k})`);
    c.fillStyle = g;
    c.fillRect(x0 - 2, 0, x1 - x0 + 4, BOX_H);
    if (yTop !== undefined && yBot !== undefined) {
      const v = c.createLinearGradient(0, T(yTop), 0, T(yBot));
      v.addColorStop(0, `rgba(255,255,255,${0.12 * k})`);
      v.addColorStop(0.6, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(0,0,0,${0.22 * k})`);
      c.fillStyle = v;
      c.fillRect(x0 - 2, T(yTop) - 1, x1 - x0 + 4, T(yBot) - T(yTop) + 2);
    }
    c.restore();
  }
  clipDo(p: Path2D, fn: () => void) {
    const c = this.ctx;
    c.save();
    c.clip(p);
    fn();
    c.restore();
  }
  line(a: Pt, b: Pt, w: number, col: string) {
    const c = this.ctx;
    c.strokeStyle = col;
    c.lineWidth = w;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(a[0], T(a[1]));
    c.lineTo(b[0], T(b[1]));
    c.stroke();
  }
}

/** Perna: coxa (calça), joelheira, canela (meião com faixa), chuteira. */
function drawLeg(pen: Pen, ctx: CanvasRenderingContext2D, L: Look, hip: Pt, knee: Pt, ank: Pt, sole: boolean, casual: boolean) {
  const shoe: Pt = [ank[0], ank[1] - 1.1];
  const thigh = capsule(hip, knee, 3.2, 2.5);
  const calf = capsule(knee, ank, 2.2, 1.55);
  const boot = ellipse(shoe, 2.7, sole ? 1.9 : 1.5);
  pen.group([
    [calf, casual ? L.skin : L.sock],
    [boot, '#141418'],
    [thigh, casual ? L.skin : L.pants],
  ]);
  // chuteira: sola clara quando o pé sobe, detalhe na cor do time
  if (sole) pen.clipDo(boot, () => { ctx.fillStyle = '#5A5A64'; ctx.fillRect(shoe[0] - 3, T(shoe[1] + 0.2), 6, 3); });
  pen.clipDo(boot, () => { ctx.fillStyle = L.trim; ctx.fillRect(shoe[0] - 1.4, T(shoe[1] + 1.4), 2.8, 0.8); });
  if (casual) {
    // meia curta branca
    pen.clipDo(calf, () => { ctx.fillStyle = '#F4F1E8'; const m = lerp(knee, ank, 0.62); ctx.fillRect(m[0] - 4, T(m[1]), 8, 6); });
  } else {
    // faixa do meião e joelheira (volume da calça)
    pen.clipDo(calf, () => { const m = lerp(knee, ank, 0.32); ctx.fillStyle = L.trim; ctx.fillRect(m[0] - 4, T(m[1]) - 0.5, 8, 1.1); });
    pen.shade(calf, knee[0] - 2.5, knee[0] + 2.5, 0.8);
    const pad = ellipse(lerp(hip, knee, 0.86), 2.6, 1.9);
    pen.clipDo(thigh, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fill(pad);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.5;
      ctx.stroke(pad);
    });
  }
  pen.shade(thigh, hip[0] - 3.4, hip[0] + 3.4, 1);
}

/** Braço: manga da camisa com faixa, braço, cotovelo e luva. */
function drawArm(pen: Pen, ctx: CanvasRenderingContext2D, L: Look, sh: Pt, el: Pt, hd: Pt, casual: boolean) {
  const upper = capsule(sh, el, 2.1, 1.75);
  const fore = capsule(el, hd, 1.75, 1.35);
  const glove = ellipse(hd, 1.7, 1.6);
  const sleeveEnd = lerp(sh, el, casual ? 0.5 : 0.42);
  const sleeve = capsule(sh, sleeveEnd, 2.6, 2.3);
  pen.group([
    [upper, L.skin],
    [fore, L.skin],
    [glove, L.glove],
  ]);
  pen.shade(upper, sh[0] - 2.4, sh[0] + 2.4, 0.9);
  pen.shade(fore, el[0] - 2, el[0] + 2, 0.9);
  // cotovelo
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fill(ellipse(el, 1.1, 0.7));
  pen.group([[sleeve, L.jersey]]);
  if (!casual) {
    pen.clipDo(sleeve, () => {
      const m = lerp(sh, el, 0.3);
      ctx.fillStyle = L.trim;
      ctx.fillRect(m[0] - 3, T(m[1]) - 0.55, 6, 1.1);
    });
  }
  pen.shade(sleeve, sh[0] - 2.6, sh[0] + 2.6, 0.9);
  // dedos da luva
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(hd[0] - 1, T(hd[1]) - 0.2, 2, 0.35);
}

function torsoPath(R: Rig): Path2D {
  const { cx, waist, chest, wWaist, wChest, padY } = R;
  const hw = wWaist / 2, hc = wChest / 2;
  const p = new Path2D();
  p.moveTo(cx - hw, T(waist));
  p.bezierCurveTo(cx - hw - 0.6, T(waist + 4), cx - hc, T(chest - 3), cx - hc, T(chest));
  p.lineTo(cx - hc + 1, T(padY));
  p.lineTo(cx + hc - 1, T(padY));
  p.lineTo(cx + hc, T(chest));
  p.bezierCurveTo(cx + hc, T(chest - 3), cx + hw + 0.6, T(waist + 4), cx + hw, T(waist));
  p.quadraticCurveTo(cx, T(waist - 0.8), cx - hw, T(waist));
  p.closePath();
  return p;
}

/** Ombreiras: dois "cascos" arredondados ligados pela gola. */
function padsPath(R: Rig): Path2D {
  const { cx, padY, padW } = R;
  const p = new Path2D();
  const top = T(padY + 2.2);
  const bot = T(padY - 3.2);
  p.moveTo(cx - padW, bot);
  p.bezierCurveTo(cx - padW - 0.8, T(padY + 1.4), cx - padW + 2.5, top - 0.3, cx - 3.8, top + 0.4);
  p.quadraticCurveTo(cx, top + 1.2, cx + 3.8, top + 0.4);
  p.bezierCurveTo(cx + padW - 2.5, top - 0.3, cx + padW + 0.8, T(padY + 1.4), cx + padW, bot);
  p.quadraticCurveTo(cx + padW - 2.5, bot + 1.4, cx + padW - 5, bot - 0.4);
  p.lineTo(cx - padW + 5, bot - 0.4);
  p.quadraticCurveTo(cx - padW + 2.5, bot + 1.4, cx - padW, bot);
  p.closePath();
  return p;
}

function helmetPath(c: Pt, r: number, ry: number): Path2D {
  // casco: domo em cima, base um pouco achatada
  const x = c[0], y = T(c[1]);
  const p = new Path2D();
  p.moveTo(x - r, y + ry * 0.2);
  p.bezierCurveTo(x - r, y - ry * 1.05, x + r, y - ry * 1.05, x + r, y + ry * 0.2);
  p.bezierCurveTo(x + r, y + ry * 0.75, x + r * 0.55, y + ry * 0.98, x, y + ry * 0.98);
  p.bezierCurveTo(x - r * 0.55, y + ry * 0.98, x - r, y + ry * 0.75, x - r, y + ry * 0.2);
  p.closePath();
  return p;
}

function drawHead(pen: Pen, ctx: CanvasRenderingContext2D, L: Look, R: Rig) {
  const [hx, hb] = R.head;
  const r = R.headR;
  const ry = R.headRy ?? r * 0.95;
  const y = T(hb);
  if (L.casual) {
    // cabeça sem capacete: pescoço, rosto/nuca, orelhas e cabelo
    const head = ellipse(R.head, r * 0.72, ry * 0.86);
    const neck = capsule([hx, hb - ry * 0.9], [hx, hb - ry * 0.3], 1.8, 1.8);
    const earL = ellipse([hx - r * 0.72, hb], 0.8, 1.2);
    const earR = ellipse([hx + r * 0.72, hb], 0.8, 1.2);
    pen.group([[neck, L.skin], [earL, L.skin], [earR, L.skin], [head, L.skin]]);
    const hair = L.hair ?? '#15110F';
    pen.clipDo(head, () => {
      ctx.fillStyle = hair;
      if (L.front || R.view === 'side') ctx.fillRect(hx - r, y - ry, r * 2, ry * 0.7);
      else ctx.fillRect(hx - r, y - ry, r * 2, ry * 1.45);
      if (L.front) {
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(hx - 2.2, y - 0.6, 1.2, 1);
        ctx.fillRect(hx + 1, y - 0.6, 1.2, 1);
      }
    });
    pen.shade(head, hx - r, hx + r, 1);
    return;
  }
  const shell = helmetPath(R.head, r, ry);
  pen.group([[shell, L.helmet]]);
  if (R.view === 'side') {
    // de perfil (virado para a direita): rosto e grade na frente, furo da orelha
    const face = new Path2D();
    face.moveTo(hx + r * 0.25, y - ry * 0.05);
    face.lineTo(hx + r, y - ry * 0.05);
    face.lineTo(hx + r, y + ry * 0.75);
    face.lineTo(hx + r * 0.3, y + ry * 0.75);
    face.closePath();
    pen.clipDo(shell, () => {
      ctx.fillStyle = L.skin;
      ctx.fill(face);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(hx + r * 0.25, y - ry * 0.05, r, 0.7);
      // faixa por cima do casco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(hx - r, y - ry * 0.95, r * 2, 1.1);
    });
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill(ellipse([hx - r * 0.2, hb - ry * 0.05], 1, 1.1));
    // grade
    ctx.strokeStyle = '#C9CED6';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.6, y - ry * 0.1);
    ctx.quadraticCurveTo(hx + r + 1.6, y + ry * 0.2, hx + r * 0.7, y + ry * 0.95);
    ctx.moveTo(hx + r * 0.5, y + ry * 0.35);
    ctx.lineTo(hx + r + 1.2, y + ry * 0.35);
    ctx.stroke();
    pen.shade(shell, hx - r, hx + r, 1, hb + ry, hb - ry);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill(ellipse([hx - r * 0.35, hb + ry * 0.5], r * 0.32, ry * 0.18, -0.4));
    return;
  }
  if (L.front) {
    // de frente: rosto no vão do capacete, eye black, grade curva
    const face = new Path2D();
    face.moveTo(hx - r * 0.66, y - ry * 0.12);
    face.quadraticCurveTo(hx, y - ry * 0.3, hx + r * 0.66, y - ry * 0.12);
    face.lineTo(hx + r * 0.6, y + ry * 0.75);
    face.quadraticCurveTo(hx, y + ry * 1.0, hx - r * 0.6, y + ry * 0.75);
    face.closePath();
    pen.clipDo(shell, () => {
      ctx.fillStyle = L.skin;
      ctx.fill(face);
      ctx.save();
      ctx.clip(face);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(hx - r, y - ry * 0.3, r * 2, 1.2); // sombra da aba
      ctx.fillStyle = '#121212';
      ctx.fillRect(hx - r * 0.5, y + ry * 0.12, r * 0.32, 0.65);
      ctx.fillRect(hx + r * 0.18, y + ry * 0.12, r * 0.32, 0.65);
      ctx.restore();
      // faixa central do casco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(hx - 0.8, y - ry * 1.1, 1.6, ry * 0.95);
    });
    // furos das orelhas
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill(ellipse([hx - r * 0.86, hb - ry * 0.15], 0.6, 0.9));
    ctx.fill(ellipse([hx + r * 0.86, hb - ry * 0.15], 0.6, 0.9));
    pen.shade(shell, hx - r, hx + r, 1, hb + ry, hb - ry);
    // grade (dois arcos e a barra do meio)
    ctx.strokeStyle = '#3A3F48';
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';
    const mask = () => {
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.78, y + ry * 0.1);
      ctx.quadraticCurveTo(hx, y + ry * 0.55, hx + r * 0.78, y + ry * 0.1);
      ctx.moveTo(hx - r * 0.62, y + ry * 0.62);
      ctx.quadraticCurveTo(hx, y + ry * 1.12, hx + r * 0.62, y + ry * 0.62);
      ctx.moveTo(hx, y + ry * 0.33);
      ctx.lineTo(hx, y + ry * 0.92);
      ctx.stroke();
    };
    mask();
    ctx.strokeStyle = '#D5DAE1';
    ctx.lineWidth = 0.6;
    mask();
  } else {
    // de costas: faixa central com filetes, protetor da nuca
    pen.clipDo(shell, () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(hx - 0.9, y - ry * 1.1, 1.8, ry * 2.2);
      ctx.fillStyle = L.trim;
      ctx.fillRect(hx - 1.7, y - ry * 1.1, 0.5, ry * 2.2);
      ctx.fillRect(hx + 1.2, y - ry * 1.1, 0.5, ry * 2.2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill(ellipse([hx, hb - ry * 0.95], r * 0.62, 1.1));
    });
    pen.shade(shell, hx - r, hx + r, 1, hb + ry, hb - ry);
  }
  // brilho do casco
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill(ellipse([hx - r * 0.45, hb + ry * 0.48], r * 0.3, ry * 0.17, -0.5));
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill(ellipse([hx - r * 0.5, hb + ry * 0.5], 0.45, 0.35));
}

function drawBall(pen: Pen, ctx: CanvasRenderingContext2D, b: NonNullable<Rig['ball']>) {
  const p = ellipse(b.at, b.rx, b.ry, b.rot);
  pen.group([[p, BALL]]);
  pen.shade(p, b.at[0] - b.rx, b.at[0] + b.rx, 1.1);
  // costura
  const x = b.at[0], y = T(b.at[1]);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(b.rot);
  ctx.strokeStyle = '#F4F1E8';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-b.rx * 0.38, -b.ry * 0.3);
  ctx.lineTo(b.rx * 0.38, -b.ry * 0.3);
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(i * b.rx * 0.18, -b.ry * 0.5);
    ctx.lineTo(i * b.rx * 0.18, -b.ry * 0.1);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRig(ctx: CanvasRenderingContext2D, L: Look, R: Rig) {
  const pen = new Pen(ctx);
  const casual = !!L.casual;
  // gramado levantado (mergulho no chão)
  if (R.grass) {
    ctx.fillStyle = '#3a8a32';
    for (const gx of [2.5, 25.5]) {
      ctx.beginPath();
      ctx.moveTo(gx - 1.2, T(0));
      ctx.lineTo(gx - 0.3, T(2.6));
      ctx.lineTo(gx + 0.4, T(0.4));
      ctx.lineTo(gx + 1.2, T(2));
      ctx.lineTo(gx + 1.5, T(0));
      ctx.fill();
    }
  }
  // pernas: a de trás primeiro (de perfil); senão a mais alta (mais longe) primeiro
  const legs: [Pt, Pt, Pt, boolean][] = [
    [R.hipL, R.kneeL, R.ankL, !!R.soleL],
    [R.hipR, R.kneeR, R.ankR, !!R.soleR],
  ];
  for (const [h, k, a, s] of legs) drawLeg(pen, ctx, L, h, k, a, s, casual);
  // quadril (calça/bermuda) com o cinto
  const hipC: Pt = [R.cx, (R.hipL[1] + R.hipR[1]) / 2];
  const hw = Math.max(Math.abs(R.hipR[0] - R.hipL[0]) / 2 + 3, R.wWaist / 2);
  const pelvis = new Path2D();
  pelvis.moveTo(R.cx - hw, T(R.waist + 0.5));
  pelvis.lineTo(R.cx + hw, T(R.waist + 0.5));
  pelvis.bezierCurveTo(R.cx + hw + 0.4, T(hipC[1]), R.cx + hw - 1, T(hipC[1] - 2.6), R.cx + 1.5, T(hipC[1] - 2.2));
  pelvis.lineTo(R.cx - 1.5, T(hipC[1] - 2.2));
  pelvis.bezierCurveTo(R.cx - hw + 1, T(hipC[1] - 2.6), R.cx - hw - 0.4, T(hipC[1]), R.cx - hw, T(R.waist + 0.5));
  pelvis.closePath();
  pen.group([[pelvis, L.pants]]);
  pen.clipDo(pelvis, () => {
    // faixas laterais e costura do meio
    ctx.fillStyle = L.trim;
    ctx.fillRect(R.cx - hw, T(R.waist + 1), 1.3, 8);
    ctx.fillRect(R.cx + hw - 1.3, T(R.waist + 1), 1.3, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(R.cx - 0.3, T(R.waist), 0.6, 6);
  });
  pen.shade(pelvis, R.cx - hw, R.cx + hw, 1);
  // tronco (camisa) com o número
  const torso = torsoPath(R);
  pen.group([[torso, L.jersey]]);
  pen.clipDo(torso, () => {
    if (R.view !== 'side' && R.numSize > 0) {
      // número no meio do espaço livre entre a cintura e as ombreiras (nunca embaixo delas)
      const room = R.padY - 3.2 - R.waist;
      const size = Math.min(R.numSize, room * 0.72);
      ctx.font = `${size}px ${FONT_TITLE}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const ny = T(R.waist + room / 2 + 0.7);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.strokeText(L.num, R.cx, ny);
      ctx.fillStyle = L.numColor;
      ctx.fillText(L.num, R.cx, ny);
    }
    // barra da camisa
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(R.cx - 12, T(R.waist + 1.6), 24, 1.6);
    // dobras do tecido
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(R.cx - R.wWaist / 2 + 1.5, T(R.waist + 2));
    ctx.quadraticCurveTo(R.cx - R.wWaist / 2 + 2.5, T(R.waist + 5), R.cx - R.wWaist / 2 + 1.8, T(R.waist + 7));
    ctx.stroke();
  });
  pen.shade(torso, R.cx - R.wChest / 2, R.cx + R.wChest / 2, 1, R.padY, R.waist);

  // braços para baixo e bola presa (antes das ombreiras)
  const ballUnder = R.ball && R.ball.under;
  if (R.ball && ballUnder) drawBall(pen, ctx, R.ball);
  if (!R.upL) drawArm(pen, ctx, L, R.shL, R.elL, R.hdL, casual);
  if (!R.upR) drawArm(pen, ctx, L, R.shR, R.elR, R.hdR, casual);

  // ombreiras (ou gola da camiseta) e cabeça
  if (!casual) {
    const pads = padsPath(R);
    pen.group([[pads, L.jersey]]);
    pen.clipDo(pads, () => {
      ctx.fillStyle = L.trim;
      ctx.fillRect(R.cx - R.padW - 1, T(R.padY - 1.6), 3.4, 1);
      ctx.fillRect(R.cx + R.padW - 2.4, T(R.padY - 1.6), 3.4, 1);
      // gola
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill(ellipse([R.cx, R.padY + 1.6], 3.6, 1.1));
    });
    pen.shade(pads, R.cx - R.padW, R.cx + R.padW, 1.1, R.padY + 2.2, R.padY - 3.2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill(ellipse([R.cx - R.padW + 3.5, R.padY + 1], 2.6, 0.7, -0.15));
  }
  drawHead(pen, ctx, L, R);
  // braços levantados (passe, recepção, mergulho) por cima de tudo
  if (R.upL) drawArm(pen, ctx, L, R.shL, R.elL, R.hdL, casual);
  if (R.upR) drawArm(pen, ctx, L, R.shR, R.elR, R.hdR, casual);
  if (R.ball && !ballUnder) {
    drawBall(pen, ctx, R.ball);
    // mão segurando a bola
    if (R.upR || R.upL) {
      const hd = R.upR ? R.hdR : R.hdL;
      pen.group([[ellipse(hd, 1.7, 1.6), L.glove]]);
    }
  }
}

/** Esqueleto em pé (de costas ou de frente) com passada, agachamento e braços. */
function standing(L: Look, o: { liftL?: number; liftR?: number; swing?: number; drop?: number; spread?: number; arms?: 'down' | 'catch' | 'throw' | 'knees'; ball?: 'none' | 'hand' | 'chest' }): Rig {
  const lL = o.liftL ?? 0, lR = o.liftR ?? 0, sw = o.swing ?? 0, d = o.drop ?? 0, sp = o.spread ?? 0;
  const arms = o.arms ?? 'down';
  const hipY = 16 - d;
  const R: Rig = {
    view: L.front ? 'front' : 'back',
    hipL: [11.2 - sp * 0.4, hipY], hipR: [16.8 + sp * 0.4, hipY],
    kneeL: [10.6 - sp * 1.3 - (d ? 0.6 : 0), 9.4 + lL * 0.75 - d * 0.5],
    kneeR: [17.4 + sp * 1.3 + (d ? 0.6 : 0), 9.4 + lR * 0.75 - d * 0.5],
    ankL: [10.4 - sp, 3 + lL * 1.1], ankR: [17.6 + sp, 3 + lR * 1.1],
    soleL: lL >= 3, soleR: lR >= 3,
    cx: 14, waist: 17 - d, chest: 26.5 - d, wWaist: 13, wChest: 17,
    padY: 29.5 - d, padW: 11.4,
    shL: [4.6, 28 - d], shR: [23.4, 28 - d],
    elL: [3.2, 21.6 - d + sw], elR: [24.8, 21.6 - d - sw],
    hdL: [3.6, 15.6 - d + sw * 1.5], hdR: [24.4, 15.6 - d - sw * 1.5],
    head: [14, 37 - d], headR: 6.9, headRy: 6.3,
    numSize: 6.2,
  };
  if (L.casual) {
    R.padY = 28.5 - d;
    R.padW = 9;
    R.wChest = 16;
    R.shL = [5.5, 27 - d];
    R.shR = [22.5, 27 - d];
    R.head = [14, 36.5 - d];
  }
  if (arms === 'knees') {
    R.elL = [2.6, 20.5 - d];
    R.hdL = [7.2, 13.5 - d];
    R.elR = [25.4, 20.5 - d];
    R.hdR = [20.8, 13.5 - d];
  }
  if (arms === 'catch') {
    R.upL = R.upR = true;
    R.elL = [2.4, 35];
    R.hdL = [4, 41.5];
    R.elR = [25.6, 35];
    R.hdR = [24, 41.5];
  }
  if (arms === 'throw') {
    R.upR = true;
    R.elR = [26, 35.5];
    R.hdR = [24.2, 42.5];
  }
  if (o.ball === 'hand') R.ball = { at: [24.2, 45.2], rx: 3.6, ry: 2.2, rot: -0.5 };
  if (o.ball === 'chest') {
    // bola presa sob o braço direito; o antebraço passa por cima
    R.elR = [26.2, 23 - d];
    R.hdR = [22.6, 19.6 - d];
    R.ball = { at: [25.2, 20.6 - d], rx: 2.5, ry: 3.9, rot: 0.3, under: 'R' };
    if (L.front) R.ball = { at: [22.2, 21.6 - d], rx: 3.4, ry: 2.3, rot: 0.3, under: 'R' };
  }
  return R;
}

function rigFor(L: Look, pose: Pose): Rig {
  switch (pose) {
    case 'run1': return standing(L, { liftL: 4, swing: 3, drop: 1, spread: 0 });
    case 'run3': return standing(L, { liftL: 1, liftR: 2 });
    case 'run2': return standing(L, { liftR: 4, swing: -3, drop: 1 });
    case 'run4': return standing(L, { liftL: 2, liftR: 1 });
    case 'throw': return standing(L, { spread: 1, arms: 'throw', ball: 'hand' });
    case 'catch': return standing(L, { arms: 'catch' });
    case 'carry': return standing(L, { ball: 'chest' });
    case 'carry1': return standing(L, { liftL: 4, swing: 2, drop: 1, ball: 'chest' });
    case 'carry2': return standing(L, { liftR: 4, swing: -2, drop: 1, ball: 'chest' });
    case 'ready': return standing(L, { drop: 3, spread: 2, arms: 'knees' });
    case 'carrySide':
      return {
        view: 'side',
        hipL: [13, 16], kneeL: [10.8, 9.6], ankL: [7.6, 3.6], soleL: true,
        hipR: [15.2, 16], kneeR: [18.6, 10.4], ankR: [19.8, 3.2],
        cx: 14.2, waist: 17, chest: 26.5, wWaist: 10.5, wChest: 12,
        padY: 29.5, padW: 7.6,
        shL: [11.5, 27.5], elL: [10, 21.5], hdL: [11.8, 16.5],
        shR: [15.8, 27.5], elR: [14.2, 21.2], hdR: [19.2, 21.6],
        head: [15, 37], headR: 6.6, headRy: 6.2,
        ball: { at: [19.6, 22.2], rx: 3.6, ry: 2.3, rot: 0.15, under: 'R' },
        numSize: 0,
      };
    case 'diveUp':
      return {
        view: L.front ? 'front' : 'back',
        hipL: [11, 13], kneeL: [7.4, 8.4], ankL: [9.2, 2.4],
        hipR: [17, 13], kneeR: [20.8, 9.2], ankR: [19, 4.4], soleR: true,
        cx: 14, waist: 14, chest: 22.5, wWaist: 14, wChest: 19,
        padY: 25.5, padW: 12.2,
        shL: [4, 24.5], elL: [3.6, 32], hdL: [10, 38.6], upL: true,
        shR: [24, 24.5], elR: [24.4, 32], hdR: [18, 38.6], upR: true,
        head: [14, 31], headR: 6.8, headRy: 5.9,
        ball: { at: [14, 40.4], rx: 3.8, ry: 2.4, rot: 0 },
        numSize: 6,
      };
    case 'dive':
      return {
        view: L.front ? 'front' : 'back',
        hipL: [11, 14], kneeL: [9.6, 10.4], ankL: [8, 6.2], soleL: true,
        hipR: [17, 14], kneeR: [18.8, 11], ankR: [20.2, 7.8], soleR: true,
        cx: 14, waist: 14.5, chest: 21, wWaist: 13.5, wChest: 19,
        padY: 23.5, padW: 12.2,
        shL: [4, 23], elL: [4.2, 30.5], hdL: [10.2, 37], upL: true,
        shR: [24, 23], elR: [23.8, 30.5], hdR: [17.8, 37], upR: true,
        head: [14, 28.6], headR: 6.4, headRy: 5.2,
        ball: { at: [14, 38.6], rx: 3.8, ry: 2.4, rot: 0 },
        numSize: 5,
      };
    case 'diveFlat':
      return {
        view: L.front ? 'front' : 'back',
        hipL: [11.2, 6.5], kneeL: [10.2, 4.2], ankL: [9.2, 2], soleL: true,
        hipR: [16.8, 6.5], kneeR: [17.8, 4.2], ankR: [18.8, 2], soleR: true,
        cx: 14, waist: 7, chest: 11.5, wWaist: 14, wChest: 20,
        padY: 13, padW: 12,
        shL: [4.5, 13], elL: [5, 17], hdL: [11, 20.5], upL: true,
        shR: [23.5, 13], elR: [23, 17], hdR: [17, 20.5], upR: true,
        head: [14, 16.4], headR: 6, headRy: 3.8,
        ball: { at: [14, 21.6], rx: 3.6, ry: 2.1, rot: 0 },
        numSize: 3.8,
        grass: true,
      };
    case 'stance':
      if (!L.casual)
        return {
          view: L.front ? 'front' : 'back',
          hipL: [10, 11], kneeL: [5, 8.4], ankL: [6.4, 2.6],
          hipR: [18, 11], kneeR: [23, 8.4], ankR: [21.6, 2.6],
          cx: 14, waist: 11.5, chest: 19, wWaist: 15, wChest: 20,
          padY: 21.5, padW: 12.4,
          shL: [3.8, 20.5], elL: [2.4, 14.2], hdL: [5.6, 9.6],
          shR: [24.2, 20.5], elR: [25.2, 11.5], hdR: [24.4, 2.2],
          head: [14, 27.2], headR: 6.9, headRy: 6,
          numSize: 5.2,
        };
      return standing(L, { drop: 3, spread: 2, arms: 'knees' });
    case 'idle':
    default:
      return standing(L, {});
  }
}

/** Desenha o jogador no canvas (escala: 1 unidade do design = PX pixels). */
function drawPlayer(ctx: CanvasRenderingContext2D, L: Look, pose: Pose) {
  // Meio giro: o mesmo jogador visto do outro lado (de frente se é do ataque)
  if (pose === 'carryTurn') {
    L = { ...L, front: !L.front };
    pose = 'carry';
  }
  ctx.save();
  ctx.scale(PX, PX);
  drawRig(ctx, L, rigFor(L, pose));
  ctx.restore();
}

export function playerTextureKey(side: Side, num: number) {
  return `pl_${side}_${num}`;
}

/** Gera (uma vez) a textura de um jogador. */
export function makePlayerTexture(scene: Phaser.Scene, side: Side, num: number, skinIndex: number, front = false) {
  const off = side === 'off';
  // O ataque é desenhado de costas (a câmera fica atrás dele); `front` gera a versão de frente
  // (comemoração do título). A defesa já é de frente.
  const asFront = !off || front;
  const key = playerTextureKey(side, num) + (off && front ? '_f' : '');
  if (scene.textures.exists(key)) return key;
  const team = off ? TEAMS.home : TEAMS.away;
  return makeLookTexture(scene, key, {
    front: asFront,
    helmet: team.uniform.helmet,
    jersey: team.uniform.jersey,
    pants: team.uniform.pants,
    trim: team.uniform.trim,
    sock: team.uniform.sock,
    skin: SKINS[skinIndex % SKINS.length],
    glove: off ? '#F4F1E8' : '#1A1A1A',
    num: String(num),
    numColor: team.uniform.num,
  });
}

/** Textura de jogador com visual livre (carreira): o mesmo desenho e as mesmas poses da partida. */
export function makeLookTexture(scene: Phaser.Scene, key: string, look: Look) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, (FRAME_W + GAP) * POSES.length, FRAME_H + GAP)!;
  const ctx = tex.getContext();
  POSES.forEach((pose, i) => {
    const fx = i * (FRAME_W + GAP);
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, 0, FRAME_W, FRAME_H); // nada passa da caixa da pose
    ctx.clip();
    ctx.translate(fx + MARGIN, MARGIN); // margem para o contorno
    drawPlayer(ctx, look, pose);
    ctx.restore();
    tex.add(pose, 0, fx, 0, FRAME_W, FRAME_H);
  });
  tex.refresh();
  return key;
}

/** Escala do sprite do jogador relativa às pessoas das laterais (design: 0,76 vs 0,72). */
export const PLAYER_SCALE = 0.76 / PX / SPRITE_SCALE;

export class Player {
  x: number;
  y: number;
  readonly attrs: Attributes;
  readonly bb: Billboard;
  /** Velocidade atual (jardas/s). */
  vx = 0;
  vy = 0;
  /** Estado da máquina de estados (cada sistema usa os seus: 'route', 'block', 'rush', 'cover', 'carry', 'down'...). */
  state = 'idle';
  /** Pose fixa (passe, recepção...); null = automática (parado/correndo). */
  pose: Pose | null = null;
  /** Rotação do sprite em graus (queda, tackle). */
  angle = 0;
  /** Escala extra do sprite: largura (negativa = espelhado; giro do spin) e altura (achatado no mergulho). */
  sx = 1;
  sy = 1;
  /** Altura do corpo acima do chão (pulo, mergulho), em jardas. */
  hop = 0;
  /** Tempo até poder agir de novo (ex.: atraso de reação, caído). */
  wait = 0;
  private animT = 0;
  /** Inclinação suavizada (evita tremida ao mudar de direção). */
  private tiltS = 0;
  /** Fase da respiração (cada jogador num tempo diferente). */
  private breath = 0;
  /** Antes do snap: a linha fica em 3 apoios e os outros agachados, prontos. */
  static preSnap = false;

  constructor(
    layer: BillboardLayer,
    scene: Phaser.Scene,
    readonly side: Side,
    readonly slot: Slot,
    los: number,
    skinIndex: number,
  ) {
    this.x = slot.x;
    this.y = los + slot.d;
    // Notas do time: ataque (ou defesa) acima/abaixo de 75 mexem nos atributos dos jogadores
    const rt = (side === 'off' ? TEAMS.home : TEAMS.away).rating;
    const q = (side === 'off' ? rt.atk : rt.def) - 75;
    const b = BASE[slot.role];
    const sc = (v: number, k: number) => Math.max(5, Math.min(99, Math.round(v * (1 + q * k))));
    this.attrs = { speed: sc(b.speed, 0.0022), strength: sc(b.strength, 0.004), hands: sc(b.hands, 0.004), coverage: sc(b.coverage, 0.004), tackle: sc(b.tackle, 0.004) };
    const key = makePlayerTexture(scene, side, slot.num, skinIndex);
    this.texKey = key;
    this.skinIndex = skinIndex;
    this.bb = layer.add(key, this.x, this.y, { scale: PLAYER_SCALE, shadow: 2.2 });
    this.bb.img.setFrame('idle');
    this.breath = (slot.num * 1.37) % (Math.PI * 2);
  }

  private texKey: string;
  private skinIndex: number;

  /** Vira o jogador de frente para a câmera (true) ou volta ao desenho normal (false). */
  faceFront(scene: Phaser.Scene, front: boolean) {
    const key = front ? makePlayerTexture(scene, this.side, this.slot.num, this.skinIndex, true) : this.texKey;
    if (this.bb.img.texture.key !== key) this.bb.img.setTexture(key);
  }

  /** Velocidade máxima (jardas/s) a partir do atributo. */
  get maxSpeed() {
    return (3.2 + this.attrs.speed * 0.058) * (this.side === 'def' ? difficulty.d.defSpeed : 1);
  }

  get role() {
    return this.slot.role;
  }
  get key(): RecvKey | undefined {
    return this.slot.key;
  }

  /** Pose parada antes do snap (linha em 3 apoios; recebedores e defesa agachados). */
  private setPose(): Pose {
    const r = this.role;
    if (r === 'C' || r === 'G' || r === 'T' || r === 'DL') return 'stance';
    if (r === 'QB') return 'idle';
    return 'ready';
  }

  /** Copia posição, pose e rotação para o billboard (chamar uma vez por frame). */
  sync(dt = 0) {
    this.bb.x = this.x;
    this.bb.y = this.y;
    this.bb.h = this.hop;
    this.bb.sx = this.sx;
    this.bb.sy = this.sy;
    const sp = Math.hypot(this.vx, this.vy);
    const moving = sp > 0.6;
    let frame: Pose = this.pose ?? 'idle';
    if (!this.pose && moving) {
      // corrida em 4 quadros (dois passos por ciclo); o ritmo acompanha a velocidade
      this.animT += dt * (2 + sp * 0.9);
      frame = RUN_CYCLE[Math.floor(this.animT * 2) % 4];
    } else if (this.pose === 'carry' && moving) {
      this.animT += dt * (2 + sp * 0.9);
      frame = CARRY_CYCLE[Math.floor(this.animT * 2) % 4];
    } else if (!this.pose && Player.preSnap && this.state === 'idle') {
      frame = this.setPose();
    }
    if (this.bb.img.frame.name !== frame) this.bb.img.setFrame(frame);
    // Peso do corpo: correndo, balança de um lado para o outro a cada passada, quica um pouco
    // e inclina para dentro nas curvas (corte para o lado); a inclinação é suavizada
    let tilt = 0;
    if (moving && (!this.pose || this.pose === 'carry') && this.angle === 0) {
      const k = Math.min(1, sp / 6);
      tilt = Math.sin(this.animT * Math.PI) * 2.5 * k + Math.max(-9, Math.min(9, this.vx * 1.4));
      this.bb.h = Math.max(this.bb.h, this.hop + Math.abs(Math.sin(this.animT * Math.PI)) * 0.1 * k);
    }
    this.tiltS += (tilt - this.tiltS) * Math.min(1, dt * 14);
    if (dt === 0) this.tiltS = tilt;
    this.bb.img.setAngle(this.angle + (this.angle === 0 ? this.tiltS : 0));
    // Parado: respira (o peito sobe e desce de leve)
    if (!moving && !this.pose && this.angle === 0 && this.hop === 0) {
      this.breath += dt * 2.6;
      this.bb.sy = this.sy * (1 + Math.sin(this.breath) * 0.018);
    }
  }
}

const RUN_CYCLE: Pose[] = ['run1', 'run3', 'run2', 'run4'];
const CARRY_CYCLE: Pose[] = ['carry1', 'carry', 'carry2', 'carry'];
