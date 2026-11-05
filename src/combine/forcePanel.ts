import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { C, plate, plateLine, plateShadow, TV, tvText } from '../ui/tv';
import { UI_DEPTH } from './ui';

/*
 * Painel FORÇA do passe (10 segmentos e a linha do alvo), mais a dica "PUXE PRA TRÁS E SOLTE" com o
 * círculo pulsando sobre o QB. Pacote da transmissão: placa de tinta e fonte condensada.
 */
export function forcePanel(scene: Phaser.Scene) {
  const W = GAME_W;
  const H = GAME_H;
  const D = UI_DEPTH;
  const by = H - 96;
  const bh = 78;
  const px = 16;
  const pw = W - 32;
  const panel = scene.add.graphics().setDepth(D);
  plateShadow(panel, px, by, pw, bh);
  plate(panel, px, by, pw, bh, TV.ink, 0.94);
  plateLine(panel, px, by, pw, bh, TV.rule, 1, 1);
  tvText(scene, px + 18, by + 16, 'FORÇA', 13, C.muted, 800, 1.6).setOrigin(0, 0.5).setDepth(D);
  const pct = tvText(scene, px + pw - 18, by + 16, '0%', 17, C.yellow, 800, 0.4).setOrigin(1, 0.5).setDepth(D);
  const segs = scene.add.graphics().setDepth(D);
  const target = tvText(scene, px + 18, by + 60, 'ARRASTE A PARTIR DO QB', 13, C.muted, 700, 1).setOrigin(0, 0.5).setDepth(D);
  const bx = px + 18;
  const bw = pw - 36;

  const hint = scene.add.container(0, 0).setDepth(D + 1);
  const ring = scene.add.graphics();
  ring.fillStyle(0xffffff, 0.18);
  ring.fillCircle(0, 0, 28);
  ring.lineStyle(3, 0xffffff, 1);
  ring.strokeCircle(0, 0, 28);
  ring.fillStyle(TV.ink, 1);
  ring.fillCircle(0, 0, 11);
  ring.fillStyle(0xffffff, 1);
  ring.fillCircle(0, 0, 9);
  const ht = tvText(scene, 0, 0, 'PUXE PRA TRÁS\nE SOLTE', 14, C.white, 800, 1).setLineSpacing(-2);
  const hb = scene.add.graphics();
  plate(hb, 36, -ht.height / 2 - 7, ht.width + 26, ht.height + 14, TV.ink, 0.94);
  hb.fillStyle(TV.yellow, 1);
  hb.fillRect(43, -ht.height / 2 - 7, ht.width + 19, 2);
  ht.setPosition(48, -ht.height / 2);
  hint.add([ring, hb, ht]);
  scene.tweens.add({ targets: ring, scale: 1.12, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut' });
  hint.setVisible(false);

  const set = (power: number, text: string, color: string) => {
    segs.clear();
    const n = 10;
    const gap = 3;
    const sw = (bw - gap * (n - 1)) / n;
    const lit = Math.round(power * n);
    for (let i = 0; i < n; i++) {
      segs.fillStyle(i >= lit ? TV.ink3 : i < 4 ? TV.yellow : i < 7 ? 0xffb02e : 0xff8a2e, 1);
      segs.fillRect(bx + i * (sw + gap), by + 31, sw, 12);
    }
    pct.setText(`${Math.round(power * 100)}%`);
    target.setText(text).setColor(color === '#C9CEE0' ? C.muted : color);
  };
  set(0, 'ARRASTE PARA TRÁS PARA LANÇAR', C.muted);
  return { set, hint: (on: boolean, x = 0, y = 0) => hint.setVisible(on).setPosition(x, y) };
}
