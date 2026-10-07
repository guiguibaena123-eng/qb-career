import Phaser from 'phaser';
import { FONT_TITLE, GAME_H, GAME_W, TEAMS } from '../config';
import { bottomGradient, GlassButton, label, title, UI } from './widgets';

/*
 * Card de resultado (telas "Resultado" e "Interceptacao" do design):
 *   título grande torto (TOUCHDOWN! / INTERCEPTADO!) + selo (+6 LOBOS / #31 TOUROS · NICKEL)
 *   painel embaixo: resumo da jogada, dica opcional, 4 estatísticas,
 *   barra de XP da carreira ou de confiança, e os botões REPLAY | CONTINUAR.
 */

export interface CardOpts {
  big: string;
  bigColor: string;
  bigShadow: string;
  bigSize?: number;
  chip: string;
  chipBg: number;
  chipFg: string;
  header: string;
  head: string;
  sub: string;
  subColor?: string;
  tip?: string;
  stats: { label: string; value: string; bad?: boolean }[];
  bar: { kind: 'xp'; label: string; gain: number; base: number } | { kind: 'conf'; value: number; delta: number };
  teamColor: number;
  replay?: () => void;
  replayLabel?: string;
  next: () => void;
  nextLabel?: string;
}

export class ResultCard {
  private root: Phaser.GameObjects.Container | null = null;
  private tweens: Phaser.Tweens.Tween[] = [];

  constructor(private scene: Phaser.Scene) {}

  get visible() {
    return !!this.root?.visible;
  }

  setVisible(on: boolean) {
    this.root?.setVisible(on);
  }

  hide() {
    this.tweens.forEach((t) => t.remove());
    this.tweens = [];
    this.root?.destroy();
    this.root = null;
  }

  show(o: CardOpts) {
    this.hide();
    const sc = this.scene;
    const W = GAME_W;
    const H = GAME_H;
    const root = (this.root = sc.add.container(0, 0).setDepth(120));

    // Título grande torto + selo
    const big = sc.add
      .text(W / 2, 168, o.big, {
        fontFamily: FONT_TITLE,
        fontSize: `${o.bigSize ?? 30}px`,
        color: o.bigColor,
        stroke: '#0D0D12',
        strokeThickness: 7,
        shadow: { offsetX: 5, offsetY: 7, color: o.bigShadow, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setAngle(-4)
      .setScale(0.3)
      .setAlpha(0);
    this.tweens.push(sc.tweens.add({ targets: big, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' }));
    const chipT = title(sc, W / 2, 226, o.chip, 10, o.chipFg).setOrigin(0.5);
    const cw = chipT.width + 20;
    const chip = sc.add.graphics();
    chip.fillStyle(UI.dark, 1);
    chip.fillRect(W / 2 - cw / 2 - 3, 226 - 14 - 3, cw + 6, 28 + 9);
    chip.fillStyle(o.chipBg, 1);
    chip.fillRect(W / 2 - cw / 2, 226 - 14, cw, 28);
    const chipC = sc.add.container(0, 0, [chip, chipT]).setAlpha(0);
    this.tweens.push(sc.tweens.add({ targets: chipC, alpha: 1, y: { from: 8, to: 0 }, delay: 300, duration: 300 }));
    root.add([big, chipC]);

    // Painel inferior
    const grad = bottomGradient(sc, o.tip ? 500 : 470, 120);
    root.add(grad);
    const L = 14;
    const R = W - 14;
    let y = H - (o.tip ? 318 : 300) + 16;
    root.add(label(sc, L, y, o.header, 10, UI.muted));
    y += 18;
    root.add(title(sc, L, y, o.head, 13, '#FFFFFF'));
    y += 22;
    const sub = label(sc, L, y, o.sub, 11, o.subColor ?? '#C9CEE0').setWordWrapWidth(R - L);
    root.add(sub);
    y += sub.height + 12;

    if (o.tip) {
      const t = label(sc, L + 44, 0, o.tip, 11, '#E8EAF2').setWordWrapWidth(R - L - 56).setLineSpacing(3);
      const bh = Math.max(42, t.height + 20);
      const g = sc.add.graphics();
      g.fillStyle(0x22284a, 0.7);
      g.fillRoundedRect(L, y, R - L, bh, 12);
      g.lineStyle(1, 0xffffff, 0.14);
      g.strokeRoundedRect(L, y, R - L, bh, 12);
      g.fillStyle(0xffd23f, 1);
      g.fillRoundedRect(L + 12, y + bh / 2 - 11, 22, 22, 6);
      t.setY(y + bh / 2 - t.height / 2);
      root.add([g, t, title(sc, L + 23, y + bh / 2, '!', 10, '#0D0D12').setOrigin(0.5)]);
      y += bh + 12;
    }

    // 4 estatísticas
    const gap = 6;
    const sw = (R - L - gap * 3) / 4;
    o.stats.forEach((s, i) => {
      const x = L + i * (sw + gap);
      const g = sc.add.graphics();
      g.fillStyle(0x22284a, 0.7);
      g.fillRoundedRect(x, y, sw, 46, 12);
      g.lineStyle(1, s.bad ? 0xe5484d : 0xffffff, s.bad ? 0.8 : 0.12);
      g.strokeRoundedRect(x, y, sw, 46, 12);
      root.add([
        g,
        title(sc, x + sw / 2, y + 16, s.value, 11, s.bad ? '#FF7B80' : '#FFFFFF').setOrigin(0.5),
        label(sc, x + sw / 2, y + 34, s.label, 9, '#C9CEE0').setOrigin(0.5),
      ]);
    });
    y += 46 + 14;

    // Barra: XP da carreira ou confiança
    if (o.bar.kind === 'xp') {
      const b = o.bar;
      root.add(label(sc, L, y, b.label, 10, UI.muted));
      root.add(title(sc, R, y + 1, `+${b.gain} XP`, 9, '#3CCB5A').setOrigin(1, 0));
      const by = y + 18;
      const g = sc.add.graphics();
      g.fillStyle(UI.dark, 1);
      g.fillRect(L, by, R - L, 12);
      g.fillStyle(0x3a4060, 1);
      g.fillRect(L + 2, by + 2, R - L - 4, 8);
      const iw = R - L - 4;
      const base = Phaser.Math.Clamp(b.base, 0, 1);
      const gain = Phaser.Math.Clamp(b.gain / 1000, 0, 1 - base);
      g.fillStyle(0xffd23f, 1);
      g.fillRect(L + 2, by + 2, iw * base, 8);
      const fill = sc.add.rectangle(L + 2 + iw * base, by + 2, 0, 8, 0x3ccb5a).setOrigin(0, 0);
      this.tweens.push(sc.tweens.add({ targets: fill, width: iw * gain, delay: 450, duration: 700, ease: 'Quad.Out' }));
      root.add([g, fill]);
    } else {
      const b = o.bar;
      root.add(label(sc, L, y + 2, 'CONFIANÇA', 10, UI.muted));
      const dt = title(sc, R, y + 2, b.delta >= 0 ? `+${b.delta}` : `${b.delta}`, 9, b.delta >= 0 ? '#3CCB5A' : '#FF7B80').setOrigin(1, 0);
      root.add(dt);
      const x0 = R - dt.width - 8 - 5 * 16;
      for (let i = 0; i < 5; i++) {
        const lost = b.delta < 0 && i === b.value;
        const r = sc.add.rectangle(x0 + i * 16, y + 2, 14, 9, i < b.value ? 0x3ccb5a : lost ? 0xe5484d : 0x3a4060).setOrigin(0, 0);
        if (lost) this.tweens.push(sc.tweens.add({ targets: r, alpha: 0.3, yoyo: true, repeat: 3, duration: 400 }));
        root.add(r);
      }
    }

    // Botões
    const bh = 56;
    const byy = H - 18 - bh / 2;
    const wTot = R - L - 10;
    const w1 = o.replay ? wTot / 2.6 : 0;
    const w2 = wTot - w1;
    if (o.replay) {
      const rp = new GlassButton(sc, L + w1 / 2, byy, { w: w1, h: bh, radius: 16 });
      rp.add(title(sc, 0, 0, o.replayLabel ?? 'REPLAY', 11).setOrigin(0.5));
      rp.onTap = o.replay;
      root.add(rp);
    }
    const nx = new GlassButton(sc, R - w2 / 2, byy, { w: w2, h: bh, radius: 16, fill: o.teamColor, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    nx.add(title(sc, 0, 0, o.nextLabel ?? 'CONTINUAR', 13, TEAMS.home.fg).setOrigin(0.5));
    nx.onTap = o.next;
    root.add(nx);
  }
}
