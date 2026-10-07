// Configuração central: resolução, câmera/projeção, cores do campo e times.

export const GAME_W = 390;
export const GAME_H = 844;

/** Parâmetros da projeção pseudo-3D (mundo em jardas → tela em px). */
export const CAMERA = {
  tiltDefault: 40, // graus (inclinação da câmera)
  tiltMin: 28,
  tiltMax: 52,
  perspDist: 700, // distância de perspectiva (px)
  vanishRatio: 0.35, // ponto de fuga em 35% da altura
  focusRatio: 0.72, // o QB fica no terço inferior
  zoom: 0.9,
  pxPerYard: 7.5, // px por jarda na largura, no ponto de foco (antes do zoom)
  depthPxBase: 24.4, // profundidade por jarda = base × sen(tilt)
  followLerp: 0.12, // suavidade da câmera seguindo o alvo
  minY: 20, // a câmera não recua além disso (perto da end zone dos LOBOS)
  maxY: 100,
};

/** Duração de cada período (s) e quanto o relógio anda mais rápido que o tempo real da jogada. */
export const QUARTER_SECONDS = 5 * 60;
export const CLOCK_RATE = 2;

/** Dimensões do campo em jardas. y=0 é a nossa linha de gol, y=100 a do adversário. */
export const FIELD = {
  width: 53.3,
  endZone: 10,
  hashX: [23.58, 29.72],
  sideHashX: [1, 52.3],
};

export const COLORS = {
  grassA: 0x3f8e39,
  grassB: 0x48993f,
  line: 0xffffff,
  scrimmage: 0x2f7cf6,
  firstDown: 0xffd23f,
  goalPost: 0xffd23f,
  goalPostOutline: 0x3a2a05,
  pylon: 0xff7a1a,
  sky: 0x0a0c1a,
};

export interface TeamConfig {
  name: string;
  abbr: string;
  color: number;
  colorHex: string;
  /** Cor do texto sobre a cor do time (contraste). */
  fg: string;
  /** Vitórias-derrotas na temporada. */
  record: [number, number];
  /** Notas de apresentação. */
  rating: { atk: number; def: number; esp: number };
}

/** Os dois times da liga fictícia. */
export const ROSTER: Record<'LOBOS' | 'TOUROS', TeamConfig> = {
  LOBOS: { name: 'LOBOS', abbr: 'LOB', color: 0xf26b1d, colorHex: '#F26B1D', fg: '#0D0D12', record: [4, 2], rating: { atk: 74, def: 70, esp: 66 } },
  TOUROS: { name: 'TOUROS', abbr: 'TOU', color: 0x22406b, colorHex: '#22406B', fg: '#FFFFFF', record: [2, 3], rating: { atk: 71, def: 77, esp: 69 } },
};

/**
 * 'home' é SEMPRE o time do jogador (ataca para o fundo da tela, fica à esquerda no placar);
 * 'away' é o adversário. setUserTeam troca quem é quem antes de a partida começar.
 */
export const TEAMS: Record<'home' | 'away', TeamConfig> = {
  home: { ...ROSTER.LOBOS, record: [...ROSTER.LOBOS.record] as [number, number] },
  away: { ...ROSTER.TOUROS, record: [...ROSTER.TOUROS.record] as [number, number] },
};

export type TeamName = 'LOBOS' | 'TOUROS';
export type WeatherChoice = 'clear' | 'rain' | 'snow' | 'random';

/** Escolhas do menu (Partida rápida). */
export const matchConfig: { team: TeamName; weather: WeatherChoice } = { team: 'LOBOS', weather: 'random' };

export function setUserTeam(name: TeamName) {
  const other: TeamName = name === 'LOBOS' ? 'TOUROS' : 'LOBOS';
  matchConfig.team = name;
  // Mexe nos mesmos objetos (quem já guardou TEAMS.home continua válido)
  Object.assign(TEAMS.home, ROSTER[name], { record: [...ROSTER[name].record] });
  Object.assign(TEAMS.away, ROSTER[other], { record: [...ROSTER[other].record] });
}

export const FONT_TITLE = '"Press Start 2P", monospace';
export const FONT_LABEL = '"Silkscreen", monospace';

/** Escala dos sprites: mesma altura das pessoas do design (44 px × 0,72). */
/** Fator de resolução: o canvas é desenhado em RES x o tamanho lógico (390×844), então fica nítido em telas de alta densidade. */
export const RES = (() => {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('res') : null;
  if (q) return Math.max(1, Math.min(3, Number(q) || 1));
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return dpr >= 1.5 ? 2 : 1;
})();

/** Texturas de pixel art são desenhadas em TEX_PX x (4x = bem nítidas ao ampliar). */
export const TEX_PX = 4;

export const SPRITE_SCALE = 1.26 / TEX_PX;

/** Seed padrão da partida (torcida, posições das laterais...). */
export const MATCH_SEED = 20261006;
