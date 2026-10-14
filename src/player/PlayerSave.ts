/*
 * Save único do jogador (carreira). Tudo o que a carreira precisa vive aqui: as telas não guardam
 * estado próprio. Persistido em localStorage (depois, Capacitor Preferences).
 */

/** Opções do PERSONALIZAR (as cores do uniforme NÃO estão aqui: vêm do kit travado do time). */
export interface LookOptions {
  kit: 'home' | 'away' | 'night';
  // Capacete
  helmet: 'classic' | 'speed' | 'compact';
  gloss: boolean;
  mask: 'qb' | 'rb' | 'wr' | 'ol';
  maskC: number;
  visor: 'none' | 'clear' | 'smoke' | 'mirror' | 'amber' | 'blue';
  chin: 'two' | 'four';
  chinC: number;
  // Corpo
  jerseyLen: 'short' | 'mid';
  under: 'none' | 'short' | 'long';
  underC: number;
  pants: 'short' | 'reg' | 'long';
  knee: 'none' | 'sleeve';
  kneeC: number;
  nroll: 'none' | 'roll' | 'horse';
  nrollC: number;
  // Pés
  sock: 'high' | 'mid' | 'low';
  sockC: number;
  sstripe: 'none' | 'band' | 'hoops' | 'wide';
  sstripeC: number;
  cleats: 'low' | 'mid' | 'high';
  cleatC: number;
  cacc: 'none' | 'swoosh' | 'stripes' | 'toe';
  caccC: number;
  // Mãos
  gloves: 'none' | 'short' | 'full' | 'lineman';
  gloveC: number;
  wrist: 'none' | 'L' | 'R' | 'B' | 'P';
  wristC: number;
  asl: 'none' | 'fL' | 'fR' | 'fB' | 'lL' | 'lR' | 'lB';
  aslC: number;
  // Rosto e extras
  eyeblack: 'none' | 'solid' | 'stripe' | 'double';
  hairOut: 'none' | 'short' | 'curls' | 'dreads';
  mouth: 'none' | 'hang' | 'bite';
  mouthC: number;
  towel: 'none' | 'L' | 'R' | 'F';
  towelC: number;
  celebration: number;
}

/** Visual padrão (o do design); `kitAccents` ajusta as cores dos acessórios a cada kit. */
export const DEFAULT_LOOK: LookOptions = {
  kit: 'home',
  helmet: 'classic',
  gloss: true,
  mask: 'qb',
  maskC: 0xc9ceda,
  visor: 'none',
  chin: 'two',
  chinC: 0xf4f1e8,
  jerseyLen: 'short',
  under: 'long',
  underC: 0x22406b,
  pants: 'reg',
  knee: 'none',
  kneeC: 0xf4f1e8,
  nroll: 'none',
  nrollC: 0x22406b,
  sock: 'high',
  sockC: 0xf4f1e8,
  sstripe: 'hoops',
  sstripeC: 0xf26b1d,
  cleats: 'mid',
  cleatC: 0x0d0d12,
  cacc: 'swoosh',
  caccC: 0xf26b1d,
  gloves: 'short',
  gloveC: 0xf4f1e8,
  wrist: 'R',
  wristC: 0xf4f1e8,
  asl: 'none',
  aslC: 0xf4f1e8,
  eyeblack: 'none',
  hairOut: 'none',
  mouth: 'hang',
  mouthC: 0x22406b,
  towel: 'none',
  towelC: 0xf4f1e8,
  celebration: 0,
};

/** Converte saves antigos (viseira e toalha eram liga/desliga). */
function migrateLook(raw: Record<string, unknown> | undefined): Partial<LookOptions> {
  const l = { ...(raw ?? {}) } as Record<string, unknown>;
  if (typeof l.visor === 'boolean') l.visor = l.visor ? 'clear' : 'none';
  if (typeof l.towel === 'boolean') l.towel = l.towel ? 'F' : 'none';
  return l as Partial<LookOptions>;
}

export interface Attrs {
  arm: number;
  accuracy: number;
  reading: number;
  speed: number;
}

export type TestId = 'sprint40' | 'cones' | 'passing' | 'arm';

export interface CombineResult {
  /** Resultado de cada teste: valor bruto, nota 0-100 e letra. Ausente = ainda não feito. */
  tests: Partial<Record<TestId, { raw: number; score: number; grade: string; extra?: number; skipped?: boolean }>>;
  score?: number;
}

export interface CareerState {
  teamId: string | null;
  season: number;
  week: number;
  record: { w: number; l: number };
  schedule: { week: number; opp: string; home: boolean; result?: { us: number; them: number }; stats?: GameLine }[];
  news: { week: number; text: string; body?: string }[];
  /** XP somado nas partidas da carreira e confiança no fim do último jogo (0-5). */
  xp?: number;
  confidence?: number;
  /** Playoffs da temporada: seu jogo em cada fase (wc, div, conf, final). */
  post?: Partial<Record<'wc' | 'div' | 'conf' | 'final', { opp: string; result?: { us: number; them: number }; stats?: GameLine }>>;
}

/** Linha do QB numa partida da carreira. */
export interface GameLine {
  comp: number;
  att: number;
  yards: number;
  td: number;
  int: number;
  sacks: number;
}

export interface PlayerSave {
  version: 1;
  created: boolean;
  firstName: string;
  name: string;
  /** Número do uniforme (0 a 99; -1 = ainda não escolhido na criação). */
  number: number;
  college: { id: string; name: string; colors: [string, string] };
  face: number;
  skin: number;
  hair: number;
  hairColor: number;
  beard: number;
  look: LookOptions;
  attrs: Attrs;
  ovr: number;
  combine?: CombineResult;
  draft?: { teamId: string; pick: number; round: number; contract: { years: number; value: number } };
  career: CareerState;
  /** Última gravação (ms), mostrada na tela de saves. */
  updated?: number;
}

/** OVR único do jogador, usado em todas as telas (rookie ≈ 62). */
export function calcOvr(a: Attrs): number {
  return Math.round(a.arm * 0.25 + a.accuracy * 0.3 + a.reading * 0.3 + a.speed * 0.15);
}

export const DEFAULT_ATTRS: Attrs = { arm: 66, accuracy: 62, reading: 59, speed: 60 };

export function defaultSave(): PlayerSave {
  return {
    version: 1,
    created: false,
    firstName: '',
    name: 'SILVA',
    number: 12,
    college: { id: 'pinecrest', name: 'PINECREST LENHADORES', colors: ['#2E7D4F', '#E8C547'] },
    face: 0,
    skin: 5,
    hair: 27,
    hairColor: 0,
    beard: 6,
    look: { ...DEFAULT_LOOK },
    attrs: { ...DEFAULT_ATTRS },
    ovr: calcOvr(DEFAULT_ATTRS),
    career: { teamId: null, season: 1, week: 0, record: { w: 0, l: 0 }, schedule: [], news: [] },
  };
}

/*
 * Saves: até SLOT_COUNT carreiras, cada uma numa chave própria ('qb-career-save-1'..3). A carreira em
 * uso fica em 'qb-career-slot'. O save antigo (chave única 'qb-career-save') vira o espaço 1.
 */
export const SLOT_COUNT = 3;
const LEGACY = 'qb-career-save';
const SLOT_KEY = 'qb-career-slot';
const keyOf = (n: number) => `qb-career-save-${n}`;
let cache: PlayerSave | null = null;
let slot = 1;
try {
  const legacy = localStorage.getItem(LEGACY);
  if (legacy && !localStorage.getItem(keyOf(1))) localStorage.setItem(keyOf(1), legacy);
  if (legacy) localStorage.removeItem(LEGACY);
  const n = Number(localStorage.getItem(SLOT_KEY));
  if (n >= 1 && n <= SLOT_COUNT) slot = n;
} catch {
  /* sem armazenamento: espaço 1 só nesta sessão */
}

/** Lê e completa um save cru (campos novos entram com o padrão). */
function parse(raw: unknown): PlayerSave | null {
  const r = raw as (Partial<PlayerSave> & { look?: Record<string, unknown> }) | null;
  if (!r || r.version !== 1) return null;
  const base = defaultSave();
  return { ...base, ...r, look: { ...base.look, ...migrateLook(r.look) }, attrs: { ...base.attrs, ...r.attrs }, career: { ...base.career, ...r.career } } as PlayerSave;
}

/** Espaço de save em uso (1..SLOT_COUNT). */
export const activeSlot = () => slot;

/** Troca a carreira em uso. */
export function setActiveSlot(n: number) {
  slot = Math.max(1, Math.min(SLOT_COUNT, n));
  cache = null;
  try {
    localStorage.setItem(SLOT_KEY, String(slot));
  } catch {
    /* ignora */
  }
}

/** Conteúdo de um espaço sem trocar a carreira em uso (null = vazio). */
export function peekSlot(n: number): PlayerSave | null {
  if (n === slot && cache) return cache.created || cache.draft ? cache : null;
  try {
    const s = parse(JSON.parse(localStorage.getItem(keyOf(n)) ?? 'null'));
    return s && (s.created || s.draft) ? s : null;
  } catch {
    return null;
  }
}

/** Apaga um espaço. */
export function deleteSlot(n: number) {
  try {
    localStorage.removeItem(keyOf(n));
  } catch {
    /* ignora */
  }
  if (n === slot) cache = null;
}

/** Lê o save da carreira em uso (ou cria o padrão). */
export function getSave(): PlayerSave {
  if (cache) return cache;
  try {
    const s = parse(JSON.parse(localStorage.getItem(keyOf(slot)) ?? 'null'));
    if (s) return (cache = s);
  } catch {
    /* save corrompido ou sem armazenamento: começa do zero */
  }
  cache = defaultSave();
  return cache;
}

/** Aplica mudanças ao save, recalcula o OVR e grava. */
export function updateSave(patch: Partial<PlayerSave>): PlayerSave {
  const s = { ...getSave(), ...patch, updated: Date.now() };
  s.ovr = calcOvr(s.attrs);
  cache = s;
  try {
    localStorage.setItem(keyOf(slot), JSON.stringify(s));
  } catch {
    /* sem armazenamento: o save vale só nesta sessão */
  }
  return s;
}

/** Zera a carreira em uso (o espaço fica vazio). */
export function resetSave(): PlayerSave {
  deleteSlot(slot);
  cache = null;
  return getSave();
}
