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
export class Daylight {
  private rect: Phaser.GameObjects.Rectangle | null = null;
  private pools: { img: Phaser.GameObjects.Image; x: number; y: number }[] = [];

  constructor(scene: Phaser.Scene, readonly tod: TimeOfDay, w: number, h: number, weather: SkyWeather = 'clear') {
    // Dia e tarde com chuva/neve: céu nublado, luz cinza e difusa (a noite fica como no tempo limpo)
    const overcast: Record<'day' | 'dusk', Record<'rain' | 'snow', number>> = {
      day: { rain: 0xa3abb8, snow: 0xc9ced8 },
      dusk: { rain: 0x9c95a0, snow: 0xbdb3b8 },
    };
    const c = tod !== 'night' && weather !== 'clear' ? overcast[tod][weather] : TOD[tod].light;
    if (c === null) return;
    if (tod === 'night') {
      this.night(scene, w, h);
      return;
    }
    this.rect = scene.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, c, 1).setOrigin(0).setDepth(59).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  /**
   * Noite de estádio: o gramado fica bem iluminado no centro e escurece para as bordas e a arquibancada
   * (camada que multiplica), e por cima entram os fachos dos refletores e um brilho branco-quente sobre o
   * campo (camada aditiva). Tudo em textura de canvas na resolução da tela.
   */
  private night(scene: Phaser.Scene, _w: number, _h: number) {
    // Escuridão da noite por igual na tela (não "anda" com a câmera)
    scene.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, 0x8a93c8, 1).setOrigin(0).setDepth(59).setBlendMode(Phaser.BlendModes.MULTIPLY);
    // Focos dos refletores PRESOS NO GRAMADO: poças de luz em pontos fixos do campo, projetadas a cada quadro
    const key = 'night_pool';
    if (!scene.textures.exists(key)) {
      const S = 256;
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      // luz âmbar de refletor (não branca): realça o verde do gramado sem lavar a cor
      g.addColorStop(0, 'rgba(255,214,140,1)');
      g.addColorStop(0.4, 'rgba(255,200,120,0.5)');
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      scene.textures.addCanvas(key, cv);
    }
    for (const y of [-2, 22, 50, 78, 102]) {
      const img = scene.add.image(0, 0, key).setDepth(59.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.16).setVisible(false);
      this.pools.push({ img, x: FIELD.width / 2, y });
    }
  }

  /** Reposiciona os focos de luz conforme a câmera (ficam fixos no campo). */
  update(proj: Projection) {
    for (const p of this.pools) {
      const a = proj.project(p.x, p.y);
      const u = proj.unitAt(p.y);
      const d = u * 52; // ~52 jardas de diâmetro
      const vis = p.y > proj.nearY - 30 && a.y > VIEW.y - d && u > 0;
      p.img.setVisible(vis);
      if (vis) p.img.setPosition(a.x, a.y).setDisplaySize(d, d * proj.flattenAt(p.y));
    }
  }

}
