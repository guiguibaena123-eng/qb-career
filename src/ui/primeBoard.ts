import Phaser from 'phaser';
import { GAME_W, TEAMS, playoffLogo } from '../config';
import type { GameState } from '../state/GameState';
import { tvText } from './tv';

/*
 * Placares exclusivos dos jogos de horário nobre e dos playoffs (carreira). Cada transmissão é um pacote
 * gráfico próprio, com estrutura, materiais e detalhes diferentes (e a fonte de transmissão, não a pixel):
 *   neon   — QUINTA À NOITE: painel de LED violeta, relógio numa janela com varredura, quartos em
 *            pontos de neon embaixo e a lua no selo;
 *   gold   — DOMINGO À NOITE: gala — réguas douradas duplas, painéis listrados, placar em caixas de
 *            marfim e um estandarte pendurado com estrelas, quarto, relógio e o nome do programa;
 *   stripe — SEGUNDA À NOITE: os dois times empilhados em linhas (tarja de canto), módulo do relógio
 *            com faixa de alerta e o raio no selo;
 *   round  — playoffs: chave do mata-mata desenhada ligando os dois times ao medalhão da fase;
 *   bowl   — QFL BOWL: moldura de ouro sobre mármore, coroa, louros em volta do emblema e brilhos.
 * Todos mostram a posse de bola ao lado da sigla de quem ataca. O Hud só pede posições, tamanhos e
 * cores dos textos e chama `update` a cada atualização; os desenhos ficam todos aqui.
 */

export interface Prime {
  name: string;
  short: string;
  pt?: string;
  color: number;
  glow: number;
}
export type PrimeKind = 'neon' | 'gold' | 'stripe' | 'round' | 'bowl';

export function primeKind(pr: Prime): PrimeKind {
  const s = pr.short;
  return s.startsWith('THURSDAY') ? 'neon' : s.startsWith('SUNDAY') ? 'gold' : s.startsWith('MONDAY') ? 'stripe' : s === 'QFL BOWL' ? 'bowl' : 'round';
}

interface Slot {
  x: number;
  y: number;
  /** Origem horizontal do texto (0 esquerda, 0.5 centro, 1 direita). */
  ox: number;
}
interface Rect {
  x: number;
  y: number;
  s: number;
}

export interface PrimeBoard {
  /** Camadas desenhadas (molduras, faixas, emblema), de baixo para cima. */
  layers: Phaser.GameObjects.GameObject[];
  logoH: Rect;
  logoA: Rect;
  homeAbbr: Slot;
  homeRec: Slot;
  homeScore: Slot;
  awayAbbr: Slot;
  awayRec: Slot;
  awayScore: Slot;
  quarter: Slot;
  clock: Slot;
  /** Tamanhos (px da fonte de transmissão) e cores dos textos. */
  size: { abbr: number; rec: number; score: number; quarter: number; clock: number };
  colors: { home: string; away: string; homeRec: string; awayRec: string; homeScore: string; awayScore: string; quarter: string; clock: string };
  /** Brilho (sombra desfocada) no placar e no relógio, quando a transmissão pede. */
  glow?: string;
  /** Chamado pelo Hud a cada atualização (posse de bola, quartos). */
  update: (s: GameState, t: Record<string, Phaser.GameObjects.Text>) => void;
}

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
const poly = (g: Phaser.GameObjects.Graphics, color: number, pts: [number, number][], alpha = 1) => {
  g.fillStyle(color, alpha);
  g.fillPoints(
    pts.map(([x, y]) => V(x, y)),
    true,
  );
};
const outline = (g: Phaser.GameObjects.Graphics, w: number, color: number, a: number, pts: [number, number][]) => {
  g.lineStyle(w, color, a);
  g.strokePoints(
    pts.map(([x, y]) => V(x, y)),
    true,
    true,
  );
};
const mix = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** Bola de futebol americano (posse), desenhada. */
function football(scene: Phaser.Scene, color = 0x8a4a22) {
  const b = scene.add.graphics();
  b.fillStyle(0x000000, 0.45);
  b.fillEllipse(0.5, 1.5, 15, 9);
  b.fillStyle(color, 1);
  b.fillEllipse(0, 0, 14, 8);
  b.lineStyle(1.2, 0xffffff, 1);
  b.lineBetween(-3.5, 0, 3.5, 0);
  for (const x of [-2, 0, 2]) b.lineBetween(x, -1.6, x, 1.6);
  b.lineStyle(1, 0xffffff, 0.9);
  b.lineBetween(-7, 0, -5.5, 0);
  b.lineBetween(5.5, 0, 7, 0);
  return b.setVisible(false);
}

/** Estrela de cinco pontas. */
function star5(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.45 : r;
    pts.push(V(cx + Math.cos(a) * k, cy + Math.sin(a) * k));
  }
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
}

/** Brilho de quatro pontas (bowl). */
function sparkle(scene: Phaser.Scene, x: number, y: number, r: number, color: number) {
  const s = scene.add.graphics().setPosition(x, y);
  s.fillStyle(color, 1);
  s.fillPoints([V(0, -r), V(r * 0.22, -r * 0.22), V(r, 0), V(r * 0.22, r * 0.22), V(0, r), V(-r * 0.22, r * 0.22), V(-r, 0), V(-r * 0.22, -r * 0.22)], true);
  s.fillStyle(0xffffff, 1);
  s.fillCircle(0, 0, r * 0.18);
  return s;
}

export function buildPrimeBoard(scene: Phaser.Scene, pr: Prime, rec: boolean): PrimeBoard {
  const L = 12;
  const R = GAME_W - 12;
  const cx = GAME_W / 2;
  const top = 14;
  const h = 44;
  const cy = top + h / 2;
  const kind = primeKind(pr);
  const g = scene.add.graphics();
  const layers: Phaser.GameObjects.GameObject[] = [g];
  const hc = TEAMS.home.color;
  const ac = TEAMS.away.color;
  const aY = rec ? cy - 8 : cy;
  const rY = cy + 11;
  const name = pr.pt ?? pr.short;
  const anim: (() => void)[] = [];

  // Posse de bola: uma bola ao lado da sigla de quem ataca (comum a todas as transmissões)
  const ballH = football(scene);
  const ballA = football(scene);
  let pips: ((q: number) => void) | null = null;

  const b: PrimeBoard = {
    layers,
    logoH: { x: L + 5, y: top + 4, s: 36 },
    logoA: { x: R - 5 - 36, y: top + 4, s: 36 },
    homeAbbr: { x: L + 48, y: aY, ox: 0 },
    homeRec: { x: L + 48, y: rY, ox: 0 },
    homeScore: { x: cx - 62, y: cy, ox: 1 },
    awayAbbr: { x: R - 48, y: aY, ox: 1 },
    awayRec: { x: R - 48, y: rY, ox: 1 },
    awayScore: { x: cx + 62, y: cy, ox: 0 },
    quarter: { x: cx, y: top + 12, ox: 0.5 },
    clock: { x: cx, y: top + 30, ox: 0.5 },
    size: { abbr: 20, rec: 12, score: 32, quarter: 11, clock: 22 },
    colors: { home: TEAMS.home.fg, away: TEAMS.away.fg, homeRec: TEAMS.home.fg, awayRec: TEAMS.away.fg, homeScore: TEAMS.home.fg, awayScore: TEAMS.away.fg, quarter: hex(pr.glow), clock: '#FFFFFF' },
    update: (s, t) => {
      const mine = s.possession === 'home';
      const ab = mine ? t.homeAbbr : t.awayAbbr;
      const ball = mine ? ballH : ballA;
      (mine ? ballA : ballH).setVisible(false);
      if (ab) {
        const left = ab.originX < 0.5;
        ball.setPosition(left ? ab.x + ab.displayWidth + 12 : ab.x - ab.displayWidth - 12, ab.y + 1).setVisible(true);
      }
      pips?.(s.quarter);
    },
  };

  /** Pontos dos quartos (1–4; na prorrogação, todos acesos e um quinto). */
  const quarterPips = (x: number, y: number, on: number, off: number, w = 12, hh = 3, gap = 4) => {
    const pg = scene.add.graphics();
    layers.push(pg);
    pips = (q) => {
      pg.clear();
      const n = q > 4 ? 5 : 4;
      const x0 = x - (n * w + (n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) {
        pg.fillStyle(i < q ? on : off, 1);
        pg.fillRect(x0 + i * (w + gap), y, w, hh);
      }
    };
  };

  if (kind === 'neon') {
    // ---- QUINTA À NOITE: painel de LED violeta
    const sk = 10;
    const slab: [number, number][] = [[L + sk, top], [R, top], [R - sk, top + h], [L, top + h]];
    outline(g, 12, pr.glow, 0.08, slab);
    outline(g, 6, pr.glow, 0.16, slab);
    poly(g, 0x0c0618, slab);
    // grade de LED
    g.fillStyle(pr.glow, 0.09);
    for (let x = L + sk + 4; x < R - sk - 2; x += 4) for (let y = top + 3; y < top + h - 2; y += 4) g.fillRect(x, y, 1.2, 1.2);
    // zonas dos times (chapadas, inclinadas) nas pontas
    poly(g, hc, [[L + sk, top], [L + sk + 32, top], [L + 32, top + h], [L, top + h]]);
    poly(g, ac, [[R - 32, top], [R, top], [R - sk, top + h], [R - sk - 32, top + h]]);
    // filetes neon de cima e de baixo
    for (const [w, a] of [[5, 0.25], [1.5, 1]] as const) {
      g.lineStyle(w, pr.glow, a);
      g.lineBetween(L + sk, top, R, top);
      g.lineBetween(L, top + h, R - sk, top + h);
    }
    // janela do relógio com varredura
    const win: [number, number][] = [[cx - 44, top + 5], [cx + 50, top + 5], [cx + 44, top + h - 5], [cx - 50, top + h - 5]];
    poly(g, 0x05020c, win);
    g.fillStyle(0xffffff, 0.05);
    for (let y = top + 7; y < top + h - 6; y += 2) g.fillRect(cx - 46, y, 92, 1);
    outline(g, 4, pr.glow, 0.25, win);
    outline(g, 1.2, pr.glow, 1, win);
    // selo com a lua
    const tt = tvText(scene, cx + 8, top - 9, name, 13, '#FFFFFF', 800, 2.4).setOrigin(0.5);
    tt.setShadow(0, 0, hex(pr.glow), 8, false, true);
    const tw = tt.width + 46;
    const tab: [number, number][] = [[cx - tw / 2 + 6, top - 19], [cx + tw / 2 + 6, top - 19], [cx + tw / 2 - 2, top + 1], [cx - tw / 2 - 2, top + 1]];
    poly(g, 0x0c0618, tab);
    outline(g, 4, pr.glow, 0.3, tab);
    outline(g, 1.2, pr.glow, 1, tab);
    const mx = cx - tw / 2 + 16;
    g.fillStyle(0xf2e9ff, 1);
    g.fillCircle(mx, top - 9, 6);
    g.fillStyle(0x0c0618, 1);
    g.fillCircle(mx + 3, top - 11, 5.2);
    layers.push(tt);
    // quartos em pontos de neon embaixo
    quarterPips(cx, top + h + 5, pr.glow, 0x2a1d44, 14, 3, 4);
    // o neon "acende" piscando na entrada
    anim.push(() => {
      const objs = [g, tt];
      scene.tweens.add({ targets: objs, alpha: { from: 0.35, to: 1 }, duration: 70, yoyo: true, repeat: 3, ease: 'Stepped', onComplete: () => objs.forEach((o) => o.setAlpha(1)) });
    });
    b.logoH = { x: L + 9, y: top + 8, s: 28 };
    b.logoA = { x: R - 9 - 28, y: top + 8, s: 28 };
    b.homeAbbr = { x: L + 50, y: aY, ox: 0 };
    b.homeRec = { x: L + 50, y: rY, ox: 0 };
    b.awayAbbr = { x: R - 50, y: aY, ox: 1 };
    b.awayRec = { x: R - 50, y: rY, ox: 1 };
    b.homeScore = { x: cx - 60, y: cy, ox: 1 };
    b.awayScore = { x: cx + 62, y: cy, ox: 0 };
    b.quarter = { x: cx, y: top + 13, ox: 0.5 };
    b.clock = { x: cx, y: top + 29, ox: 0.5 };
    b.size = { abbr: 21, rec: 12, score: 34, quarter: 11, clock: 22 };
    const lav = '#C9B8F2';
    b.colors = { home: '#FFFFFF', away: '#FFFFFF', homeRec: lav, awayRec: lav, homeScore: '#FFFFFF', awayScore: '#FFFFFF', quarter: hex(mix(pr.glow, 0xffffff, 0.3)), clock: '#FFFFFF' };
    b.glow = hex(pr.glow);
  } else if (kind === 'gold') {
    // ---- DOMINGO À NOITE: gala
    const gold = pr.glow;
    const navy = 0x0a1024;
    const pw = 56;
    g.fillStyle(0x000000, 0.35);
    g.fillRect(L, top + 3, R - L, h);
    g.fillStyle(navy, 1);
    g.fillRect(L, top, R - L, h);
    // painéis dos times com risca de giz
    g.fillStyle(hc, 1);
    g.fillRect(L, top, cx - pw - L, h);
    g.fillStyle(ac, 1);
    g.fillRect(cx + pw, top, R - cx - pw, h);
    g.fillStyle(0xffffff, 0.07);
    for (let x = L + 3; x < cx - pw; x += 5) g.fillRect(x, top, 1, h);
    for (let x = cx + pw + 3; x < R; x += 5) g.fillRect(x, top, 1, h);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(L, top + h - 10, R - L, 10);
    // réguas douradas duplas
    g.fillStyle(gold, 1);
    g.fillRect(L - 2, top - 5, R - L + 4, 2);
    g.fillRect(L - 2, top - 1.5, R - L + 4, 1);
    g.fillRect(L - 2, top + h + 0.5, R - L + 4, 1);
    g.fillRect(L - 2, top + h + 3, R - L + 4, 2);
    // caixas de marfim do placar, com bisel dourado
    const box = (x: number) => {
      g.fillStyle(0x000000, 0.35);
      g.fillRect(x + 1, top + 8, 42, 30);
      g.fillStyle(0xf5efdf, 1);
      g.fillRect(x, top + 6, 42, 30);
      g.fillStyle(0x000000, 0.12);
      g.fillRect(x, top + 6, 42, 3);
      g.lineStyle(1.5, gold, 1);
      g.strokeRect(x, top + 6, 42, 30);
    };
    box(cx - pw - 50);
    box(cx + pw + 8);
    // estandarte pendurado
    const ban: [number, number][] = [[cx - pw, top - 8], [cx + pw, top - 8], [cx + pw, top + h - 1], [cx, top + h + 11], [cx - pw, top + h - 1]];
    poly(g, 0x000000, ban.map(([x, y]) => [x + 2, y + 3] as [number, number]), 0.4);
    poly(g, 0x0f1a3d, ban);
    poly(g, pr.color, [[cx - pw, top - 8], [cx + pw, top - 8], [cx + pw, top + 4], [cx - pw, top + 4]], 0.55);
    outline(g, 2, gold, 1, ban);
    outline(g, 1, gold, 0.45, ban.map(([x, y]) => [cx + (x - cx) * 0.9, top + 18 + (y - top - 18) * 0.86] as [number, number]));
    for (const dx of [-14, 0, 14]) star5(g, cx + dx, top - 1, dx ? 3.4 : 4.6, gold);
    const nt = tvText(scene, cx, top + h - 3, name, 9, hex(gold), 800, 2).setOrigin(0.5);
    layers.push(nt);
    b.logoH = { x: L + 6, y: top + 7, s: 30 };
    b.logoA = { x: R - 6 - 30, y: top + 7, s: 30 };
    b.homeAbbr = { x: L + 42, y: aY, ox: 0 };
    b.homeRec = { x: L + 42, y: rY, ox: 0 };
    b.awayAbbr = { x: R - 42, y: aY, ox: 1 };
    b.awayRec = { x: R - 42, y: rY, ox: 1 };
    b.homeScore = { x: cx - pw - 29, y: top + 21, ox: 0.5 };
    b.awayScore = { x: cx + pw + 29, y: top + 21, ox: 0.5 };
    b.quarter = { x: cx, y: top + 9, ox: 0.5 };
    b.clock = { x: cx, y: top + 24, ox: 0.5 };
    b.size = { abbr: 19, rec: 11, score: 26, quarter: 10, clock: 20 };
    b.colors.homeScore = b.colors.awayScore = '#0F1A3D';
    b.colors.quarter = hex(gold);
    b.colors.clock = '#F5EFDF';
  } else if (kind === 'stripe') {
    // ---- SEGUNDA À NOITE: times empilhados + módulo do relógio
    const bx = 262;
    const rows: [number, number][] = [[hc, top], [ac, top + 23]];
    g.fillStyle(0x000000, 0.4);
    g.fillRect(L + 2, top + 3, R - L, h + 1);
    rows.forEach(([c, y0]) => {
      g.fillStyle(0x121216, 1);
      g.fillRect(L, y0, bx - L, 21);
      g.fillStyle(c, 1);
      g.fillRect(L, y0, 30, 21);
      // caixa do placar na cor do time, com corte
      poly(g, c, [[bx - 50, y0], [bx, y0], [bx, y0 + 21], [bx - 56, y0 + 21]]);
      g.fillStyle(0x000000, 0.18);
      g.fillRect(bx - 50, y0 + 15, 50, 6);
    });
    g.fillStyle(pr.color, 1);
    g.fillRect(L, top + 21, bx - L, 2);
    // módulo do relógio: faixa de alerta em cima
    const mx0 = bx + 4;
    g.fillStyle(0x16080a, 1);
    g.fillRect(mx0, top, R - mx0, h);
    g.fillStyle(pr.color, 1);
    g.fillRect(mx0, top, R - mx0, 8);
    g.fillStyle(0x16080a, 1);
    for (let x = mx0 - 8; x < R; x += 12) g.fillPoints([V(x, top + 8), V(x + 6, top + 8), V(x + 12, top), V(x + 6, top)], true);
    g.fillStyle(pr.glow, 1);
    g.fillRect(mx0, top + 8, R - mx0, 1.5);
    // selo com o raio
    const tt = tvText(scene, L + 30, top - 9, name, 12, '#FFFFFF', 800, 2).setOrigin(0, 0.5);
    const tw = tt.width + 44;
    poly(g, pr.color, [[L, top - 19], [L + tw + 8, top - 19], [L + tw, top - 1], [L, top - 1]]);
    g.fillStyle(pr.glow, 1);
    g.fillRect(L, top - 19, tw + 8, 2);
    poly(g, pr.glow, [[L + 17, top - 17], [L + 11, top - 8], [L + 15, top - 8], [L + 12, top - 1], [L + 21, top - 11], [L + 16, top - 11], [L + 20, top - 17]]);
    layers.push(tt);
    quarterPips((mx0 + R) / 2, top + h - 6, pr.glow, 0x3a2024, 14, 3, 4);
    b.logoH = { x: L + 6, y: top + 1.5, s: 18 };
    b.logoA = { x: L + 6, y: top + 24.5, s: 18 };
    b.homeAbbr = { x: L + 38, y: top + 10.5, ox: 0 };
    b.awayAbbr = { x: L + 38, y: top + 33.5, ox: 0 };
    b.homeRec = { x: L + 96, y: top + 11, ox: 0 };
    b.awayRec = { x: L + 96, y: top + 34, ox: 0 };
    b.homeScore = { x: bx - 24, y: top + 10.5, ox: 0.5 };
    b.awayScore = { x: bx - 24, y: top + 33.5, ox: 0.5 };
    b.quarter = { x: (mx0 + R) / 2, y: top + 15, ox: 0.5 };
    b.clock = { x: (mx0 + R) / 2, y: top + 28, ox: 0.5 };
    b.size = { abbr: 16, rec: 11, score: 19, quarter: 10, clock: 20 };
    b.colors = { home: '#FFFFFF', away: '#FFFFFF', homeRec: '#A9A2A6', awayRec: '#A9A2A6', homeScore: TEAMS.home.fg, awayScore: TEAMS.away.fg, quarter: hex(pr.glow), clock: '#FFFFFF' };
    // o relógio fica um pouco acima dos pontos dos quartos
    b.clock.y = top + 26;
  } else if (kind === 'round') {
    // ---- PLAYOFFS: chave do mata-mata até o medalhão
    const sk = 10;
    const gap = 70;
    g.fillStyle(0x000000, 0.35);
    g.fillRect(L + 2, top + 3, R - L, h);
    poly(g, hc, [[L, top], [cx - gap, top], [cx - gap - sk, top + h], [L, top + h]]);
    poly(g, ac, [[cx + gap + sk, top], [R, top], [R, top + h], [cx + gap, top + h]]);
    g.fillStyle(0x000000, 0.16);
    g.fillRect(L, top + h - 9, cx - gap - L - 6, 9);
    g.fillRect(cx + gap + 6, top + h - 9, R - cx - gap - 6, 9);
    poly(g, 0x0b0d14, [[cx - gap, top], [cx + gap + sk, top], [cx + gap, top + h], [cx - gap - sk, top + h]]);
    // linhas da chave: colchete de cada lado e a linha até o medalhão
    g.lineStyle(2, pr.glow, 1);
    for (const s of [-1, 1]) {
      const x0 = cx + s * (gap - 4);
      const x1 = cx + s * (gap - 18);
      g.beginPath();
      g.moveTo(x0, top + 7);
      g.lineTo(x1, top + 7);
      g.lineTo(x1, top + h - 7);
      g.lineTo(x0, top + h - 7);
      g.strokePath();
      g.lineBetween(x1, cy, cx + s * 26, cy);
    }
    // medalhão da fase
    g.fillStyle(pr.glow, 1);
    g.fillCircle(cx, cy - 2, 25);
    g.fillStyle(0x0b0d14, 1);
    g.fillCircle(cx, cy - 2, 22);
    g.lineStyle(1.5, pr.color, 1);
    g.strokeCircle(cx, cy - 2, 19);
    if (playoffLogo.key && scene.textures.exists(playoffLogo.key)) layers.push(scene.add.image(cx, cy - 4, playoffLogo.key).setDisplaySize(30, 30));
    // aba do relógio embaixo do medalhão
    const g2 = scene.add.graphics();
    layers.push(g2);
    g2.fillStyle(0x0b0d14, 1);
    g2.fillRect(cx - 52, top + h - 3, 104, 13);
    g2.fillStyle(pr.glow, 1);
    g2.fillRect(cx - 52, top + h - 3, 104, 1.5);
    g2.lineStyle(1, pr.glow, 0.6);
    g2.strokeRect(cx - 52, top + h - 3, 104, 13);
    // fita de cima com o nome da fase
    const tt = tvText(scene, cx, top - 10, `PLAYOFFS · ${name}`, 11, '#FFFFFF', 800, 2).setOrigin(0.5);
    const tw = tt.width + 34;
    const g3 = scene.add.graphics();
    poly(g3, pr.color, [[cx - tw / 2 + 5, top - 19], [cx + tw / 2 - 5, top - 19], [cx + tw / 2, top - 2], [cx - tw / 2, top - 2]]);
    g3.fillStyle(pr.glow, 1);
    g3.fillRect(cx - tw / 2 + 5, top - 19, tw - 10, 1.5);
    layers.push(g3, tt);
    b.logoH = { x: L + 6, y: top + 7, s: 30 };
    b.logoA = { x: R - 6 - 30, y: top + 7, s: 30 };
    b.homeAbbr = { x: L + 44, y: aY, ox: 0 };
    b.homeRec = { x: L + 44, y: rY, ox: 0 };
    b.awayAbbr = { x: R - 44, y: aY, ox: 1 };
    b.awayRec = { x: R - 44, y: rY, ox: 1 };
    b.homeScore = { x: cx - gap - 12, y: cy, ox: 1 };
    b.awayScore = { x: cx + gap + 14, y: cy, ox: 0 };
    b.quarter = { x: cx - 24, y: top + h + 3.5, ox: 0.5 };
    b.clock = { x: cx + 26, y: top + h + 3.5, ox: 0.5 };
    b.size = { abbr: 19, rec: 11, score: 32, quarter: 10, clock: 13 };
    b.colors.quarter = hex(pr.glow);
    b.colors.clock = '#FFFFFF';
  } else {
    // ---- QFL BOWL: ouro sobre mármore
    const gold = pr.glow;
    const mw = 80;
    g.fillStyle(0x000000, 0.4);
    g.fillRect(L - 3, top - 1, R - L + 10, h + 10);
    g.fillStyle(gold, 1);
    g.fillRect(L - 6, top - 6, R - L + 12, h + 12);
    g.fillStyle(mix(gold, 0x000000, 0.45), 1);
    g.fillRect(L - 4, top - 4, R - L + 8, h + 8);
    g.fillStyle(gold, 1);
    g.fillRect(L - 3, top - 3, R - L + 6, h + 6);
    g.fillStyle(0x0b0b0f, 1);
    g.fillRect(L, top, R - L, h);
    // veios do mármore (fixos)
    g.lineStyle(1, 0xffffff, 0.06);
    for (const [x1, y1, x2, y2] of [[cx - 70, top, cx - 30, top + h], [cx - 40, top, cx + 10, top + h], [cx + 20, top, cx + 60, top + h], [cx + 50, top + 6, cx + 72, top + h]]) g.lineBetween(x1, y1, x2, y2);
    // painéis dos times com filete dourado
    g.fillStyle(hc, 1);
    g.fillRect(L, top, cx - mw - L, h);
    g.fillStyle(ac, 1);
    g.fillRect(cx + mw, top, R - cx - mw, h);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(L, top + h - 9, cx - mw - L, 9);
    g.fillRect(cx + mw, top + h - 9, R - cx - mw, 9);
    g.fillStyle(gold, 1);
    g.fillRect(cx - mw - 2, top, 2, h);
    g.fillRect(cx + mw, top, 2, h);
    // coroa: dentes dourados com pedras
    for (let x = L - 6; x <= R + 6 - 12; x += 22) {
      poly(g, gold, [[x, top - 6], [x + 12, top - 6], [x + 6, top - 15]]);
      g.fillStyle(x % 44 < 22 ? 0xd7263d : 0x2e8bff, 1);
      g.fillCircle(x + 6, top - 9, 1.4);
    }
    // louros em volta do medalhão
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + s * (0.55 + i * 0.36);
        const lx = cx + Math.cos(a) * 30;
        const ly = cy + 2 + Math.sin(a) * 22;
        const leaf = scene.add.graphics();
        leaf.fillStyle(i % 2 ? gold : mix(gold, 0xffffff, 0.25), 1);
        leaf.fillEllipse(0, 0, 9, 4);
        leaf.setPosition(lx, ly).setRotation(a + (s * Math.PI) / 2);
        layers.push(leaf);
      }
    }
    const g2 = scene.add.graphics();
    layers.push(g2);
    g2.fillStyle(gold, 1);
    g2.fillCircle(cx, cy, 22);
    g2.fillStyle(0x0b0b0f, 1);
    g2.fillCircle(cx, cy, 19);
    g2.lineStyle(1, gold, 0.6);
    g2.strokeCircle(cx, cy, 16);
    const key = playoffLogo.key ?? 'logoQflBowl';
    if (scene.textures.exists(key)) layers.push(scene.add.image(cx, cy, key).setDisplaySize(28, 28));
    // fita de cima
    const tt = tvText(scene, cx, top - 20, 'QFL BOWL · A GRANDE FINAL', 10, '#1A1205', 800, 2).setOrigin(0.5);
    const tw = tt.width + 40;
    const g3 = scene.add.graphics();
    poly(g3, gold, [[cx - tw / 2, top - 28], [cx + tw / 2, top - 28], [cx + tw / 2 - 6, top - 12], [cx - tw / 2 + 6, top - 12]]);
    star5(g3, cx - tw / 2 + 12, top - 20, 4, 0x1a1205);
    star5(g3, cx + tw / 2 - 12, top - 20, 4, 0x1a1205);
    layers.push(g3, tt);
    // brilhos piscando na moldura
    const sp: Phaser.GameObjects.Graphics[] = [];
    for (const [x, y, r] of [[L - 4, top - 4, 6], [R + 4, top + h + 4, 6], [cx - mw, top - 5, 4], [cx + mw + 30, top - 5, 5], [L + 60, top + h + 5, 4], [R - 20, top - 6, 4]] as const) {
      const s = sparkle(scene, x, y, r, mix(gold, 0xffffff, 0.5));
      sp.push(s);
      layers.push(s);
    }
    anim.push(() =>
      sp.forEach((s, i) => {
        s.setScale(0.2).setAlpha(0);
        scene.tweens.add({ targets: s, scale: 1, alpha: 1, duration: 520, delay: i * 380, yoyo: true, repeat: -1, repeatDelay: 1600, ease: 'Sine.InOut' });
      }),
    );
    b.logoH = { x: L + 4, y: top + 7, s: 30 };
    b.logoA = { x: R - 4 - 30, y: top + 7, s: 30 };
    b.homeAbbr = { x: L + 39, y: aY, ox: 0 };
    b.awayAbbr = { x: R - 39, y: aY, ox: 1 };
    b.homeRec = { x: L + 39, y: rY, ox: 0 };
    b.awayRec = { x: R - 39, y: rY, ox: 1 };
    b.homeScore = { x: cx - mw - 8, y: cy, ox: 1 };
    b.awayScore = { x: cx + mw + 9, y: cy, ox: 0 };
    // à direita do emblema: quarto em cima, relógio embaixo; à esquerda: os quartos em barras de ouro
    b.quarter = { x: cx + 56, y: cy - 9, ox: 0.5 };
    b.clock = { x: cx + 56, y: cy + 7, ox: 0.5 };
    quarterPips(cx - 56, cy - 6, gold, 0x3a3320, 7, 4, 3);
    layers.push(tvText(scene, cx - 56, cy + 7, 'QUARTOS', 9, hex(mix(gold, 0x0b0b0f, 0.35)), 800, 1.6).setOrigin(0.5));
    b.size = { abbr: 18, rec: 11, score: 30, quarter: 9, clock: 16 };
    b.colors.quarter = hex(gold);
    b.colors.clock = '#FFFFFF';
    b.glow = hex(gold);
  }

  // Textos escuros sobre times claros: a cor do texto do retrospecto acompanha a da sigla
  if (kind !== 'neon' && kind !== 'stripe') {
    b.colors.homeRec = b.colors.home;
    b.colors.awayRec = b.colors.away;
  }
  layers.push(ballH, ballA);
  anim.forEach((f) => f());
  return b;
}
