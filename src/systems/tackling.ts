import type { Player } from '../entities/Player';
import type { Rng } from './rng';

/*
 * Tackle: colisão por distância + chance pelos atributos.
 * Juke/spin bem cronometrados (janela ativa no momento do contato) quebram a maioria dos tackles.
 */

export const TACKLE_RANGE = 0.95; // jardas

export interface TackleResult {
  made: boolean;
  /** Quebrou por causa de juke/spin? */
  broken: boolean;
  /** Tackle forte (para tremida maior). */
  big: boolean;
}

export function tryTackle(def: Player, carrier: Player, evasive: 'juke' | 'spin' | null, rng: Rng, slippery = 0): TackleResult {
  let p = 0.62 + (def.attrs.tackle - carrier.attrs.strength) / 180;
  // Defensor chegando de frente acerta mais; por trás, menos
  const dy = def.y - carrier.y;
  p += dy > 0 ? 0.08 : -0.1;
  if (evasive === 'juke') p *= 0.22;
  if (evasive === 'spin') p *= 0.3;
  p -= slippery;
  p = Math.max(0.05, Math.min(0.95, p));
  const made = rng.next() < p;
  const speed = Math.hypot(def.vx - carrier.vx, def.vy - carrier.vy);
  return { made, broken: !made && evasive !== null, big: made && speed > 9 };
}
