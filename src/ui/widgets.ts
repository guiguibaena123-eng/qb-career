import Phaser from 'phaser';
import { FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, LAYOUT } from '../config';

/*
 * Componentes de interface do design: botões de "vidro fosco" arredondados
 * (rgba(42,49,86,0.7) + borda branca a 15%), botão principal na cor do time com brilho
 * no topo, e etiquetas retrô com borda escura.
 */

export const UI = {
  glass: 0x2a3156,
  glassAlpha: 0.7,
  dark: 0x0d0d12,
  text: '#FFFFFF',
  muted: '#9AA3C0',
  yellow: '#FFD23F',
};

export interface GlassButtonOpts {
  w: number;
  h: number;
  radius?: number;
  fill?: number; // cor de fundo (padrão: vidro)
  fillAlpha?: number;
  border?: number;
  borderAlpha?: number;
  primary?: boolean; // brilho no topo
}

/** Botão arredondado com feedback instantâneo (afunda + clareia + vibra). */
export class GlassButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private opts: Required<GlassButtonOpts>;
  private enabled = true;
  onTap?: () => void;
  onDown?: () => void;
  onUp?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: GlassButtonOpts) {
    super(scene, x, y);
    this.opts = {
      radius: 16,
      fill: UI.glass,
      fillAlpha: UI.glassAlpha,
      border: 0xffffff,
      borderAlpha: 0.16,
      primary: false,
      ...opts,
    };
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.redraw(false);
    this.setSize(opts.w, opts.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e?.stopPropagation();
      if (!this.enabled) return;
      this.setScale(0.95);
      this.redraw(true);
      navigator.vibrate?.(8);
      this.onDown?.();
    });
    const release = (fire: boolean) => {
      if (this.scale === 1) return;
      this.setScale(1);
      this.redraw(false);
      this.onUp?.();
      if (fire && this.enabled) this.onTap?.();
    };
    this.on('pointerup', () => release(true));
    this.on('pointerout', () => release(false));
    scene.add.existing(this);
  }

  setFill(fill: number, alpha = 1, primary = false) {
    this.opts.fill = fill;
    this.opts.fillAlpha = alpha;
    this.opts.primary = primary;
    this.redraw(false);
    return this;
  }

  setBorder(color: number, alpha: number) {
    this.opts.border = color;
    this.opts.borderAlpha = alpha;
    this.redraw(false);
    return this;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    this.setAlpha(v ? 1 : 0.45);
    return this;
  }

  private redraw(pressed: boolean) {
    const { w, h, radius, fill, fillAlpha, border, borderAlpha, primary } = this.opts;
    const g = this.bg;
    g.clear();
    // Sombra suave
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, radius);
    g.fillStyle(fill, fillAlpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    if (primary) {
      // Brilho no topo do botão principal
      g.fillStyle(0xffffff, 0.22);
      g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.38, { tl: radius - 3, tr: radius - 3, bl: 4, br: 4 });
    }
    if (pressed) {
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
    g.lineStyle(1, border, borderAlpha);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }
}

/** Texto nas fontes do jogo. */
export function title(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = UI.text) {
  return scene.add.text(x, y, text, { fontFamily: FONT_TITLE, fontSize: `${size}px`, color });
}
export function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = UI.text) {
  return scene.add.text(x, y, text, { fontFamily: FONT_LABEL, fontSize: `${size}px`, color });
}

/** Etiqueta retrô (fundo colorido, borda escura de 2px), ancorada pela base no centro. */
export class Tag extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private bgColor: number;

  constructor(scene: Phaser.Scene, text: string, bg: number, fg: string, size = 10) {
    super(scene, 0, 0);
    this.bgColor = bg;
    this.bg = scene.add.graphics();
    this.txt = scene.add.text(0, 0, text, { fontFamily: FONT_TITLE, fontSize: `${size}px`, color: fg }).setOrigin(0.5, 1);
    this.add([this.bg, this.txt]);
    this.layout();
    scene.add.existing(this);
  }

  setLabel(text: string, bg?: number, fg?: string) {
    this.txt.setText(text);
    if (bg !== undefined) this.bgColor = bg;
    if (fg) this.txt.setColor(fg);
    this.layout();
    return this;
  }

  private layout() {
    const w = this.txt.width + 6;
    const h = this.txt.height + 4;
    this.txt.setPosition(0, -2);
    const g = this.bg;
    g.clear();
    g.fillStyle(UI.dark, 1);
    g.fillRect(-w / 2 - 1.5, -h - 1.5, w + 3, h + 3);
    g.fillStyle(this.bgColor, 1);
    g.fillRect(-w / 2, -h, w, h);
    this.setSize(w + 4, h + 4);
  }
}

/**
 * Degradê vertical contínuo (sem faixas): segmentos com fillGradientStyle que se encostam exatamente,
 * sem sobrepor — sobrepor faixas semitransparentes cria linhas escuras na emenda.
 * `a(t)`: opacidade em t (0 = topo, 1 = base).
 */
export function vGradient(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, a: (t: number) => number, n = 12) {
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const a0 = Math.max(0, Math.min(1, a(t0)));
    const a1 = Math.max(0, Math.min(1, a(t1)));
    g.fillGradientStyle(color, color, color, color, a0, a0, a1, a1);
    g.fillRect(x, y + h * t0, w, h * (t1 - t0));
  }
}

/** Degradê de baixo (transparente em cima → #0A0C1A embaixo), atrás dos botões. */
export function bottomGradient(scene: Phaser.Scene, height: number, depth: number) {
  const g = scene.add.graphics().setDepth(depth);
  const W = GAME_W;
  const H = LAYOUT.h;
  const VIEW = LAYOUT.view;
  const top = H - height;
  const c = 0x0a0c1a;
  const stops: [number, number][] = [
    [0, 0],
    [0.35, 0.55],
    [0.75, 0.92],
    [1, 1],
  ];
  // interpolação suave entre as paradas, num degradê contínuo
  const at = (t: number) => {
    for (let i = 0; i < stops.length - 1; i++) {
      const [t0, a0] = stops[i];
      const [t1, a1] = stops[i + 1];
      if (t <= t1) return a0 + ((t - t0) / (t1 - t0)) * (a1 - a0);
    }
    return 1;
  };
  vGradient(g, VIEW.x, top, VIEW.w, height, c, at, 16);
  // de ponta a ponta e até a borda de baixo da tela (barra de início do iPhone)
  g.fillStyle(c, 1);
  g.fillRect(VIEW.x, H, VIEW.w, VIEW.y + VIEW.h - H);
  void W;
  return g;
}
