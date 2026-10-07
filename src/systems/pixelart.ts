import Phaser from 'phaser';
import { TEX_PX } from '../config';

/**
 * Cria uma textura de pixel art a partir de uma grade de caracteres.
 * Cada caractere é uma cor da paleta ('.' = transparente). Desenhada em `px`x (2x por padrão)
 * para manter a nitidez quando reduzida na perspectiva.
 */
export function makePixelTexture(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  palette: Record<string, string>,
  px = TEX_PX,
) {
  if (scene.textures.exists(key)) return;
  const w = Math.max(...rows.map((r) => r.length));
  const tex = scene.textures.createCanvas(key, w * px, rows.length * px)!;
  const ctx = tex.getContext();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * px, y * px, px, px);
    }
  });
  tex.refresh();
}

/** Clareia (f > 0) ou escurece (f < 0) uma cor numérica. Retorna '#rrggbb'. */
export function shade(color: number, f: number): string {
  const ch = (v: number) => Math.round(Phaser.Math.Clamp(f >= 0 ? v + (255 - v) * f : v * (1 + f), 0, 255));
  const r = ch((color >> 16) & 255);
  const g = ch((color >> 8) & 255);
  const b = ch(color & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function shadeNum(color: number, f: number): number {
  return parseInt(shade(color, f).slice(1), 16);
}

export function hex(color: number) {
  return '#' + color.toString(16).padStart(6, '0');
}
