import Phaser from 'phaser';
import { stadiumSlot } from './stadiumPhoto';
import { GAME_H, GAME_W } from '../config';
import { TeamRepository } from '../data/TeamRepository';

/*
 * Pacote gráfico de TRANSMISSÃO dos menus (fora de campo).
 * Os menus são a transmissão do jogo: placar no canto, tarjas com corte diagonal, vinheta entre as
 * telas, telestrador para marcar a escolha e a "imagem ao vivo" do estádio ao fundo.
 * Regras: nenhum canto arredondado (toda placa corta na diagonal), tinta + placa clara + amarelo de
 * primeira descida para a seleção, vermelho só para o AO VIVO, cores dos times como blocos chapados.
 */

export const TV = {
  ink: 0x0b0e14,
  ink2: 0x161b25,
  ink3: 0x222936,
  rule: 0x2e3747,
  plate: 0xf3f5f7,
  yellow: 0xffc400,
  red: 0xe0263c,
  green: 0x2fbf62,
};
/** Cores de texto. */
export const C = {
  white: '#F3F5F7',
  ink: '#0B0E14',
  muted: '#93A0B6',
  dim: '#7D89A3',
  /** Texto sobre placa clara. */
  inkSoft: '#46516A',
  yellow: '#FFC400',
  red: '#FF4D5E',
  green: '#3DDC78',
};
export const FONT_TV = '"Saira Condensed", "Arial Narrow", sans-serif';
/** Inclinação de toda placa (12°). */
export const SLANT = Math.tan((12 * Math.PI) / 180);
export const hexStr = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mistura duas cores (t = 0 → a, 1 → b). */
export function mix(a: number, b: number, t: number) {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
/** Luminância aproximada (0–255). */
export function lum(c: number) {
  return 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
}
/** A cor do time, clareada quando é escura demais para aparecer sobre a tinta. */
export function onInk(c: number) {
  const l = lum(c);
  return l < 70 ? mix(c, 0xffffff, Math.min(0.5, (70 - l) / 90 + 0.18)) : c;
}
/** Cor de texto legível sobre um fundo. */
export function inkOn(bg: number) {
  const r = (bg >> 16) & 255;
  const g = (bg >> 8) & 255;
  const b = bg & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? C.ink : C.white;
}

// ------------------------------------------------------------ texto

/** Texto da transmissão (Saira Condensed). */
export function tvText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = C.white, weight = 700, spacing = 0.2) {
  // testString com as maiúsculas acentuadas: o Phaser mede a altura da linha por ela, senão o acento de Á/Í/Ç é cortado
  // Cria vazio, ajusta o espaçamento e só então escreve: o texto é desenhado uma vez só (antes eram duas)
  const t = scene.add.text(x, y, '', { fontFamily: FONT_TV, fontSize: `${size}px`, fontStyle: String(weight), color, testString: '|ÁÉÍÓÚÂÊÔÃÕÀÇÑ_gjpqy' });
  t.letterSpacing = spacing;
  return t.setText(text);
}
/**
 * Substitutos de `title`/`label` dos widgets (mesma assinatura) para as telas de menu:
 * os tamanhos antigos eram de fonte pixel (letras largas e baixas); aqui viram a fonte condensada.
 */
export function title(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = C.white) {
  return tvText(scene, x, y, text, Math.round(size * 1.6), color, 800, 0.3);
}
export function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = C.white) {
  return tvText(scene, x, y, text, Math.round(size * 1.42), color, 600, 0.5);
}

// ------------------------------------------------------------ placas

/** Pontos de uma placa com cortes diagonais (esquerda embaixo e direita em cima). */
export function platePts(x: number, y: number, w: number, h: number, cutL = true, cutR = true) {
  const s = Math.min(h * SLANT, 12);
  return [
    new Phaser.Math.Vector2(x + (cutL ? s : 0), y),
    new Phaser.Math.Vector2(x + w, y),
    new Phaser.Math.Vector2(x + w - (cutR ? s : 0), y + h),
    new Phaser.Math.Vector2(x, y + h),
  ];
}
export function plate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1, cutL = true, cutR = true) {
  g.fillStyle(color, alpha);
  g.fillPoints(platePts(x, y, w, h, cutL, cutR), true);
}
export function plateLine(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1, width = 1, cutL = true, cutR = true) {
  g.lineStyle(width, color, alpha);
  g.strokePoints(platePts(x, y, w, h, cutL, cutR), true, true);
}
/** Sombra macia (camadas deslocadas para baixo, cada vez mais fracas). */
export function plateShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, cutL = true, cutR = true, strength = 1) {
  [
    [7, 0.07],
    [4, 0.12],
    [2, 0.2],
  ].forEach(([d, a]) => plate(g, x + d * 0.4, y + d, w, h, 0x000000, a * strength, cutL, cutR));
}

// ------------------------------------------------------------ botão (placa de transmissão)

export interface TvButtonOpts {
  w: number;
  h: number;
  /** Ignorado (as placas não têm canto arredondado); mantido para compatibilidade. */
  radius?: number;
  fill?: number;
  fillAlpha?: number;
  border?: number;
  borderAlpha?: number;
  /** Placa principal: cor chapada com faixa diagonal mais escura à direita. */
  primary?: boolean;
  cutL?: boolean;
  cutR?: boolean;
}

const GLASS = 0x2a3156;

/**
 * Botão-placa. Mesma interface do antigo GlassButton (onTap, setFill, setBorder, setEnabled, add),
 * mas desenhado como placa de TV: cor sólida (a transparência antiga vira mistura com a tinta),
 * borda só quando marca seleção, e o toque "empurra" a placa para a direita.
 */
export class TvButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private o: Required<TvButtonOpts>;
  private enabled = true;
  private pressed = false;
  private homeX: number;
  onTap?: () => void;
  onDown?: () => void;
  onUp?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: TvButtonOpts) {
    super(scene, x, y);
    this.homeX = x;
    this.o = { radius: 0, fill: GLASS, fillAlpha: 0.7, border: 0xffffff, borderAlpha: 0.16, primary: false, cutL: true, cutR: true, ...opts };
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.redraw();
    this.setSize(opts.w, opts.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e?.stopPropagation();
      if (!this.enabled) return;
      this.pressed = true;
      this.homeX = this.x;
      this.x = this.homeX + 3;
      this.redraw();
      navigator.vibrate?.(8);
      this.onDown?.();
    });
    const release = (fire: boolean) => {
      if (!this.pressed) return;
      this.pressed = false;
      this.x = this.homeX;
      this.redraw();
      this.onUp?.();
      if (fire && this.enabled) this.onTap?.();
    };
    this.on('pointerup', () => release(true));
    this.on('pointerout', () => release(false));
    scene.add.existing(this);
  }

  setFill(fill: number, alpha = 1, primary = false) {
    this.o.fill = fill;
    this.o.fillAlpha = alpha;
    this.o.primary = primary;
    this.redraw();
    return this;
  }
  setBorder(color: number, alpha: number) {
    this.o.border = color;
    this.o.borderAlpha = alpha;
    this.redraw();
    return this;
  }
  setEnabled(v: boolean) {
    this.enabled = v;
    this.setAlpha(v ? 1 : 0.4);
    return this;
  }
  /** Cor de fundo efetiva (sólida). */
  get color() {
    const { fill, fillAlpha } = this.o;
    if (fill === GLASS) return TV.ink2;
    return fillAlpha >= 0.95 ? fill : mix(TV.ink2, fill, Math.min(1, fillAlpha * 1.35));
  }

  private redraw() {
    const { w, h, border, borderAlpha, primary, cutL, cutR } = this.o;
    const g = this.bg;
    const x = -w / 2;
    const y = -h / 2;
    let c = this.color;
    if (this.pressed) c = mix(c, 0xffffff, 0.12);
    g.clear();
    plateShadow(g, x, y, w, h, cutL, cutR, primary ? 1.2 : 0.8);
    plate(g, x, y, w, h, c, 1, cutL, cutR);
    if (primary) {
      // Faixa diagonal mais escura (textura de placa de transmissão)
      const s = Math.min(h * SLANT, 12);
      g.fillStyle(0x000000, 0.13);
      g.fillPoints([new Phaser.Math.Vector2(x + w * 0.66 + s, y), new Phaser.Math.Vector2(x + w, y), new Phaser.Math.Vector2(x + w - (cutR ? s : 0), y + h), new Phaser.Math.Vector2(x + w * 0.66, y + h)], true);
      g.fillStyle(0xffffff, 0.16);
      g.fillRect(x + (cutL ? s : 0), y, w - (cutL ? s : 0), 2);
    } else if (this.o.fill === GLASS) {
      plateLine(g, x, y, w, h, TV.rule, 1, 1, cutL, cutR);
    }
    // Borda só quando marca algo (seleção)
    if (borderAlpha >= 0.5) plateLine(g, x, y, w, h, border === 0xffffff ? TV.plate : border, borderAlpha, 2, cutL, cutR);
  }
}

// ------------------------------------------------------------ vinheta (transição entre telas)

let carry: { color: number; t: number } | null = null;
const BW = 760;
const OFF = GAME_H * Math.tan((20 * Math.PI) / 180);
const X0 = -BW - 40;
const X1 = GAME_W + OFF + 40;
const MIDX = (GAME_W - BW + 2 * OFF) / 2;
const PMID = (MIDX - X0) / (X1 - X0);

function drawWipe(g: Phaser.GameObjects.Graphics, p: number, color: number) {
  g.clear();
  // faixas inclinadas como dois triângulos (fillPoints triangulava o polígono a cada quadro)
  const band = (lead: number, w: number, c: number) => {
    const X = X0 + (p + lead) * (X1 - X0);
    g.fillStyle(c, 1);
    g.fillTriangle(X, -10, X + w, -10, X + w - OFF, GAME_H + 10);
    g.fillTriangle(X, -10, X + w - OFF, GAME_H + 10, X - OFF, GAME_H + 10);
  };
  band(0.075, BW + 70, TV.yellow);
  band(0.04, BW + 34, color);
  band(0, BW, TV.ink);
}
function runWipe(scene: Phaser.Scene, from: number, to: number, ms: number, color: number, done?: () => void) {
  const g = scene.add.graphics().setDepth(10000);
  const o = { p: from };
  drawWipe(g, from, color);
  const start = () =>
    scene.tweens.add({
      targets: o,
      p: to,
      duration: ms,
      ease: from === 0 ? 'Cubic.In' : 'Cubic.Out',
      onUpdate: () => drawWipe(g, o.p, color),
      onComplete: () => {
        if (to >= 1) g.destroy();
        done?.();
        if (to < 1) g.destroy();
      },
    });
  if (from === 0) return void start();
  // Saída da vinheta: a tela nova acabou de ser montada (quadro demorado). Se a animação começasse já,
  // o tempo desse quadro entraria nela e a vinheta sumiria de uma vez; espera dois quadros e então desliza.
  let frames = 0;
  const tick = () => {
    if (++frames < 2) return;
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, tick);
    start();
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, tick);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    if (frames >= 2) return;
    // a cena fechou antes da vinheta sair: solta a trava (senão nenhuma vinheta roda mais)
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, tick);
    frames = 2;
    done?.();
  });
}
let busy = false;
/** Troca o conteúdo da tela por baixo da vinheta. */
export function wipe(scene: Phaser.Scene, swap: () => void, color: number = TV.red) {
  if (reduced() || busy) return swap();
  busy = true;
  runWipe(scene, 0, PMID, 210, color, () => {
    swap();
    runWipe(scene, PMID, 1, 300, color, () => (busy = false));
  });
}
/** Vai para outra cena passando pela vinheta (a nova cena chama `tvEnter`). */
export function wipeTo(scene: Phaser.Scene, key: string, color: number = TV.red, data?: object) {
  if (reduced() || busy) return scene.scene.start(key, data);
  busy = true;
  runWipe(scene, 0, PMID, 210, color, () => {
    carry = { color, t: performance.now() };
    busy = false;
    scene.scene.start(key, data);
  });
}
/** Chamar no fim do create() de cada cena de menu: termina a vinheta que veio da cena anterior. */
export function tvEnter(scene: Phaser.Scene) {
  if (!carry) return;
  const { color, t } = carry;
  carry = null;
  // só termina a vinheta se a cena veio direto dela (outra cena no meio = não)
  if (performance.now() - t > 1500) return;
  runWipe(scene, PMID, 1, 300, color);
}

// ------------------------------------------------------------ telestrador

/** Círculo amarelo desenhado à mão em volta de algo (a marca da escolha). */
export function telestrate(scene: Phaser.Scene, x: number, y: number, rx: number, ry: number, delay = 0, depth?: number, color: number = TV.yellow) {
  const g = scene.add.graphics();
  if (depth !== undefined) g.setDepth(depth);
  const seed = (x * 7 + y * 13) % 10;
  const o = { t: 0 };
  const draw = () => {
    g.clear();
    const turns = 1.1 * o.t;
    const n = Math.max(2, Math.round(64 * turns));
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const a = -1.9 + (i / 64) * Math.PI * 2;
      const k = 0.93 + 0.03 * Math.sin(a * 3 + seed) + (i / 64) * 0.05;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k));
    }
    g.lineStyle(5, 0x000000, 0.25);
    g.strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x + 1, p.y + 2)));
    g.lineStyle(3, color, 1);
    g.strokePoints(pts);
  };
  draw();
  if (reduced()) {
    o.t = 1;
    draw();
  } else scene.tweens.add({ targets: o, t: 1, delay, duration: 340, ease: 'Sine.Out', onUpdate: draw });
  return g;
}

/** Traço de caneta do telestrador sob uma opção (a marca das escolhas com texto). */
export function underline(scene: Phaser.Scene, x: number, y: number, w: number, delay = 0) {
  const g = scene.add.graphics();
  const o = { t: 0 };
  const draw = () => {
    g.clear();
    const n = Math.max(2, Math.round(24 * o.t));
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const k = i / 24;
      pts.push(new Phaser.Math.Vector2(x - w / 2 + k * w, y + Math.sin(k * Math.PI) * 2.5 - k * 2));
    }
    g.lineStyle(4, TV.yellow, 1);
    g.strokePoints(pts);
  };
  if (reduced()) o.t = 1;
  draw();
  if (!reduced()) scene.tweens.add({ targets: o, t: 1, delay, duration: 220, ease: 'Sine.Out', onUpdate: draw });
  return g;
}

// ------------------------------------------------------------ imagem ao vivo (fundo)

/** Fundo: foto do estádio do time escurecida, com movimento lento de câmera. */
export function feed(scene: Phaser.Scene, teamId: string | null, dim = 0.7) {
  const W = GAME_W;
  const H = GAME_H;
  const c = scene.add.container(0, 0).setDepth(-20);
  const base = scene.add.graphics();
  base.fillStyle(TV.ink, 1);
  base.fillRect(0, 0, W, H);
  c.add(base);
  const key = teamId ? TeamRepository.get(teamId).stadium.image : null;
  if (key) {
    // ilustração do estádio (baixada quando aparece), com um "movimento de câmera" bem lento
    c.add(
      stadiumSlot(scene, key, (slot) => {
        const img = scene.add.image(W / 2, H * 0.27, key);
        const s = Math.max(W / img.width, (H * 0.56) / img.height);
        img.setScale(s);
        slot.add(img);
        if (!reduced()) scene.tweens.add({ targets: img, scale: s * 1.09, x: W / 2 - 18, duration: 26000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }),
    );
  }
  // Escurece e funde na tinta (mais escuro embaixo, onde ficam os botões)
  const veil = scene.add.graphics();
  veil.fillStyle(TV.ink, dim);
  veil.fillRect(0, 0, W, H);
  // funde na tinta antes de a foto acabar (sem emenda)
  const steps = 28;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    veil.fillStyle(TV.ink, Math.min(1, t * t * 1.2));
    veil.fillRect(0, H * 0.18 + t * H * 0.34, W, (H * 0.34) / steps + 1);
  }
  veil.fillStyle(TV.ink, 1);
  veil.fillRect(0, H * 0.52, W, H * 0.48 + 2);
  c.add(veil);
  return c;
}

// ------------------------------------------------------------ placar do topo (navegação)

export interface BugOpts {
  title: string;
  /** Texto pequeno à direita do título (ex.: "1 DE 2"). */
  step?: string;
  onBack?: () => void;
  team?: { abbr: string; color: number };
  depth?: number;
}

/** Placar no topo: voltar + AO VIVO + onde a pessoa está + o time dela. */
export function scoreBug(scene: Phaser.Scene, o: BugOpts) {
  const W = GAME_W;
  const y = 14;
  const h = 40;
  const c = scene.add.container(0, 0).setDepth(o.depth ?? 800);
  const g = scene.add.graphics();
  plateShadow(g, 12, y, W - 24, h, false, true, 0.9);
  plate(g, 12, y, W - 24, h, TV.ink, 0.96, false, true);
  c.add(g);
  let x = 12;
  if (o.onBack) {
    const bg = scene.add.graphics();
    plate(bg, 12, y, 46, h, TV.ink3, 1, false, true);
    bg.lineStyle(2.5, TV.plate, 1);
    bg.beginPath();
    bg.moveTo(38, y + 12);
    bg.lineTo(30, y + 20);
    bg.lineTo(38, y + 28);
    bg.strokePath();
    c.add(bg);
    const z = scene.add.zone(12, y - 6, 58, h + 12).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => {
      navigator.vibrate?.(8);
      bg.setAlpha(0.6);
    });
    z.on('pointerout', () => bg.setAlpha(1));
    z.on('pointerup', () => {
      bg.setAlpha(1);
      o.onBack!();
    });
    c.add(z);
    x = 58;
  }
  // Ponto AO VIVO
  const dot = scene.add.circle(x + 14, y + h / 2, 4, TV.red);
  c.add(dot);
  if (!reduced()) scene.tweens.add({ targets: dot, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  const tt = tvText(scene, x + 26, y + h / 2, o.title, 17, C.white, 800, 0.6).setOrigin(0, 0.5);
  c.add(tt);
  let right = W - 12;
  if (o.team) {
    const tg = scene.add.graphics();
    const tw = 62;
    plate(tg, right - tw, y, tw, h, o.team.color, 1, true, true);
    c.add(tg);
    c.add(tvText(scene, right - tw / 2 - 2, y + h / 2, o.team.abbr, 17, inkOn(o.team.color), 800, 1).setOrigin(0.5));
    right -= tw + 6;
  }
  if (o.step) {
    const st = tvText(scene, right - 6, y + h / 2, o.step, 13, C.muted, 600, 1).setOrigin(1, 0.5);
    c.add(st);
    right = st.x - st.width - 8;
  }
  // Título longo: encolhe para caber
  const room = right - tt.x - 6;
  if (tt.width > room) tt.setScale(Math.max(0.6, room / tt.width), 1);
  return c;
}

// ------------------------------------------------------------ faixa de notícias

/** Faixa de notícias rolando no rodapé. */
export function ticker(scene: Phaser.Scene, y: number, items: string[], tag = 'QFL', depth = 700) {
  const W = GAME_W;
  const h = 30;
  const c = scene.add.container(0, 0).setDepth(depth);
  const g = scene.add.graphics();
  g.fillStyle(TV.ink2, 1);
  g.fillRect(0, y, W, h);
  g.fillStyle(TV.rule, 1);
  g.fillRect(0, y, W, 1);
  c.add(g);
  const text = items.join('     ▪     ');
  const t1 = tvText(scene, 0, y + h / 2, text, 14, C.white, 600, 0.6).setOrigin(0, 0.5);
  const gap = 60;
  const t2 = tvText(scene, 0, y + h / 2, text, 14, C.white, 600, 0.6).setOrigin(0, 0.5);
  const mg = scene.make.graphics({}, false);
  mg.fillRect(70, y, W - 70, h);
  const mask = mg.createGeometryMask();
  t1.setMask(mask);
  t2.setMask(mask);
  c.add([t1, t2]);
  const tagG = scene.add.graphics();
  plate(tagG, 0, y, 66, h, TV.yellow, 1, false, true);
  c.add(tagG);
  c.add(tvText(scene, 29, y + h / 2, tag, 15, C.ink, 800, 1.2).setOrigin(0.5));
  const span = t1.width + gap;
  const o = { x: 0 };
  const place = () => {
    t1.x = 76 + o.x;
    t2.x = 76 + o.x + span;
  };
  place();
  if (!reduced()) scene.tweens.add({ targets: o, x: -span, duration: (span / 42) * 1000, repeat: -1, onUpdate: place });
  return c;
}

// ------------------------------------------------------------ cabeçalho de seção

/** Nome de seção com um fio que segue até a borda. */
export function sectionHead(scene: Phaser.Scene, x: number, y: number, text: string, right?: string, w = GAME_W - 2 * x) {
  const c = scene.add.container(0, 0);
  const t = tvText(scene, x, y, text, 14, C.white, 800, 1.2).setOrigin(0, 0.5);
  c.add(t);
  let end = x + w;
  if (right) {
    const r = tvText(scene, x + w, y, right, 13, C.muted, 600, 0.8).setOrigin(1, 0.5);
    c.add(r);
    end = r.x - r.width - 10;
  }
  const g = scene.add.graphics();
  g.fillStyle(TV.rule, 1);
  g.fillRect(t.x + t.width + 10, y, Math.max(0, end - (t.x + t.width + 10)), 1);
  g.fillStyle(TV.yellow, 1);
  g.fillRect(t.x + t.width + 10, y - 1, 14, 3);
  c.add(g);
  return c;
}

/** Entrada em cascata: desliza da esquerda (tarjas entrando no ar). */
export function slideIn(scene: Phaser.Scene, targets: Phaser.GameObjects.GameObject[], step = 45, delay = 80) {
  if (reduced()) return;
  targets.forEach((t, i) => {
    const o = t as unknown as { x: number; alpha: number };
    const x = o.x;
    o.x = x - 34;
    o.alpha = 0;
    scene.tweens.add({ targets: o, x, alpha: 1, duration: 420, delay: delay + i * step, ease: 'Expo.Out' });
  });
}

// ------------------------------------------------------------ substitutos do visual antigo

/** Retângulo "arredondado" do visual antigo → placa com corte diagonal pequeno (mesmos argumentos). */
export function fillPlate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, _r?: unknown) {
  const s = Math.min(h * SLANT, 8, w * 0.2);
  g.fillPoints([new Phaser.Math.Vector2(x + s, y), new Phaser.Math.Vector2(x + w, y), new Phaser.Math.Vector2(x + w - s, y + h), new Phaser.Math.Vector2(x, y + h)], true);
  return g;
}
export function strokePlate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, _r?: unknown) {
  const s = Math.min(h * SLANT, 8, w * 0.2);
  g.strokePoints([new Phaser.Math.Vector2(x + s, y), new Phaser.Math.Vector2(x + w, y), new Phaser.Math.Vector2(x + w - s, y + h), new Phaser.Math.Vector2(x, y + h)], true, true);
  return g;
}

export interface CardOpts {
  from: number;
  to?: number;
  fromAlpha?: number;
  toAlpha?: number;
  mid?: number;
  midAlpha?: number;
  radius?: number;
  stroke?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  sheen?: number;
  glow?: boolean;
  /** Placa inteira na cor (cartão de time): sem meia placa e sem tinta por cima. */
  solid?: boolean;
}
/**
 * Cartão em destaque (substitui o degradê com brilho): placa sólida tingida com a cor, faixa da cor no
 * topo e borda só quando forte. Mesma assinatura do antigo gradCard.
 */
export function tvCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, o: CardOpts) {
  const g = scene.add.graphics();
  if (o.solid) {
    // Cor do time na placa toda; escurece um pouco só quando é clara demais para o texto branco
    const l = lum(o.from);
    const base = l > 150 ? mix(o.from, TV.ink, 0.45) : l > 110 ? mix(o.from, TV.ink, 0.25) : o.from;
    const s0 = Math.min(h * SLANT, 12);
    plateShadow(g, x, y, w, h, true, true, 0.8);
    plate(g, x, y, w, h, base, 1);
    // leve sombra na base (profundidade, sem mudar a cor)
    g.fillStyle(TV.ink, 0.18);
    g.fillPoints([new Phaser.Math.Vector2(x + s0 * 0.45, y + h * 0.55), new Phaser.Math.Vector2(x + w, y + h * 0.55), new Phaser.Math.Vector2(x + w - s0, y + h), new Phaser.Math.Vector2(x, y + h)], true);
    if (o.stroke !== undefined && (o.strokeAlpha ?? 0) >= 0.5 && o.stroke !== 0xffffff) plateLine(g, x, y, w, h, o.stroke === 0xf26b1d ? TV.yellow : o.stroke, o.strokeAlpha!, o.strokeWidth ?? 2);
    else plateLine(g, x, y, w, h, 0xffffff, 0.16, 1);
    return g;
  }
  // Amarelo = "é você / está escolhido": placa elevada com contorno amarelo (misturar amarelo na tinta dá oliva)
  const yellowish = (c: number) => ((c >> 16) & 255) > 200 && ((c >> 8) & 255) > 150 && (c & 255) < 120;
  if (yellowish(o.from)) {
    const s0 = Math.min(h * SLANT, 12);
    plateShadow(g, x, y, w, h, true, true, 0.8);
    plate(g, x, y, w, h, TV.ink3, 1);
    g.fillStyle(TV.yellow, 1);
    g.fillRect(x + s0, y, w - s0, 4);
    plateLine(g, x, y, w, h, TV.yellow, 1, 2);
    return g;
  }
  const base = mix(TV.ink2, o.from, Math.min(0.42, (o.fromAlpha ?? 1) * 0.4));
  plateShadow(g, x, y, w, h, true, true, 0.8);
  plate(g, x, y, w, h, base, 1);
  if (o.to !== undefined && o.to !== o.from && o.to !== 0x22284a && o.to !== 0x0d0f1f) {
    // segunda cor: metade direita mais puxada para ela (confronto)
    g.fillStyle(mix(TV.ink2, o.to, 0.45), 0.97);
    const s = Math.min(h * SLANT, 12);
    g.fillPoints([new Phaser.Math.Vector2(x + w * 0.55 + s, y), new Phaser.Math.Vector2(x + w, y), new Phaser.Math.Vector2(x + w - s, y + h), new Phaser.Math.Vector2(x + w * 0.55, y + h)], true);
  }
  const s = Math.min(h * SLANT, 12);
  g.fillStyle(onInk(o.from), 1);
  g.fillRect(x + s, y, w - s, 3);
  if ((o.strokeAlpha ?? 0) >= 0.5 && o.stroke !== undefined && o.stroke !== 0xffffff) plateLine(g, x, y, w, h, o.stroke === 0xf26b1d ? TV.yellow : o.stroke, o.strokeAlpha!, o.strokeWidth ?? 2);
  return g;
}

/** Estrela desenhada (substitui o símbolo ★ de texto): título conquistado. */
export function star(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number = TV.yellow) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * k, cy + Math.sin(a) * k));
  }
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
  return g;
}

/** Troféu desenhado (taça + base), centrado em (cx, cy), altura ≈ 2s. */
export function trophy(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number, color: number = TV.yellow) {
  g.fillStyle(color, 1);
  // taça
  g.fillPoints([new Phaser.Math.Vector2(cx - s * 0.62, cy - s), new Phaser.Math.Vector2(cx + s * 0.62, cy - s), new Phaser.Math.Vector2(cx + s * 0.4, cy - s * 0.05), new Phaser.Math.Vector2(cx - s * 0.4, cy - s * 0.05)], true);
  g.fillCircle(cx, cy - s * 0.12, s * 0.38);
  // alças
  g.lineStyle(Math.max(2, s * 0.16), color, 1);
  g.strokeRect(cx - s * 0.92, cy - s * 0.86, s * 0.34, s * 0.42);
  g.strokeRect(cx + s * 0.58, cy - s * 0.86, s * 0.34, s * 0.42);
  // haste e base
  g.fillRect(cx - s * 0.1, cy + s * 0.2, s * 0.2, s * 0.42);
  g.fillRect(cx - s * 0.46, cy + s * 0.62, s * 0.92, s * 0.3);
  return g;
}

/**
 * Seta desenhada logo depois de um texto (substitui "›", "▲" e "▼" escritos). Abre espaço empurrando o
 * texto conforme a origem dele e devolve o desenho, para o chamador pôr no mesmo container.
 */
export function arrowAfter(scene: Phaser.Scene, t: Phaser.GameObjects.Text, color: string, dir: 'right' | 'up' | 'down' = 'right') {
  const gap = 12;
  t.x -= gap * t.originX;
  const right = t.x + t.displayWidth * (1 - t.originX);
  const cy = t.y + t.displayHeight * (0.5 - t.originY);
  const k = Math.max(3, t.displayHeight * 0.2);
  const g = scene.add.graphics();
  const c = parseInt(color.slice(1), 16);
  const x = right + 5;
  if (dir === 'right') {
    g.lineStyle(2.5, c, t.alpha);
    g.beginPath();
    g.moveTo(x, cy - k);
    g.lineTo(x + k, cy);
    g.lineTo(x, cy + k);
    g.strokePath();
  } else {
    g.fillStyle(c, t.alpha);
    const s = dir === 'up' ? -1 : 1;
    g.fillTriangle(x - 1, cy - (k * s) / 1.4, x + k * 1.4 + 1, cy - (k * s) / 1.4, x + (k * 1.4) / 2, cy + (k * s) / 1.4);
  }
  return g;
}
