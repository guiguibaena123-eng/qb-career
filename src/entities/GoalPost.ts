import Phaser from 'phaser';
import { COLORS, FIELD } from '../config';
import type { ShadowLight } from '../systems/daytime';
import type { Projection } from '../systems/projection';
import { shadowStroke } from '../systems/shadows';

/** Medidas da trave em jardas. */
const CROSSBAR_H = 3.3;
const CROSSBAR_W = 6.2;
const UPRIGHT_H = 6;

const p = { x: 0, y: 0, s: 0 };

/** Desenha a trave amarela (billboard) centralizada na linha de fundo `y`. */
export function drawGoalPost(g: Phaser.GameObjects.Graphics, proj: Projection, y: number, lights: ShadowLight[] | null = null) {
  if (y < proj.nearY) return;
  const cx = FIELD.width / 2;
  const base = proj.project(cx, y, 0, { x: 0, y: 0, s: 0 });
  const unit = base.s * 10; // px por jarda nesta profundidade

  if (!lights) {
    // Sombra oval no chão
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(base.x + unit * 1.2, base.y, unit * 3.2, unit * 0.9);
  } else {
    // Uma sombra da trave inteira para longe de cada torre de luz: poste, barra e as duas hastes
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(base.x, base.y, unit * 0.9, unit * 0.3);
    for (const l of lights) {
      let dx = cx - l.x;
      let dy = y - l.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      const f = 0.5 * (l.len / 3.1) * Math.min(1, d / 35); // quanto a sombra anda por jarda de altura
      const a = Math.min(0.4, l.a * 2);
      const bx = cx + dx * CROSSBAR_H * f;
      const by = y + dy * CROSSBAR_H * f;
      const tx = dx * UPRIGHT_H * f;
      const ty = dy * UPRIGHT_H * f;
      shadowStroke(g, proj, cx, y, bx, by, 0.14, 0.11, a);
      shadowStroke(g, proj, bx - CROSSBAR_W / 2, by, bx + CROSSBAR_W / 2, by, 0.1, 0.1, a);
      shadowStroke(g, proj, bx - CROSSBAR_W / 2, by, bx - CROSSBAR_W / 2 + tx, by + ty, 0.1, 0.06, a);
      shadowStroke(g, proj, bx + CROSSBAR_W / 2, by, bx + CROSSBAR_W / 2 + tx, by + ty, 0.1, 0.06, a);
    }
  }

  const bar = proj.project(cx, y, CROSSBAR_H, { x: 0, y: 0, s: 0 }).y;
  const left = proj.project(cx - CROSSBAR_W / 2, y, CROSSBAR_H, { x: 0, y: 0, s: 0 });
  const right = proj.project(cx + CROSSBAR_W / 2, y, CROSSBAR_H, { x: 0, y: 0, s: 0 });
  const top = proj.project(cx, y, CROSSBAR_H + UPRIGHT_H, p).y;

  const thick = Math.max(1.5, 0.32 * unit);
  const outline = thick + Math.max(1, 0.12 * unit);

  // Contorno escuro primeiro, depois o amarelo por cima
  for (const [color, w] of [
    [COLORS.goalPostOutline, outline],
    [COLORS.goalPost, thick],
  ] as const) {
    g.lineStyle(w, color, 1);
    g.lineBetween(base.x, base.y, base.x, bar); // poste
    g.lineBetween(left.x, bar, right.x, bar); // barra horizontal
    g.lineBetween(left.x, bar, left.x, top); // poste esquerdo
    g.lineBetween(right.x, bar, right.x, top); // poste direito
  }
  // Brilho no lado esquerdo do poste
  g.lineStyle(Math.max(1, thick * 0.3), 0xfff3b0, 0.9);
  g.lineBetween(base.x - thick * 0.25, base.y, base.x - thick * 0.25, bar);
}

/** Pylon laranja (cubinho) em pé no canto da end zone. */
export function drawPylon(g: Phaser.GameObjects.Graphics, proj: Projection, x: number, y: number, lights: ShadowLight[] | null = null) {
  if (y < proj.nearY) return;
  const b = proj.project(x, y, 0, p);
  const unit = b.s * 10;
  const w = Math.max(2, unit * 0.5);
  const h = Math.max(3, unit * 1.0);
  if (!lights) {
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(b.x + w * 0.3, b.y, w * 1.6, w * 0.5);
  } else {
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(b.x, b.y, w * 1.1, w * 0.4);
    for (const l of lights) {
      let dx = x - l.x;
      let dy = y - l.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      const len = 1.5 * (l.len / 3.1) * Math.min(1, d / 35);
      shadowStroke(g, proj, x, y, x + dx * len, y + dy * len, 0.25, 0.12, Math.min(0.3, l.a * 1.3));
    }
  }
  g.fillStyle(COLORS.pylon, 1);
  g.fillRect(b.x - w / 2, b.y - h, w, h);
  g.fillStyle(0xffb070, 1);
  g.fillRect(b.x - w / 2, b.y - h, w * 0.35, h);
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(b.x - w / 2, b.y - h * 0.62, w, Math.max(1, h * 0.12));
}
