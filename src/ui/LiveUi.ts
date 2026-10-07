import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { Joystick } from './Joystick';
import { bottomGradient, GlassButton, label, title, UI } from './widgets';

/*
 * Interface do lance ao vivo (como no design):
 *  POCKET → CORRER | painel FORÇA + ALVO | JOGAR FORA, e a dica "PUXE PRA TRÁS E SOLTE"
 *  CORRIDA (com a bola) → joystick, SPRINT, MERGULHO, JUKE, SPIN e barra de FÔLEGO
 */

export interface LiveUiHandlers {
  onRun(): void;
  onThrowAway(): void;
  onSprint(on: boolean): void;
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
  private stamina: Phaser.GameObjects.Graphics;
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
    const run = new GlassButton(scene, 14 + 41, by + bh / 2, { w: 82, h: bh, radius: 18 }).setDepth(D);
    run.add(title(scene, 0, 0, 'CORRER', 9).setOrigin(0.5));
    run.onTap = h.onRun;
    const away = new GlassButton(scene, W - 14 - 41, by + bh / 2, { w: 82, h: bh, radius: 18 }).setDepth(D);
    away.add(title(scene, 0, 0, 'JOGAR\nFORA', 9).setOrigin(0.5).setAlign('center').setLineSpacing(6));
    away.onTap = h.onThrowAway;
    // Painel de força
    const px = 14 + 82 + 10;
    const pw = W - 2 * px;
    const panel = scene.add.graphics().setDepth(D);
    panel.fillStyle(0x000000, 0.28);
    panel.fillRoundedRect(px, by + 4, pw, bh, 18);
    panel.fillStyle(0x22284a, 0.6);
    panel.fillRoundedRect(px, by, pw, bh, 18);
    panel.lineStyle(1, 0xffffff, 0.12);
    panel.strokeRoundedRect(px, by, pw, bh, 18);
    const fl = label(scene, px + 12, by + 14, 'FORÇA', 10, '#C9CEE0').setDepth(D);
    this.powerPct = title(scene, px + pw - 12, by + 15, '0%', 9, UI.yellow).setOrigin(1, 0).setDepth(D);
    this.powerSegs = scene.add.graphics().setDepth(D);
    this.powerSegs.setData('box', [px + 12, by + 34, pw - 24, 12]);
    this.target = label(scene, px + 12, by + 54, 'ARRASTE A PARTIR DO QB', 10, '#C9CEE0').setDepth(D);
    // Dica de arrastar (círculo branco + caixa de texto)
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
    const ht = label(scene, 0, 0, 'PUXE PRA TRÁS\nE SOLTE', 10, '#E8EAF2').setLineSpacing(3);
    const hb = scene.add.graphics();
    hb.fillStyle(UI.dark, 1);
    hb.fillRect(34, -ht.height / 2 - 7, ht.width + 20, ht.height + 14);
    hb.fillStyle(UI.dark, 0.85);
    hb.fillRect(36, -ht.height / 2 - 5, ht.width + 16, ht.height + 10);
    ht.setPosition(44, -ht.height / 2);
    this.dragHint.add([ring, hb, ht]);
    scene.tweens.add({ targets: ring, scale: 1.12, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut' });
    this.pocket.push(g1, run, away, panel, fl, this.powerPct, this.powerSegs, this.target, this.dragHint);

    // ---------- CORRIDA
    const g2 = bottomGradient(scene, 260, 90);
    this.joystick = new Joystick(scene, 18 + 64, H - 26 - 64).setDepth(D);
    const round = (x: number, y: number, text: string) => {
      const b = new GlassButton(scene, x, y, { w: 62, h: 62, radius: 31 }).setDepth(D);
      b.add(title(scene, 0, 0, text, 7).setOrigin(0.5));
      return b;
    };
    const sprint = round(W - 18 - 31, H - 26 - 31, 'SPRINT');
    sprint.onDown = () => h.onSprint(true);
    sprint.onUp = () => h.onSprint(false);
    const dive = round(W - 18 - 84 - 31, H - 26 - 31, 'MERGULHO');
    dive.onDown = h.onDive;
    const juke = round(W - 18 - 70 - 31, H - 26 - 70 - 31, 'JUKE');
    juke.onDown = h.onJuke;
    const spin = round(W - 18 - 6 - 31, H - 26 - 86 - 31, 'SPIN');
    spin.onDown = h.onSpin;
    const stl = label(scene, 160 + 23, H - 30 - 74, 'FÔLEGO', 8, UI.muted).setOrigin(0.5, 0).setDepth(D);
    this.stamina = scene.add.graphics().setDepth(D);
    this.carryHint = scene.add.container(W / 2, 630).setDepth(D);
    this.carryHintText = label(scene, 0, 0, '', 10, '#E8EAF2').setOrigin(0.5);
    const chb = scene.add.graphics();
    this.carryHint.add([chb, this.carryHintText]);
    this.carryHint.setData('bg', chb);
    this.carry.push(g2, this.joystick, sprint, dive, juke, spin, stl, this.stamina, this.carryHint);

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
      g.fillStyle(i >= lit ? 0x3a4060 : i < 4 ? 0xffd23f : i < 7 ? 0xffb02e : 0xff8a2e, 1);
      g.fillRect(x + i * (sw + gap), y, sw, h);
    }
    this.powerPct.setText(`${Math.round(power * 100)}%`);
    this.target.setText(targetText).setColor(color);
  }

  showDragHint(on: boolean, x = 0, y = 0) {
    this.dragHint.setVisible(on).setPosition(x, y);
  }

  setStamina(v: number) {
    const g = this.stamina;
    const H = GAME_H;
    const x = 160 + 18;
    const y = H - 30 - 60;
    g.clear();
    g.fillStyle(0x3a4060, 1);
    g.fillRoundedRect(x, y, 10, 60, 5);
    const h = Math.max(0, Math.min(1, v)) * 60;
    g.fillStyle(v > 0.3 ? 0x3ccb5a : 0xffb02e, 1);
    if (h > 1) g.fillRoundedRect(x, y + 60 - h, 10, h, Math.min(5, h / 2));
  }

  setCarryHint(text: string) {
    this.carryHintText.setText(text);
    const g = this.carryHint.getData('bg') as Phaser.GameObjects.Graphics;
    const w = this.carryHintText.width + 20;
    g.clear();
    g.fillStyle(UI.dark, 0.75);
    g.fillRoundedRect(-w / 2, -12, w, 24, 10);
  }
}
