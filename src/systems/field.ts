import Phaser from 'phaser';
import { COLORS, FIELD, FONT_TITLE, TEAMS } from '../config';
import { drawGoalPost, drawPylon } from '../entities/GoalPost';
import { fillQuad } from './ground';
import type { Projection } from './projection';

const a = { x: 0, y: 0, s: 0 };
const b = { x: 0, y: 0, s: 0 };
const c = { x: 0, y: 0, s: 0 };
const d = { x: 0, y: 0, s: 0 };

/**
 * Desenha o gramado em perspectiva: listras, linhas, hash marks, números,
 * end zones, linha de scrimmage/first down, traves e pylons.
 * Tudo é redesenhado a cada frame num único Graphics (barato: poucas centenas de polígonos).
 */
export class FieldRenderer {
  private g: Phaser.GameObjects.Graphics;
  /** Traves e pylons ficam numa camada acima do estádio. */
  private props: Phaser.GameObjects.Graphics;
  private numbers: { t: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private ezTexts: { t: Phaser.GameObjects.Text; y: number }[] = [];
  private wallText: Phaser.GameObjects.Text;

  /** Linha de scrimmage e de first down (em jardas, eixo y). */
  scrimmageY = 25;
  firstDownY = 35;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    this.g = scene.add.graphics().setDepth(0);
    this.props = scene.add.graphics().setDepth(5);

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
    // "QB CAREER" na faixa do muro do fundo
    this.wallText = scene.add
      .text(0, 0, 'QB CAREER :: QB CAREER :: QB CAREER :: QB CAREER', { fontFamily: FONT_TITLE, fontSize: '32px', color: TEAMS.home.colorHex })
      .setOrigin(0.5, 0.5)
      .setDepth(1);
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
    fillQuad(this.g, a, b, c, d);
  }

  draw() {
    const g = this.g;
    const W = FIELD.width;
    g.clear();

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
    // Borda branca grossa em volta do campo (como no design)
    const t = 0.9;
    this.quad(-t, -10 - t, 0, 110 + t, COLORS.line);
    this.quad(W, -10 - t, W + t, 110 + t, COLORS.line);
    this.quad(-t, -10 - t, W + t, -10, COLORS.line);
    this.quad(-t, 110, W + t, 110 + t, COLORS.line);

    // Linha de scrimmage (azul) e first down (amarela)
    this.quad(0, this.scrimmageY - 0.2, W, this.scrimmageY + 0.2, COLORS.scrimmage);
    this.quad(0, this.firstDownY - 0.2, W, this.firstDownY + 0.2, COLORS.firstDown);

    this.updateTexts();

    // Objetos em pé: do mais distante para o mais perto
    const pg = this.props;
    pg.clear();
    drawGoalPost(pg, this.proj, 110);
    drawPylon(pg, this.proj, 0, 110);
    drawPylon(pg, this.proj, W, 110);
    drawPylon(pg, this.proj, 0, 100);
    drawPylon(pg, this.proj, W, 100);
    drawPylon(pg, this.proj, 0, 0);
    drawPylon(pg, this.proj, W, 0);
    drawPylon(pg, this.proj, 0, -10);
    drawPylon(pg, this.proj, W, -10);
    drawGoalPost(pg, this.proj, -10);
  }

  /** Posiciona os textos deitados no gramado (escala + achatamento da perspectiva). */
  private updateTexts() {
    const near = this.proj.nearY + 2;
    for (const n of this.numbers) this.layFlat(n.t, n.x, n.y, 2.2 / 40, near);
    for (const e of this.ezTexts) this.layFlat(e.t, FIELD.width / 2, e.y, 4.2 / 64, near);
    // Ocupa a largura da faixa do muro (55 jardas)
    this.layFlat(this.wallText, FIELD.width / 2, 118.5, 55.3 / this.wallText.width, near);
  }

  private layFlat(t: Phaser.GameObjects.Text, x: number, y: number, ydPerPx: number, near: number) {
    if (y < near || y > this.proj.camY + 150) {
      t.setVisible(false);
      return;
    }
    const p = this.proj.project(x, y, 0, a);
    const sx = p.s * 10 * ydPerPx * 1.0;
    t.setVisible(true)
      .setPosition(p.x, p.y)
      .setScale(sx, sx * this.proj.flattenAt(y));
  }
}
