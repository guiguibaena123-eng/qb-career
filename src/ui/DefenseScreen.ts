import Phaser from 'phaser';
import type { DriveResult } from '../systems/oppdrive';
import { GlassButton, label, title, UI } from './widgets';

/*
 * Tela "Defesa" do design: o jogo fica borrado ao fundo e a campanha deles
 * aparece jogada a jogada (feed), com a barra CAMPANHA (campo em miniatura),
 * e no fim o card "SUA VEZ!" com 2X e ENTRAR EM CAMPO.
 * O desfoque é feito sem filtros (reduz a imagem e amplia de novo), funciona em qualquer celular.
 */

const ROW_H = 40;
const MAX_ROWS = 6;

export interface DefenseOpts {
  drive: DriveResult;
  teamColor: number;
  oppColor: number;
  homeAbbr: string;
  awayAbbr: string;
  awayName: string;
  clockText: string;
  head: string;
  onEnter: () => void;
  /** Chamado quando a campanha termina (placar e relógio atualizam aqui). */
  onFinish?: () => void;
}

export class DefenseScreen {
  private root: Phaser.GameObjects.Container | null = null;
  private bgKey = 'def-blur';
  private shown = 0;
  private timer = 0;
  private static fast = false;
  private get speed() {
    return DefenseScreen.fast ? 2 : 1;
  }
  private o: DefenseOpts | null = null;
  private rowsC!: Phaser.GameObjects.Container;
  private ball!: Phaser.GameObjects.Ellipse;
  private trail!: Phaser.GameObjects.Graphics;
  private stripX = 0;
  private stripW = 0;
  private stripY = 0;
  private dots: Phaser.GameObjects.Rectangle[] = [];
  private done = false;

  constructor(private scene: Phaser.Scene) {}

  get visible() {
    return !!this.root;
  }

  /** Tira um "print" do jogo, borra e abre a tela. */
  open(o: DefenseOpts) {
    this.close();
    this.o = o;
    this.shown = 0;
    this.timer = 0.4;
    this.done = false;
    const sc = this.scene;
    sc.game.renderer.snapshot((img) => {
      if (!this.o) return;
      this.build(img as HTMLImageElement);
    });
  }

  private build(img: HTMLImageElement) {
    const sc = this.scene;
    const o = this.o!;
    const W = sc.scale.width;
    const H = sc.scale.height;
    // Desfoque barato: reduz 10x e amplia com suavização
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(W / 10));
    small.height = Math.max(1, Math.round(H / 10));
    const sctx = small.getContext('2d')!;
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(img, 0, 0, small.width, small.height);
    if (sc.textures.exists(this.bgKey)) sc.textures.remove(this.bgKey);
    const tex = sc.textures.createCanvas(this.bgKey, W, H)!;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, W, H);
    tex.refresh();

    const root = (this.root = sc.add.container(0, 0).setDepth(99));
    const bg = sc.add.image(0, 0, this.bgKey).setOrigin(0);
    const dim = sc.add.rectangle(0, 0, W, H, 0x0a0c1a, 0.45).setOrigin(0);
    // Bloqueia toques no campo enquanto a tela está aberta
    dim.setInteractive();
    root.add([bg, dim]);

    const L = 14;
    const R = W - 14;
    const panel = (y: number, h: number, border = 0xffffff, ba = 0.14) => {
      const g = sc.add.graphics();
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(L, y + 6, R - L, h, 12);
      g.fillStyle(0x22284a, 0.82);
      g.fillRoundedRect(L, y, R - L, h, 12);
      g.lineStyle(1, border, ba);
      g.strokeRoundedRect(L, y, R - L, h, 12);
      return g;
    };
    // Cabeçalho "TOUROS COM A BOLA · SIMULANDO..."
    let y = 76;
    const sq = sc.add.graphics();
    sq.fillStyle(0xffffff, 1);
    sq.fillRoundedRect(L + 10, y + 14, 18, 18, 5);
    sq.fillStyle(o.oppColor, 1);
    sq.fillRoundedRect(L + 12, y + 16, 14, 14, 4);
    const ht = title(sc, L + 36, y + 23, `${o.awayName} COM A BOLA`, 9).setOrigin(0, 0.5);
    const sim = label(sc, R - 34, y + 23, 'SIMULANDO', 9, UI.muted).setOrigin(1, 0.5);
    root.add([panel(y, 46), sq, ht, sim]);
    this.dots = [0, 1, 2].map((i) => {
      const d = sc.add.rectangle(R - 28 + i * 7, y + 21, 4, 4, 0xffd23f).setOrigin(0);
      sc.tweens.add({ targets: d, alpha: 0.2, yoyo: true, repeat: -1, duration: 500, delay: i * 200 });
      return d;
    });
    root.add(this.dots);

    // CAMPANHA: campo em miniatura
    y += 56;
    const plays = o.drive.rows.length;
    const secs = o.drive.seconds;
    root.add(panel(y, 58));
    root.add(label(sc, L + 12, y + 14, 'CAMPANHA', 9, UI.muted).setOrigin(0, 0.5));
    root.add(label(sc, R - 12, y + 14, `${plays} JOGADAS · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 9, UI.muted).setOrigin(1, 0.5));
    const sx = L + 12;
    const sw = R - L - 24;
    const sy = y + 28;
    const ez = sw * 0.09;
    const strip = sc.add.graphics();
    strip.fillStyle(UI.dark, 1);
    strip.fillRoundedRect(sx - 2, sy - 2, sw + 4, 24, 4);
    strip.fillStyle(o.teamColor, 1);
    strip.fillRect(sx, sy, ez, 20);
    strip.fillStyle(0x3f8e39, 1);
    strip.fillRect(sx + ez, sy, sw - 2 * ez, 20);
    strip.fillStyle(o.oppColor, 1);
    strip.fillRect(sx + sw - ez, sy, ez, 20);
    strip.fillStyle(0xffffff, 0.35);
    for (let k = 1; k < 10; k++) strip.fillRect(sx + ez + ((sw - 2 * ez) * k) / 10, sy, 1, 20);
    root.add([
      strip,
      label(sc, sx + ez / 2, sy + 10, o.homeAbbr, 8, '#0D0D12').setOrigin(0.5),
      label(sc, sx + sw - ez / 2, sy + 10, o.awayAbbr, 8, '#FFFFFF').setOrigin(0.5),
    ]);
    this.stripX = sx + ez;
    this.stripW = sw - 2 * ez;
    this.stripY = sy;
    this.trail = sc.add.graphics();
    this.ball = sc.add.ellipse(this.yToX(o.drive.start), sy + 10, 10, 8, 0x8a4b1f).setStrokeStyle(1, UI.dark);
    sc.tweens.add({ targets: this.ball, scale: 1.25, yoyo: true, repeat: -1, duration: 500 });
    root.add([this.trail, this.ball]);

    y += 68;
    this.rowsC = sc.add.container(0, y);
    root.add(this.rowsC);

    // Toque na tela acelera
    dim.on('pointerdown', () => {
      if (!this.done) this.timer = 0;
    });
  }

  private yToX(y: number) {
    return this.stripX + (y / 100) * this.stripW;
  }

  private addRow(i: number) {
    const sc = this.scene;
    const o = this.o!;
    const r = o.drive.rows[i];
    const W = sc.scale.width;
    const L = 14;
    const R = W - 14;
    // Rola para cima quando passa do limite
    const idx = Math.min(i, MAX_ROWS - 1);
    if (i >= MAX_ROWS) {
      const first = this.rowsC.list[0] as Phaser.GameObjects.Container;
      first.destroy();
      this.rowsC.list.forEach((c) => sc.tweens.add({ targets: c, y: (c as Phaser.GameObjects.Container).y - (ROW_H + 8), duration: 200 }));
    }
    const c = sc.add.container(0, idx * (ROW_H + 8)).setAlpha(0);
    const g = sc.add.graphics();
    g.fillStyle(0x22284a, 0.82);
    g.fillRoundedRect(L, 0, R - L, ROW_H, 12);
    const bc = r.tone === 'good' ? 0x3ccb5a : r.tone === 'bad' ? 0xe5484d : r.tone === 'end' ? 0xffd23f : 0xffffff;
    g.lineStyle(1, bc, r.tone === 'normal' ? 0.14 : 0.9);
    g.strokeRoundedRect(L, 0, R - L, ROW_H, 12);
    const col = r.tone === 'good' ? '#3CCB5A' : r.tone === 'bad' ? '#FF7B80' : r.tone === 'end' ? '#FFD23F' : '#FFFFFF';
    c.add([
      g,
      title(sc, L + 10, 13, r.down, 8, UI.yellow).setOrigin(0, 0.5),
      label(sc, L + 10, 28, r.spot, 9, UI.muted).setOrigin(0, 0.5),
      label(sc, L + 92, ROW_H / 2, r.text, 10, col).setOrigin(0, 0.5),
    ]);
    this.rowsC.add(c);
    sc.tweens.add({ targets: c, alpha: 1, x: { from: 16, to: 0 }, duration: 300, ease: 'Quad.Out' });
    // Bola anda na miniatura
    const from = this.ball.x;
    const to = this.yToX(Math.max(0, r.y));
    this.trail.lineStyle(2, 0xffffff, 0.9);
    for (let x = Math.min(from, to); x < Math.max(from, to); x += 6) this.trail.lineBetween(x, this.stripY + 10, Math.min(x + 3, Math.max(from, to)), this.stripY + 10);
    sc.tweens.add({ targets: this.ball, x: to, duration: 350 });
    if (r.tone === 'good') navigator.vibrate?.(15);
  }

  private finish() {
    const sc = this.scene;
    const o = this.o!;
    this.done = true;
    o.onFinish?.();
    this.dots.forEach((d) => d.setVisible(false));
    const W = sc.scale.width;
    const H = sc.scale.height;
    const L = 14;
    const R = W - 14;
    const bh = 140;
    const y = H - bh - 22;
    const c = sc.add.container(0, 0).setAlpha(0);
    const g = sc.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(L, y + 6, R - L, bh, 12);
    g.fillStyle(0x22284a, 0.92);
    g.fillRoundedRect(L, y, R - L, bh, 12);
    g.lineStyle(1, 0xffd23f, 0.7);
    g.strokeRoundedRect(L, y, R - L, bh, 12);
    const t = sc.add
      .text(W / 2, y + 26, 'SUA VEZ!', { fontFamily: '"Press Start 2P", monospace', fontSize: '20px', color: '#FFD23F', shadow: { offsetX: 3, offsetY: 3, color: '#0D0D12', fill: true } })
      .setOrigin(0.5);
    const s = label(sc, W / 2, y + 54, o.head, 11, '#E8EAF2').setOrigin(0.5);
    const b2 = new GlassButton(sc, L + 14 + 40, y + bh - 14 - 26, { w: 80, h: 52, radius: 16 });
    const b2t = title(sc, 0, 0, DefenseScreen.fast ? '1X' : '2X', 10).setOrigin(0.5);
    b2.add(b2t);
    b2.onTap = () => {
      DefenseScreen.fast = !DefenseScreen.fast;
      b2t.setText(DefenseScreen.fast ? '1X' : '2X');
    };
    const wGo = R - L - 28 - 90;
    const go = new GlassButton(sc, R - 14 - wGo / 2, y + bh - 14 - 26, { w: wGo, h: 52, radius: 16, fill: o.teamColor, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    go.add(title(sc, 0, 0, 'ENTRAR EM CAMPO', 10, '#0D0D12').setOrigin(0.5));
    go.onTap = () => {
      const cb = this.o?.onEnter;
      this.close();
      cb?.();
    };
    c.add([g, t, s, b2, go]);
    this.root!.add(c);
    sc.tweens.add({ targets: c, alpha: 1, y: { from: 14, to: 0 }, duration: 400, ease: 'Quad.Out' });
  }

  update(dt: number) {
    if (!this.root || this.done || !this.o) return;
    this.timer -= dt * this.speed;
    if (this.timer > 0) return;
    if (this.shown < this.o.drive.rows.length) {
      this.addRow(this.shown++);
      this.timer = 0.7;
    } else this.finish();
  }

  close() {
    this.o = null;
    this.root?.destroy();
    this.root = null;
  }
}
