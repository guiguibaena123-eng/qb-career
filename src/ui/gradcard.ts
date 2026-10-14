import Phaser from 'phaser';
import { RES } from '../config';

/*
 * Cartão em degradê de verdade (canvas 2D, com cache): o fillGradientStyle do Phaser interpola só
 * pelos vértices e, em retângulo arredondado, fica chapado/listrado. Aqui o degradê é diagonal e suave,
 * com um brilho no topo (vidro), vinheta na base e borda fina. Desenhado na resolução do canvas (RES).
 */

export interface GradOpts {
  /** Cor de partida (canto de cima, à esquerda) e de chegada (canto de baixo, à direita). */
  from: number;
  to: number;
  fromAlpha?: number;
  toAlpha?: number;
  /** Cor do meio (opcional): degradê em 3 paradas. */
  mid?: number;
  midAlpha?: number;
  radius?: number;
  /** Borda: cor e opacidade (0 = sem borda). */
  stroke?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  /** Brilho de vidro no topo (0..1). */
  sheen?: number;
  /** Brilho radial (glow) no canto de cima à esquerda, na cor `from`. */
  glow?: boolean;
}

const rgba = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

function path(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Textura do cartão (cache pela combinação de parâmetros). */
export function gradTexture(scene: Phaser.Scene, w: number, h: number, o: GradOpts): string {
  const key = `grad_${Math.round(w)}x${Math.round(h)}_${JSON.stringify(o)}`;
  if (scene.textures.exists(key)) return key;
  const k = RES;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * k);
  cv.height = Math.ceil(h * k);
  const ctx = cv.getContext('2d')!;
  ctx.scale(k, k);
  const r = o.radius ?? 16;
  const sw = o.strokeWidth ?? 1;
  path(ctx, sw / 2, sw / 2, w - sw, h - sw, r);
  ctx.save();
  ctx.clip();
  // Degradê diagonal
  const lg = ctx.createLinearGradient(0, 0, w * 0.85, h * 1.15);
  lg.addColorStop(0, rgba(o.from, o.fromAlpha ?? 1));
  if (o.mid !== undefined) lg.addColorStop(0.5, rgba(o.mid, o.midAlpha ?? 1));
  lg.addColorStop(1, rgba(o.to, o.toAlpha ?? 1));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, w, h);
  // Glow radial no canto
  if (o.glow) {
    const rg = ctx.createRadialGradient(w * 0.12, h * 0.1, 0, w * 0.12, h * 0.1, Math.max(w, h) * 0.75);
    rg.addColorStop(0, rgba(o.from, 0.45));
    rg.addColorStop(1, rgba(o.from, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }
  // Vidro: brilho no topo
  const sh = o.sheen ?? 0.14;
  if (sh > 0) {
    const tg = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    tg.addColorStop(0, `rgba(255,255,255,${sh})`);
    tg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, w, h * 0.55);
  }
  // Vinheta na base
  const bg = ctx.createLinearGradient(0, h * 0.55, 0, h);
  bg.addColorStop(0, 'rgba(10,12,26,0)');
  bg.addColorStop(1, 'rgba(10,12,26,0.28)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.restore();
  if ((o.strokeAlpha ?? 0.2) > 0) {
    path(ctx, sw / 2, sw / 2, w - sw, h - sw, r);
    ctx.lineWidth = sw;
    ctx.strokeStyle = rgba(o.stroke ?? 0xffffff, o.strokeAlpha ?? 0.2);
    ctx.stroke();
  }
  scene.textures.addCanvas(key, cv);
  return key;
}

/** Imagem do cartão com o canto de cima à esquerda em (x, y). */
export function gradCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, o: GradOpts) {
  return scene.add.image(x, y, gradTexture(scene, w, h, o)).setOrigin(0).setDisplaySize(w, h);
}
