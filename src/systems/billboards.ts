import Phaser from 'phaser';
import { SPRITE_SCALE } from '../config';
import type { ShadowLight } from './daytime';
import type { Projection } from './projection';

/** Objeto em pé no mundo, desenhado como sprite virado para a câmera. */
export interface Billboard {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  h: number;
  scale: number;
  shadow: number; // largura da sombra em jardas (0 = sem sombra)
  /** Escala extra (largura/altura) para giros e mergulhos; padrão 1. */
  sx?: number;
  sy?: number;
}

const p = { x: 0, y: 0, s: 0 };
const q = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, s: 0 }));

/**
 * Camada de billboards: projeta, escala pela perspectiva e ordena por profundidade
 * (os mais distantes são desenhados primeiro). Sombras ovais vão num Graphics no chão.
 */
export class BillboardLayer {
  readonly items: Billboard[] = [];
  private shadows: Phaser.GameObjects.Graphics;
  /** Luzes que projetam as sombras (noite/tarde); sem elas, cada um tem só uma oval ao lado. */
  private lights: ShadowLight[] | null = null;

  constructor(private scene: Phaser.Scene, shadowDepth: number) {
    this.shadows = scene.add.graphics().setDepth(shadowDepth);
  }

  setLights(lights: ShadowLight[] | null) {
    this.lights = lights;
  }

  add(key: string, x: number, y: number, opts: { flip?: boolean; scale?: number; shadow?: number; h?: number } = {}) {
    const img = this.scene.add.image(0, 0, key).setOrigin(0.5, 1).setFlipX(!!opts.flip);
    const b: Billboard = { img, x, y, h: opts.h ?? 0, scale: opts.scale ?? 1, shadow: opts.shadow ?? 1.4 };
    this.items.push(b);
    return b;
  }

  update(proj: Projection) {
    const g = this.shadows;
    g.clear();
    const near = proj.nearY + 1.5;
    for (const b of this.items) {
      if (b.y < near) {
        b.img.setVisible(false);
        continue;
      }
      proj.project(b.x, b.y, b.h, p);
      if (p.x < -60 || p.x > proj.w + 60 || p.y < -20) {
        b.img.setVisible(false);
        continue;
      }
      const sc = p.s * SPRITE_SCALE * b.scale;
      // Profundidade: quanto menor o y (mais perto), mais na frente
      b.img
        .setVisible(true)
        .setPosition(p.x, p.y)
        .setScale(sc * (b.sx ?? 1), sc * (b.sy ?? 1))
        .setDepth(10 + (1000 - b.y) / 1000);
      if (b.shadow > 0) {
        const u = p.s * 10;
        if (!this.lights) {
          g.fillStyle(0x000000, 0.3);
          g.fillEllipse(p.x + u * 0.3, p.y, u * b.shadow, u * b.shadow * 0.32);
        } else {
          // Sombra de contato sob os pés + uma sombra comprida para longe de cada luz
          g.fillStyle(0x000000, 0.34);
          g.fillEllipse(p.x, p.y, u * b.shadow * 0.55, u * b.shadow * 0.2);
          this.castShadows(g, proj, b, near);
        }
      }
    }
  }

  /** Uma sombra afunilada no chão para cada luz, apontando para longe dela (mais curta perto da torre). */
  private castShadows(g: Phaser.GameObjects.Graphics, proj: Projection, b: Billboard, near: number) {
    const k = b.shadow / 2.2;
    for (const l of this.lights!) {
      let dx = b.x - l.x;
      let dy = b.y - l.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      const len = l.len * k * Math.min(1, d / 35);
      const w0 = b.shadow * 0.2;
      const w1 = w0 * 0.35;
      const px = -dy;
      const py = dx;
      const tx = b.x + dx * len;
      const ty = b.y + dy * len;
      const pts: [number, number][] = [
        [b.x - px * w0, b.y - py * w0],
        [b.x + px * w0, b.y + py * w0],
        [tx + px * w1, ty + py * w1],
        [tx - px * w1, ty - py * w1],
      ];
      pts.forEach(([x, y], i) => proj.project(x, Math.max(y, near), 0, q[i]));
      g.fillStyle(0x000000, l.a);
      g.fillTriangle(q[0].x, q[0].y, q[1].x, q[1].y, q[2].x, q[2].y);
      g.fillTriangle(q[0].x, q[0].y, q[2].x, q[2].y, q[3].x, q[3].y);
    }
  }
}
