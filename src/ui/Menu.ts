import Phaser from 'phaser';
import { FONT_TITLE, TEAMS } from '../config';
import { bottomGradient, GlassButton, label, title, UI } from './widgets';

/*
 * Escolha rápida (4ª descida: TENTAR | PUNT | FIELD GOAL):
 * título torto + selo no topo e uma fileira de botões embaixo.
 */

export interface MenuButton {
  label: string;
  enabled?: boolean;
  primary?: boolean;
  onTap: () => void;
}

export class Menu {
  private root: Phaser.GameObjects.Container | null = null;

  constructor(private scene: Phaser.Scene) {}

  hide() {
    this.root?.destroy();
    this.root = null;
  }

  show(o: { big: string; chip: string; sub: string; buttons: MenuButton[] }) {
    this.hide();
    const sc = this.scene;
    const W = sc.scale.width;
    const H = sc.scale.height;
    const root = (this.root = sc.add.container(0, 0).setDepth(120));
    const big = sc.add
      .text(W / 2, 200, o.big, {
        fontFamily: FONT_TITLE,
        fontSize: '24px',
        color: UI.yellow,
        stroke: '#0D0D12',
        strokeThickness: 7,
        shadow: { offsetX: 5, offsetY: 7, color: '#0D0D12', fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setAngle(-4)
      .setScale(0.4)
      .setAlpha(0);
    sc.tweens.add({ targets: big, scale: 1, alpha: 1, duration: 240, ease: 'Back.Out' });
    const ct = title(sc, W / 2, 252, o.chip, 10, '#0D0D12').setOrigin(0.5);
    const cw = ct.width + 20;
    const cg = sc.add.graphics();
    cg.fillStyle(UI.dark, 1);
    cg.fillRect(W / 2 - cw / 2 - 3, 252 - 17, cw + 6, 34);
    cg.fillStyle(0xffd23f, 1);
    cg.fillRect(W / 2 - cw / 2, 252 - 14, cw, 28);
    root.add([bottomGradient(sc, 260, 120), big, cg, ct]);

    root.add(label(sc, W / 2, H - 132, o.sub, 11, '#E8EAF2').setOrigin(0.5));
    const L = 14;
    const gap = 8;
    const n = o.buttons.length;
    const bw = (W - 2 * L - gap * (n - 1)) / n;
    o.buttons.forEach((b, i) => {
      const x = L + bw / 2 + i * (bw + gap);
      const btn = new GlassButton(sc, x, H - 30 - 30, {
        w: bw,
        h: 60,
        radius: 16,
        ...(b.primary ? { fill: TEAMS.home.color, fillAlpha: 1, borderAlpha: 0.35, primary: true } : {}),
      });
      btn.add(title(sc, 0, 0, b.label.replace(' ', '\n'), 9, b.primary ? TEAMS.home.fg : '#FFFFFF').setOrigin(0.5).setAlign('center').setLineSpacing(6));
      btn.onTap = b.onTap;
      if (b.enabled === false) {
        btn.setEnabled(false);
        btn.setAlpha(0.4);
      }
      root.add(btn);
    });
  }
}
