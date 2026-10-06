import Phaser from 'phaser';
import { SPRITE_SCALE } from '../config';
import type { Projection } from './projection';

/** Objeto em pé no mundo, desenhado como sprite virado para a câmera. */
export interface Billboard {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  h: number;
  scale: number;
  shadow: number; // largura da sombra em jardas (0 = sem sombra)
}

const p = { x: 0, y: 0, s: 0 };

/**
 * Camada de billboards: projeta, escala pela perspectiva e ordena por profundidade
 * (os mais distantes são desenhados primeiro). Sombras ovais vão num Graphics no chão.
 */
export class BillboardLayer {
  readonly items: Billboard[] = [];
  private shadows: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, shadowDepth: number) {
    this.shadows = scene.add.graphics().setDepth(shadowDepth);
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
      b.img.setVisible(true).setPosition(p.x, p.y).setScale(sc).setDepth(10 + (1000 - b.y) / 1000);
      if (b.shadow > 0) {
        const u = p.s * 10;
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(p.x + u * 0.3, p.y, u * b.shadow, u * b.shadow * 0.32);
      }
    }
  }
}
