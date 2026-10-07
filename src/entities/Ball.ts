import Phaser from 'phaser';
import { arcAt, type Throw } from '../systems/passing';
import type { Projection, ScreenPoint } from '../systems/projection';
import type { Player } from './Player';

/*
 * A bola: na mão de alguém, em voo (seguindo o arco do passe) ou solta no chão.
 * Desenhada em pixel art com sombra no chão e um rastro curto quando voa.
 */

const p: ScreenPoint = { x: 0, y: 0, s: 0 };
const g0: ScreenPoint = { x: 0, y: 0, s: 0 };

export class Ball {
  state: 'held' | 'air' | 'loose' = 'held';
  holder: Player | null = null;
  throw: Throw | null = null;
  /** Progresso do voo (0–1). */
  u = 0;
  x = 0;
  y = 0;
  h = 0;
  private img: Phaser.GameObjects.Image;
  private trail: { x: number; y: number }[] = [];
  private spin = 0;

  constructor(scene: Phaser.Scene, private proj: Projection, private ground: Phaser.GameObjects.Graphics, private fxTop: Phaser.GameObjects.Graphics) {
    if (!scene.textures.exists('ball')) {
      const t = scene.textures.createCanvas('ball', 60, 36)!;
      const c = t.getContext();
      c.scale(3, 3);
      c.fillStyle = '#0d0d12';
      c.fillRect(2, 0, 16, 12);
      c.fillRect(0, 2, 20, 8);
      c.fillStyle = '#8a4b1f';
      c.fillRect(2, 2, 16, 8);
      c.fillStyle = '#a8612b';
      c.fillRect(4, 2, 10, 3);
      c.fillStyle = '#ffffff';
      c.fillRect(7, 5, 6, 2);
      t.refresh();
    }
    this.img = scene.add.image(0, 0, 'ball').setDepth(36).setVisible(false);
  }

  give(pl: Player) {
    this.state = 'held';
    this.holder = pl;
    this.throw = null;
    this.trail = [];
  }

  launch(t: Throw) {
    this.state = 'air';
    this.holder = null;
    this.throw = t;
    this.u = 0;
    this.trail = [];
  }

  /** Avança o voo; devolve true quando chega no ponto de queda. */
  update(dt: number) {
    if (this.state === 'air' && this.throw) {
      this.u = Math.min(1, this.u + dt / this.throw.T);
      [this.x, this.y, this.h] = arcAt(this.throw, this.u);
      this.spin += dt * 20;
      return this.u >= 1;
    }
    if (this.state === 'held' && this.holder) {
      this.x = this.holder.x;
      this.y = this.holder.y;
      this.h = 1.2;
    }
    return false;
  }

  draw() {
    const show = this.state !== 'held';
    this.img.setVisible(show);
    if (!show) return;
    const pr = this.proj;
    pr.project(this.x, this.y, this.h, p);
    pr.project(this.x, this.y, 0, g0);
    // Sombra no chão
    const u = g0.s * 10;
    this.ground.fillStyle(0x000000, 0.35);
    this.ground.fillEllipse(g0.x, g0.y, u * 0.9, u * 0.35);
    // Rastro curto
    this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > 7) this.trail.shift();
    this.trail.forEach((t, i) => {
      const k = (i + 1) / this.trail.length;
      this.fxTop.fillStyle(0xffffff, 0.35 * k);
      this.fxTop.fillCircle(t.x, t.y, 1 + k * 2.5 * p.s);
    });
    this.img
      .setPosition(p.x, p.y)
      .setScale(Math.max(0.35, p.s * 0.9) / 3)
      .setAngle(Math.sin(this.spin) * 25 - 20);
  }

  hide() {
    this.img.setVisible(false);
  }
}
