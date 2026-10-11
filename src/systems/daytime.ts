import Phaser from 'phaser';
import { matchConfig } from '../config';

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
export function shadowLights(tod: TimeOfDay): ShadowLight[] | null {
  if (tod === 'day') return null;
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
export class Daylight {
  private rect: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, readonly tod: TimeOfDay, w: number, h: number) {
    const c = TOD[tod].light;
    if (c === null) return;
    this.rect = scene.add.rectangle(0, 0, w, h, c, 1).setOrigin(0).setDepth(59).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }
}
