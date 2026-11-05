import Phaser from 'phaser';
import { GAME_W, GAME_H, TEAMS } from '../config';
import { Joystick } from './Joystick';
import { C, plate, plateLine, plateShadow, TV, TvButton, tvText } from './tv';
import { bottomGradient, UI } from './widgets';

/*
 * Interface do lance ao vivo (como no design):
 *  POCKET → CORRER | painel FORÇA + ALVO | JOGAR FORA, e a dica "PUXE PRA TRÁS E SOLTE"
 *  CORRIDA (com a bola) → joystick, MERGULHO, JUKE e SPIN
 */

export interface LiveUiHandlers {
  onRun(): void;
  onThrowAway(): void;
  onDive(): void;
  onJuke(): void;
  onSpin(): void;
}

export class LiveUi {
  readonly joystick: Joystick;
  private pocket: Phaser.GameObjects.GameObject[] = [];
  private carry: Phaser.GameObjects.GameObject[] = [];
  private powerSegs: Phaser.GameObjects.Graphics;
  private powerPct: Phaser.GameObjects.Text;
  private target: Phaser.GameObjects.Text;
  private dragHint: Phaser.GameObjects.Container;
  private carryHint: Phaser.GameObjects.Container;
  private carryHintText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, h: LiveUiHandlers) {
    const W = GAME_W;
    const H = GAME_H;
    const D = 95;

    // ---------- POCKET
    const g1 = bottomGradient(scene, 190, 90);
    const by = H - 104 + 12;
    const bh = 104 - 12 - 16;
    const run = new TvButton(scene, 14 + 41, by + bh / 2, { w: 82, h: bh }).setDepth(D);
    run.add(tvText(scene, 0, 0, 'CORRER', 19, C.white, 800, 1).setOrigin(0.5));
    run.onTap = h.onRun;
    const away = new TvButton(scene, W - 14 - 41, by + bh / 2, { w: 82, h: bh }).setDepth(D);
    away.add(tvText(scene, 0, -10, 'JOGAR', 17, C.white, 800, 1).setOrigin(0.5));
    away.add(tvText(scene, 0, 10, 'FORA', 17, C.white, 800, 1).setOrigin(0.5));
    away.onTap = h.onThrowAway;
    // Painel de força (placa da transmissão)
    const px = 14 + 82 + 10;
    const pw = W - 2 * px;
    const panel = scene.add.graphics().setDepth(D);
    plateShadow(panel, px, by, pw, bh, true, true, 0.8);
    plate(panel, px, by, pw, bh, TV.ink, 0.94);
    plateLine(panel, px, by, pw, bh, TV.rule, 1, 1);
    const fl = tvText(scene, px + 16, by + 15, 'FORÇA', 13, C.muted, 700, 1.4).setOrigin(0, 0.5).setDepth(D);
    this.powerPct = tvText(scene, px + pw - 16, by + 15, '0%', 17, C.yellow, 800, 0).setOrigin(1, 0.5).setDepth(D);
    this.powerSegs = scene.add.graphics().setDepth(D);
    this.powerSegs.setData('box', [px + 16, by + 30, pw - 32, 12]);
    this.target = tvText(scene, px + 16, by + 60, 'ARRASTE A PARTIR DO QB', 13, C.muted, 700, 0.8).setOrigin(0, 0.5).setDepth(D);
    // Dica de arrastar (círculo branco + tarja de texto)
    this.dragHint = scene.add.container(0, 0).setDepth(96);
    const ring = scene.add.graphics();
    ring.fillStyle(0xffffff, 0.18);
    ring.fillCircle(0, 0, 28);
    ring.lineStyle(3, 0xffffff, 1);
    ring.strokeCircle(0, 0, 28);
    ring.fillStyle(UI.dark, 1);
    ring.fillCircle(0, 0, 11);
    ring.fillStyle(0xffffff, 1);
    ring.fillCircle(0, 0, 9);
    const ht1 = tvText(scene, 0, 0, 'PUXE PRA TRÁS', 14, C.white, 800, 0.8).setOrigin(0, 0.5);
    const ht2 = tvText(scene, 0, 0, 'E SOLTE', 14, C.yellow, 800, 0.8).setOrigin(0, 0.5);
    const hw = Math.max(ht1.width, ht2.width) + 30;
    const hb = scene.add.graphics();
    plate(hb, 36, -22, hw, 44, TV.ink, 0.94);
    ht1.setPosition(52, -10);
    ht2.setPosition(52, 10);
    this.dragHint.add([ring, hb, ht1, ht2]);
    scene.tweens.add({ targets: ring, scale: 1.12, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut' });
    this.pocket.push(g1, run, away, panel, fl, this.powerPct, this.powerSegs, this.target, this.dragHint);

    // ---------- CORRIDA
    const g2 = bottomGradient(scene, 260, 90);
    this.joystick = new Joystick(scene, 18 + 64, H - 26 - 64).setDepth(D);
    const act = (x: number, y: number, text: string, accent = false) => {
      const b = new TvButton(scene, x, y, { w: 76, h: 56, fill: accent ? TEAMS.home.color : TV.ink2, fillAlpha: 1, primary: accent }).setDepth(D);
      const t = tvText(scene, 0, 0, text, 17, accent ? TEAMS.home.fg : C.white, 800, 0.8).setOrigin(0.5);
      if (t.width > 62) t.setScale(62 / t.width, 1);
      b.add(t);
      return b;
    };
    // Sem SPRINT: MERGULHO embaixo à direita, JUKE ao lado e SPIN em cima
    const dive = act(W - 16 - 38, H - 26 - 28, 'MERGULHO', true);
    dive.onDown = h.onDive;
    const juke = act(W - 16 - 38 - 84, H - 26 - 28, 'JUKE');
    juke.onDown = h.onJuke;
    const spin = act(W - 16 - 38 - 42, H - 26 - 28 - 66, 'SPIN');
    spin.onDown = h.onSpin;
    this.carryHint = scene.add.container(W / 2, 630).setDepth(D);
    this.carryHintText = tvText(scene, 0, 0, '', 14, C.white, 800, 0.8).setOrigin(0.5);
    const chb = scene.add.graphics();
    this.carryHint.add([chb, this.carryHintText]);
    this.carryHint.setData('bg', chb);
    this.carry.push(g2, this.joystick, dive, juke, spin, this.carryHint);

    this.show('none');
  }

  show(mode: 'none' | 'pocket' | 'carry') {
    this.pocket.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(mode === 'pocket'));
    this.carry.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(mode === 'carry'));
    if (mode !== 'carry') this.joystick.reset();
  }

  /** Força 0..1, texto do alvo e cor do recebedor. */
  setPower(power: number, targetText: string, color: string) {
    const [x, y, w, h] = this.powerSegs.getData('box') as number[];
    const g = this.powerSegs;
    g.clear();
    const n = 10;
    const gap = 2;
    const sw = (w - gap * (n - 1)) / n;
    const lit = Math.round(power * n);
    for (let i = 0; i < n; i++) {
      g.fillStyle(i >= lit ? TV.ink3 : i < 4 ? 0xffd23f : i < 7 ? 0xffb02e : 0xff8a2e, 1);
      g.fillRect(x + i * (sw + gap), y, sw, h);
    }
    this.powerPct.setText(`${Math.round(power * 100)}%`);
    this.target.setText(targetText).setColor(color);
  }

  showDragHint(on: boolean, x = 0, y = 0) {
    this.dragHint.setVisible(on).setPosition(x, y);
  }


  setCarryHint(text: string) {
    this.carryHintText.setText(text);
    const g = this.carryHint.getData('bg') as Phaser.GameObjects.Graphics;
    const w = this.carryHintText.width + 32;
    g.clear();
    plate(g, -w / 2, -14, w, 28, TV.ink, 0.9);
  }
}
