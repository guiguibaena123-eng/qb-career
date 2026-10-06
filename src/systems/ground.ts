import Phaser from 'phaser';
import type { Projection, ScreenPoint } from './projection';

const tmp: ScreenPoint[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, s: 0 }));
/** Arrays pré-alocados por tamanho (evita lixo de memória a cada frame). */
const byLen = Array.from({ length: 9 }, (_, n) => tmp.slice(0, n));

/** Quadrilátero como dois triângulos (bem mais barato que fillPoints, que triangula com earcut). */
export function fillQuad(g: Phaser.GameObjects.Graphics, a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint) {
  g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
  g.fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
}

/**
 * Polígono deitado no chão (pontos em jardas). Pontos atrás da câmera são
 * "puxados" para a linha mais próxima visível (recorte simples).
 */
export function groundPoly(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  pts: readonly (readonly [number, number])[],
  color: number,
  alpha = 1,
  h = 0,
) {
  const near = proj.nearY;
  let maxY = -Infinity;
  for (const p of pts) maxY = Math.max(maxY, p[1]);
  if (maxY < near) return;
  const out = byLen[pts.length];
  pts.forEach((p, i) => proj.project(p[0], Math.max(p[1], near), h, out[i]));
  g.fillStyle(color, alpha);
  if (out.length === 4) fillQuad(g, out[0], out[1], out[2], out[3]);
  else g.fillPoints(out, true);
}

/** Retângulo deitado no chão. */
export function groundQuad(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number,
  alpha = 1,
  h = 0,
) {
  groundPoly(g, proj, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], color, alpha, h);
}

/**
 * Face vertical (parede) entre dois pontos do chão, da altura h0 até h1.
 */
export function wallQuad(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  h0: number,
  h1: number,
  color: number,
  alpha = 1,
) {
  const near = proj.nearY;
  if (ay < near && by < near) return;
  ay = Math.max(ay, near);
  by = Math.max(by, near);
  proj.project(ax, ay, h0, tmp[0]);
  proj.project(bx, by, h0, tmp[1]);
  proj.project(bx, by, h1, tmp[2]);
  proj.project(ax, ay, h1, tmp[3]);
  g.fillStyle(color, alpha);
  fillQuad(g, tmp[0], tmp[1], tmp[2], tmp[3]);
}

/** Caixa 3D alinhada aos eixos (banco, pedestal...). Desenha as faces que a câmera vê. */
export function box(
  g: Phaser.GameObjects.Graphics,
  proj: Projection,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  h0: number,
  h1: number,
  top: number,
  side: number,
  front: number,
) {
  const mid = proj.camX;
  // Face lateral voltada para o centro do campo (a câmera está no meio)
  if (x1 < mid) wallQuad(g, proj, x1, y0, x1, y1, h0, h1, side);
  else if (x0 > mid) wallQuad(g, proj, x0, y0, x0, y1, h0, h1, side);
  groundQuad(g, proj, x0, y0, x1, y1, top, 1, h1);
  // Face voltada para a câmera (y menor)
  wallQuad(g, proj, x0, y0, x1, y0, h0, h1, front);
}
