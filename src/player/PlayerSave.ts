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
  schedule: { week: number; opp: string; home: boolean; result?: { us: number; them: number } }[];
  news: { week: number; text: string }[];
}

export interface PlayerSave {
  version: 1;
  created: boolean;
  firstName: string;
  name: string;
  number: 12;
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

const KEY = 'qb-career-save';
let cache: PlayerSave | null = null;

/** Lê o save (ou cria o padrão). Campos novos de versões futuras entram com o valor padrão. */
export function getSave(): PlayerSave {
  if (cache) return cache;
  const base = defaultSave();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && raw.version === 1) {
      cache = { ...base, ...raw, look: { ...base.look, ...migrateLook(raw.look) }, attrs: { ...base.attrs, ...raw.attrs }, career: { ...base.career, ...raw.career } };
      return cache!;
    }
  } catch {
    /* save corrompido ou sem armazenamento: começa do zero */
  }
  cache = base;
  return cache;
}

/** Aplica mudanças ao save, recalcula o OVR e grava. */
export function updateSave(patch: Partial<PlayerSave>): PlayerSave {
  const s = { ...getSave(), ...patch };
  s.ovr = calcOvr(s.attrs);
  cache = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento: o save vale só nesta sessão */
  }
  return s;
}

export function resetSave(): PlayerSave {
  cache = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
  return getSave();
}
