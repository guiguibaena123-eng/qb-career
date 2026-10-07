import { FIELD } from '../config';
import { ROUTES, type RecvKey, type RouteKind } from '../data/plays';
import type { Player } from '../entities/Player';
import type { Rng } from './rng';

/*
 * "IA" da defesa feita com regras (nada de modelos): cada esquema define quem pressiona,
 * quem marca homem a homem e quem guarda uma zona. A leitura e a dica da visão tática saem
 * de tabelas simples: que tipo de rota cada cobertura deixa aberto.
 */

export type SchemeId = 'COVER2' | 'COVER3' | 'MAN' | 'BLITZ';

export interface Zone {
  x: number; // centro (jardas)
  d: number; // distância da LOS
  w: number; // largura (jardas)
  h: number; // profundidade (jardas)
}

export interface Scheme {
  id: SchemeId;
  name: string;
  /** Zonas por papel de defensor (índice no NICKEL_425). */
  zones: Partial<Record<number, Zone>>;
  /** Defensores que vão para cima do QB (índices). */
  rushers: number[];
  /** Marcação homem a homem: defensor → letra do recebedor. */
  man: Partial<Record<number, RecvKey>>;
  /** Tipos de rota que essa cobertura deixa abertos (da melhor para a pior). */
  beats: RouteKind[];
  /** Onde fica a janela (em jardas relativas à LOS). */
  window: { x: number; d: number; label: string };
  tip: string;
}

// Índices da defesa 4-2-5: 0–3 DL, 4–5 LB, 6–7 CB, 8 nickel, 9–10 S
const MID = FIELD.width / 2;

export const SCHEMES: Record<SchemeId, Scheme> = {
  COVER2: {
    id: 'COVER2',
    name: 'COVER 2',
    rushers: [0, 1, 2, 3],
    zones: {
      9: { x: 13, d: 29.7, w: 23, h: 15 },
      10: { x: 40.2, d: 29.7, w: 23, h: 15 },
      6: { x: 9, d: 7.7, w: 11, h: 6.4 },
      7: { x: 45, d: 7.7, w: 11, h: 6.4 },
      4: { x: 17.2, d: 9.2, w: 9.6, h: 5.6 },
      5: { x: 36, d: 9.2, w: 9.6, h: 5.6 },
    },
    man: { 8: 'B' },
    beats: ['mid-in', 'short-in', 'mid-out', 'deep'],
    window: { x: MID, d: 22.5, label: 'JANELA NO MEIO' },
    tip: 'OS SAFETIES DIVIDIRAM O FUNDO. ATAQUE O MEIO',
  },
  COVER3: {
    id: 'COVER3',
    name: 'COVER 3',
    rushers: [0, 1, 2, 3],
    zones: {
      6: { x: 8, d: 26, w: 16, h: 14 },
      7: { x: 45.3, d: 26, w: 16, h: 14 },
      10: { x: MID, d: 28, w: 18, h: 14 },
      8: { x: 10, d: 6, w: 11, h: 6 },
      9: { x: 43, d: 6, w: 11, h: 6 },
      4: { x: 20, d: 9, w: 10, h: 6 },
      5: { x: 33, d: 9, w: 10, h: 6 },
    },
    man: {},
    beats: ['mid-in', 'short-out', 'mid-out', 'short-in'],
    window: { x: 16, d: 14, label: 'JANELA ENTRE AS ZONAS' },
    tip: 'TRÊS NO FUNDO, QUATRO EMBAIXO. ATAQUE ENTRE AS ZONAS',
  },
  MAN: {
    id: 'MAN',
    name: 'HOMEM A HOMEM',
    rushers: [0, 1, 2, 3],
    zones: { 10: { x: MID, d: 28, w: 20, h: 14 } },
    man: { 6: 'A', 8: 'B', 9: 'C', 7: 'D', 4: 'E' },
    beats: ['short-in', 'mid-in', 'mid-out', 'short-out'],
    window: { x: 20, d: 10, label: 'CRUZE NA FRENTE' },
    tip: 'MARCAÇÃO INDIVIDUAL: ROTAS QUE CRUZAM GANHAM SEPARAÇÃO',
  },
  BLITZ: {
    id: 'BLITZ',
    name: 'BLITZ',
    rushers: [0, 1, 2, 3, 4, 5],
    zones: {},
    man: { 6: 'A', 8: 'B', 9: 'C', 7: 'D', 10: 'E' },
    beats: ['short-in', 'short-out', 'mid-in', 'deep'],
    window: { x: 20, d: 6, label: 'PASSE RÁPIDO!' },
    tip: 'BLITZ! SOLTE A BOLA RÁPIDO',
  },
};

/** Sorteia o esquema da defesa para a próxima jogada (com seed). */
export function pickScheme(rng: Rng): Scheme {
  const r = rng.next();
  const id: SchemeId = r < 0.35 ? 'COVER2' : r < 0.65 ? 'COVER3' : r < 0.85 ? 'MAN' : 'BLITZ';
  return SCHEMES[id];
}

/** Leitura curta para a visão tática: "COVER 2 · 4 NA PRESSÃO". */
export function readText(s: Scheme) {
  return `${s.name} · ${s.rushers.length} NA PRESSÃO`;
}

/** Dica: quais recebedores atacam o ponto fraco desta cobertura. */
export function tipText(s: Scheme, routes: Record<RecvKey, string>) {
  const keys = Object.keys(routes) as RecvKey[];
  for (const kind of s.beats) {
    const hits = keys.filter((k) => ROUTES[routes[k]].kind === kind);
    if (hits.length) {
      const list = hits.slice(0, 2).map((k) => `${k} (${ROUTES[routes[k]].name})`);
      return `${s.tip} COM ${list.join(' OU ')}.`;
    }
  }
  return `${s.tip}.`;
}

/** Bloqueio: cada OL pega o DL mais próximo (para desenhar as setas brancas). */
export function blockAssignments(ol: Player[], dl: Player[]) {
  return ol.map((o) => {
    let best = dl[0];
    for (const d of dl) if (Math.abs(d.x - o.x) < Math.abs(best.x - o.x)) best = d;
    return { from: o, to: best };
  });
}
