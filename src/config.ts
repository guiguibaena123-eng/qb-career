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
};

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
  grassOut: 0x2f6e2c, // gramado fora das linhas
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
}

export const TEAMS: Record<'home' | 'away', TeamConfig> = {
  home: { name: 'LOBOS', abbr: 'LOB', color: 0xf26b1d, colorHex: '#F26B1D' },
  away: { name: 'TOUROS', abbr: 'TOU', color: 0x22406b, colorHex: '#22406B' },
};

export const FONT_TITLE = '"Press Start 2P", monospace';
export const FONT_LABEL = '"Silkscreen", monospace';
