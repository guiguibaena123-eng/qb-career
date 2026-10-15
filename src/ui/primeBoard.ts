import Phaser from 'phaser';
import { GAME_W, TEAMS, playoffLogo } from '../config';
import { title } from './widgets';

/*
 * Placares exclusivos dos jogos de horário nobre e dos playoffs (carreira). Cada transmissão tem o
 * seu desenho, bem diferente do placar comum:
 *   neon   — QUI à noite (Thursday Night): painéis inclinados com filete neon e centro em trapézio;
 *   gold   — DOM à noite (Sunday Night): barra com aba dourada pendurada e caixas de placar claras;
 *   stripe — SEG à noite (Monday Night): corte diagonal, faixa de alerta e "moeda" no centro;
 *   round  — Wild Card / Divisional / Semi Bowl: hexágono com o emblema da fase e o quarto numa aba;
 *   bowl   — QFL Bowl: moldura dourada com coroa, emblema da final e painéis estreitos.
 * O Hud só pede as posições e cores dos textos; os desenhos ficam todos aqui.
 */

export interface Prime {
  name: string;
  short: string;
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
  /** Tamanhos e cores dos textos. */
  size: { abbr: number; score: number; quarter: number; clock: number };
  colors: { home: string; away: string; homeScore: string; awayScore: string; quarter: string; clock: string };
}

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const DARK = 0x0d0f1f;

const poly = (g: Phaser.GameObjects.Graphics, color: number, pts: [number, number][], alpha = 1) => {
  g.fillStyle(color, alpha);
  g.fillPoints(
    pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)),
    true,
  );
};
const seg = (g: Phaser.GameObjects.Graphics, w: number, color: number, a: number, x1: number, y1: number, x2: number, y2: number) => {
  g.lineStyle(w, color, a);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokePath();
};

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
  // Sigla e retrospecto: com retrospecto, a sigla sobe e o "7-2" fica embaixo
  const aY = rec ? cy - 8 : cy;
  const rY = cy + 10;

  const b: PrimeBoard = {
    layers,
    logoH: { x: L + 5, y: top + 4, s: 36 },
    logoA: { x: R - 5 - 36, y: top + 4, s: 36 },
    homeAbbr: { x: L + 46, y: aY, ox: 0 },
    homeRec: { x: L + 46, y: rY, ox: 0 },
    homeScore: { x: cx - 56, y: cy, ox: 1 },
    awayAbbr: { x: R - 46, y: aY, ox: 1 },
    awayRec: { x: R - 46, y: rY, ox: 1 },
    awayScore: { x: cx + 56, y: cy, ox: 0 },
    quarter: { x: cx, y: top + 13, ox: 0.5 },
    clock: { x: cx, y: top + 31, ox: 0.5 },
    size: { abbr: 11, score: 18, quarter: 10, clock: 12 },
    colors: { home: TEAMS.home.fg, away: TEAMS.away.fg, homeScore: TEAMS.home.fg, awayScore: TEAMS.away.fg, quarter: hex(pr.glow), clock: '#FFFFFF' },
  };

  /** Aba com o nome da transmissão, inclinada, sobre o centro do placar. */
  const cap = (text: string, y: number, w = 0, skew = 6) => {
    const t = title(scene, cx, y + 7, text, 7, '#FFFFFF').setOrigin(0.5);
    const cw = Math.max(w, t.width + 30);
    poly(g, 0x0d0d12, [[cx - cw / 2 - 2 + skew, y - 2], [cx + cw / 2 + 2, y - 2], [cx + cw / 2 + 2 - skew, y + 16], [cx - cw / 2 - 2, y + 16]]);
    poly(g, pr.color, [[cx - cw / 2 + skew, y], [cx + cw / 2, y], [cx + cw / 2 - skew, y + 14], [cx - cw / 2, y + 14]]);
    seg(g, 2, pr.glow, 1, cx - cw / 2 + skew, y, cx + cw / 2, y);
    layers.push(t);
  };

  if (kind === 'neon') {
    const hw = 50;
    const sk = 12;
    // halo neon e base escura
    g.fillStyle(pr.glow, 0.28);
    g.fillRect(L - 4, top - 4, R - L + 8, h + 8);
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(L - 2, top - 2, R - L + 4, h + 4);
    poly(g, hc, [[L, top], [cx - hw, top], [cx - hw - sk, top + h], [L, top + h]]);
    poly(g, ac, [[cx + hw, top], [R, top], [R, top + h], [cx + hw + sk, top + h]]);
    poly(g, DARK, [[cx - hw, top], [cx + hw, top], [cx + hw + sk, top + h], [cx - hw - sk, top + h]]);
    poly(g, pr.color, [[cx - hw, top], [cx + hw, top], [cx + hw + sk / 2, top + h / 2], [cx - hw - sk / 2, top + h / 2]], 0.4);
    for (const [w, a] of [[7, 0.22], [2, 1]] as const) {
      seg(g, w, pr.glow, a, cx - hw, top, cx - hw - sk, top + h);
      seg(g, w, pr.glow, a, cx + hw, top, cx + hw + sk, top + h);
      seg(g, w, pr.glow, a, cx - hw, top, cx + hw, top);
      seg(g, w, pr.glow, a, cx - hw - sk, top + h, cx + hw + sk, top + h);
    }
    cap(pr.short, top - 19);
    b.homeScore = { x: cx - 66, y: cy, ox: 1 };
    b.awayScore = { x: cx + 66, y: cy, ox: 0 };
    b.homeAbbr.x = L + 46;
    b.awayAbbr.x = R - 46;
  } else if (kind === 'gold') {
    const bh = 38;
    const tw = 58;
    // régua dourada em cima e embaixo, painéis dos times e aba central pendurada
    g.fillStyle(pr.glow, 1);
    g.fillRect(L - 3, top - 3, R - L + 6, 3);
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(L - 3, top, R - L + 6, bh + 4);
    g.fillStyle(hc, 1);
    g.fillRect(L, top, cx - tw - L, bh);
    g.fillStyle(ac, 1);
    g.fillRect(cx + tw, top, R - cx - tw, bh);
    g.fillStyle(pr.color, 1);
    g.fillRect(L, top + bh, R - L, 3);
    // caixas de placar claras
    g.fillStyle(0xf3f0e6, 1);
    g.fillRoundedRect(cx - tw - 46, top + 4, 42, bh - 8, 4);
    g.fillRoundedRect(cx + tw + 4, top + 4, 42, bh - 8, 4);
    // aba central
    g.fillStyle(pr.glow, 1);
    g.fillRect(cx - tw - 2, top - 3, tw * 2 + 4, h + 14);
    g.fillStyle(DARK, 1);
    g.fillRect(cx - tw, top - 1, tw * 2, h + 10);
    g.fillStyle(pr.color, 0.55);
    g.fillRect(cx - tw, top - 1, tw * 2, 22);
    const t = title(scene, cx, top + h + 1, pr.short, 7, hex(pr.glow)).setOrigin(0.5);
    layers.push(t);
    b.logoH = { x: L + 4, y: top + 4, s: 30 };
    b.logoA = { x: R - 4 - 30, y: top + 4, s: 30 };
    b.homeAbbr = { x: L + 38, y: rec ? top + 13 : top + bh / 2, ox: 0 };
    b.homeRec = { x: L + 38, y: top + 29, ox: 0 };
    b.awayAbbr = { x: R - 38, y: rec ? top + 13 : top + bh / 2, ox: 1 };
    b.awayRec = { x: R - 38, y: top + 29, ox: 1 };
    b.homeScore = { x: cx - tw - 25, y: top + bh / 2, ox: 0.5 };
    b.awayScore = { x: cx + tw + 25, y: top + bh / 2, ox: 0.5 };
    b.quarter = { x: cx, y: top + 11, ox: 0.5 };
    b.clock = { x: cx, y: top + 30, ox: 0.5 };
    b.size = { abbr: 10, score: 17, quarter: 10, clock: 13 };
    // placar escuro sobre a caixa clara
    b.colors.homeScore = b.colors.awayScore = '#0D0D12';
  } else if (kind === 'stripe') {
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(L - 3, top - 3, R - L + 6, h + 6);
    poly(g, hc, [[L, top], [cx + 10, top], [cx - 18, top + h], [L, top + h]]);
    poly(g, ac, [[cx + 26, top], [R, top], [R, top + h], [cx - 2, top + h]]);
    poly(g, pr.glow, [[cx + 10, top], [cx + 26, top], [cx - 2, top + h], [cx - 18, top + h]]);
    poly(g, pr.color, [[cx + 15, top], [cx + 21, top], [cx - 7, top + h], [cx - 13, top + h]]);
    // "moeda" central com o quarto e o relógio
    g.fillStyle(pr.glow, 1);
    g.fillCircle(cx, cy, 29);
    g.fillStyle(DARK, 1);
    g.fillCircle(cx, cy, 26);
    g.lineStyle(2, pr.color, 1);
    g.strokeCircle(cx, cy, 22);
    cap(pr.short, top - 19, 0, 8);
    b.homeScore = { x: cx - 40, y: cy, ox: 1 };
    b.awayScore = { x: cx + 40, y: cy, ox: 0 };
    b.quarter = { x: cx, y: cy - 8, ox: 0.5 };
    b.clock = { x: cx, y: cy + 8, ox: 0.5 };
    b.size = { abbr: 11, score: 18, quarter: 8, clock: 9 };
  } else if (kind === 'round') {
    // hexágono central com o emblema da fase; o quarto vai na aba de cima
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(L - 3, top - 3, R - L + 6, h + 6);
    g.fillStyle(hc, 1);
    g.fillRect(L, top, cx - 46 - L, h);
    g.fillStyle(ac, 1);
    g.fillRect(cx + 46, top, R - cx - 46, h);
    g.fillStyle(pr.glow, 1);
    g.fillRect(L, top, R - L, 2);
    g.fillRect(L, top + h - 2, R - L, 2);
    const hexa: [number, number][] = [[cx - 52, cy], [cx - 30, top - 6], [cx + 30, top - 6], [cx + 52, cy], [cx + 30, top + h + 6], [cx - 30, top + h + 6]];
    poly(g, pr.glow, hexa);
    poly(g, DARK, hexa.map(([x, y]) => [cx + (x - cx) * 0.9, cy + (y - cy) * 0.86] as [number, number]));
    if (playoffLogo.key && scene.textures.exists(playoffLogo.key)) layers.push(scene.add.image(cx, cy - 7, playoffLogo.key).setDisplaySize(30, 30));
    // aba do quarto
    const cw = 96;
    poly(g, 0x0d0d12, [[cx - cw / 2 + 4, top - 20], [cx + cw / 2 - 4, top - 20], [cx + cw / 2 + 2, top - 5], [cx - cw / 2 - 2, top - 5]]);
    poly(g, pr.color, [[cx - cw / 2 + 6, top - 18], [cx + cw / 2 - 6, top - 18], [cx + cw / 2, top - 6], [cx - cw / 2, top - 6]]);
    b.quarter = { x: cx, y: top - 12, ox: 0.5 };
    b.clock = { x: cx, y: cy + 14, ox: 0.5 };
    b.homeScore = { x: cx - 58, y: cy, ox: 1 };
    b.awayScore = { x: cx + 58, y: cy, ox: 0 };
    b.size = { abbr: 10, score: 18, quarter: 8, clock: 10 };
    b.colors.quarter = '#FFFFFF';
    b.colors.clock = hex(pr.glow);
  } else {
    // bowl: moldura dourada com coroa, painéis estreitos e emblema da final
    g.fillStyle(pr.glow, 1);
    g.fillRect(L - 6, top - 6, R - L + 12, h + 12);
    g.fillStyle(pr.color, 1);
    g.fillRect(L - 4, top - 4, R - L + 8, h + 8);
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(L - 2, top - 2, R - L + 4, h + 4);
    const mw = 62;
    g.fillStyle(hc, 1);
    g.fillRect(L, top, cx - mw - L, h);
    g.fillStyle(ac, 1);
    g.fillRect(cx + mw, top, R - cx - mw, h);
    g.fillStyle(DARK, 1);
    g.fillRect(cx - mw, top, mw * 2, h);
    g.fillStyle(pr.color, 0.4);
    g.fillRect(cx - mw, top, mw * 2, h / 2);
    for (const x of [cx - mw, cx + mw - 2]) {
      g.fillStyle(pr.glow, 1);
      g.fillRect(x, top, 2, h);
    }
    // coroa: dentes dourados ao longo da moldura de cima
    for (let x = L - 6; x < R + 6 - 8; x += 24) poly(g, pr.glow, [[x, top - 6], [x + 12, top - 6], [x + 6, top - 15]]);
    // medalhão do emblema
    g.fillStyle(pr.glow, 1);
    g.fillCircle(cx - 36, cy, 24);
    g.fillStyle(DARK, 1);
    g.fillCircle(cx - 36, cy, 21);
    const key = playoffLogo.key ?? 'logoQflBowl';
    if (scene.textures.exists(key)) layers.push(scene.add.image(cx - 36, cy, key).setDisplaySize(32, 32));
    b.quarter = { x: cx + 26, y: top + 12, ox: 0.5 };
    b.clock = { x: cx + 26, y: top + 30, ox: 0.5 };
    b.logoH = { x: L + 3, y: top + 7, s: 30 };
    b.logoA = { x: R - 3 - 30, y: top + 7, s: 30 };
    b.homeAbbr = { x: L + 37, y: rec ? cy - 8 : cy, ox: 0 };
    b.awayAbbr = { x: R - 37, y: rec ? cy - 8 : cy, ox: 1 };
    b.homeRec = { x: L + 37, y: rY, ox: 0 };
    b.awayRec = { x: R - 37, y: rY, ox: 1 };
    b.homeScore = { x: cx - mw - 6, y: cy, ox: 1 };
    b.awayScore = { x: cx + mw + 6, y: cy, ox: 0 };
    b.size = { abbr: 10, score: 16, quarter: 9, clock: 11 };
  }
  return b;
}
