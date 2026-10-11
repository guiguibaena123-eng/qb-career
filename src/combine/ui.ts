import Phaser from 'phaser';
import { COLLEGES, hexNum } from '../data/colleges';
import { fgOn } from '../data/teams';
import { GAME_H, GAME_W } from '../config';
import { getSave } from '../player/PlayerSave';
import { bottomGradient, GlassButton, label, title, UI } from '../ui/widgets';

/*
 * Interface do Combine no mesmo desenho da partida rápida (KickUi/LiveUi): degradê escuro embaixo,
 * botão principal largo na cor do time, botões de vidro, barra de agulha em degradê, pílulas de info
 * e painel com dica. A cor do botão principal é a da faculdade do jogador.
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
  return { color, fg: fgOn(color) };
}

export function bottomShade(scene: Phaser.Scene, height = 260) {
  return bottomGradient(scene, height, UI_DEPTH - 5);
}

/** Botão principal largo (como CHUTAR / SNAP), colado embaixo. */
export function primaryButton(scene: Phaser.Scene, text: string) {
  const { color, fg } = brand();
  const b = new GlassButton(scene, GAME_W / 2, GAME_H - 60, { w: GAME_W - 40, h: 60, radius: 16, fill: color, fillAlpha: 1, borderAlpha: 0.35, primary: true }).setDepth(UI_DEPTH);
  const t = title(scene, 0, 0, text, 14, fg).setOrigin(0.5);
  b.add(t);
  scene.add.existing(b);
  return { btn: b, text: t, fg };
}

/** Par de botões de vidro lado a lado (como CORRER / JOGAR FORA). */
export function sideButtons(scene: Phaser.Scene, a: string, b: string, onA: () => void, onB: () => void) {
  const w = (GAME_W - 28 - 12) / 2;
  const h = 78;
  const y = GAME_H - 28 - h / 2;
  const mk = (x: number, text: string, fn: () => void) => {
    const btn = new GlassButton(scene, x, y, { w, h, radius: 18 }).setDepth(UI_DEPTH);
    btn.add(title(scene, 0, 0, text, 14).setOrigin(0.5));
    btn.onDown = fn;
    scene.add.existing(btn);
    return btn;
  };
  return [mk(14 + w / 2, a, onA), mk(GAME_W - 14 - w / 2, b, onB)];
}

/** Pílula de informação (como VENTO / DISTÂNCIA): texto centralizado, fundo de vidro. */
export function pill(scene: Phaser.Scene, y: number) {
  const c = scene.add.container(GAME_W / 2, y).setDepth(UI_DEPTH);
  const g = scene.add.graphics();
  const t = title(scene, 0, 15, '', 8).setOrigin(0.5);
  c.add([g, t]);
  return {
    c,
    set(text: string, color = '#FFFFFF') {
      t.setText(text).setColor(color);
      const w = t.width + 28;
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(-w / 2, 4, w, 30, 12);
      g.fillStyle(0x22284a, 0.85);
      g.fillRoundedRect(-w / 2, 0, w, 30, 12);
      g.lineStyle(1, 0xffffff, 0.16);
      g.strokeRoundedRect(-w / 2, 0, w, 30, 12);
    },
  };
}

/**
 * Barra de agulha em degradê (verde na faixa boa, âmbar e vermelho fora), com agulha branca e
 * contorno da faixa. `centre` e `win` vão de −1 a 1 (posição e meia-largura da faixa boa).
 */
export class MeterBar {
  private bar: Phaser.GameObjects.Graphics;
  private needle: Phaser.GameObjects.Rectangle;
  private x0 = 20;
  private w = GAME_W - 40;

  constructor(scene: Phaser.Scene, private y: number) {
    this.bar = scene.add.graphics().setDepth(UI_DEPTH);
    this.needle = scene.add.rectangle(GAME_W / 2, y + 11, 5, 36, 0xffffff).setDepth(UI_DEPTH + 1).setStrokeStyle(1.5, UI.dark);
  }

  setVisible(v: boolean) {
    this.bar.setVisible(v);
    this.needle.setVisible(v);
  }

  /** Redesenha: faixa boa em `centre` com meia-largura `win`, agulha em `pos` (todos em −1..1). */
  draw(pos: number, centre: number, win: number, needle = true) {
    const g = this.bar;
    const by = this.y;
    const ix = this.x0 + 6;
    const iw = this.w - 12;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(this.x0, by + 6, this.w, 22, 11);
    const N = 64;
    for (let i = 0; i < N; i++) {
      const u = ((i + 0.5) / N) * 2 - 1;
      const d = Math.abs(u - centre) / Math.max(0.05, win);
      const col = d <= 0.85 ? 0x3ccb5a : d <= 1.05 ? mix(0x3ccb5a, 0xffb02e, (d - 0.85) / 0.2) : d <= 1.6 ? mix(0xffb02e, 0xe5484d, (d - 1.05) / 0.55) : 0xe5484d;
      g.fillStyle(col, 1);
      g.fillRect(ix + (i / N) * iw, by, iw / N + 1, 22);
    }
    g.fillStyle(0xe5484d, 1);
    g.fillCircle(this.x0 + 11, by + 11, 11);
    g.fillCircle(this.x0 + this.w - 11, by + 11, 11);
    g.lineStyle(2, UI.dark, 1);
    g.strokeRoundedRect(this.x0, by, this.w, 22, 11);
    const half = win * (iw / 2);
    const cx = GAME_W / 2 + (centre * iw) / 2;
    g.lineStyle(2, 0xffffff, 0.85);
    g.strokeRect(cx - half, by - 3, half * 2, 28);
    this.needle.setVisible(needle).setX(GAME_W / 2 + (pos * iw) / 2);
  }
}

/** Painel de vidro com título e valor (como o painel FORÇA do passe) e uma dica embaixo. */
export function infoPanel(scene: Phaser.Scene, heading: string, hint: string) {
  const W = GAME_W;
  const H = GAME_H;
  const by = H - 104 + 12;
  const bh = 104 - 12 - 16;
  const px = 14;
  const pw = W - 28;
  const g = scene.add.graphics().setDepth(UI_DEPTH);
  g.fillStyle(0x000000, 0.28);
  g.fillRoundedRect(px, by + 4, pw, bh, 18);
  g.fillStyle(0x22284a, 0.6);
  g.fillRoundedRect(px, by, pw, bh, 18);
  g.lineStyle(1, 0xffffff, 0.12);
  g.strokeRoundedRect(px, by, pw, bh, 18);
  label(scene, px + 14, by + 16, heading, 10, '#C9CEE0').setDepth(UI_DEPTH);
  const value = title(scene, px + pw - 14, by + 17, '', 9, UI.yellow).setOrigin(1, 0).setDepth(UI_DEPTH);
  const bar = scene.add.graphics().setDepth(UI_DEPTH);
  label(scene, px + 14, by + 56, hint, 10, '#C9CEE0').setDepth(UI_DEPTH);
  return {
    /** k de 0 a 1: preenche os 10 segmentos como a barra de FORÇA. */
    set(k: number, text: string) {
      value.setText(text);
      bar.clear();
      const segs = 10;
      const w = pw - 28;
      const sw = (w - (segs - 1) * 3) / segs;
      for (let i = 0; i < segs; i++) {
        const on = (i + 1) / segs <= k + 0.001;
        bar.fillStyle(on ? (i < 4 ? 0x3ccb5a : i < 7 ? 0xffb02e : 0xe5484d) : 0x0a0c1a, on ? 1 : 0.7);
        bar.fillRoundedRect(px + 14 + i * (sw + 3), by + 34, sw, 12, 3);
      }
    },
  };
}
