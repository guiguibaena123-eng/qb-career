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
export const POSES = ['idle', 'run1', 'run2', 'throw', 'catch', 'carry', 'carrySide', 'carryTurn', 'diveUp', 'dive', 'diveFlat'] as const;
export type Pose = (typeof POSES)[number];
const MARGIN = PX;
const FRAME_W = BOX_W * PX + 2 * MARGIN;
const FRAME_H = BOX_H * PX + 2 * MARGIN;

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

/** r(x, bottom, w, h): retângulo com contorno de 1px (como o box-shadow do design). */
function rect(ctx: CanvasRenderingContext2D) {
  return (x: number, bottom: number, w: number, h: number, color: string, outline = true) => {
    const y = BOX_H - bottom - h;
    if (outline) {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect((x - 1) * PX, (y - 1) * PX, (w + 2) * PX, (h + 2) * PX);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
  };
}

/** De perfil (virado para a direita), com a bola presa no braço: meio do giro do spin. */
function drawSide(ctx: CanvasRenderingContext2D, L: Look) {
  const r = rect(ctx);
  // Pernas em passada (de trás e da frente) e chuteiras
  r(8, 0, 6, 3, '#111111', false);
  r(15, 1, 7, 3, '#111111', false);
  r(9, 3, 4, 6, L.sock);
  r(16, 4, 4, 5, L.sock);
  r(8, 9, 12, 9, L.pants);
  r(13, 9, 2, 9, L.trim, false); // faixa lateral da calça
  r(8, 17, 12, 2, '#1A1A1A', false);
  // Tronco e ombreira vistos de lado (mais estreitos que de costas)
  r(8, 19, 11, 11, L.jersey);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(8 * PX, (BOX_H - 30) * PX, 3 * PX, 11 * PX); // sombra nas costas
  r(7, 27, 14, 6, L.jersey);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(7 * PX, (BOX_H - 33) * PX, 14 * PX, 2 * PX);
  // Capacete de perfil: casco, grade na frente, rosto aparecendo
  r(8, 31, 13, 12, L.helmet);
  ctx.clearRect(8 * PX - PX, (BOX_H - 43) * PX - PX, 2 * PX, 2 * PX);
  ctx.clearRect(21 * PX - PX, (BOX_H - 43) * PX - PX, 2 * PX, 2 * PX);
  r(17, 32, 4, 5, L.skin, false);
  ctx.fillStyle = '#D7DBE0';
  ctx.fillRect(21 * PX, (BOX_H - 38) * PX, 2 * PX, 6 * PX);
  ctx.fillRect(18 * PX, (BOX_H - 35) * PX, 4 * PX, 1 * PX);
  r(9, 41, 11, 1, '#FFFFFF', false); // faixa do capacete por cima
  r(11, 36, 3, 3, 'rgba(0,0,0,0.35)', false); // furo da orelha
  r(10, 38, 3, 2, 'rgba(255,255,255,0.5)', false);
  // Braço do lado de cá segurando a bola no peito
  r(11, 22, 4, 6, L.jersey);
  r(14, 20, 6, 3, L.skin);
  r(17, 19, 8, 5, '#8A4B1F');
  r(20, 21, 3, 1, '#FFFFFF', false);
  r(15, 20, 3, 3, L.glove, false);
}

/** Mergulho para a frente visto de trás: pés perto da câmera, corpo deitado, braços esticados com a bola. */
function drawDive(ctx: CanvasRenderingContext2D, L: Look) {
  const r = rect(ctx);
  // Solas das chuteiras (pernas no ar, abertas)
  r(5, 4, 6, 3, '#111111');
  r(17, 6, 6, 3, '#111111');
  r(6, 7, 4, 4, L.sock);
  r(18, 9, 4, 3, L.sock);
  // Quadril e costas encurtados pela perspectiva
  r(7, 11, 14, 6, L.pants);
  r(7, 11, 2, 6, L.trim, false);
  r(19, 11, 2, 6, L.trim, false);
  r(5, 17, 18, 7, L.jersey);
  ctx.fillStyle = L.numColor;
  ctx.font = `${5 * PX}px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(L.num, 14 * PX, (BOX_H - 17 - 3.5) * PX);
  r(3, 23, 22, 4, L.jersey);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(3 * PX, (BOX_H - 27) * PX, 22 * PX, 1 * PX);
  // Capacete (de costas, um pouco abaixado) e braços esticados à frente com a bola
  r(8, 25, 12, 9, L.helmet);
  r(13, 25, 2, 9, '#FFFFFF', false);
  r(9, 30, 3, 2, 'rgba(255,255,255,0.55)', false);
  r(4, 28, 4, 6, L.jersey);
  r(20, 28, 4, 6, L.jersey);
  r(5, 34, 4, 4, L.skin);
  r(19, 34, 4, 4, L.skin);
  r(9, 36, 10, 6, '#8A4B1F');
  r(13, 38, 3, 1, '#FFFFFF', false);
  r(7, 36, 3, 3, L.glove, false);
  r(18, 36, 3, 3, L.glove, false);
}

/** Impulso do mergulho (de trás): agachado, inclinado para a frente, os dois braços subindo com a bola. */
function drawDiveUp(ctx: CanvasRenderingContext2D, L: Look) {
  const r = rect(ctx);
  // Pernas dobradas: uma empurrando o chão, a outra saindo
  r(6, 0, 6, 3, '#111111', false);
  r(16, 2, 6, 3, '#111111', false);
  r(7, 3, 4, 5, L.sock);
  r(17, 5, 4, 3, L.sock);
  r(6, 8, 16, 8, L.pants);
  r(6, 8, 2, 8, L.trim, false);
  r(20, 8, 2, 8, L.trim, false);
  // Tronco curvado (mais baixo e largo), número
  r(5, 16, 18, 9, L.jersey);
  ctx.fillStyle = L.numColor;
  ctx.font = `${6 * PX}px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(L.num, 14 * PX, (BOX_H - 16 - 4.5) * PX);
  r(2, 23, 24, 5, L.jersey);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(2 * PX, (BOX_H - 28) * PX, 24 * PX, 2 * PX);
  // Capacete baixo (cabeça para a frente)
  r(8, 25, 12, 10, L.helmet);
  r(13, 25, 2, 10, '#FFFFFF', false);
  r(9, 31, 3, 3, 'rgba(255,255,255,0.55)', false);
  // Braços subindo juntos, bola acima da cabeça
  r(3, 27, 4, 7, L.jersey);
  r(21, 27, 4, 7, L.jersey);
  r(5, 34, 4, 5, L.skin);
  r(19, 34, 4, 5, L.skin);
  r(9, 37, 10, 6, '#8A4B1F');
  r(13, 39, 3, 1, '#FFFFFF', false);
  r(7, 37, 3, 3, L.glove, false);
  r(18, 37, 3, 3, L.glove, false);
}

/** Mergulho terminado (de trás): deitado no gramado, bem baixo, braços esticados com a bola à frente. */
function drawDiveFlat(ctx: CanvasRenderingContext2D, L: Look) {
  const r = rect(ctx);
  // Solas das chuteiras quase no chão
  r(6, 0, 6, 3, '#111111');
  r(16, 0, 6, 3, '#111111');
  r(7, 3, 4, 2, L.sock);
  r(17, 3, 4, 2, L.sock);
  // Corpo achatado no chão, visto pela perspectiva
  r(7, 5, 14, 3, L.pants);
  r(5, 8, 18, 4, L.jersey);
  r(3, 11, 22, 3, L.jersey);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(3 * PX, (BOX_H - 14) * PX, 22 * PX, 1 * PX);
  // Capacete encostado no gramado e braços esticados
  r(9, 12, 10, 6, L.helmet);
  r(13, 12, 2, 6, '#FFFFFF', false);
  r(4, 14, 4, 4, L.jersey);
  r(20, 14, 4, 4, L.jersey);
  r(6, 18, 3, 3, L.skin);
  r(19, 18, 3, 3, L.skin);
  r(10, 19, 8, 5, '#8A4B1F');
  r(13, 21, 3, 1, '#FFFFFF', false);
  // Grama levantada nas pontas
  r(2, 0, 2, 2, '#3a8a32', false);
  r(24, 0, 2, 2, '#3a8a32', false);
}

/** Desenha o jogador no canvas (coordenadas "bottom" do design convertidas para "top"). */
function drawPlayer(ctx: CanvasRenderingContext2D, L: Look, pose: Pose) {
  if (pose === 'carrySide') return drawSide(ctx, L);
  if (pose === 'dive') return drawDive(ctx, L);
  if (pose === 'diveUp') return drawDiveUp(ctx, L);
  if (pose === 'diveFlat') return drawDiveFlat(ctx, L);
  // Meio giro: o mesmo jogador visto do outro lado (de frente se é do ataque)
  if (pose === 'carryTurn') {
    L = { ...L, front: !L.front };
    pose = 'carry';
  }
  const r = rect(ctx);

  // Chuteiras e meiões (correndo: uma perna levantada de cada vez)
  const liftL = pose === 'run1' ? 3 : 0;
  const liftR = pose === 'run2' ? 3 : 0;
  r(7, liftL, 6, 3, '#111111', false);
  r(15, liftR, 6, 3, '#111111', false);
  if (L.casual) {
    // Pernas de fora, meia curta branca e bermuda
    r(8, 3 + liftL, 4, 9 - liftL, L.skin);
    r(16, 3 + liftR, 4, 9 - liftR, L.skin);
    r(8, 3 + liftL, 4, 3, '#F4F1E8');
    r(16, 3 + liftR, 4, 3, '#F4F1E8');
    r(7, 11, 14, 7, L.pants);
    r(13, 11, 2, 4, 'rgba(0,0,0,0.3)', false);
    r(7, 11, 2, 7, L.trim, false);
    r(19, 11, 2, 7, L.trim, false);
  } else {
    r(8, 3 + liftL, 4, 6 - liftL, L.sock);
    r(16, 3 + liftR, 4, 6 - liftR, L.sock);
    r(7, 9, 14, 9, L.pants);
    r(13, 9, 2, 5, 'rgba(0,0,0,0.35)', false);
    r(7, 9, 2, 9, L.trim, false);
    r(19, 9, 2, 9, L.trim, false);
    r(7, 17, 14, 2, '#1A1A1A', false);
  }
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
  if (L.casual) {
    // Camiseta mais estreita, pescoço e cabeça com cabelo (sem capacete)
    r(5, 27, 18, 3, L.jersey);
    r(11, 30, 6, 3, L.skin);
    r(9, 33, 10, 10, L.skin);
    r(9, 37, 10, 7, L.hair ?? '#15110F');
    r(8, 36, 12, 2, L.hair ?? '#15110F', false);
    if (pose === 'catch' || pose === 'throw') {
      for (const [ax, up] of [[0, upL], [24, upR]] as [number, boolean][]) {
        if (!up) continue;
        r(ax, 30, 4, 5, L.jersey);
        r(ax, 35, 4, 6, L.skin);
        r(ax, 41, 4, 3, L.glove);
      }
    }
    if (pose === 'throw') {
      r(21, 44, 8, 5, '#8A4B1F');
      r(24, 46, 3, 1, '#FFFFFF', false);
    } else if (pose === 'carry') {
      r(18, 19, 8, 5, '#8A4B1F');
      r(21, 21, 3, 1, '#FFFFFF', false);
    }
    return;
  }
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
  return makeLookTexture(scene, key, {
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
  });
}

/** Textura de jogador com visual livre (carreira): o mesmo desenho e as mesmas poses da partida. */
export function makeLookTexture(scene: Phaser.Scene, key: string, look: Look) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, FRAME_W * POSES.length, FRAME_H)!;
  const ctx = tex.getContext();
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
    this.bb.sx = this.sx;
    this.bb.sy = this.sy;
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
    // Peso do corpo: correndo, balança de um lado para o outro a cada passada, quica um pouco
    // e inclina para dentro nas curvas (corte para o lado)
    let tilt = 0;
    const sp = Math.hypot(this.vx, this.vy);
    if (moving && (!this.pose || this.pose === 'carry') && this.angle === 0) {
      const k = Math.min(1, sp / 6);
      tilt = Math.sin(this.animT * Math.PI) * 3 * k + Math.max(-9, Math.min(9, this.vx * 1.4));
      this.bb.h = Math.max(this.bb.h, this.hop + Math.abs(Math.sin(this.animT * Math.PI)) * 0.1 * k);
    }
    this.bb.img.setAngle(this.angle + tilt);
  }
}
