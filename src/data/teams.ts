/*
 * Os 32 times da liga (logos desenhadas à mão, uma por time).
 * Notas (overall, ataque, defesa, especiais) aproximadas, no estilo das notas dos times da NFL
 * em jogos de futebol americano. Cores principal/secundária seguem as cores originais de cada time.
 * Uniformes: CASA (cor principal), FORA (branco) e ALTERNATIVO (cor secundária).
 */

export interface TeamDef {
  id: string;
  name: string;
  abbr: string;
  primary: number;
  secondary: number;
  /** Cor do capacete, se diferente da principal. */
  helmet?: number;
  /** Calça do uniforme de casa, se não for branca. */
  pants?: number;
  ovr: number;
  atk: number;
  def: number;
  esp: number;
}

export interface Uniform {
  name: string;
  helmet: string;
  jersey: string;
  pants: string;
  trim: string;
  sock: string;
  /** Cor do número (contraste com a camisa). */
  num: string;
}

export const TEAM_LIST: TeamDef[] = [
  // AFC Leste
  { id: 'buf', name: 'BUFFALO', abbr: 'BUF', primary: 0x00338d, secondary: 0xc60c30, ovr: 88, atk: 89, def: 86, esp: 80 },
  { id: 'mia', name: 'MIAMI', abbr: 'MIA', primary: 0x008e97, secondary: 0xfc4c02, ovr: 85, atk: 88, def: 80, esp: 78 },
  { id: 'ne', name: 'NEW ENGLAND', abbr: 'NE', primary: 0x002244, secondary: 0xc60c30, ovr: 74, atk: 70, def: 78, esp: 74 },
  { id: 'nyj', name: 'NY JETS', abbr: 'NYJ', primary: 0x125740, secondary: 0xf4f1e8, ovr: 81, atk: 79, def: 86, esp: 78 },
  // AFC Norte
  { id: 'bal', name: 'BALTIMORE', abbr: 'BAL', primary: 0x241773, secondary: 0x9e7c0c, ovr: 91, atk: 93, def: 88, esp: 83 },
  { id: 'cin', name: 'CINCINNATI', abbr: 'CIN', primary: 0xfb4f14, secondary: 0x101820, ovr: 85, atk: 88, def: 80, esp: 76 },
  { id: 'cle', name: 'CLEVELAND', abbr: 'CLE', primary: 0xff3c00, secondary: 0x311d00, ovr: 79, atk: 74, def: 86, esp: 77 },
  { id: 'pit', name: 'PITTSBURGH', abbr: 'PIT', primary: 0x101820, secondary: 0xffb612, ovr: 82, atk: 78, def: 86, esp: 80 },
  // AFC Sul
  { id: 'hou', name: 'HOUSTON', abbr: 'HOU', primary: 0x03202f, secondary: 0xa71930, ovr: 85, atk: 86, def: 83, esp: 77 },
  { id: 'ind', name: 'INDIANAPOLIS', abbr: 'IND', primary: 0x002c5f, secondary: 0xa5acaf, ovr: 77, atk: 79, def: 74, esp: 76 },
  { id: 'jax', name: 'JACKSONVILLE', abbr: 'JAX', primary: 0x006778, secondary: 0xd7a22a, ovr: 79, atk: 81, def: 76, esp: 77 },
  { id: 'ten', name: 'TENNESSEE', abbr: 'TEN', primary: 0x0c2340, secondary: 0x4b92db, ovr: 73, atk: 71, def: 75, esp: 76 },
  // AFC Oeste
  { id: 'den', name: 'DENVER', abbr: 'DEN', primary: 0xfb4f14, secondary: 0x002244, ovr: 79, atk: 76, def: 83, esp: 75 },
  { id: 'kc', name: 'KANSAS CITY', abbr: 'KC', primary: 0xe31837, secondary: 0xffb81c, ovr: 90, atk: 91, def: 87, esp: 85 },
  { id: 'lv', name: 'LAS VEGAS', abbr: 'LV', primary: 0x101820, secondary: 0xa5acaf, helmet: 0xa5acaf, ovr: 79, atk: 77, def: 80, esp: 76 },
  { id: 'lac', name: 'LA CHARGERS', abbr: 'LAC', primary: 0x0080c6, secondary: 0xffc20e, ovr: 82, atk: 80, def: 85, esp: 79 },
  // NFC Leste
  { id: 'dal', name: 'DALLAS', abbr: 'DAL', primary: 0x003594, secondary: 0x869397, helmet: 0x869397, ovr: 85, atk: 87, def: 83, esp: 80 },
  { id: 'nyg', name: 'NY GIANTS', abbr: 'NYG', primary: 0x0b2265, secondary: 0xa71930, ovr: 74, atk: 70, def: 77, esp: 72 },
  { id: 'phi', name: 'PHILADELPHIA', abbr: 'PHI', primary: 0x004c54, secondary: 0xa5acaf, ovr: 88, atk: 90, def: 85, esp: 79 },
  { id: 'was', name: 'WASHINGTON', abbr: 'WAS', primary: 0x5a1414, secondary: 0xffb612, ovr: 74, atk: 75, def: 71, esp: 73 },
  // NFC Norte
  { id: 'chi', name: 'CHICAGO', abbr: 'CHI', primary: 0x0b162a, secondary: 0xc83803, ovr: 77, atk: 74, def: 80, esp: 76 },
  { id: 'det', name: 'DETROIT', abbr: 'DET', primary: 0x0076b6, secondary: 0xb0b7bc, ovr: 89, atk: 92, def: 84, esp: 82 },
  { id: 'gb', name: 'GREEN BAY', abbr: 'GB', primary: 0x203731, secondary: 0xffb612, ovr: 85, atk: 86, def: 83, esp: 77 },
  { id: 'min', name: 'MINNESOTA', abbr: 'MIN', primary: 0x4f2683, secondary: 0xffc62f, ovr: 82, atk: 80, def: 84, esp: 78 },
  // NFC Sul
  { id: 'atl', name: 'ATLANTA', abbr: 'ATL', primary: 0x101820, secondary: 0xa71930, helmet: 0x101820, ovr: 80, atk: 82, def: 77, esp: 75 },
  { id: 'car', name: 'CAROLINA', abbr: 'CAR', primary: 0x0085ca, secondary: 0x101820, ovr: 70, atk: 68, def: 72, esp: 70 },
  { id: 'no', name: 'NEW ORLEANS', abbr: 'NO', primary: 0xd3bc8d, secondary: 0x101820, helmet: 0xd3bc8d, ovr: 78, atk: 76, def: 80, esp: 76 },
  { id: 'tb', name: 'TAMPA BAY', abbr: 'TB', primary: 0xd50a0a, secondary: 0xff7900, helmet: 0x34302b, ovr: 80, atk: 81, def: 79, esp: 77 },
  // NFC Oeste
  { id: 'ari', name: 'ARIZONA', abbr: 'ARI', primary: 0x97233f, secondary: 0xffb612, ovr: 76, atk: 77, def: 73, esp: 75 },
  { id: 'lar', name: 'LA RAMS', abbr: 'LAR', primary: 0x003594, secondary: 0xffa300, helmet: 0xffa300, ovr: 83, atk: 84, def: 82, esp: 78 },
  { id: 'sf', name: 'SAN FRANCISCO', abbr: 'SF', primary: 0xaa0000, secondary: 0xb3995d, helmet: 0xb3995d, ovr: 90, atk: 92, def: 88, esp: 81 },
  { id: 'sea', name: 'SEATTLE', abbr: 'SEA', primary: 0x002244, secondary: 0x69be28, ovr: 81, atk: 79, def: 83, esp: 76 },
];

const BY_ID = new Map(TEAM_LIST.map((t) => [t.id, t]));
export const teamById = (id: string) => BY_ID.get(id) ?? TEAM_LIST[0];

// ---------------------------------------------------------------- cores

const WHITE = 0xf4f1e8;
const css = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function lum(c: number) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((c >> 16) & 255) + 0.7152 * f((c >> 8) & 255) + 0.0722 * f(c & 255);
}

function mix(a: number, b: number, k: number) {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export function colorDist(a: number, b: number) {
  const dr = ((a >> 16) & 255) - ((b >> 16) & 255);
  const dg = ((a >> 8) & 255) - ((b >> 8) & 255);
  const db = (a & 255) - (b & 255);
  return Math.sqrt(dr * dr + dg * dg + db * db) / 441;
}

/** Cor do time na interface (placar, botões): a principal, ou a secundária se a principal for escura demais. */
export function uiColor(t: TeamDef) {
  return lum(t.primary) < 0.04 ? t.secondary : t.primary;
}

/** Texto escuro ou claro sobre uma cor. */
export function fgOn(c: number) {
  return lum(c) > 0.3 ? '#0D0D12' : '#FFFFFF';
}

/** Os três uniformes do time. */
export function uniformsOf(t: TeamDef): Uniform[] {
  const helmet = t.helmet ?? t.primary;
  const mk = (name: string, jersey: number, pants: number, trim: number, sock: number): Uniform => ({
    name,
    helmet: css(helmet),
    jersey: css(jersey),
    pants: css(pants),
    trim: css(trim),
    sock: css(sock),
    num: lum(jersey) > 0.35 ? '#141414' : '#FFFFFF',
  });
  const altJersey = lum(t.secondary) < 0.75 && t.secondary !== WHITE ? t.secondary : mix(t.primary, 0x000000, 0.45);
  return [
    mk('CASA', t.primary, t.pants ?? (lum(t.primary) < 0.04 ? 0xd7dbe0 : WHITE), t.secondary, t.primary),
    mk('FORA', WHITE, 0xd7dbe0, t.primary, WHITE),
    mk('ALTERNATIVO', altJersey, t.primary, lum(altJersey) > 0.3 ? t.primary : t.secondary, altJersey),
  ];
}

/** Uniforme do adversário que melhor contrasta com a camisa do jogador (casa por padrão). */
export function autoUniform(opp: TeamDef, userJersey: number): number {
  const ups = uniformsOf(opp);
  let best = 0;
  let bestD = -1;
  ups.forEach((u, i) => {
    const d = colorDist(parseInt(u.jersey.slice(1), 16), userJersey) + (i === 0 ? 0.08 : 0);
    if (d > bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
