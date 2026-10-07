import Phaser from 'phaser';
import { TEAMS } from '../config';
import { UI } from './widgets';

/*
 * Joystick virtual (canto inferior esquerdo, como no design): base de vidro com o
 * botão na cor do time. Começa a contar quando o dedo toca na metade esquerda de baixo
 * da tela e o botão segue o dedo dentro do círculo.
 */
export class Joystick extends Phaser.GameObjects.Container {
  /** Direção atual (−1..1). */
  vx = 0;
  vy = 0;
  private knob: Phaser.GameObjects.Graphics;
  private pointerId: number | null = null;
  private readonly R = 64;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const base = scene.add.graphics();
    base.fillStyle(0x000000, 0.28);
    base.fillCircle(0, 4, this.R);
    base.fillStyle(UI.glass, 0.7);
    base.fillCircle(0, 0, this.R);
    base.lineStyle(1, 0xffffff, 0.16);
    base.strokeCircle(0, 0, this.R);
    // Centro tracejado
    for (let i = 0; i < 12; i += 2) {
      base.lineStyle(2, 0xffffff, 0.3);
      base.beginPath();
      base.arc(0, 0, 15, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2);
      base.strokePath();
    }
    this.knob = scene.add.graphics();
    this.drawKnob();
    this.add([base, this.knob]);
    scene.add.existing(this);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.visible || this.pointerId !== null) return;
      // Área do joystick: metade esquerda, parte de baixo
      if (p.x < scene.scale.width * 0.45 && p.y > scene.scale.height - 260) {
        this.pointerId = p.id;
        this.track(p);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.pointerId) this.track(p);
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.pointerId = null;
      this.vx = this.vy = 0;
      this.knob.setPosition(0, 0);
    };
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
  }

  private drawKnob() {
    const g = this.knob;
    g.clear();
    g.fillStyle(TEAMS.home.color, 1);
    g.fillCircle(0, 0, 26);
    g.fillStyle(0xffffff, 0.22);
    g.fillCircle(-6, -8, 10);
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(0, 0, 26);
  }

  private track(p: Phaser.Input.Pointer) {
    let dx = p.x - this.x;
    let dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    const max = this.R - 20;
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    this.knob.setPosition(dx, dy);
    this.vx = dx / max;
    this.vy = dy / max;
  }

  reset() {
    this.pointerId = null;
    this.vx = this.vy = 0;
    this.knob.setPosition(0, 0);
  }
}
