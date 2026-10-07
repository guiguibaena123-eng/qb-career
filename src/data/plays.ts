/*
 * Jogadas, rotas e formações (dados puros, fáceis de expandir).
 *
 * Posições em jardas RELATIVAS à linha de scrimmage (LOS):
 *   x = coordenada absoluta na largura do campo (0–53,3);
 *   d = distância da LOS (negativo = atrás, no lado do ataque; positivo = lado da defesa).
 * Copiadas do design (Shotgun Trips x 4-2-5).
 */

export type Side = 'off' | 'def';
export type RecvKey = 'A' | 'B' | 'C' | 'D' | 'E';

export const RECV_COLORS: Record<RecvKey, number> = {
  A: 0xffd23f,
  B: 0x3fd0ff,
  C: 0xff6fb5,
  D: 0x9be15d,
  E: 0xffffff,
};

export type Role = 'C' | 'G' | 'T' | 'TE' | 'WR' | 'QB' | 'RB' | 'DL' | 'LB' | 'CB' | 'NB' | 'S';

export interface Slot {
  role: Role;
  x: number;
  d: number;
  num: number;
  key?: RecvKey;
}

/** Ataque: Shotgun Trips — C, 2 G, 2 T, TE, 3 WR, QB (5 jd atrás), RB. */
export const SHOTGUN_TRIPS: Slot[] = [
  { role: 'C', x: 26.6, d: -1.1, num: 62 },
  { role: 'G', x: 24.6, d: -1.3, num: 66 },
  { role: 'G', x: 28.6, d: -1.3, num: 70 },
  { role: 'T', x: 22.6, d: -1.5, num: 74 },
  { role: 'T', x: 30.6, d: -1.5, num: 77 },
  { role: 'TE', x: 33.0, d: -1.6, num: 87, key: 'C' },
  { role: 'WR', x: 6.0, d: -1.3, num: 11, key: 'A' },
  { role: 'WR', x: 15.0, d: -1.8, num: 84, key: 'B' },
  { role: 'WR', x: 47.8, d: -1.5, num: 17, key: 'D' },
  { role: 'QB', x: 26.6, d: -5.8, num: 12 },
  { role: 'RB', x: 23.8, d: -6.0, num: 28, key: 'E' },
];

/** Defesa 4-2-5: 4 DL, 2 LB, 2 CB, 1 nickel, 2 safeties. */
export const NICKEL_425: Slot[] = [
  { role: 'DL', x: 21.2, d: 1.0, num: 94 },
  { role: 'DL', x: 25.0, d: 1.1, num: 97 },
  { role: 'DL', x: 28.3, d: 1.1, num: 99 },
  { role: 'DL', x: 32.2, d: 1.0, num: 91 },
  { role: 'LB', x: 23.5, d: 5.5, num: 54 },
  { role: 'LB', x: 30.0, d: 5.5, num: 52 },
  { role: 'CB', x: 6.2, d: 3.2, num: 24 },
  { role: 'CB', x: 47.8, d: 3.2, num: 21 },
  { role: 'NB', x: 15.5, d: 3.2, num: 31 },
  { role: 'S', x: 18.5, d: 16.7, num: 33 },
  { role: 'S', x: 35.0, d: 16.7, num: 42 },
];

/*
 * Rotas: waypoints em jardas relativos ao recebedor.
 *   i = para DENTRO (em direção ao meio do campo; negativo = para fora)
 *   f = para frente (rumo à end zone adversária)
 * `kind` agrupa rotas para a leitura da defesa (o que bate cada cobertura).
 */
export type RouteKind = 'deep' | 'short-in' | 'short-out' | 'mid-in' | 'mid-out' | 'back';
export interface RouteDef {
  name: string;
  kind: RouteKind;
  pts: [number, number][];
}

export const ROUTES: Record<string, RouteDef> = {
  FLY: { name: 'FLY', kind: 'deep', pts: [[0, 0], [0, 37.5]] },
  SLANT: { name: 'SLANT', kind: 'short-in', pts: [[0, 0], [0, 3.5], [10, 13.5]] },
  CORNER: { name: 'CORNER', kind: 'mid-out', pts: [[0, 0], [0, 8.8], [-8, 16.8]] },
  CURL: { name: 'CURL', kind: 'mid-in', pts: [[0, 0], [0, 14.8], [1.6, 13]] },
  FLAT: { name: 'FLAT', kind: 'short-out', pts: [[0, 0], [-5.8, 1.3], [-13.8, 2.5]] },
  POST: { name: 'POST', kind: 'deep', pts: [[0, 0], [0, 12], [7, 24]] },
  OUT: { name: 'OUT', kind: 'short-out', pts: [[0, 0], [0, 9], [-7, 9]] },
  DIG: { name: 'DIG', kind: 'mid-in', pts: [[0, 0], [0, 12], [11, 12]] },
  WHEEL: { name: 'WHEEL', kind: 'deep', pts: [[0, 0], [-6, 2], [-9, 8], [-9, 24]] },
};

/** Ordem do ciclo de hot route ao tocar numa letra. */
export const HOT_ROUTE_CYCLE = ['FLY', 'SLANT', 'CORNER', 'CURL', 'POST', 'OUT', 'DIG', 'FLAT', 'WHEEL'];

/** Jogadas de passe (AUDIBLE alterna entre elas). */
export interface PassPlay {
  name: string;
  routes: Record<RecvKey, string>;
}
export const PASS_PLAYS: PassPlay[] = [
  { name: 'SLANT FLOOD', routes: { A: 'FLY', B: 'SLANT', C: 'CORNER', D: 'CURL', E: 'FLAT' } },
  { name: 'FOUR VERTS', routes: { A: 'FLY', B: 'FLY', C: 'FLY', D: 'FLY', E: 'FLAT' } },
  { name: 'MESH DIG', routes: { A: 'POST', B: 'DIG', C: 'OUT', D: 'SLANT', E: 'WHEEL' } },
  { name: 'SMASH', routes: { A: 'CURL', B: 'CORNER', C: 'CURL', D: 'CORNER', E: 'FLAT' } },
];

/** Jogadas de corrida: o RB recebe a bola e ataca o buraco `gapX`. */
export interface RunPlay {
  name: string;
  gapX: number;
}
export const RUN_PLAYS: RunPlay[] = [
  { name: 'INSIDE ZONE', gapX: 25.6 },
  { name: 'OFF TACKLE', gapX: 31.8 },
  { name: 'STRETCH', gapX: 36 },
];

export const FORMATION_NAME = 'SHOTGUN TRIPS';
