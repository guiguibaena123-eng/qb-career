import Phaser from 'phaser';
import { GAME_H, GAME_W, TEAMS } from '../config';
import { C, plate, plateShadow, TV, TvButton, tvText } from './tv';
import { bottomGradient } from './widgets';

/*
 * Escolha rápida (4ª descida: TENTAR | PUNT | FIELD GOAL), no pacote da transmissão:
 * selo amarelo + título grande numa tarja, explicação e a fileira de botões embaixo.
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
    const W = GAME_W;
    const H = GAME_H;
    const root = (this.root = sc.add.container(0, 0).setDepth(120));
    root.add(bottomGradient(sc, 300, 120));
    // tarja do título (entra deslizando)
    const ty = H - 236;
    const head = sc.add.container(0, 0);
    const g = sc.add.graphics();
    const big = tvText(sc, 30, ty + 34, o.big, 40, C.white, 800, 1).setOrigin(0, 0.5);
    const tw = Math.min(W - 32, big.width + 50);
    if (big.width > W - 80) big.setScale((W - 80) / big.width, 1);
    plateShadow(g, 16, ty, tw, 68);
    plate(g, 16, ty, tw, 68, TV.ink, 0.96);
    g.fillStyle(TEAMS.home.color, 1);
    g.fillRect(16, ty + 64, tw - 14, 4);
    const ct = tvText(sc, 30, ty - 2, o.chip, 13, C.ink, 800, 1.6).setOrigin(0, 0.5);
    plate(g, 22, ty - 13, ct.width + 26, 22, TV.yellow);
    head.add([g, big, ct]);
    head.setX(-30).setAlpha(0);
    sc.tweens.add({ targets: head, x: 0, alpha: 1, duration: 360, ease: 'Expo.Out' });
    root.add(head);
    root.add(tvText(sc, 18, H - 142, o.sub, 15, C.muted, 700, 0.8).setOrigin(0, 0.5).setWordWrapWidth(W - 36));

    const L = 16;
    const gap = 6;
    const n = o.buttons.length;
    const bw = (W - 2 * L - gap * (n - 1)) / n;
    o.buttons.forEach((b, i) => {
      const x = L + bw / 2 + i * (bw + gap);
      const btn = new TvButton(sc, x, H - 30 - 32, { w: bw, h: 64, fill: b.primary ? TEAMS.home.color : TV.ink2, fillAlpha: 1, primary: !!b.primary });
      const t = tvText(sc, 0, 0, b.label.replace(' ', '\n'), 18, b.primary ? TEAMS.home.fg : C.white, 800, 1).setOrigin(0.5).setAlign('center').setLineSpacing(-4);
      if (t.width > bw - 12) t.setScale((bw - 12) / t.width);
      btn.add(t);
      btn.onTap = b.onTap;
      if (b.enabled === false) {
        btn.setEnabled(false);
        btn.setAlpha(0.4);
      }
      root.add(btn);
    });
  }
}
