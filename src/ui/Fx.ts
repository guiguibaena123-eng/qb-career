import Phaser from 'phaser';
import { FONT_LABEL, FONT_TITLE } from '../config';
import { UI } from './widgets';

/*
 * Efeitos de interface: narração curta com "pop" (RECEPÇÃO!, SACK!, É BOA!),
 * legendas, brilho/flash nas bordas, selo de câmera lenta, XP subindo e confete de pixels.
 */
export class Fx {
  private edge: Phaser.GameObjects.Graphics;
  private edgeColor = 0xffffff;
  private edgeLife = 0;
  private edgeMax = 1;
  private slowPill: Phaser.GameObjects.Container;
  private confetti: { o: Phaser.GameObjects.Rectangle; vx: number; vy: number; vr: number }[] = [];

  constructor(private scene: Phaser.Scene) {
    this.edge = scene.add.graphics().setDepth(140);
    // Selo "CÂMERA LENTA" com bolinha vermelha pulsando
    const W = scene.scale.width;
    this.slowPill = scene.add.container(W / 2, 128).setDepth(141).setVisible(false);
    const t = scene.add.text(6, 0, 'CÂMERA LENTA', { fontFamily: FONT_LABEL, fontSize: '10px', color: '#FFFFFF' }).setOrigin(0.5);
    const bg = scene.add.graphics();
    bg.fillStyle(UI.dark, 0.8);
    bg.fillRoundedRect(-t.width / 2 - 14, -12, t.width + 30, 24, 10);
    const dot = scene.add.circle(-t.width / 2 - 2, 0, 3, 0xe5484d);
    scene.tweens.add({ targets: dot, alpha: 0.35, yoyo: true, repeat: -1, duration: 400 });
    this.slowPill.add([bg, t, dot]);
  }

  /** Texto grande que entra com pop (escala + rotação de −4°) e some. */
  pop(text: string, color: string, size = 26, y = 190, hold = 900) {
    const t = this.scene.add
      .text(this.scene.scale.width / 2, y, text, {
        fontFamily: FONT_TITLE,
        fontSize: `${size}px`,
        color,
        stroke: '#0D0D12',
        strokeThickness: 7,
        shadow: { offsetX: 5, offsetY: 7, color: '#0D0D12', fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setScale(0.3)
      .setAngle(-10)
      .setAlpha(0);
    this.scene.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.15, angle: -3, alpha: 1, duration: 150, ease: 'Quad.Out' },
        { scale: 1, angle: -4, duration: 100 },
        { alpha: 0, y: y - 16, delay: hold, duration: 220, onComplete: () => t.destroy() },
      ],
    });
    return t;
  }

  /** Legenda pequena numa caixa escura (entra deslizando). */
  caption(text: string, y = 236, hold = 1200, color = '#FFFFFF', bg = UI.dark) {
    const c = this.scene.add.container(this.scene.scale.width / 2, y + 10).setDepth(150).setAlpha(0);
    const t = this.scene.add.text(0, 0, text, { fontFamily: FONT_LABEL, fontSize: '11px', color }).setOrigin(0.5);
    const g = this.scene.add.graphics();
    g.fillStyle(UI.dark, 1);
    g.fillRoundedRect(-t.width / 2 - 12, -14, t.width + 24, 28, 8);
    g.fillStyle(bg, 0.85);
    g.fillRoundedRect(-t.width / 2 - 10, -12, t.width + 20, 24, 8);
    c.add([g, t]);
    this.scene.tweens.chain({
      targets: c,
      tweens: [
        { alpha: 1, y, duration: 220, delay: 120, ease: 'Quad.Out' },
        { alpha: 0, delay: hold, duration: 200, onComplete: () => c.destroy() },
      ],
    });
    return c;
  }

  /** Brilho/flash nas bordas da tela (branco na recepção, vermelho na interceptação). */
  edgeFlash(color: number, sec = 0.5) {
    this.edgeColor = color;
    this.edgeLife = this.edgeMax = sec;
  }

  slowmo(on: boolean) {
    this.slowPill.setVisible(on);
  }

  /** "+25 XP" subindo de um ponto. */
  xp(x: number, y: number, text: string, color = '#FFD23F') {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT_TITLE, fontSize: '10px', color, stroke: '#0D0D12', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(152);
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, ease: 'Quad.Out', onComplete: () => t.destroy() });
  }

  /** Confete de pixels (touchdown). */
  burst(n = 70) {
    const W = this.scene.scale.width;
    const colors = [0xffd23f, 0xf26b1d, 0xffffff, 0x3fd0ff, 0x3ccb5a, 0xff6fb5];
    for (let i = 0; i < n; i++) {
      const o = this.scene.add
        .rectangle(W / 2 + Phaser.Math.Between(-60, 60), 260, Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6), colors[i % colors.length])
        .setDepth(149);
      this.confetti.push({ o, vx: Phaser.Math.FloatBetween(-260, 260), vy: Phaser.Math.FloatBetween(-520, -160), vr: Phaser.Math.FloatBetween(-8, 8) });
    }
  }

  update(dt: number) {
    const g = this.edge;
    g.clear();
    if (this.edgeLife > 0) {
      this.edgeLife -= dt;
      const k = Math.max(0, this.edgeLife / this.edgeMax);
      const W = this.scene.scale.width;
      const H = this.scene.scale.height;
      for (let i = 0; i < 6; i++) {
        const w = 4 + i * 6;
        g.lineStyle(w, this.edgeColor, 0.16 * k * (1 - i / 6));
        g.strokeRect(w / 2, w / 2, W - w, H - w);
      }
    }
    for (const c of this.confetti) {
      c.vy += 900 * dt;
      c.o.x += c.vx * dt;
      c.o.y += c.vy * dt;
      c.o.rotation += c.vr * dt;
    }
    this.confetti = this.confetti.filter((c) => {
      if (c.o.y > this.scene.scale.height + 20) {
        c.o.destroy();
        return false;
      }
      return true;
    });
  }
}
