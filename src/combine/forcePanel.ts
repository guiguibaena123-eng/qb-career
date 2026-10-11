import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { label, title, UI } from '../ui/widgets';
import { UI_DEPTH } from './ui';

/*
 * Painel FORÇA do passe, igual ao do jogo rápido (10 segmentos laranja e a linha do alvo), mais a dica
 * "PUXE PRA TRÁS E SOLTE" com o círculo pulsando sobre o QB.
 */
export function forcePanel(scene: Phaser.Scene) {
  const W = GAME_W;
  const H = GAME_H;
  const D = UI_DEPTH;
  const by = H - 104 + 12;
  const bh = 104 - 12 - 16;
  const px = 14;
  const pw = W - 28;
  const panel = scene.add.graphics().setDepth(D);
  panel.fillStyle(0x000000, 0.28);
  panel.fillRoundedRect(px, by + 4, pw, bh, 18);
  panel.fillStyle(0x22284a, 0.6);
  panel.fillRoundedRect(px, by, pw, bh, 18);
  panel.lineStyle(1, 0xffffff, 0.12);
  panel.strokeRoundedRect(px, by, pw, bh, 18);
  label(scene, px + 12, by + 14, 'FORÇA', 10, '#C9CEE0').setDepth(D);
  const pct = title(scene, px + pw - 12, by + 15, '0%', 9, UI.yellow).setOrigin(1, 0).setDepth(D);
  const segs = scene.add.graphics().setDepth(D);
  const target = label(scene, px + 12, by + 54, 'ARRASTE A PARTIR DO QB', 10, '#C9CEE0').setDepth(D);
  const bx = px + 12;
  const bw = pw - 24;

  const hint = scene.add.container(0, 0).setDepth(D + 1);
  const ring = scene.add.graphics();
  ring.fillStyle(0xffffff, 0.18);
  ring.fillCircle(0, 0, 28);
  ring.lineStyle(3, 0xffffff, 1);
  ring.strokeCircle(0, 0, 28);
  ring.fillStyle(UI.dark, 1);
  ring.fillCircle(0, 0, 11);
  ring.fillStyle(0xffffff, 1);
  ring.fillCircle(0, 0, 9);
  const ht = label(scene, 0, 0, 'PUXE PRA TRÁS\nE SOLTE', 10, '#E8EAF2').setLineSpacing(3);
  const hb = scene.add.graphics();
  hb.fillStyle(UI.dark, 1);
  hb.fillRect(34, -ht.height / 2 - 7, ht.width + 20, ht.height + 14);
  hb.fillStyle(UI.dark, 0.85);
  hb.fillRect(36, -ht.height / 2 - 5, ht.width + 16, ht.height + 10);
  ht.setPosition(44, -ht.height / 2);
  hint.add([ring, hb, ht]);
  scene.tweens.add({ targets: ring, scale: 1.12, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut' });
  hint.setVisible(false);

  const set = (power: number, text: string, color: string) => {
    segs.clear();
    const n = 10;
    const gap = 2;
    const sw = (bw - gap * (n - 1)) / n;
    const lit = Math.round(power * n);
    for (let i = 0; i < n; i++) {
      segs.fillStyle(i >= lit ? 0x3a4060 : i < 4 ? 0xffd23f : i < 7 ? 0xffb02e : 0xff8a2e, 1);
      segs.fillRect(bx + i * (sw + gap), by + 34, sw, 12);
    }
    pct.setText(`${Math.round(power * 100)}%`);
    target.setText(text).setColor(color);
  };
  set(0, 'ARRASTE PARA TRÁS PARA LANÇAR', '#C9CEE0');
  return { set, hint: (on: boolean, x = 0, y = 0) => hint.setVisible(on).setPosition(x, y) };
}
