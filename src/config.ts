// Configuração central: resolução, câmera/projeção, cores do campo e times.
import type { StandChoice } from './data/stadiums';
import type { TimeChoice } from './systems/daytime';
import { autoUniform, fgOn, teamById, uiColor, uniformsOf, type TeamDef, type Uniform } from './data/teams';

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
  zoom: 1.15,
  pxPerYard: 7.5, // px por jarda na largura, no ponto de foco (antes do zoom)
  depthPxBase: 24.4, // profundidade por jarda = base × sen(tilt)
  followLerp: 0.12, // suavidade da câmera seguindo o alvo
  minY: 20, // a câmera não recua além disso (perto da end zone dos LOBOS)
  maxY: 100,
};

/** Duração de cada período (s) e quanto o relógio anda mais rápido que o tempo real da jogada. */
export const QUARTER_SECONDS = 3 * 60;
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
  id: string;
  name: string;
  abbr: string;
  /** Cor do time na interface (placar, botões). */
  color: number;
  colorHex: string;
  /** Cor do texto sobre a cor do time (contraste). */
  fg: string;
  /** Notas do time (overall, ataque, defesa, especiais). */
  rating: { ovr: number; atk: number; def: number; esp: number };
  /** Uniforme em uso e seu índice (0 casa, 1 fora, 2 alternativo). */
  uniform: Uniform;
  uniformIdx: number;
}

export type WeatherChoice = 'clear' | 'rain' | 'snow' | 'random';

/** Escolhas do menu (Partida rápida). `awayUni` = null deixa o uniforme do adversário automático (o que mais contrasta). */
export const matchConfig: { home: string; away: string; homeUni: number; awayUni: number | null; weather: WeatherChoice; stand: StandChoice; time: TimeChoice; side: 'home' | 'away' | 'final'; standTeam: string | null } = {
  home: 'kc',
  away: 'buf',
  homeUni: 0,
  awayUni: null,
  weather: 'random',
  stand: 'auto',
  time: 'random',
  /** Partida Rápida: jogar em casa ou fora, e o estádio de outro time (campo neutro). */
  side: 'home',
  standTeam: null,
};

try {
  const saved = JSON.parse(localStorage.getItem('qb-career-match') ?? 'null');
  if (saved && teamById(saved.home).id === saved.home && teamById(saved.away).id === saved.away && saved.home !== saved.away) {
    Object.assign(matchConfig, saved);
  }
} catch {
  /* sem armazenamento: usa o padrão */
}

/** Estádio da partida (carreira: jogo fora = estádio do adversário). null = estádio do TEAMS.home. */
export const venue: { id: string | null } = { id: null };

/** Final (QFL Bowl): campo, estádio e torcida especiais. */
export const finalGame = { on: false };

/** Playoffs: logo da fase (chave da textura) pintada nas linhas de 40 jardas. null = jogo comum. */
export const playoffLogo: { key: string | null } = { key: null };

/** Transmissão de horário nobre (carreira): placar e abertura especiais. null = jogo comum. */
export const broadcast: { prime: { name: string; short: string; color: number; glow: number } | null } = { prime: null };

/** Time dono do estádio (end zones e logo do meio-campo): o adversário nos jogos fora de casa. */
export const hostTeam = () => (venue.id && venue.id === TEAMS.away.id ? TEAMS.away : TEAMS.home);
/** Time visitante no estádio (o seu, nos jogos fora de casa). */
export const guestTeam = () => (hostTeam() === TEAMS.away ? TEAMS.home : TEAMS.away);

export function saveMatchConfig() {
  try {
    localStorage.setItem('qb-career-match', JSON.stringify(matchConfig));
  } catch {
    /* ignora */
  }
}

function toConfig(t: TeamDef, idx: number): TeamConfig {
  const color = uiColor(t);
  return {
    id: t.id,
    name: t.name,
    abbr: t.abbr,
    color,
    colorHex: '#' + color.toString(16).padStart(6, '0'),
    fg: fgOn(color),
    rating: { ovr: t.ovr, atk: t.atk, def: t.def, esp: t.esp },
    uniform: uniformsOf(t)[idx],
    uniformIdx: idx,
  };
}

/**
 * 'home' é SEMPRE o time do jogador (ataca para o fundo da tela, fica à esquerda no placar);
 * 'away' é o adversário. applyMatchup copia o que o menu escolheu para esses objetos (mesmos objetos: quem guardou TEAMS.home continua válido).
 */
export const TEAMS: Record<'home' | 'away', TeamConfig> = {
  home: toConfig(teamById(matchConfig.home), matchConfig.homeUni),
  away: toConfig(teamById(matchConfig.away), 0),
};

export function applyMatchup() {
  const h = teamById(matchConfig.home);
  const a = teamById(matchConfig.away);
  const hu = toConfig(h, matchConfig.homeUni);
  Object.assign(TEAMS.home, hu);
  const awayIdx = matchConfig.awayUni ?? autoUniform(a, parseInt(hu.uniform.jersey.slice(1), 16));
  Object.assign(TEAMS.away, toConfig(a, awayIdx));
}
applyMatchup();

/** Chave da textura da logo: tamanho 's' (64 px), 'm' (128 px) ou 'l' (384 px). */
export const logoKey = (id: string, size: 's' | 'm' | 'l' = 'm') => `logo${size.toUpperCase()}_${id}`;

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
