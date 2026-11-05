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
// (novas poses sempre no fim: o replay guarda o índice)
export const POSES = ['idle', 'run1', 'run2', 'throw', 'catch', 'carry', 'carrySide', 'carryTurn', 'diveUp', 'dive', 'diveFlat', 'run3', 'run4', 'carry1', 'carry2', 'stance', 'ready'] as const;
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

/** Número da camisa com um contorno escuro fino (lê melhor de longe). */
function jerseyNumber(ctx: CanvasRenderingContext2D, L: Look, size: number, cx: number, cyBottom: number) {
  ctx.font = `${size * PX}px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = PX * 0.9;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.strokeText(L.num, cx * PX, (BOX_H - cyBottom) * PX);
  ctx.fillStyle = L.numColor;
  ctx.fillText(L.num, cx * PX, (BOX_H - cyBottom) * PX);
}

/** Capacete (de frente com rosto e grade, ou de costas com a faixa), com a base em `b`. */
function drawHelmet(ctx: CanvasRenderingContext2D, L: Look, x: number, b: number) {
  const r = rect(ctx);
  r(x, b, 14, 12, L.helmet);
  ctx.clearRect((x - 1) * PX, (BOX_H - b - 12 - 1) * PX, 2 * PX, 2 * PX);
  ctx.clearRect((x + 13) * PX, (BOX_H - b - 12 - 1) * PX, 2 * PX, 2 * PX);
  // volume: lado direito na sombra e a borda de baixo mais escura
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect((x + 11) * PX, (BOX_H - b - 12) * PX, 3 * PX, 12 * PX);
  ctx.fillRect(x * PX, (BOX_H - b - 2) * PX, 14 * PX, 2 * PX);
  if (L.front) {
    r(x + 6, b + 6, 2, 6, '#FFFFFF', false);
    r(x + 2, b + 1, 10, 5, L.skin, false);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect((x + 2) * PX, (BOX_H - b - 6) * PX, 10 * PX, 1 * PX); // sombra da aba sobre os olhos
    r(x + 3, b + 4, 2, 1, '#1A1A1A', false); // eye black
    r(x + 9, b + 4, 2, 1, '#1A1A1A', false);
    ctx.fillStyle = '#D7DBE0';
    ctx.fillRect((x + 2) * PX, (BOX_H - b - 5) * PX, 1 * PX, 5 * PX);
    ctx.fillRect((x + 11) * PX, (BOX_H - b - 5) * PX, 1 * PX, 5 * PX);
    ctx.fillRect((x + 2) * PX, (BOX_H - b - 1) * PX, 10 * PX, 1 * PX);
    r(x + 2, b + 2, 10, 1, '#D7DBE0', false);
    r(x + 6, b, 2, 3, '#D7DBE0', false);
  } else {
    r(x + 6, b, 2, 12, '#FFFFFF', false);
    r(x + 1, b, 12, 1, 'rgba(0,0,0,0.35)', false); // protetor de nuca
  }
  r(x + 2, b + 7, 3, 3, 'rgba(255,255,255,0.55)', false); // brilho
  r(x + 3, b + 9, 1, 1, 'rgba(255,255,255,0.8)', false);
}

/** Postura de 3 apoios (linha de scrimmage): agachado, pernas abertas, uma mão no chão. */
function drawStance(ctx: CanvasRenderingContext2D, L: Look) {
  const r = rect(ctx);
  r(3, 0, 6, 3, '#111111', false);
  r(19, 0, 6, 3, '#111111', false);
  r(4, 2, 3, 1, L.trim, false);
  r(20, 2, 3, 1, L.trim, false);
  r(4, 3, 4, 4, L.sock);
  r(20, 3, 4, 4, L.sock);
  // coxas dobradas
  r(4, 7, 20, 7, L.pants);
  r(12, 7, 4, 3, 'rgba(0,0,0,0.35)', false);
  r(4, 7, 2, 7, L.trim, false);
  r(22, 7, 2, 7, L.trim, false);
  r(5, 9, 4, 2, 'rgba(255,255,255,0.18)', false);
  r(19, 9, 4, 2, 'rgba(255,255,255,0.18)', false);
  // braço de apoio até o chão e o outro no joelho
  r(22, 9, 4, 6, L.jersey);
  r(22, 3, 4, 6, L.skin);
  r(21, 0, 5, 3, L.glove);
  r(1, 10, 4, 5, L.jersey);
  r(1, 7, 4, 3, L.glove);
  // tronco inclinado para a frente (mais curto e largo) e ombreiras
  r(4, 13, 20, 8, L.jersey);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(20 * PX, (BOX_H - 21) * PX, 4 * PX, 8 * PX);
  if (!L.front) jerseyNumber(ctx, L, 5, 14, 16);
  r(2, 19, 24, 5, L.jersey);
  r(2, 20, 4, 1, L.trim, false);
  r(22, 20, 4, 1, L.trim, false);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(2 * PX, (BOX_H - 24) * PX, 24 * PX, 1 * PX);
  drawHelmet(ctx, L, 7, 21);
}

/** Desenho de cada quadro do corpo (pernas, braços, agachamento). */
interface Frame {
  liftL: number;
  liftR: number;
  swing: number;
  /** Quanto o corpo desce (joelho dobrado). */
  drop: number;
  /** Pés mais abertos. */
  spread: number;
  arms: 'down' | 'catch' | 'throw' | 'knees';
  ball: 'none' | 'hand' | 'chest';
}
const FRAMES: Partial<Record<Pose, Frame>> = {
  idle: { liftL: 0, liftR: 0, swing: 0, drop: 0, spread: 0, arms: 'down', ball: 'none' },
  // corrida em 4 tempos: apoio (joelho dobrado) → passagem → apoio do outro lado → passagem
  run1: { liftL: 4, liftR: 0, swing: 3, drop: 1, spread: 0, arms: 'down', ball: 'none' },
  run3: { liftL: 1, liftR: 2, swing: 0, drop: 0, spread: 0, arms: 'down', ball: 'none' },
  run2: { liftL: 0, liftR: 4, swing: -3, drop: 1, spread: 0, arms: 'down', ball: 'none' },
  run4: { liftL: 2, liftR: 1, swing: 0, drop: 0, spread: 0, arms: 'down', ball: 'none' },
  throw: { liftL: 0, liftR: 0, swing: 0, drop: 0, spread: 1, arms: 'throw', ball: 'hand' },
  catch: { liftL: 0, liftR: 0, swing: 0, drop: 0, spread: 0, arms: 'catch', ball: 'none' },
  carry: { liftL: 0, liftR: 0, swing: 0, drop: 0, spread: 0, arms: 'down', ball: 'chest' },
  carry1: { liftL: 4, liftR: 0, swing: 2, drop: 1, spread: 0, arms: 'down', ball: 'chest' },
  carry2: { liftL: 0, liftR: 4, swing: -2, drop: 1, spread: 0, arms: 'down', ball: 'chest' },
  // pronto para o snap: joelhos dobrados, pés abertos, mãos nas coxas
  ready: { liftL: 0, liftR: 0, swing: 0, drop: 3, spread: 2, arms: 'knees', ball: 'none' },
};

/** Desenha o jogador no canvas (coordenadas "bottom" do design convertidas para "top"). */
function drawPlayer(ctx: CanvasRenderingContext2D, L: Look, pose: Pose) {
  if (pose === 'carrySide') return drawSide(ctx, L);
  if (pose === 'dive') return drawDive(ctx, L);
  if (pose === 'diveUp') return drawDiveUp(ctx, L);
  if (pose === 'diveFlat') return drawDiveFlat(ctx, L);
  if (pose === 'stance' && !L.casual) return drawStance(ctx, L);
  // Meio giro: o mesmo jogador visto do outro lado (de frente se é do ataque)
  if (pose === 'carryTurn') {
    L = { ...L, front: !L.front };
    pose = 'carry';
  }
  const f = FRAMES[pose] ?? FRAMES.idle!;
  const r = rect(ctx);
  const d = f.drop;
  const sp = f.spread;
  // parte de cima do corpo desce junto com o agachamento
  const u = (x: number, b: number, w: number, h: number, c: string, o = true) => r(x, b - d, w, h, c, o);
  const { liftL, liftR } = f;

  // Chuteiras (com o detalhe na cor do time) e meiões com faixa
  r(7 - sp, liftL, 6, 3, '#111111', false);
  r(15 + sp, liftR, 6, 3, '#111111', false);
  r(8 - sp, liftL + 2, 3, 1, L.trim, false);
  r(16 + sp, liftR + 2, 3, 1, L.trim, false);
  if (liftL >= 3) r(7 - sp, liftL, 6, 1, '#4A4A52', false); // sola aparecendo no passo
  if (liftR >= 3) r(15 + sp, liftR, 6, 1, '#4A4A52', false);
  const sockL = Math.max(1, 6 - liftL - d);
  const sockR = Math.max(1, 6 - liftR - d);
  if (L.casual) {
    // Pernas de fora, meia curta branca e bermuda
    r(8 - sp, 3 + liftL, 4, Math.max(2, 9 - liftL - d), L.skin);
    r(16 + sp, 3 + liftR, 4, Math.max(2, 9 - liftR - d), L.skin);
    r(8 - sp, 3 + liftL, 4, 3, '#F4F1E8');
    r(16 + sp, 3 + liftR, 4, 3, '#F4F1E8');
    u(7, 11, 14, 7, L.pants);
    u(13, 11, 2, 4, 'rgba(0,0,0,0.3)', false);
    u(7, 11, 2, 7, L.trim, false);
    u(19, 11, 2, 7, L.trim, false);
  } else {
    r(8 - sp, 3 + liftL, 4, sockL, L.sock);
    r(16 + sp, 3 + liftR, 4, sockR, L.sock);
    if (sockL >= 3) r(8 - sp, 3 + liftL + sockL - 2, 4, 1, L.trim, false);
    if (sockR >= 3) r(16 + sp, 3 + liftR + sockR - 2, 4, 1, L.trim, false);
    // calça: as pernas abrem com os pés; joelheiras com brilho
    u(7 - Math.min(sp, 1), 9, 14 + 2 * Math.min(sp, 1), 9, L.pants);
    u(13, 9, 2, 5, 'rgba(0,0,0,0.35)', false);
    u(7 - Math.min(sp, 1), 9, 2, 9, L.trim, false);
    u(19 + Math.min(sp, 1), 9, 2, 9, L.trim, false);
    u(9, 10, 3, 2, 'rgba(255,255,255,0.2)', false);
    u(16, 10, 3, 2, 'rgba(255,255,255,0.2)', false);
    u(17, 12, 2, 6, 'rgba(0,0,0,0.12)', false);
    u(7, 17, 14, 2, '#1A1A1A', false);
  }
  // Braços: para baixo (balançando), nas coxas (pronto), ou para cima (passe / recepção)
  const upL = f.arms === 'catch';
  const upR = f.arms === 'catch' || f.arms === 'throw';
  ([[0, upL, f.swing], [24, upR, -f.swing]] as [number, boolean, number][]).forEach(([ax, up, sw]) => {
    if (up) return;
    if (f.arms === 'knees') {
      const ix = ax === 0 ? 2 : 22; // mãos puxadas para dentro, apoiadas nas coxas
      u(ax, 23, 4, 5, L.jersey);
      u(ax === 0 ? 1 : 23, 17, 4, 6, L.skin);
      u(ix, 13, 4, 4, L.glove);
      return;
    }
    u(ax, 23 + sw, 4, 5, L.jersey);
    u(ax, 23 + sw, 4, 1, L.trim, false);
    u(ax, 17 + sw, 4, 6, L.skin);
    u(ax, 19 + sw, 4, 1, 'rgba(0,0,0,0.18)', false); // cotovelo
    u(ax, 14 + sw, 4, 3, L.glove);
  });
  // Camisa com número (sombra no lado direito e na barra)
  u(5, 19, 18, 11, L.jersey);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(5 * PX, (BOX_H - 19 - 2 + d) * PX, 18 * PX, 2 * PX);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(20 * PX, (BOX_H - 30 + d) * PX, 3 * PX, 11 * PX);
  jerseyNumber(ctx, L, 6, 14, 22.5 - d);
  if (L.casual) {
    // Camiseta mais estreita, pescoço e cabeça com cabelo (sem capacete)
    u(5, 27, 18, 3, L.jersey);
    u(11, 30, 6, 3, L.skin);
    u(9, 33, 10, 10, L.skin);
    u(9, 37, 10, 7, L.hair ?? '#15110F');
    u(8, 36, 12, 2, L.hair ?? '#15110F', false);
    for (const [ax, up] of [[0, upL], [24, upR]] as [number, boolean][]) {
      if (!up) continue;
      u(ax, 30, 4, 5, L.jersey);
      u(ax, 35, 4, 6, L.skin);
      u(ax, 41, 4, 3, L.glove);
    }
  } else {
    // Ombreiras com a faixa da manga
    u(2, 27, 24, 6, L.jersey);
    u(2, 29, 4, 1, L.trim, false);
    u(22, 29, 4, 1, L.trim, false);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(2 * PX, (BOX_H - 33 + d) * PX, 24 * PX, 2 * PX);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(22 * PX, (BOX_H - 31 + d) * PX, 4 * PX, 4 * PX);
    drawHelmet(ctx, L, 7, 31 - d);
    // Braços levantados por cima de tudo
    for (const [ax, up] of [[0, upL], [24, upR]] as [number, boolean][]) {
      if (!up) continue;
      u(ax, 30, 4, 5, L.jersey);
      u(ax, 30, 4, 1, L.trim, false);
      u(ax, 35, 4, 6, L.skin);
      u(ax, 41, 4, 3, L.glove);
    }
  }
  // Bola: na mão (passe) ou presa junto ao peito (carregando), com a costura
  if (f.ball === 'hand') {
    u(21, 44, 8, 5, '#8A4B1F');
    u(22, 47, 3, 1, 'rgba(255,255,255,0.3)', false);
    u(24, 46, 3, 1, '#FFFFFF', false);
  } else if (f.ball === 'chest') {
    u(18, 19, 8, 5, '#8A4B1F');
    u(19, 22, 3, 1, 'rgba(255,255,255,0.3)', false);
    u(21, 21, 3, 1, '#FFFFFF', false);
    u(17, 19, 4, 3, L.glove, false); // mão segurando a bola
  }
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
