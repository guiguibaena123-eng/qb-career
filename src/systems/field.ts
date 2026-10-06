import Phaser from 'phaser';
import { COLORS, FIELD, FONT_TITLE, TEAMS } from '../config';
import { drawGoalPost, drawPylon } from '../entities/GoalPost';
import type { Projection } from './projection';

const a = { x: 0, y: 0, s: 0 };
const b = { x: 0, y: 0, s: 0 };
const c = { x: 0, y: 0, s: 0 };
const d = { x: 0, y: 0, s: 0 };
const pts = [a, b, c, d];

/**
 * Desenha o gramado em perspectiva: listras, linhas, hash marks, números,
 * end zones, linha de scrimmage/first down, traves e pylons.
 * Tudo é redesenhado a cada frame num único Graphics (barato: poucas centenas de polígonos).
 */
export class FieldRenderer {
  private g: Phaser.GameObjects.Graphics;
  private numbers: { t: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private ezTexts: { t: Phaser.GameObjects.Text; y: number }[] = [];

  /** Linha de scrimmage e de first down (em jardas, eixo y). */
  scrimmageY = 25;
  firstDownY = 35;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    this.g = scene.add.graphics().setDepth(0);

    // Números a cada 10 jardas, dos dois lados do campo
    for (let yd = 10; yd <= 90; yd += 10) {
      const label = String(yd <= 50 ? yd : 100 - yd);
      for (const x of [9, FIELD.width - 9]) {
        const t = scene.add
          .text(0, 0, label, { fontFamily: FONT_TITLE, fontSize: '40px', color: '#ffffff' })
          .setOrigin(0.5, 1)
          .setAlpha(0.92)
          .setDepth(1);
        this.numbers.push({ t, x, y: yd });
      }
    }
    // Nome dos times nas end zones
    const ez = [
      { name: TEAMS.home.name, y: -5 },
      { name: TEAMS.away.name, y: 105 },
    ];
    for (const e of ez) {
      const t = scene.add
        .text(0, 0, e.name, { fontFamily: FONT_TITLE, fontSize: '64px', color: '#ffffff' })
        .setOrigin(0.5, 0.5)
        .setAlpha(0.85)
        .setDepth(1);
      this.ezTexts.push({ t, y: e.y });
    }
  }

  /** Retângulo no chão (x0..x1, y0..y1) recortado pela faixa visível. */
  private quad(x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1) {
    const near = this.proj.nearY;
    const far = this.proj.camY + 160;
    if (y1 < near || y0 > far) return;
    y0 = Math.max(y0, near);
    y1 = Math.min(y1, far);
    this.proj.project(x0, y0, 0, a);
    this.proj.project(x1, y0, 0, b);
    this.proj.project(x1, y1, 0, c);
    this.proj.project(x0, y1, 0, d);
    this.g.fillStyle(color, alpha);
    this.g.fillPoints(pts, true);
  }

  draw() {
    const g = this.g;
    const W = FIELD.width;
    g.clear();

    // Gramado externo (área das laterais)
    this.quad(-14, -24, W + 14, 124, COLORS.grassOut);

    // Listras de 5 em 5 jardas (inclui as end zones)
    for (let y = 0; y < 100; y += 5) {
      this.quad(0, y, W, y + 5, (y / 5) % 2 === 0 ? COLORS.grassA : COLORS.grassB);
    }
    // End zones nas cores dos times
    this.quad(0, -10, W, 0, TEAMS.home.color);
    this.quad(0, 100, W, 110, TEAMS.away.color);

    // Linhas de jarda a cada 5 (gol mais grossa)
    for (let y = 0; y <= 100; y += 5) {
      const half = y === 0 || y === 100 ? 0.25 : 0.14;
      this.quad(0, y - half, W, y + half, COLORS.line);
    }
    // Hash marks a cada jarda (meio e perto das laterais)
    for (let y = 1; y < 100; y++) {
      if (y % 5 === 0) continue;
      for (const hx of FIELD.hashX) this.quad(hx - 0.35, y - 0.08, hx + 0.35, y + 0.08, COLORS.line, 0.9);
      for (const hx of FIELD.sideHashX) this.quad(hx - 0.35, y - 0.08, hx + 0.35, y + 0.08, COLORS.line, 0.9);
    }
    // Linhas de limite (laterais e fundo), mais grossas
    const t = 0.45;
    this.quad(-t, -10 - t, 0, 110 + t, COLORS.line);
    this.quad(W, -10 - t, W + t, 110 + t, COLORS.line);
    this.quad(-t, -10 - t, W + t, -10, COLORS.line);
    this.quad(-t, 110, W + t, 110 + t, COLORS.line);

    // Linha de scrimmage (azul) e first down (amarela)
    this.quad(0, this.scrimmageY - 0.2, W, this.scrimmageY + 0.2, COLORS.scrimmage);
    this.quad(0, this.firstDownY - 0.2, W, this.firstDownY + 0.2, COLORS.firstDown);

    this.updateTexts();

    // Objetos em pé: do mais distante para o mais perto
    drawGoalPost(g, this.proj, 110);
    drawPylon(g, this.proj, 0, 110);
    drawPylon(g, this.proj, W, 110);
    drawPylon(g, this.proj, 0, 100);
    drawPylon(g, this.proj, W, 100);
    drawPylon(g, this.proj, 0, 0);
    drawPylon(g, this.proj, W, 0);
    drawPylon(g, this.proj, 0, -10);
    drawPylon(g, this.proj, W, -10);
    drawGoalPost(g, this.proj, -10);
  }

  /** Posiciona os textos deitados no gramado (escala + achatamento da perspectiva). */
  private updateTexts() {
    const near = this.proj.nearY + 2;
    for (const n of this.numbers) this.layFlat(n.t, n.x, n.y, 2.2 / 40, near);
    for (const e of this.ezTexts) this.layFlat(e.t, FIELD.width / 2, e.y, 4.2 / 64, near);
  }

  private layFlat(t: Phaser.GameObjects.Text, x: number, y: number, ydPerPx: number, near: number) {
    if (y < near || y > this.proj.camY + 150) {
      t.setVisible(false);
      return;
    }
    const p = this.proj.project(x, y, 0, a);
    const sx = p.s * 6.75 * ydPerPx * 1.0;
    t.setVisible(true)
      .setPosition(p.x, p.y)
      .setScale(sx, sx * this.proj.flattenAt(y));
  }
}
