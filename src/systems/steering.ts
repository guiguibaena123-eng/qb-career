import type { Player } from '../entities/Player';

/*
 * Steering behaviors clássicos (algoritmos simples, sem IA treinada):
 * seek/arrive (ir até um ponto), pursue (perseguir prevendo a posição do alvo),
 * evade (fugir). A velocidade muda com aceleração limitada, o que dá peso aos jogadores.
 */

const ACCEL = 16; // jardas/s² — quão rápido muda de velocidade/direção

/** Aproxima a velocidade de (dvx, dvy) com aceleração limitada e move o jogador. */
export function steer(p: Player, dvx: number, dvy: number, dt: number, accel = ACCEL) {
  const ax = dvx - p.vx;
  const ay = dvy - p.vy;
  const a = Math.hypot(ax, ay);
  const max = accel * dt;
  const k = a > max ? max / a : 1;
  p.vx += ax * k;
  p.vy += ay * k;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

/** Vai até (tx, ty) e desacelera ao chegar (arrive). */
export function arrive(p: Player, tx: number, ty: number, speed: number, dt: number, slowRadius = 1.5, accel = ACCEL) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) {
    steer(p, 0, 0, dt, accel);
    return d;
  }
  const v = Math.min(speed, (speed * d) / slowRadius);
  steer(p, (dx / d) * v, (dy / d) * v, dt, accel);
  return d;
}

/** Vai até (tx, ty) sem desacelerar (seek). */
export function seek(p: Player, tx: number, ty: number, speed: number, dt: number, accel = ACCEL) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  steer(p, (dx / d) * speed, (dy / d) * speed, dt, accel);
  return d;
}

/** Persegue o alvo mirando onde ele vai estar (pursue). */
export function pursue(p: Player, target: Player, speed: number, dt: number, lead = 1, accel = ACCEL) {
  const d = Math.hypot(target.x - p.x, target.y - p.y);
  const t = Math.min(1.2, (d / Math.max(1, speed)) * lead);
  return seek(p, target.x + target.vx * t, target.y + target.vy * t, speed, dt, accel);
}

export function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** O jogador mais próximo de um ponto (ignorando quem não pode agir). */
export function nearest<T extends { x: number; y: number }>(list: T[], x: number, y: number, filter?: (p: T) => boolean) {
  let best: T | null = null;
  let bd = Infinity;
  for (const p of list) {
    if (filter && !filter(p)) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return { p: best, d: bd };
}
