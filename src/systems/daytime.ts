import Phaser from 'phaser';
import { FIELD, matchConfig, VIEW } from '../config';
import type { Projection } from './projection';

/*
 * Horário da partida: DIA (céu azul, refletores apagados), TARDE (pôr do sol alaranjado, refletores
 * acendendo) e NOITE (céu escuro, refletores no máximo). Muda o céu atrás do estádio, a cidade ao
 * fundo, o brilho dos refletores e a luz sobre o campo (uma camada que multiplica as cores).
 */

export type TimeOfDay = 'day' | 'dusk' | 'night';
export type TimeChoice = TimeOfDay | 'random';

type RGB = [number, number, number];

export interface TodInfo {
  label: string;
  /** Céu (topo e horizonte), em 0..1 para o shader. */
  skyTop: RGB;
  skyHor: RGB;
  /** Chão fora do muro (só aparece nas bordas). */
  bg: RGB;
  /** Cor da luz sobre tudo (multiplica); null = sem filtro. */
  light: number | null;
  /** Intensidade dos refletores (0 apagados .. 1 no máximo). */
  lamps: number;
}

export const TOD: Record<TimeOfDay, TodInfo> = {
  day: { label: 'DIA', skyTop: [0.28, 0.55, 0.9], skyHor: [0.68, 0.84, 0.97], bg: [0.3, 0.42, 0.58], light: null, lamps: 0 },
  dusk: { label: 'TARDE', skyTop: [0.17, 0.12, 0.34], skyHor: [0.98, 0.5, 0.25], bg: [0.2, 0.13, 0.22], light: 0xffcfa6, lamps: 0.6 },
  night: { label: 'NOITE', skyTop: [0.02, 0.025, 0.07], skyHor: [0.09, 0.1, 0.23], bg: [0.051, 0.051, 0.071], light: 0xd2daf8, lamps: 1 },
};

export type SkyWeather = 'clear' | 'rain' | 'snow';

/** Céu e chão do horário, ajustados pelo clima: dia de chuva/neve fica cinza; à noite o azul muda de tom. */
export function todInfo(tod: TimeOfDay, weather: SkyWeather = 'clear'): TodInfo {
  const base = TOD[tod];
  if (weather === 'clear') return base;
  const rain = weather === 'rain';
  if (tod === 'day') {
    return { ...base, skyTop: rain ? [0.36, 0.39, 0.44] : [0.55, 0.58, 0.62], skyHor: rain ? [0.58, 0.61, 0.66] : [0.78, 0.8, 0.83], bg: [0.33, 0.36, 0.4] };
  }
  if (tod === 'dusk') {
    return { ...base, skyTop: rain ? [0.18, 0.19, 0.27] : [0.26, 0.26, 0.36], skyHor: rain ? [0.66, 0.46, 0.4] : [0.78, 0.6, 0.55] };
  }
  return { ...base, skyTop: rain ? [0.015, 0.035, 0.075] : [0.035, 0.045, 0.1], skyHor: rain ? [0.06, 0.13, 0.2] : [0.15, 0.17, 0.3] };
}

/** Fonte de luz para as sombras dos jogadores: posição no campo (jardas), comprimento da sombra e força. */
export interface ShadowLight {
  x: number;
  y: number;
  len: number;
  a: number;
}

const CORNERS: [number, number][] = [
  [-8, -14],
  [61, -14],
  [-8, 118],
  [61, 118],
];

/** Sombras: de dia uma oval sob o jogador; à noite uma sombra para cada torre de luz dos 4 cantos; na tarde, o sol baixo faz uma sombra comprida. */
export function shadowLights(tod: TimeOfDay, weather: SkyWeather = 'clear'): ShadowLight[] | null {
  if (tod === 'day') return null;
  // tarde nublada (chuva/neve): sem sol baixo, só as torres de luz fracas
  if (tod === 'dusk' && weather !== 'clear') return CORNERS.map(([x, y]) => ({ x, y, len: 3.1, a: 0.08 }));
  const corners = (a: number): ShadowLight[] => CORNERS.map(([x, y]) => ({ x, y, len: 3.1, a }));
  if (tod === 'night') return corners(0.22);
  return [{ x: -75, y: -55, len: 5.5, a: 0.3 }, ...corners(0.06)];
}

export const TOD_IDS: TimeOfDay[] = ['day', 'dusk', 'night'];

/** Horário da partida: ?hora=dia|tarde|noite força; senão o do menu; "random" sorteia. */
export function pickTimeOfDay(): TimeOfDay {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('hora') : null;
  if (q === 'dia') return 'day';
  if (q === 'tarde') return 'dusk';
  if (q === 'noite') return 'night';
  const c = matchConfig.time;
  if (c !== 'random') return c;
  return TOD_IDS[Math.floor(Math.random() * TOD_IDS.length)];
}

/** Camada de luz: multiplica as cores do jogo pela cor do horário (tarde quente, noite azulada). */
/** Focos dos refletores mirados no gramado (jardas): duas colunas × cinco faixas ao longo do campo. */
const POOLS: [number, number][] = [];
for (const y of [5, 30, 55, 80, 105]) for (const x of [13.3, 40]) POOLS.push([x, y]);
const POOL_R2 = 13.5 * 13.5;


type V3 = [number, number, number];

export class Daylight {
  private rect: Phaser.GameObjects.Rectangle | null = null;
  private lightG: Phaser.GameObjects.Graphics | null = null;
  private lastKey = '';
  /** Luz mínima (longe dos focos) e ganho dos focos. */
  private amb = 0.55;
  private gain = 0.42;
  /** Cor (multiplica) do escuro e da luz plena. */
  private dark: V3 = [0.56, 0.58, 0.76];
  private full: V3 = [1, 0.99, 0.955];

  constructor(scene: Phaser.Scene, readonly tod: TimeOfDay, w: number, h: number, weather: SkyWeather = 'clear') {
    // Dia e tarde com chuva/neve: céu nublado, luz cinza e difusa (a noite fica como no tempo limpo)
    const overcast: Record<'day' | 'dusk', Record<'rain' | 'snow', number>> = {
      day: { rain: 0xa3abb8, snow: 0xc9ced8 },
      dusk: { rain: 0x9c95a0, snow: 0xbdb3b8 },
    };
    const c = tod !== 'night' && weather !== 'clear' ? overcast[tod][weather] : TOD[tod].light;
    if (c === null) return;
    void w;
    void h;
    if (tod === 'night') {
      // Noite: só o mapa de luz dos refletores (o gramado mantém as cores vivas)
      this.lightG = scene.add.graphics().setDepth(59.6).setBlendMode(Phaser.BlendModes.MULTIPLY);
      return;
    }
    this.rect = scene.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, c, 1).setOrigin(0).setDepth(59).setBlendMode(Phaser.BlendModes.MULTIPLY);
    // Tarde: os refletores já acesos marcam o gramado de leve (mesmo mapa, bem mais suave)
    if (tod === 'dusk') {
      this.amb = 0.8;
      this.gain = 0.2;
      this.dark = weather === 'clear' ? [0.72, 0.7, 0.8] : [0.8, 0.79, 0.84];
      this.lightG = scene.add.graphics().setDepth(59.6).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }
  }

  /** Luz (0..1) num ponto do chão: luz mínima + soma dos focos (queda gaussiana suave). */
  private lightAt(x: number, y: number) {
    let s = 0;
    for (const [px, py] of POOLS) {
      const dx = x - px;
      const dy = y - py;
      s += Math.exp(-(dx * dx + dy * dy) / POOL_R2);
    }
    return Math.min(1, this.amb + this.gain * s);
  }

  /** Cor (multiplica) para uma luz L. */
  private colorFor(L: number) {
    const t = Math.pow(Math.min(1, Math.max(0, (L - this.amb) / (1 - this.amb))), 0.8);
    const ch = (i: number) => Math.round(255 * (this.dark[i] + (this.full[i] - this.dark[i]) * t));
    return (ch(0) << 16) | (ch(1) << 8) | ch(2);
  }

  /**
   * Mapa de luz dos refletores, PRESO NO GRAMADO: uma malha de pontos no chão (de bem antes da end zone
   * até atrás da arquibancada, e muito além das laterais) com a luz de cada ponto; projetada pela câmera
   * a cada quadro e pintada em triângulos com cor por vértice (degradê suave), multiplicando a imagem.
   * Os focos fazem manchas suaves de luz que ficam no mesmo lugar do campo quando a câmera anda.
   * Acima da arquibancada (`standTopY`, céu e cidade) não escurece nada: a cidade fica viva.
   */
  update(proj: Projection, standTopY?: number) {
    const g = this.lightG;
    if (!g) return;
    const key = `${proj.camY},${proj.tilt},${standTopY ?? ''}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    g.clear();
    const y0 = Math.max(-40, proj.nearY - 3);
    const rows: number[] = [];
    for (let y = y0; y < 136; y += y < 0 || y > 110 ? 6 : 3) rows.push(y);
    rows.push(136);
    // Cada linha do chão (y) vira uma linha horizontal na tela; a posição x na tela é linear no x do campo.
    // Então o mapa é feito de faixas horizontais, cada uma com retângulos em degradê de 4 cantos (cores
    // calculadas no ponto do chão sob cada canto): sem emendas e sem depender de triângulos coloridos.
    const SX0 = VIEW.x - 4;
    const SX1 = VIEW.x + VIEW.w + 4;
    const NC = 18;
    const sxs = Array.from({ length: NC + 1 }, (_, i) => SX0 + ((SX1 - SX0) * i) / NC);
    const rowCols = (y: number) => {
      const p0 = proj.project(0, y);
      const p1 = proj.project(1, y);
      const k = p1.x - p0.x || 1e-6;
      return { sy: p0.y, cols: sxs.map((sx) => this.colorFor(this.lightAt((sx - p0.x) / k, y))) };
    };
    let prev = rowCols(rows[0]);
    let farY = prev.sy;
    for (let r = 1; r < rows.length; r++) {
      const cur = rowCols(rows[r]);
      const top = cur.sy;
      const bot = prev.sy;
      if (bot > top + 0.01 && bot > VIEW.y - 8 && top < VIEW.y + VIEW.h + 8) {
        for (let i = 0; i < NC; i++) {
          g.fillGradientStyle(cur.cols[i], cur.cols[i + 1], prev.cols[i], prev.cols[i + 1], 1, 1, 1, 1);
          g.fillRect(sxs[i], top, sxs[i + 1] - sxs[i], bot - top);
        }
      }
      farY = Math.min(farY, top);
      prev = cur;
    }
    // Da última linha (atrás da arquibancada) até o topo da arquibancada: luz ambiente (torcida na penumbra)
    {
      const top = Math.max(VIEW.y - 4, standTopY ?? VIEW.y - 4);
      if (farY > top) {
        g.fillStyle(this.colorFor(this.amb), 1);
        g.fillRect(VIEW.x - 4, top, VIEW.w + 8, farY - top + 1);
      }
    }
  }
}
