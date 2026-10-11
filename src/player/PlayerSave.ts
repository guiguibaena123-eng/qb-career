/*
 * Save único do jogador (carreira). Tudo o que a carreira precisa vive aqui: as telas não guardam
 * estado próprio. Persistido em localStorage (depois, Capacitor Preferences).
 */

export interface LookOptions {
  kit: 'home' | 'away' | 'night';
  helmet: 'classic' | 'speed' | 'compact';
  gloss: boolean;
  mask: 'qb' | 'rb' | 'wr' | 'ol';
  visor: boolean;
  chin: 'two' | 'four';
  jerseyLen: 'short' | 'mid';
  under: 'none' | 'short' | 'long';
  pants: 'short' | 'reg' | 'long';
  cleats: 'low' | 'mid' | 'high';
  gloves: 'none' | 'short' | 'full' | 'lineman';
  towel: boolean;
  eyeblack: 'none' | 'solid' | 'stripe' | 'double';
  celebration: number;
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
    look: {
      kit: 'home',
      helmet: 'classic',
      gloss: true,
      mask: 'qb',
      visor: false,
      chin: 'two',
      jerseyLen: 'short',
      under: 'none',
      pants: 'reg',
      cleats: 'low',
      gloves: 'short',
      towel: false,
      eyeblack: 'none',
      celebration: 0,
    },
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
      cache = { ...base, ...raw, look: { ...base.look, ...raw.look }, attrs: { ...base.attrs, ...raw.attrs }, career: { ...base.career, ...raw.career } };
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
