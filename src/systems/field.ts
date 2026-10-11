import Phaser from 'phaser';
import { COLORS, FIELD, FONT_TITLE, TEAMS, logoKey } from '../config';
import { drawGoalPost, drawPylon } from '../entities/GoalPost';
import { fillQuad } from './ground';
import type { ShadowLight } from './daytime';
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
/** Combine: end zones azuis com "QBL COMBINE" e o logo da liga no meio do campo. */
export const fieldOptions = { combine: false };
const COMBINE_BLUE = 0x1f4e9c;

export class FieldRenderer {
  private g: Phaser.GameObjects.Graphics;
  /** Linhas do meio do campo e de scrimmage, desenhadas POR CIMA da logo pintada no gramado. */
  private over: Phaser.GameObjects.Graphics;
  /** Logo do mandante pintada no meio do campo (deitada no gramado, virada para a esquerda). */
  private midLogo: Phaser.GameObjects.Image | null = null;
  /** Traves e pylons ficam numa camada acima do estádio. */
  private props: Phaser.GameObjects.Graphics;
  private numbers: { t: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private ezTexts: { t: Phaser.GameObjects.Text; y: number }[] = [];

  /** Luzes que projetam as sombras da trave e dos pylons (noite/tarde). */
  lights: ShadowLight[] | null = null;
  /** Cores das listras do gramado (mais vivas à noite). */
  grass: [number, number] = [COLORS.grassA, COLORS.grassB];

  /** Linha de scrimmage e de first down (em jardas, eixo y). */
  scrimmageY = 25;
  firstDownY = 35;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    this.g = scene.add.graphics().setDepth(0);
    this.props = scene.add.graphics().setDepth(5);
    this.over = scene.add.graphics().setDepth(0.15);
    this.buildMidLogo(scene);

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
    // Nome do mandante nas duas end zones (o estádio é do time da casa)
    const ez = [
      { name: fieldOptions.combine ? 'QBL COMBINE' : TEAMS.home.name, y: -5 },
      { name: fieldOptions.combine ? 'QBL COMBINE' : TEAMS.home.name, y: 105 },
    ];
    for (const e of ez) {
      const t = scene.add
        .text(0, 0, e.name, { fontFamily: FONT_TITLE, fontSize: fieldOptions.combine ? '52px' : '64px', color: fieldOptions.combine ? '#FFFFFF' : TEAMS.home.fg })
        .setOrigin(0.5, 0.5)
        .setAlpha(0.85)
        .setDepth(1);
      this.ezTexts.push({ t, y: e.y });
    }
  }

  /** Retângulo no chão (x0..x1, y0..y1) recortado pela faixa visível. */
  private quad(x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1, g: Phaser.GameObjects.Graphics = this.g) {
    const near = this.proj.nearY;
    const far = this.proj.camY + 160;
    if (y1 < near || y0 > far) return;
    y0 = Math.max(y0, near);
    y1 = Math.min(y1, far);
    this.proj.project(x0, y0, 0, a);
    this.proj.project(x1, y0, 0, b);
    this.proj.project(x1, y1, 0, c);
    this.proj.project(x0, y1, 0, d);
    g.fillStyle(color, alpha);
    fillQuad(g, a, b, c, d);
  }

  draw() {
    const g = this.g;
    const W = FIELD.width;
    g.clear();
    this.over.clear();
    const over = this.over;
    /** Perto do meio (onde fica a logo) as linhas vão por cima dela. */
    const T = (y: number) => (y > 38 && y < 62 ? over : g);

    // Listras de 5 em 5 jardas (inclui as end zones)
    for (let y = 0; y < 100; y += 5) {
      this.quad(0, y, W, y + 5, (y / 5) % 2 === 0 ? this.grass[0] : this.grass[1]);
    }
    // As duas end zones nas cores do mandante
    const ezColor = fieldOptions.combine ? COMBINE_BLUE : TEAMS.home.color;
    this.quad(0, -10, W, 0, ezColor);
    this.quad(0, 100, W, 110, ezColor);

    // Linhas de jarda a cada 5 (gol mais grossa)
    for (let y = 0; y <= 100; y += 5) {
      const half = y === 0 || y === 100 ? 0.25 : 0.14;
      this.quad(0, y - half, W, y + half, COLORS.line, 1, T(y));
    }
    // Hash marks a cada jarda (meio e perto das laterais)
    for (let y = 1; y < 100; y++) {
      if (y % 5 === 0) continue;
      for (const hx of FIELD.hashX) this.quad(hx - 0.35, y - 0.08, hx + 0.35, y + 0.08, COLORS.line, 0.9, T(y));
      for (const hx of FIELD.sideHashX) this.quad(hx - 0.35, y - 0.08, hx + 0.35, y + 0.08, COLORS.line, 0.9, T(y));
    }
    // Borda branca grossa em volta do campo (como no design)
    const t = 0.9;
    this.quad(-t, -10 - t, 0, 110 + t, COLORS.line);
    this.quad(W, -10 - t, W + t, 110 + t, COLORS.line);
    this.quad(-t, -10 - t, W + t, -10, COLORS.line);
    this.quad(-t, 110, W + t, 110 + t, COLORS.line);

    // Linha de scrimmage (azul) e first down (amarela)
    this.quad(0, this.scrimmageY - 0.2, W, this.scrimmageY + 0.2, COLORS.scrimmage, 1, T(this.scrimmageY));
    this.quad(0, this.firstDownY - 0.2, W, this.firstDownY + 0.2, COLORS.firstDown, 1, T(this.firstDownY));

    this.updateTexts();
    this.layMidLogo();

    // Objetos em pé: do mais distante para o mais perto
    const pg = this.props;
    pg.clear();
    drawGoalPost(pg, this.proj, 110, this.lights);
    drawPylon(pg, this.proj, 0, 110, this.lights);
    drawPylon(pg, this.proj, W, 110, this.lights);
    drawPylon(pg, this.proj, 0, 100, this.lights);
    drawPylon(pg, this.proj, W, 100, this.lights);
    drawPylon(pg, this.proj, 0, 0, this.lights);
    drawPylon(pg, this.proj, W, 0, this.lights);
    drawPylon(pg, this.proj, 0, -10, this.lights);
    drawPylon(pg, this.proj, W, -10, this.lights);
    drawGoalPost(pg, this.proj, -10, this.lights);
  }

  /** Logo do mandante no meio (50 jardas): rotacionada 90° para a esquerda, com a tinta "gasta" para parecer pintada no gramado. */
  private buildMidLogo(scene: Phaser.Scene) {
    const src = scene.textures.get(fieldOptions.combine ? 'logoLeague' : logoKey(TEAMS.home.id, 'l')).getSourceImage() as HTMLImageElement;
    const N = 384;
    if (scene.textures.exists('midlogo')) scene.textures.remove('midlogo');
    const tex = scene.textures.createCanvas('midlogo', N, N)!;
    const ctx = tex.getContext();
    ctx.save();
    ctx.translate(0, N);
    ctx.rotate(-Math.PI / 2); // topo da logo vira para a esquerda do campo
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, N, N);
    ctx.restore();
    // Tinta gasta: pontinhos transparentes deixam a textura do gramado aparecer
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.12 + Math.random() * 0.22})`;
      ctx.fillRect(Math.random() * N, Math.random() * N, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    tex.refresh();
    this.midLogo = scene.add.image(0, 0, 'midlogo').setOrigin(0.5).setAlpha(0.9).setDepth(0.1).setVisible(false);
  }

  /** Posiciona a logo deitada no gramado (escala + achatamento da perspectiva). */
  private layMidLogo() {
    const img = this.midLogo;
    if (!img) return;
    const y = 50;
    const half = 8.5; // a logo ocupa ~17 jardas
    if (y + half < this.proj.nearY || y - half > this.proj.camY + 150) {
      img.setVisible(false);
      return;
    }
    const p = this.proj.project(FIELD.width / 2, y, 0, a);
    const sx = (p.s * 10 * (half * 2)) / img.width;
    img.setVisible(true).setPosition(p.x, p.y).setScale(sx, sx * this.proj.flattenAt(y));
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
    const sx = p.s * 10 * ydPerPx * 1.0;
    t.setVisible(true)
      .setPosition(p.x, p.y)
      .setScale(sx, sx * this.proj.flattenAt(y));
  }
}
