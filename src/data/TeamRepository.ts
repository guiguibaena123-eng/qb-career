import { fgOn, lum, TEAM_LIST, type TeamDef as BaseTeam } from './teams';

/*
 * Registro de times da carreira: lê os 32 times que o jogo já tem (data/teams.ts + logos de public/logos)
 * e acrescenta cidade, estádio (foto pixelada de public/assets/stadiums) e os 3 kits derivados das cores.
 * Nenhum time é escrito à mão nas telas: tudo recebe só o teamId.
 */

export interface KitDef {
  helmet: number;
  jersey: number;
  number: number;
  pants: number;
  stripe: number;
  /** Contorno do número (padrão: tom escuro da camisa). */
  outline?: number;
  /** Desenho da listra da calça. */
  pstripe?: 'side1' | 'side2' | 'side3' | 'panel' | 'belt';
}

export interface CareerTeam {
  id: string;
  city: string;
  name: string;
  abbr: string;
  colors: { primary: number; secondary: number };
  logo: { large: string; small: string };
  stadium: { name: string; capacity: number; image: string | null };
  kits: Record<'home' | 'away' | 'night', KitDef>;
  ovr: number;
}

/** Foto do estádio (chave em public/assets/stadiums) de cada time. Os dois de Nova York usam a mesma foto. */
const PHOTO: Record<string, string | null> = {
  buf: 'buffalo',
  mia: 'miami',
  ne: 'foxborough',
  nyj: 'new-york',
  bal: 'baltimore',
  cin: 'cincinnati',
  cle: 'cleveland',
  pit: 'pittsburgh',
  hou: 'houston',
  ind: 'indianapolis',
  jax: 'jacksonville',
  ten: 'nashville',
  den: 'denver',
  kc: 'kansas-city',
  lv: 'las-vegas',
  lac: 'los-angeles',
  dal: 'dallas',
  nyg: 'new-york',
  phi: 'philadelphia',
  was: 'washington',
  chi: 'chicago',
  det: 'detroit',
  gb: 'green-bay',
  min: 'minneapolis',
  atl: 'atlanta',
  car: 'charlotte',
  no: 'new-orleans',
  tb: 'tampa',
  ari: 'phoenix',
  lar: 'los-angeles',
  sf: 'san-francisco',
  sea: 'seattle',
};

const WHITE = 0xf4f1e8;
const DARK = 0x262938;
const BLACK = 0x0d0d12;

/** Escolhe a cor do número com contraste suficiente contra a camisa (senão, branco ou preto). */
const contrast = (bg: number, want: number) => (Math.abs(lum(bg) - lum(want)) > 0.25 ? want : fgOn(bg) === '#FFFFFF' ? WHITE : BLACK);

/** Kits derivados das cores: Casa (cor principal), Fora (branco) e Noite (escuro com listras na cor do time). */
export function deriveKits(t: BaseTeam): Record<'home' | 'away' | 'night', KitDef> {
  const p = t.primary;
  const s = t.secondary;
  return {
    home: { helmet: t.helmet ?? p, jersey: p, number: contrast(p, s), pants: t.pants ?? s, stripe: s, pstripe: 'side2' },
    away: { helmet: WHITE, jersey: WHITE, number: contrast(WHITE, p), pants: WHITE, stripe: p, outline: s, pstripe: 'side3' },
    night: { helmet: DARK, jersey: DARK, number: contrast(DARK, p), pants: DARK, stripe: p, outline: WHITE, pstripe: 'panel' },
  };
}

/** Cidade do time ("NY JITS" -> "NEW YORK", "LA VAMS" -> "LOS ANGELES"). */
function cityOf(name: string) {
  return name.startsWith('NY ') ? 'NEW YORK' : name.startsWith('LA ') ? 'LOS ANGELES' : name;
}

function hash(id: string) {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function build(t: BaseTeam): CareerTeam {
  const image = PHOTO[t.id] ?? null;
  return {
    id: t.id,
    city: cityOf(t.name),
    name: t.name,
    abbr: t.abbr,
    colors: { primary: t.primary, secondary: t.secondary },
    logo: { large: `logoL_${t.id}`, small: `logoS_${t.id}` },
    stadium: { name: `${cityOf(t.name)} STADIUM`, capacity: 61000 + (hash(t.id) % 12) * 1000, image: image ? `stad_${image}` : null },
    kits: deriveKits(t),
    ovr: t.ovr,
  };
}

const TEAMS = TEAM_LIST.map(build);
const BY_ID = new Map(TEAMS.map((t) => [t.id, t]));

/** Acesso a todos os times (qualquer quantidade: nada presume 8 nem 32). */
export const TeamRepository = {
  all: (): CareerTeam[] => TEAMS,
  get: (id: string): CareerTeam => BY_ID.get(id) ?? TEAMS[0],
  has: (id: string) => BY_ID.has(id),
  count: () => TEAMS.length,
};
