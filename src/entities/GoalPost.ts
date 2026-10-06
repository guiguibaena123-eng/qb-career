import Phaser from 'phaser';
import { COLORS, FIELD } from '../config';
import type { Projection } from '../systems/projection';

/** Medidas da trave em jardas. */
const CROSSBAR_H = 3.3;
const CROSSBAR_W = 6.2;
const UPRIGHT_H = 6;

const p = { x: 0, y: 0, s: 0 };

/** Desenha a trave amarela (billboard) centralizada na linha de fundo `y`. */
export function drawGoalPost(g: Phaser.GameObjects.Graphics, proj: Projection, y: number) {
  if (y < proj.nearY) return;
  const cx = FIELD.width / 2;
  const base = proj.project(cx, y, 0, { x: 0, y: 0, s: 0 });
  const unit = base.s * 6.75; // px por jarda nesta profundidade

  // Sombra oval no chão
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(base.x + unit * 1.2, base.y, unit * 3.2, unit * 0.9);

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
export function drawPylon(g: Phaser.GameObjects.Graphics, proj: Projection, x: number, y: number) {
  if (y < proj.nearY) return;
  const b = proj.project(x, y, 0, p);
  const unit = b.s * 6.75;
  const w = Math.max(2, unit * 0.5);
  const h = Math.max(3, unit * 1.0);
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(b.x + w * 0.3, b.y, w * 1.6, w * 0.5);
  g.fillStyle(COLORS.pylon, 1);
  g.fillRect(b.x - w / 2, b.y - h, w, h);
  g.fillStyle(0xffb070, 1);
  g.fillRect(b.x - w / 2, b.y - h, w * 0.35, h);
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(b.x - w / 2, b.y - h * 0.62, w, Math.max(1, h * 0.12));
}
