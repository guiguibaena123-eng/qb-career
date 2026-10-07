import Phaser from 'phaser';
import { fillQuad } from './ground';
import type { Projection, ScreenPoint } from './projection';

/*
 * Desenhos deitados no gramado em perspectiva (rotas, setas, anéis, zonas).
 * Larguras em jardas: tudo afina com a distância, como no design.
 */

const a: ScreenPoint = { x: 0, y: 0, s: 0 };
const b: ScreenPoint = { x: 0, y: 0, s: 0 };
const c: ScreenPoint = { x: 0, y: 0, s: 0 };
const d: ScreenPoint = { x: 0, y: 0, s: 0 };

/** Faixa reta no chão de (x0,y0) a (x1,y1) com largura w. */
export function groundSegment(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  color: number,
  alpha = 1,
) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = (-(y1 - y0) / len) * (w / 2);
  const ny = ((x1 - x0) / len) * (w / 2);
  proj.project(x0 + nx, y0 + ny, 0, a);
  proj.project(x1 + nx, y1 + ny, 0, b);
  proj.project(x1 - nx, y1 - ny, 0, c);
  proj.project(x0 - nx, y0 - ny, 0, d);
  g.fillStyle(color, alpha);
  fillQuad(g, a, b, c, d);
}

/** Linha (contínua ou tracejada) por vários pontos. */
export function groundPath(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  pts: [number, number][],
  w: number,
  color: number,
  alpha = 1,
  dash = 0,
  gap = 0,
) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (!dash) {
      groundSegment(g, proj, x0, y0, x1, y1, w, color, alpha);
      continue;
    }
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    let t = 0;
    while (t < len) {
      const s0 = Math.max(0, t);
      const s1 = Math.min(len, t + dash);
      if (s1 > s0) groundSegment(g, proj, x0 + ux * s0, y0 + uy * s0, x0 + ux * s1, y0 + uy * s1, w, color, alpha);
      t += dash + gap;
    }
  }
}

/** Ponta de seta (triângulo no chão) em (x,y) apontando na direção (dx,dy). */
export function groundArrowHead(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  x: number,
  y: number,
  dx: number,
  dy: number,
  size: number,
  color: number,
  alpha = 1,
) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  proj.project(x + ux * size * 0.6, y + uy * size * 0.6, 0, a);
  proj.project(x - ux * size * 0.4 - uy * size * 0.5, y - uy * size * 0.4 + ux * size * 0.5, 0, b);
  proj.project(x - ux * size * 0.4 + uy * size * 0.5, y - uy * size * 0.4 - ux * size * 0.5, 0, c);
  g.fillStyle(color, alpha);
  g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
}

/** Seta completa (linha + ponta). */
export function groundArrow(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  pts: [number, number][],
  w: number,
  color: number,
  dashed = false,
  alpha = 1,
) {
  const n = pts.length;
  const [ex, ey] = pts[n - 1];
  const [px, py] = pts[n - 2];
  const len = Math.hypot(ex - px, ey - py) || 1;
  const head = w * 4.5;
  // Encurta a linha para a ponta não ficar por cima
  const body = pts.slice(0, -1).concat([[ex - ((ex - px) / len) * head * 0.4, ey - ((ey - py) / len) * head * 0.4]]);
  groundPath(g, proj, body, w, color, alpha, dashed ? 1.1 : 0, dashed ? 0.8 : 0);
  groundArrowHead(g, proj, ex, ey, ex - px, ey - py, head, color, alpha);
}

/** Anel no chão (círculo em perspectiva) — usado no QB e na mira. */
export function groundRing(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  x: number,
  y: number,
  r: number,
  w: number,
  color: number,
  alpha = 1,
  segments = 28,
  dashed = false,
) {
  for (let i = 0; i < segments; i++) {
    if (dashed && i % 2) continue;
    const t0 = (i / segments) * Math.PI * 2;
    const t1 = ((i + 1) / segments) * Math.PI * 2;
    proj.project(x + Math.cos(t0) * (r + w / 2), y + Math.sin(t0) * (r + w / 2), 0, a);
    proj.project(x + Math.cos(t1) * (r + w / 2), y + Math.sin(t1) * (r + w / 2), 0, b);
    proj.project(x + Math.cos(t1) * (r - w / 2), y + Math.sin(t1) * (r - w / 2), 0, c);
    proj.project(x + Math.cos(t0) * (r - w / 2), y + Math.sin(t0) * (r - w / 2), 0, d);
    g.fillStyle(color, alpha);
    fillQuad(g, a, b, c, d);
  }
}

/** Oval preenchido no chão (zona de cobertura), com borda tracejada. */
export function groundOval(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  fillAlpha: number,
  stroke: number,
  strokeAlpha: number,
  strokeW: number,
) {
  const N = 32;
  const pts: ScreenPoint[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    pts.push(proj.project(x + (Math.cos(t) * w) / 2, y + (Math.sin(t) * h) / 2));
  }
  g.fillStyle(fill, fillAlpha);
  g.fillPoints(pts, true);
  for (let i = 0; i < N; i += 2) {
    const t0 = (i / N) * Math.PI * 2;
    const t1 = ((i + 1) / N) * Math.PI * 2;
    groundSegment(
      g,
      proj,
      x + (Math.cos(t0) * w) / 2,
      y + (Math.sin(t0) * h) / 2,
      x + (Math.cos(t1) * w) / 2,
      y + (Math.sin(t1) * h) / 2,
      strokeW,
      stroke,
      strokeAlpha,
    );
  }
}
