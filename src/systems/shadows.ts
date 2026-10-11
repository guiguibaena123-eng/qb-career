import Phaser from 'phaser';
import type { Projection, ScreenPoint } from './projection';

const q: ScreenPoint[] = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, s: 0 }));

/** Sombra afunilada no chão, de (x0,y0) até (x1,y1) (jardas), com meia-largura w0 no começo e w1 na ponta. */
export function shadowStroke(g: Phaser.GameObjects.Graphics, proj: Projection, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, a: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const px = -dy / d;
  const py = dx / d;
  const near = proj.nearY;
  const pts: [number, number][] = [
    [x0 - px * w0, y0 - py * w0],
    [x0 + px * w0, y0 + py * w0],
    [x1 + px * w1, y1 + py * w1],
    [x1 - px * w1, y1 - py * w1],
  ];
  if (Math.max(y0, y1) < near) return;
  pts.forEach(([x, y], i) => proj.project(x, Math.max(y, near), 0, q[i]));
  g.fillStyle(0x000000, a);
  g.fillTriangle(q[0].x, q[0].y, q[1].x, q[1].y, q[2].x, q[2].y);
  g.fillTriangle(q[0].x, q[0].y, q[2].x, q[2].y, q[3].x, q[3].y);
}
