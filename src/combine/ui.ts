import Phaser from 'phaser';
import { COLLEGES, hexNum } from '../data/colleges';
import { GAME_H, GAME_W } from '../config';
import { getSave } from '../player/PlayerSave';
import { bottomGradient } from '../ui/widgets';
import { C, inkOn, plate, plateLine, plateShadow, TV, TvButton, tvText } from '../ui/tv';

/*
 * Interface dos testes do Combine no pacote da transmissão (placas com corte de 12°, fonte condensada):
 * degradê escuro embaixo, botão principal largo na cor da faculdade, botões de placa, barra de agulha,
 * pílula de informação e painel com dica.
 */
export const UI_DEPTH = 95;

const mix = (a: number, b: number, k: number) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
};

/** Cor principal da faculdade e a cor do texto por cima dela. */
export function brand() {
  const c = COLLEGES.find((k) => k.id === getSave().college.id) ?? COLLEGES[0];
  const color = hexNum(c.colors[0]);
  return { color, fg: inkOn(color) };
}

export function bottomShade(scene: Phaser.Scene, height = 260) {
  return bottomGradient(scene, height, UI_DEPTH - 5);
}

/** Texto grande sobre o campo (relógio, aviso): fonte de transmissão com contorno escuro. */
export function fieldText(scene: Phaser.Scene, x: number, y: number, size: number, color: string = C.white) {
  return tvText(scene, x, y, '', size, color, 800, 0.6).setOrigin(0.5).setStroke('#0B0E14', Math.max(5, size / 7)).setDepth(50);
}

/** Botão principal largo (como CHUTAR / SNAP), colado embaixo. */
export function primaryButton(scene: Phaser.Scene, text: string) {
  const { color, fg } = brand();
  const b = new TvButton(scene, GAME_W / 2, GAME_H - 52, { w: GAME_W - 32, h: 64, fill: color, fillAlpha: 1, primary: true }).setDepth(UI_DEPTH);
  const t = tvText(scene, 0, 0, text, 26, fg, 800, 2).setOrigin(0.5);
  b.add(t);
  return { btn: b, text: t, fg };
}

/** Par de botões lado a lado (como CORRER / JOGAR FORA). */
export function sideButtons(scene: Phaser.Scene, a: string, b: string, onA: () => void, onB: () => void) {
  const w = (GAME_W - 32 - 8) / 2;
  const h = 80;
  const y = GAME_H - 26 - h / 2;
  const mk = (x: number, text: string, fn: () => void) => {
    const btn = new TvButton(scene, x, y, { w, h, fill: TV.ink2, fillAlpha: 0.96 }).setDepth(UI_DEPTH);
    btn.add(tvText(scene, 0, 0, text, 28, C.white, 800, 2).setOrigin(0.5));
    btn.onDown = fn;
    return btn;
  };
  return [mk(16 + w / 2, a, onA), mk(GAME_W - 16 - w / 2, b, onB)];
}

/** Pílula de informação (como VENTO / DISTÂNCIA): placa de tinta com o texto no meio. */
export function pill(scene: Phaser.Scene, y: number) {
  const c = scene.add.container(GAME_W / 2, y).setDepth(UI_DEPTH);
  const g = scene.add.graphics();
  const t = tvText(scene, 0, 16, '', 15, C.white, 800, 1.2).setOrigin(0.5);
  c.add([g, t]);
  return {
    c,
    set(text: string, color: string = C.white) {
      t.setText(text).setColor(color);
      const w = t.width + 36;
      g.clear();
      plateShadow(g, -w / 2, 0, w, 32);
      plate(g, -w / 2, 0, w, 32, TV.ink, 0.92);
      g.fillStyle(TV.yellow, 1);
      g.fillRect(-w / 2 + 7, 0, w - 7, 2);
    },
  };
}

/**
 * Barra de agulha (verde na faixa boa, âmbar e vermelho fora), com agulha branca e contorno da faixa.
 * `centre` e `win` vão de −1 a 1 (posição e meia-largura da faixa boa).
 */
export class MeterBar {
  private bar: Phaser.GameObjects.Graphics;
  private needle: Phaser.GameObjects.Rectangle;
  private x0 = 20;
  private w = GAME_W - 40;

  constructor(scene: Phaser.Scene, private y: number) {
    this.bar = scene.add.graphics().setDepth(UI_DEPTH);
    this.needle = scene.add.rectangle(GAME_W / 2, y + 11, 5, 36, 0xffffff).setDepth(UI_DEPTH + 1).setStrokeStyle(2, TV.ink);
  }

  setVisible(v: boolean) {
    this.bar.setVisible(v);
    this.needle.setVisible(v);
  }

  /** Redesenha: faixa boa em `centre` com meia-largura `win`, agulha em `pos` (todos em −1..1). */
  draw(pos: number, centre: number, win: number, needle = true) {
    const g = this.bar;
    const by = this.y;
    const ix = this.x0 + 8;
    const iw = this.w - 16;
    g.clear();
    plateShadow(g, this.x0, by - 4, this.w, 30);
    plate(g, this.x0, by - 4, this.w, 30, TV.ink, 1);
    const N = 64;
    for (let i = 0; i < N; i++) {
      const u = ((i + 0.5) / N) * 2 - 1;
      const d = Math.abs(u - centre) / Math.max(0.05, win);
      const col = d <= 0.85 ? TV.green : d <= 1.05 ? mix(TV.green, 0xffb02e, (d - 0.85) / 0.2) : d <= 1.6 ? mix(0xffb02e, TV.red, (d - 1.05) / 0.55) : TV.red;
      g.fillStyle(col, 1);
      g.fillRect(ix + (i / N) * iw, by + 2, iw / N + 0.6, 18);
    }
    const half = win * (iw / 2);
    const cx = GAME_W / 2 + (centre * iw) / 2;
    g.lineStyle(2, TV.plate, 1);
    g.strokeRect(cx - half, by - 1, half * 2, 24);
    this.needle.setVisible(needle).setX(GAME_W / 2 + (pos * iw) / 2);
  }
}

/** Painel com título e valor (como o painel FORÇA do passe) e uma dica embaixo. */
export function infoPanel(scene: Phaser.Scene, heading: string, hint: string) {
  const W = GAME_W;
  const H = GAME_H;
  const by = H - 96;
  const bh = 78;
  const px = 16;
  const pw = W - 32;
  const g = scene.add.graphics().setDepth(UI_DEPTH);
  plateShadow(g, px, by, pw, bh);
  plate(g, px, by, pw, bh, TV.ink, 0.94);
  plateLine(g, px, by, pw, bh, TV.rule, 1, 1);
  tvText(scene, px + 18, by + 16, heading, 13, C.muted, 800, 1.4).setOrigin(0, 0.5).setDepth(UI_DEPTH);
  const value = tvText(scene, px + pw - 18, by + 16, '', 16, C.yellow, 800, 0.6).setOrigin(1, 0.5).setDepth(UI_DEPTH);
  const bar = scene.add.graphics().setDepth(UI_DEPTH);
  tvText(scene, px + 18, by + 60, hint, 13, C.muted, 700, 1).setOrigin(0, 0.5).setDepth(UI_DEPTH);
  return {
    /** k de 0 a 1: preenche os 10 segmentos como a barra de FORÇA. */
    set(k: number, text: string) {
      value.setText(text);
      bar.clear();
      const segs = 10;
      const w = pw - 36;
      const sw = (w - (segs - 1) * 3) / segs;
      for (let i = 0; i < segs; i++) {
        const on = (i + 1) / segs <= k + 0.001;
        bar.fillStyle(on ? (i < 4 ? TV.green : i < 7 ? 0xffb02e : TV.red) : TV.ink3, 1);
        bar.fillRect(px + 18 + i * (sw + 3), by + 31, sw, 12);
      }
    },
  };
}
