import Phaser from 'phaser';
import { TEAMS } from '../config';
import { bottomGradient, GlassButton, label, title, UI } from './widgets';

/*
 * Chute (telas FieldGoal / PontoExtra do design):
 *   selos de VENTO (seta + km/h) e DISTÂNCIA + CHANCE no topo,
 *   barra única com degradê vermelho → amarelo → verde → amarelo → vermelho
 *   e uma agulha branca indo e voltando; o botão CHUTAR para a agulha.
 */

export class KickUi {
  private items: Phaser.GameObjects.GameObject[] = [];
  private needle: Phaser.GameObjects.Rectangle;
  private wind: Phaser.GameObjects.Container;
  private info: Phaser.GameObjects.Container;
  private btn: GlassButton;
  private btnText: Phaser.GameObjects.Text;
  private barX: number;
  private barW: number;
  private zone: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private barY = 0;
  private timerG: Phaser.GameObjects.Graphics;
  private timerT: Phaser.GameObjects.Text;
  /** Fase da agulha (rad); posição = sin(fase) em −1..1. */
  private phase = 0;
  running = false;
  onKick?: (offset: number) => void;

  constructor(private scene: Phaser.Scene) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const D = 95;
    const grad = bottomGradient(scene, 300, 90);
    this.barX = 20;
    this.barW = W - 40;
    const by = H - 112 - 22;
    const bar = scene.add.graphics().setDepth(D);
    this.bar = bar;
    this.barY = by;
    this.zone = scene.add.graphics().setDepth(D);
    this.zone.setData('y', by);
    this.needle = scene.add.rectangle(W / 2, by + 11, 5, 36, 0xffffff).setDepth(D + 1).setStrokeStyle(1.5, UI.dark);

    this.btn = new GlassButton(scene, W / 2, H - 30 - 30, { w: W - 40, h: 60, radius: 16, fill: TEAMS.home.color, fillAlpha: 1, borderAlpha: 0.35, primary: true }).setDepth(D);
    this.btnText = title(scene, 0, 0, 'CHUTAR', 14, TEAMS.home.fg).setOrigin(0.5);
    this.btn.add(this.btnText);
    this.btn.onTap = () => this.stop();

    this.wind = scene.add.container(0, 0).setDepth(D);
    this.info = scene.add.container(0, 0).setDepth(D);
    this.timerG = scene.add.graphics().setDepth(D);
    this.timerT = title(scene, W / 2 + 62, 168, '', 9, '#FFFFFF').setOrigin(1, 0.5).setDepth(D + 1);
    this.items.push(grad, bar, this.zone, this.needle, this.btn, this.wind, this.info, this.timerG, this.timerT);
    this.show(false);
  }

  /** Abre a barra: vento (km/h, sinal = direção), distância e chance. */
  open(opts: { windKmh: number; windDir: number; dist: number; chance: number; color: number; label?: string; window: number; info?: string }) {
    const sc = this.scene;
    const W = sc.scale.width;
    this.show(true);
    this.btn.setFill(opts.color, 1, true);
    this.btnText.setText(opts.label ?? 'CHUTAR');
    this.phase = 0;
    this.running = true;
    this.paintBar(opts.window);
    // Faixa "boa" desenhada por cima (o tamanho muda com a dificuldade)
    const y = this.zone.getData('y') as number;
    const g = this.zone;
    g.clear();
    const half = opts.window * (this.barW / 2 - 6);
    g.lineStyle(2, 0xffffff, 0.85);
    g.strokeRect(W / 2 - half, y - 3, half * 2, 28);

    const pill = (c: Phaser.GameObjects.Container, x: number, right: boolean, build: (c: Phaser.GameObjects.Container) => number) => {
      c.removeAll(true);
      const w = build(c);
      const bg = sc.add.graphics();
      bg.fillStyle(0x000000, 0.3);
      bg.fillRoundedRect(0, 4, w, 30, 12);
      bg.fillStyle(0x22284a, 0.85);
      bg.fillRoundedRect(0, 0, w, 30, 12);
      bg.lineStyle(1, 0xffffff, 0.16);
      bg.strokeRoundedRect(0, 0, w, 30, 12);
      c.addAt(bg, 0);
      c.setPosition(right ? x - w : x, 116);
    };
    pill(this.wind, 12, false, (c) => {
      const l = label(sc, 10, 15, 'VENTO', 9, UI.muted).setOrigin(0, 0.5);
      const ar = sc.add.graphics();
      const ax = l.x + l.width + 8;
      ar.fillStyle(0x3fd0ff, 1);
      const dir = opts.windDir < 0 ? -1 : 1;
      if (opts.windKmh > 0) {
        ar.fillRect(ax + (dir < 0 ? 6 : 0), 14, 16, 2);
        if (dir < 0) ar.fillTriangle(ax, 15, ax + 8, 10, ax + 8, 20);
        else ar.fillTriangle(ax + 22, 15, ax + 14, 10, ax + 14, 20);
      }
      const t = title(sc, ax + 30, 15, `${opts.windKmh} KM/H`, 8).setOrigin(0, 0.5);
      c.add([l, ar, t]);
      return t.x + t.width + 10;
    });
    pill(this.info, W - 12, true, (c) => {
      const t = title(sc, 10, 15, `${opts.dist} JDS`, 8).setOrigin(0, 0.5);
      const col = opts.chance >= 0.7 ? '#3CCB5A' : opts.chance >= 0.45 ? '#FFD23F' : '#FF7B80';
      const ch = label(sc, t.x + t.width + 8, 15, opts.info ?? `CHANCE ${Math.round(opts.chance * 100)}%`, 9, opts.info ? '#3FD0FF' : col).setOrigin(0, 0.5);
      c.add([t, ch]);
      return ch.x + ch.width + 10;
    });
  }

  /** Barra: o verde ocupa só a faixa boa (|posição| < janela); depois laranja e vermelho. */
  private paintBar(win: number) {
    const g = this.bar;
    const by = this.barY;
    const x0 = this.barX + 6;
    const w = this.barW - 12;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(this.barX, by + 6, this.barW, 22, 11);
    const mix = (a: number, b: number, k: number) => {
      const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
      const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
    };
    const N = 64;
    for (let i = 0; i < N; i++) {
      const u = ((i + 0.5) / N) * 2 - 1; // −1..1
      const d = Math.abs(u) / Math.max(0.05, win); // 1 = borda da faixa boa
      const col = d <= 0.85 ? 0x3ccb5a : d <= 1.05 ? mix(0x3ccb5a, 0xffb02e, (d - 0.85) / 0.2) : d <= 1.6 ? mix(0xffb02e, 0xe5484d, (d - 1.05) / 0.55) : 0xe5484d;
      g.fillStyle(col, 1);
      g.fillRect(x0 + (i / N) * w, by, w / N + 1, 22);
    }
    g.fillStyle(0xe5484d, 1);
    g.fillCircle(this.barX + 11, by + 11, 11);
    g.fillCircle(this.barX + this.barW - 11, by + 11, 11);
    g.lineStyle(2, UI.dark, 1);
    g.strokeRoundedRect(this.barX, by, this.barW, 22, 11);
  }

  /** Timer de pressão da defesa (field goal): barra que esvazia; null esconde. */
  setTimer(left: number | null, total = 2) {
    const g = this.timerG;
    g.clear();
    this.timerT.setVisible(left !== null);
    if (left === null) return;
    const W = this.scene.scale.width;
    const x = W / 2 - 100;
    const y = 154;
    const k = Math.max(0, Math.min(1, left / total));
    const col = k > 0.5 ? 0xffb02e : 0xe5484d;
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x, y + 4, 200, 28, 12);
    g.fillStyle(0x22284a, 0.9);
    g.fillRoundedRect(x, y, 200, 28, 12);
    g.lineStyle(1, 0xffffff, 0.16);
    g.strokeRoundedRect(x, y, 200, 28, 12);
    g.fillStyle(0x3a4060, 1);
    g.fillRect(x + 66, y + 10, 74, 8);
    g.fillStyle(col, 1);
    g.fillRect(x + 66, y + 10, 74 * k, 8);
    this.timerT.setText(`${left.toFixed(1)}s`).setColor(k > 0.5 ? '#FFB02E' : '#FF7B80').setX(x + 192);
    if (!this.timerLbl) this.timerLbl = label(this.scene, 0, 0, 'PRESSÃO', 9, '#FFFFFF').setOrigin(0, 0.5).setDepth(96);
    this.timerLbl.setPosition(x + 12, y + 14).setVisible(true);
  }
  private timerLbl: Phaser.GameObjects.Text | null = null;

  /** Para a agulha (bloqueio do chute). */
  cancel() {
    this.running = false;
    this.btn.setEnabled(false);
  }

  show(on: boolean) {
    if (!on) {
      this.timerG.clear();
      this.timerT.setVisible(false);
      this.timerLbl?.setVisible(false);
    }
    this.items.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(on));
    if (!on) this.running = false;
  }

  private stop() {
    if (!this.running) return;
    this.running = false;
    this.btn.setEnabled(false);
    const off = Math.sin(this.phase);
    this.scene.tweens.add({ targets: this.needle, scaleY: 1.3, yoyo: true, duration: 90 });
    this.onKick?.(off);
  }

  update(dt: number) {
    if (!this.needle.visible) return;
    if (this.running) {
      this.btn.setEnabled(true);
      this.phase += dt * ((Math.PI * 2) / 1.6);
    }
    this.needle.x = this.scene.scale.width / 2 + Math.sin(this.phase) * (this.barW / 2 - 6);
  }
}
