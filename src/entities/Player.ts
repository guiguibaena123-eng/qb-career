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
const PX = TEX_PX; // desenhado em alta resolução
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
export const POSES = ['idle', 'run1', 'run2', 'throw', 'catch', 'carry'] as const;
export type Pose = (typeof POSES)[number];
const MARGIN = PX;
const FRAME_W = BOX_W * PX + 2 * MARGIN;
const FRAME_H = BOX_H * PX + 2 * MARGIN;

interface Look {
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
}

/** Desenha o jogador no canvas (coordenadas "bottom" do design convertidas para "top"). */
function drawPlayer(ctx: CanvasRenderingContext2D, L: Look, pose: Pose) {
  // r(x, bottom, w, h): retângulo com contorno de 1px (como o box-shadow do design)
  const r = (x: number, bottom: number, w: number, h: number, color: string, outline = true) => {
    const y = BOX_H - bottom - h;
    if (outline) {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect((x - 1) * PX, (y - 1) * PX, (w + 2) * PX, (h + 2) * PX);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
  };

  // Chuteiras e meiões (correndo: uma perna levantada de cada vez)
  const liftL = pose === 'run1' ? 3 : 0;
  const liftR = pose === 'run2' ? 3 : 0;
  r(7, liftL, 6, 3, '#111111', false);
  r(15, liftR, 6, 3, '#111111', false);
  r(8, 3 + liftL, 4, 6 - liftL, L.sock);
  r(16, 3 + liftR, 4, 6 - liftR, L.sock);
  r(7, 9, 14, 9, L.pants);
  r(13, 9, 2, 5, 'rgba(0,0,0,0.35)', false);
  r(7, 9, 2, 9, L.trim, false);
  r(19, 9, 2, 9, L.trim, false);
  r(7, 17, 14, 2, '#1A1A1A', false);
  // Braços: para baixo (manga, pele, luva) ou para cima (passe / recepção)
  const upL = pose === 'catch';
  const upR = pose === 'catch' || pose === 'throw';
  const swing = pose === 'run1' ? 2 : pose === 'run2' ? -2 : 0;
  ([[0, upL, swing], [24, upR, -swing]] as [number, boolean, number][]).forEach(([ax, up, sw]) => {
    if (up) return;
    r(ax, 23 + sw, 4, 5, L.jersey);
    r(ax, 17 + sw, 4, 6, L.skin);
    r(ax, 14 + sw, 4, 3, L.glove);
  });
  // Camisa com número
  r(5, 19, 18, 11, L.jersey);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(5 * PX, (BOX_H - 19 - 2) * PX, 18 * PX, 2 * PX);
  ctx.fillStyle = L.numColor;
  ctx.font = `${6 * PX}px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(L.num, 14 * PX, (BOX_H - 19 - 5) * PX);
  // Ombreiras
  r(2, 27, 24, 6, L.jersey);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(2 * PX, (BOX_H - 33) * PX, 24 * PX, 2 * PX);
  // Capacete arredondado (cantos de cima recortados)
  r(7, 31, 14, 12, L.helmet);
  ctx.clearRect(7 * PX - PX, (BOX_H - 43) * PX - PX, 2 * PX, 2 * PX);
  ctx.clearRect(21 * PX - PX, (BOX_H - 43) * PX - PX, 2 * PX, 2 * PX);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(19 * PX, (BOX_H - 43) * PX, 2 * PX, 12 * PX);
  ctx.fillRect(7 * PX, (BOX_H - 33) * PX, 14 * PX, 2 * PX);
  if (L.front) {
    // De frente: faixa curta, rosto, eye black, grade
    r(13, 37, 2, 6, '#FFFFFF', false);
    r(9, 32, 10, 5, L.skin, false);
    r(10, 35, 8, 1, '#1A1A1A', false);
    ctx.fillStyle = '#D7DBE0';
    ctx.fillRect(9 * PX, (BOX_H - 36) * PX, 1 * PX, 5 * PX);
    ctx.fillRect(18 * PX, (BOX_H - 36) * PX, 1 * PX, 5 * PX);
    ctx.fillRect(9 * PX, (BOX_H - 32) * PX, 10 * PX, 1 * PX);
    r(9, 33, 10, 1, '#D7DBE0', false);
  } else {
    // De costas: faixa inteira do capacete
    r(13, 31, 2, 12, '#FFFFFF', false);
  }
  // Brilho no capacete
  r(9, 38, 3, 3, 'rgba(255,255,255,0.55)', false);
  // Braços levantados por cima de tudo
  for (const [ax, up] of [[0, upL], [24, upR]] as [number, boolean][]) {
    if (!up) continue;
    r(ax, 30, 4, 5, L.jersey);
    r(ax, 35, 4, 6, L.skin);
    r(ax, 41, 4, 3, L.glove);
  }
  // Bola: na mão (passe) ou presa junto ao peito (carregando)
  if (pose === 'throw') {
    r(21, 44, 8, 5, '#8A4B1F');
    r(24, 46, 3, 1, '#FFFFFF', false);
  } else if (pose === 'carry') {
    r(18, 19, 8, 5, '#8A4B1F');
    r(21, 21, 3, 1, '#FFFFFF', false);
  }
}

export function playerTextureKey(side: Side, num: number) {
  return `pl_${side}_${num}`;
}

/** Gera (uma vez) a textura de um jogador. */
export function makePlayerTexture(scene: Phaser.Scene, side: Side, num: number, skinIndex: number) {
  const key = playerTextureKey(side, num);
  if (scene.textures.exists(key)) return key;
  const off = side === 'off';
  const team = off ? TEAMS.home : TEAMS.away;
  const tex = scene.textures.createCanvas(key, FRAME_W * POSES.length, FRAME_H)!;
  const ctx = tex.getContext();
  const look: Look = {
    front: !off,
    helmet: team.uniform.helmet,
    jersey: team.uniform.jersey,
    pants: team.uniform.pants,
    trim: team.uniform.trim,
    sock: team.uniform.sock,
    skin: SKINS[skinIndex % SKINS.length],
    glove: off ? '#F4F1E8' : '#1A1A1A',
    num: String(num),
    numColor: team.uniform.num,
  };
  POSES.forEach((pose, i) => {
    ctx.save();
    ctx.translate(i * FRAME_W + MARGIN, MARGIN); // margem para o contorno
    drawPlayer(ctx, look, pose);
    ctx.restore();
    tex.add(pose, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  });
  tex.refresh();
  return key;
}

/** Escala do sprite do jogador relativa às pessoas das laterais (design: 0,76 vs 0,72). */
const PLAYER_SCALE = 0.76 / PX / SPRITE_SCALE;

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
  /** Rotação do sprite em graus (mergulho, queda). */
  angle = 0;
  /** Altura do corpo acima do chão (pulo, mergulho), em jardas. */
  hop = 0;
  /** Tempo até poder agir de novo (ex.: atraso de reação, caído). */
  wait = 0;
  private animT = 0;

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
    this.bb = layer.add(key, this.x, this.y, { scale: PLAYER_SCALE, shadow: 2.2 });
    this.bb.img.setFrame('idle');
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

  /** Copia posição, pose e rotação para o billboard (chamar uma vez por frame). */
  sync(dt = 0) {
    this.bb.x = this.x;
    this.bb.y = this.y;
    this.bb.h = this.hop;
    const moving = Math.hypot(this.vx, this.vy) > 0.6;
    let frame: Pose = this.pose ?? 'idle';
    if (!this.pose && moving) {
      this.animT += dt * (2 + Math.hypot(this.vx, this.vy) * 0.9);
      frame = Math.floor(this.animT) % 2 ? 'run1' : 'run2';
    } else if (this.pose === 'carry' && moving) {
      this.animT += dt * (2 + Math.hypot(this.vx, this.vy) * 0.9);
      // carregando a bola: alterna as pernas mas mantém a bola no peito
      frame = 'carry';
      this.bb.h = this.hop + (Math.floor(this.animT) % 2) * 0.12;
    }
    if (this.bb.img.frame.name !== frame) this.bb.img.setFrame(frame);
    this.bb.img.setAngle(this.angle);
  }
}
