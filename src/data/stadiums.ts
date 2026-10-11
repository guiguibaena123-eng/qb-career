/*
 * Estádio de cada time: modelo de arquibancada (ver systems/grandstand.ts) e a cidade que aparece
 * ao fundo das arquibancadas baixas (ver systems/skyline.ts). Tudo desenhado por código.
 */

export type StandModelId = 'baixa' | 'telao' | 'anel' | 'separacao' | 'classica';
export type StandChoice = 'auto' | StandModelId;

export const STAND_IDS: StandModelId[] = ['baixa', 'telao', 'anel', 'separacao', 'classica'];

export const STAND_NAMES: Record<StandModelId, string> = {
  baixa: 'BAIXA',
  telao: 'TELÃO',
  anel: 'ANEL',
  separacao: 'DIVISÃO',
  classica: 'ALTA',
};

/** Peças que compõem a cidade ao fundo. */
export type CityPiece = 'towers' | 'needle' | 'bridge' | 'mountains' | 'palms' | 'strip' | 'dome' | 'town' | 'mesa' | 'hills' | 'lighthouse' | 'pyramid';

export interface CitySpec {
  /** Peças desenhadas, de trás para a frente. */
  pieces: CityPiece[];
  /** Densidade de prédios (0..1). */
  density: number;
  /** Cor do brilho do céu no horizonte. */
  glow: string;
  /** Cor de destaque dos prédios (janelas/neon). */
  accent?: string;
}

export interface Stadium {
  model: StandModelId;
  city: CitySpec;
}

const S = (model: StandModelId, pieces: CityPiece[], density: number, glow: string, accent?: string): Stadium => ({
  model,
  city: { pieces, density, glow, accent },
});

export const STADIUMS: Record<string, Stadium> = {
  buf: S('baixa', ['towers'], 0.45, '#7aa7ff'),
  mia: S('anel', ['towers', 'palms'], 0.7, '#ff7ab8', '#3fe0d0'),
  ne: S('telao', ['hills', 'towers', 'lighthouse'], 0.3, '#ff9a4a'),
  nyj: S('anel', ['towers'], 1, '#ffb36b'), // Jits e Biggers dividem o estádio (anel)
  bal: S('anel', ['towers'], 0.8, '#ff8f5a'),
  cin: S('baixa', ['hills', 'towers'], 0.65, '#ff7a3d'),
  cle: S('telao', ['towers'], 0.7, '#8aa0ff'),
  pit: S('separacao', ['towers', 'bridge'], 0.8, '#ffc94a', '#ffc94a'),
  hou: S('anel', ['towers'], 1, '#ff6a4a'),
  ind: S('baixa', ['towers'], 0.8, '#6aa0ff'),
  jax: S('telao', ['towers', 'bridge', 'palms'], 0.6, '#ff9a5a'),
  ten: S('separacao', ['towers'], 0.8, '#ff7a9a'),
  den: S('baixa', ['mountains', 'towers'], 0.6, '#ff8a3d'),
  kc: S('anel', ['towers'], 0.6, '#ff5a5a'),
  lv: S('separacao', ['strip', 'pyramid'], 0.9, '#c34bff', '#ff3fd0'),
  lac: S('classica', ['hills', 'towers', 'palms'], 0.55, '#c36aff'), // Guards e Vams dividem o estádio (alta)
  dal: S('telao', ['towers'], 1, '#ff8f3a'),
  nyg: S('anel', ['towers'], 1, '#ffb36b'),
  phi: S('baixa', ['towers'], 0.9, '#ffb36b'),
  was: S('classica', ['towers'], 0.7, '#ff9a8a'),
  chi: S('anel', ['towers'], 1, '#7aa7ff'),
  det: S('classica', ['towers'], 0.8, '#8aa0ff'),
  gb: S('baixa', ['town'], 0.2, '#ffb36b'),
  min: S('classica', ['towers'], 0.8, '#b07aff'),
  atl: S('separacao', ['towers'], 0.9, '#ff7a5a'),
  car: S('classica', ['towers'], 0.7, '#6aa0ff'),
  no: S('anel', ['towers', 'dome'], 0.6, '#ffb04a'),
  tb: S('telao', ['towers', 'palms'], 0.6, '#ff6ab8'),
  ari: S('baixa', ['mesa'], 0.3, '#ff6a3a'),
  lar: S('classica', ['hills', 'towers', 'palms'], 0.55, '#c36aff'),
  sf: S('baixa', ['towers', 'pyramid', 'bridge'], 0.6, '#ff8a6a', '#e0482e'),
  sea: S('anel', ['mountains', 'towers', 'needle'], 0.7, '#6ac3ff'),
};

export const stadiumOf = (teamId: string): Stadium => STADIUMS[teamId] ?? STADIUMS.kc;
