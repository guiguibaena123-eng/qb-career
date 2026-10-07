import { FIELD } from '../config';
import type { RecvKey } from '../data/plays';
import type { Player } from '../entities/Player';
import type { RouteRunner } from './routes';

/*
 * Passe estilingue: o jogador arrasta o dedo PARA TRÁS a partir do QB e solta.
 *   direção = oposta ao arraste (puxar para baixo = lançar para frente)
 *   força   = tamanho do arraste
 * A bola segue um arco: posição no chão interpolada + altura em parábola.
 * A MESMA função desenha a prévia e move a bola em voo (a bola segue exatamente a curva mostrada).
 */

export const MAX_DRAG = 150; // px de arraste para força 100%
export const MIN_DRAG = 14; // abaixo disso não conta como passe
const HAND_H = 2.3; // altura da mão do QB (jardas)
const CATCH_H = 1.4; // altura onde o recebedor pega a bola

export interface Throw {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  power: number;
  dist: number;
  /** Tempo de voo (s). */
  T: number;
  /** Altura extra no meio do arco. */
  apex: number;
}

/** Velocidade da bola (jardas/s): passes fortes chegam mais rápido. */
export function ballSpeed(power: number) {
  return 16 + power * 14;
}

/** Monta o lançamento a partir do arraste (em px de tela). */
export function aimFromDrag(qb: { x: number; y: number }, dragX: number, dragY: number): Throw | null {
  const len = Math.hypot(dragX, dragY);
  if (len < MIN_DRAG) return null;
  const power = Math.min(1, (len - MIN_DRAG) / (MAX_DRAG - MIN_DRAG));
  // Puxar para baixo/esquerda → lançar para cima/direita
  const wx = -dragX / len;
  const wy = dragY / len; // tela para baixo = mundo para trás → inverte
  const dist = 4 + power * 58;
  let tx = qb.x + wx * dist;
  let ty = qb.y + wy * dist;
  tx = Math.max(-2, Math.min(FIELD.width + 2, tx));
  ty = Math.min(qb.y + 70, ty);
  return makeThrow(qb.x, qb.y, tx, ty, power);
}

export function makeThrow(sx: number, sy: number, tx: number, ty: number, power: number): Throw {
  const dist = Math.hypot(tx - sx, ty - sy);
  const T = dist / ballSpeed(power);
  // Passes longos sobem mais; passes fortes são mais retos
  const apex = (0.6 + dist * 0.16) * (1.25 - power * 0.5);
  return { sx, sy, tx, ty, power, dist, T, apex };
}

/** Ponto do arco em u ∈ [0, 1]: [x, y, altura]. */
export function arcAt(t: Throw, u: number): [number, number, number] {
  const x = t.sx + (t.tx - t.sx) * u;
  const y = t.sy + (t.ty - t.sy) * u;
  const h = HAND_H + (CATCH_H - HAND_H) * u + t.apex * 4 * u * (1 - u);
  return [x, y, h];
}

export type Status = 'LIVRE' | 'APERTADO' | 'MARCADO';
export const STATUS_COLOR: Record<Status, number> = { LIVRE: 0x3ccb5a, APERTADO: 0xffb02e, MARCADO: 0xe5484d };

/** Situação do recebedor agora, pela distância do defensor mais próximo. */
export function statusOf(r: Player, defense: Player[]): Status {
  let d = Infinity;
  for (const p of defense) d = Math.min(d, Math.hypot(p.x - r.x, p.y - r.y));
  return d > 3.5 ? 'LIVRE' : d > 1.8 ? 'APERTADO' : 'MARCADO';
}

export interface Read {
  key: RecvKey | null;
  receiver: Player | null;
  /** Chance de completar (0–1). */
  chance: number;
  /** Chance de interceptação se der errado (0–1). */
  intChance: number;
  status: Status;
  /** Distância entre a queda e onde o recebedor vai estar (erro de "lead"). */
  lead: number;
}

/**
 * Avalia o passe ANTES de soltar (o que a mira mostra):
 * separação do defensor no ponto de queda + precisão do lead + força + mãos + clima.
 */
export function readThrow(
  t: Throw,
  receivers: { key: RecvKey; p: Player; runner: RouteRunner | null }[],
  defense: Player[],
  accuracyPenalty = 0,
): Read {
  // Recebedor que vai estar mais perto da queda quando a bola chegar
  let best: (typeof receivers)[number] | null = null;
  let lead = Infinity;
  for (const r of receivers) {
    const [px, py] = r.runner ? r.runner.predict(r.p, t.T) : [r.p.x, r.p.y];
    const e = Math.hypot(px - t.tx, py - t.ty);
    if (e < lead) {
      lead = e;
      best = r;
    }
  }
  if (!best || lead > 5) {
    return { key: null, receiver: null, chance: 0, intChance: 0.05, status: 'LIVRE', lead };
  }
  // Quão perto um defensor consegue chegar da queda até a bola chegar
  let sep = Infinity;
  for (const d of defense) {
    const reach = Math.hypot(d.x - t.tx, d.y - t.ty) - d.maxSpeed * t.T * 0.8;
    sep = Math.min(sep, Math.max(0, reach));
  }
  let c = 0.94;
  c -= lead < 1.2 ? 0 : Math.min(0.65, (lead - 1.2) * 0.2); // passe "na frente" do recebedor é melhor
  c -= sep < 0.4 ? 0.5 : sep < 1.8 ? 0.28 : sep < 3.5 ? 0.1 : 0;
  c += (best.p.attrs.hands - 75) / 220;
  c -= t.dist / 260;
  c -= t.power > 0.92 && t.dist < 15 ? 0.12 : 0; // forte demais e curto: difícil de segurar
  c -= accuracyPenalty;
  c = Math.max(0.03, Math.min(0.97, c));
  const intChance = sep < 0.4 ? 0.4 : sep < 1.8 ? 0.16 : sep < 3.5 ? 0.05 : 0.01;
  const status: Status = sep > 3.5 ? 'LIVRE' : sep > 1.5 ? 'APERTADO' : 'MARCADO';
  return { key: best.key, receiver: best.p, chance: c, intChance, status, lead };
}

/** Cor da mira pelo risco. */
export function riskColor(chance: number) {
  return chance >= 0.62 ? 0x3ccb5a : chance >= 0.38 ? 0xffd23f : 0xe5484d;
}
