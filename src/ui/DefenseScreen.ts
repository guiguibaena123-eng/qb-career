import Phaser from 'phaser';
import { GAME_H, GAME_W, TEAMS, VIEW } from '../config';
import type { DriveResult } from '../systems/oppdrive';
import { C, inkOn, plate, plateLine, plateShadow, TV, TvButton, tvText } from './tv';

/*
 * Campanha do adversário (simulada), no pacote da transmissão: o jogo fica borrado ao fundo e a campanha
 * deles aparece jogada a jogada (feed), com a placa CAMPANHA (campo em miniatura). A velocidade (1X/2X)
 * fica no topo durante toda a simulação; no fim, a tarja "SUA VEZ!" com ENTRAR EM CAMPO.
 * O desfoque é feito sem filtros (reduz a imagem e amplia de novo), funciona em qualquer celular.
 */

const ROW_H = 46;
const ROW_GAP = 6;
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

/** Bola de futebol americano desenhada. */
function football(g: Phaser.GameObjects.Graphics, x: number, y: number, k = 1) {
  g.fillStyle(0x8a4a22, 1);
  g.fillEllipse(x, y, 20 * k, 12 * k);
  g.lineStyle(1.5, 0xffffff, 1);
  g.lineBetween(x - 5 * k, y, x + 5 * k, y);
  for (const d of [-3, 0, 3]) g.lineBetween(x + d * k, y - 2.5 * k, x + d * k, y + 2.5 * k);
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
  private status!: Phaser.GameObjects.Text;
  private speedBtn: TvButton | null = null;
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
    }, 'image/jpeg', 0.6); // vai ser desfocado: JPEG é bem mais rápido de gerar que PNG
  }

  private build(img: HTMLImageElement) {
    const sc = this.scene;
    const o = this.o!;
    const W = GAME_W;
    const H = GAME_H;
    // Desfoque barato: reduz 10x e amplia com suavização (o print é da tela inteira, VIEW)
    const VW = Math.round(VIEW.w);
    const VH = Math.round(VIEW.h);
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(VW / 10));
    small.height = Math.max(1, Math.round(VH / 10));
    const sctx = small.getContext('2d')!;
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(img, 0, 0, small.width, small.height);
    if (sc.textures.exists(this.bgKey)) sc.textures.remove(this.bgKey);
    const tex = sc.textures.createCanvas(this.bgKey, VW, VH)!;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, VW, VH);
    tex.refresh();

    const root = (this.root = sc.add.container(0, 0).setDepth(99));
    const bg = sc.add.image(VIEW.x, VIEW.y, this.bgKey).setOrigin(0).setDisplaySize(VIEW.w, VIEW.h);
    const dim = sc.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, TV.ink, 0.58).setOrigin(0);
    root.add([bg, dim]);

    const L = 16;
    const R = W - 16;
    // ---- tarja de cima: quem está com a bola, status e a velocidade
    let y = 82;
    const hg = sc.add.graphics();
    plateShadow(hg, L, y, R - L, 54);
    plate(hg, L, y, R - L, 54, TV.ink, 0.96);
    plate(hg, L, y, 58, 54, o.oppColor, 1, true, true);
    football(hg, L + 30, y + 27, 1.1);
    root.add(hg);
    const ht = tvText(sc, L + 72, y + 18, `${o.awayName} COM A BOLA`, 18, C.white, 800, 0.6).setOrigin(0, 0.5);
    if (ht.width > R - L - 72 - 80) ht.setScale((R - L - 72 - 80) / ht.width, 1);
    this.status = tvText(sc, L + 72, y + 38, 'CAMPANHA DO ADVERSÁRIO · SIMULANDO', 12, C.muted, 700, 1.2).setOrigin(0, 0.5);
    root.add([ht, this.status]);
    this.dots = [0, 1, 2].map((i) => {
      const d = sc.add.rectangle(L + 72 + this.status.width + 8 + i * 7, y + 36, 4, 4, TV.yellow).setOrigin(0);
      sc.tweens.add({ targets: d, alpha: 0.2, yoyo: true, repeat: -1, duration: 500, delay: i * 200 });
      return d;
    });
    root.add(this.dots);
    // velocidade da simulação (vale para as próximas também)
    const sb = (this.speedBtn = new TvButton(sc, R - 36, y + 27, { w: 56, h: 38, fill: DefenseScreen.fast ? TV.yellow : TV.ink3, fillAlpha: 1 }));
    const sbt = tvText(sc, 0, 0, DefenseScreen.fast ? '2X' : '1X', 18, DefenseScreen.fast ? C.ink : C.white, 800, 1).setOrigin(0.5);
    sb.add(sbt);
    sb.onTap = () => {
      DefenseScreen.fast = !DefenseScreen.fast;
      sb.setFill(DefenseScreen.fast ? TV.yellow : TV.ink3, 1);
      sbt.setText(DefenseScreen.fast ? '2X' : '1X').setColor(DefenseScreen.fast ? C.ink : C.white);
    };
    root.add(sb);

    // ---- CAMPANHA: campo em miniatura
    y += 64;
    const plays = o.drive.rows.length;
    const secs = o.drive.seconds;
    const cg = sc.add.graphics();
    plate(cg, L, y, R - L, 64, TV.ink2, 0.96);
    plateLine(cg, L, y, R - L, 64, TV.rule, 1, 1);
    root.add(cg);
    root.add(tvText(sc, L + 16, y + 15, 'CAMPANHA', 13, C.white, 800, 1.6).setOrigin(0, 0.5));
    root.add(tvText(sc, R - 16, y + 15, `${plays} JOGADAS · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 13, C.muted, 700, 1).setOrigin(1, 0.5));
    const sx = L + 16;
    const sw = R - L - 32;
    const sy = y + 30;
    const ez = sw * 0.09;
    const strip = sc.add.graphics();
    strip.fillStyle(TV.ink, 1);
    strip.fillRect(sx - 2, sy - 2, sw + 4, 26);
    strip.fillStyle(o.teamColor, 1);
    strip.fillRect(sx, sy, ez, 22);
    strip.fillStyle(0x3f8e39, 1);
    strip.fillRect(sx + ez, sy, sw - 2 * ez, 22);
    strip.fillStyle(0x000000, 0.12);
    for (let k = 0; k < 10; k += 2) strip.fillRect(sx + ez + ((sw - 2 * ez) * k) / 10, sy, (sw - 2 * ez) / 10, 22);
    strip.fillStyle(o.oppColor, 1);
    strip.fillRect(sx + sw - ez, sy, ez, 22);
    strip.fillStyle(0xffffff, 0.4);
    for (let k = 1; k < 10; k++) strip.fillRect(sx + ez + ((sw - 2 * ez) * k) / 10, sy, 1, 22);
    root.add([
      strip,
      tvText(sc, sx + ez / 2, sy + 11, o.homeAbbr, 11, inkOn(o.teamColor), 800, 0.6).setOrigin(0.5),
      tvText(sc, sx + sw - ez / 2, sy + 11, o.awayAbbr, 11, inkOn(o.oppColor), 800, 0.6).setOrigin(0.5),
    ]);
    this.stripX = sx + ez;
    this.stripW = sw - 2 * ez;
    this.stripY = sy;
    this.trail = sc.add.graphics();
    this.ball = sc.add.ellipse(this.yToX(o.drive.start), sy + 11, 12, 8, 0x8a4b1f).setStrokeStyle(1.5, TV.ink);
    sc.tweens.add({ targets: this.ball, scale: 1.25, yoyo: true, repeat: -1, duration: 500 });
    root.add([this.trail, this.ball]);

    y += 76;
    this.rowsC = sc.add.container(0, y);
    root.add(this.rowsC);
  }

  /** Toque na tela (a cena repassa): pula a espera da próxima jogada. */
  tap() {
    if (this.root && !this.done) this.timer = 0;
  }

  private yToX(y: number) {
    return this.stripX + (y / 100) * this.stripW;
  }

  private addRow(i: number) {
    const sc = this.scene;
    const o = this.o!;
    const r = o.drive.rows[i];
    const W = GAME_W;
    const L = 16;
    const R = W - 16;
    // Rola para cima quando passa do limite
    const idx = Math.min(i, MAX_ROWS - 1);
    if (i >= MAX_ROWS) {
      const first = this.rowsC.list[0] as Phaser.GameObjects.Container;
      first.destroy();
      this.rowsC.list.forEach((c) => sc.tweens.add({ targets: c, y: (c as Phaser.GameObjects.Container).y - (ROW_H + ROW_GAP), duration: 200 }));
    }
    const c = sc.add.container(0, idx * (ROW_H + ROW_GAP)).setAlpha(0);
    const g = sc.add.graphics();
    // tom da jogada: verde = boa para você, vermelho = ruim, amarelo = fim da campanha
    const tc = r.tone === 'good' ? TV.green : r.tone === 'bad' ? TV.red : r.tone === 'end' ? TV.yellow : TV.ink3;
    plate(g, L, 0, R - L, ROW_H, TV.ink2, 0.96);
    plate(g, L, 0, 78, ROW_H, tc, 1, true, true);
    if (r.tone !== 'normal') plateLine(g, L, 0, R - L, ROW_H, tc, 1, 1.5);
    const fg = r.tone === 'normal' ? C.white : tc === TV.yellow ? C.ink : C.white;
    const tx = tvText(sc, L + 92, ROW_H / 2, r.text, 15, C.white, 700, 0.4).setOrigin(0, 0.5);
    if (tx.width > R - L - 104) tx.setScale((R - L - 104) / tx.width, 1);
    c.add([
      g,
      tvText(sc, L + 42, 15, r.down, 13, fg, 800, 0.8).setOrigin(0.5),
      tvText(sc, L + 40, 32, r.spot, 11, r.tone === 'normal' ? C.muted : fg, 700, 0.6).setOrigin(0.5).setAlpha(r.tone === 'normal' ? 1 : 0.85),
      tx,
    ]);
    this.rowsC.add(c);
    sc.tweens.add({ targets: c, alpha: 1, x: { from: -24, to: 0 }, duration: 320, ease: 'Expo.Out' });
    // Bola anda na miniatura
    const from = this.ball.x;
    const to = this.yToX(Math.max(0, r.y));
    this.trail.lineStyle(2, 0xffffff, 0.9);
    for (let x = Math.min(from, to); x < Math.max(from, to); x += 6) this.trail.lineBetween(x, this.stripY + 11, Math.min(x + 3, Math.max(from, to)), this.stripY + 11);
    sc.tweens.add({ targets: this.ball, x: to, duration: 350 });
    if (r.tone === 'good') navigator.vibrate?.(15);
  }

  private finish() {
    const sc = this.scene;
    const o = this.o!;
    this.done = true;
    o.onFinish?.();
    this.dots.forEach((d) => d.setVisible(false));
    this.status.setText('CAMPANHA ENCERRADA').setColor(C.yellow);
    this.speedBtn?.setVisible(false);
    const W = GAME_W;
    const H = GAME_H;
    const L = 16;
    const R = W - 16;
    const bh = 156;
    const y = H - bh - 20;
    const c = sc.add.container(0, 0).setAlpha(0);
    const g = sc.add.graphics();
    plateShadow(g, L, y, R - L, bh);
    plate(g, L, y, R - L, bh, TV.ink, 0.97);
    g.fillStyle(TV.yellow, 1);
    g.fillRect(L + 12, y, R - L - 12, 4);
    const chip = sc.add.graphics();
    plate(chip, W / 2 - 66, y - 12, 132, 24, TV.yellow);
    const ct = tvText(sc, W / 2, y, 'SUA VEZ!', 15, C.ink, 800, 2.4).setOrigin(0.5);
    const s = tvText(sc, W / 2, y + 40, o.head, 17, C.white, 800, 0.6).setOrigin(0.5);
    if (s.width > R - L - 32) s.setScale((R - L - 32) / s.width, 1);
    const go = new TvButton(sc, W / 2, y + bh - 50, { w: R - L - 32, h: 62, fill: o.teamColor, fillAlpha: 1, primary: true });
    const gt = tvText(sc, -10, 0, 'ENTRAR EM CAMPO', 24, TEAMS.home.fg, 800, 1.4).setOrigin(0.5);
    const ar = sc.add.graphics();
    ar.lineStyle(3, parseInt(TEAMS.home.fg.slice(1), 16), 1);
    ar.beginPath();
    ar.moveTo((R - L - 32) / 2 - 32, -9);
    ar.lineTo((R - L - 32) / 2 - 23, 0);
    ar.lineTo((R - L - 32) / 2 - 32, 9);
    ar.strokePath();
    go.add([gt, ar]);
    go.onTap = () => {
      const cb = this.o?.onEnter;
      this.close();
      cb?.();
    };
    c.add([g, chip, ct, s, go]);
    this.root!.add(c);
    sc.tweens.add({ targets: c, alpha: 1, y: { from: 18, to: 0 }, duration: 420, ease: 'Expo.Out' });
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
    this.speedBtn = null;
    this.root?.destroy();
    this.root = null;
  }
}
