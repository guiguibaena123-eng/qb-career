import Phaser from 'phaser';
import { matchConfig, VIEW } from '../config';

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
  private night(scene: Phaser.Scene, w: number, h: number) {
    const k = Math.max(1, Math.round(scene.scale.width / w));
    const mk = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const cv = document.createElement('canvas');
      // cobre a tela inteira (VIEW); os gradientes continuam medidos no palco 390×844
      cv.width = Math.ceil(VIEW.w * k);
      cv.height = Math.ceil(VIEW.h * k);
      const ctx = cv.getContext('2d')!;
      ctx.scale(k, k);
      ctx.translate(-VIEW.x, -VIEW.y);
      draw(ctx);
      scene.textures.addCanvas(key, cv);
      return key;
    };
    // Luz (multiplica): centro quase branco, bordas azul-escuras, topo (arquibancada) na penumbra
    const shade = mk('night_shade', (ctx) => {
      ctx.fillStyle = '#4b5384';
      ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      const g = ctx.createRadialGradient(w / 2, h * 0.52, h * 0.08, w / 2, h * 0.52, h * 0.62);
      g.addColorStop(0, '#fbfcff');
      g.addColorStop(0.55, '#dfe5fb');
      g.addColorStop(0.85, '#8f98c6');
      g.addColorStop(1, '#4b5384');
      ctx.fillStyle = g;
      ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      // laterais (fora das linhas) um pouco mais escuras
      const side = ctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, 'rgba(60,66,110,0.55)');
      side.addColorStop(0.16, 'rgba(255,255,255,0)');
      side.addColorStop(0.84, 'rgba(255,255,255,0)');
      side.addColorStop(1, 'rgba(60,66,110,0.55)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = side;
      ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    });
    scene.add.image(VIEW.x, VIEW.y, shade).setOrigin(0).setDisplaySize(VIEW.w, VIEW.h).setDepth(59).setBlendMode(Phaser.BlendModes.MULTIPLY);
    // Fachos e brilho (soma)
    const glow = mk('night_glow', (ctx) => {
      // Sem fachos dos refletores: só o gramado bem iluminado
      // poça de luz sobre o gramado
      const p = ctx.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.48, w * 0.75);
      p.addColorStop(0, 'rgba(255,250,235,0.1)');
      p.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = p;
      ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    });
    scene.add.image(VIEW.x, VIEW.y, glow).setOrigin(0).setDisplaySize(VIEW.w, VIEW.h).setDepth(59.6).setBlendMode(Phaser.BlendModes.ADD);
  }
}
