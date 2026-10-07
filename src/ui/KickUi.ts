import Phaser from 'phaser';
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
    // Degradê em faixas (vermelho → laranja → verde → laranja → vermelho)
    const stops: [number, number][] = [
      [0, 0xe5484d],
      [0.28, 0xffb02e],
      [0.42, 0x3ccb5a],
      [0.58, 0x3ccb5a],
      [0.72, 0xffb02e],
      [1, 0xe5484d],
    ];
    bar.fillStyle(0x000000, 0.35);
    bar.fillRoundedRect(this.barX, by + 6, this.barW, 22, 11);
    for (let i = 0; i < stops.length - 1; i++) {
      const [t0, c0] = stops[i];
      const [t1, c1] = stops[i + 1];
      bar.fillGradientStyle(c0, c1, c0, c1, 1);
      bar.fillRect(this.barX + 6 + t0 * (this.barW - 12), by, (t1 - t0) * (this.barW - 12) + 1, 22);
    }
    bar.fillStyle(0xe5484d, 1);
    bar.fillCircle(this.barX + 11, by + 11, 11);
    bar.fillCircle(this.barX + this.barW - 11, by + 11, 11);
    bar.lineStyle(2, UI.dark, 1);
    bar.strokeRoundedRect(this.barX, by, this.barW, 22, 11);
    this.zone = scene.add.graphics().setDepth(D);
    this.zone.setData('y', by);
    this.needle = scene.add.rectangle(W / 2, by + 11, 5, 36, 0xffffff).setDepth(D + 1).setStrokeStyle(1.5, UI.dark);

    this.btn = new GlassButton(scene, W / 2, H - 30 - 30, { w: W - 40, h: 60, radius: 16, fill: 0xf26b1d, fillAlpha: 1, borderAlpha: 0.35, primary: true }).setDepth(D);
    this.btnText = title(scene, 0, 0, 'CHUTAR', 14, '#0D0D12').setOrigin(0.5);
    this.btn.add(this.btnText);
    this.btn.onTap = () => this.stop();

    this.wind = scene.add.container(0, 0).setDepth(D);
    this.info = scene.add.container(0, 0).setDepth(D);
    this.items.push(grad, bar, this.zone, this.needle, this.btn, this.wind, this.info);
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

  show(on: boolean) {
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
