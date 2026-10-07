import { FIELD } from '../config';
import { ROUTES } from '../data/plays';
import type { Player } from '../entities/Player';
import { arrive, seek } from './steering';

const MID = FIELD.width / 2;

/** Waypoints da rota no mundo, a partir de onde o recebedor está alinhado. */
export function routeWorld(x: number, y: number, routeName: string): [number, number][] {
  const inward = x < MID ? 1 : -1;
  return ROUTES[routeName].pts.map(([i, f]) => [Math.min(FIELD.width - 1, Math.max(1, x + i * inward)), Math.min(108.5, y + f)]);
}

/**
 * Corredor de rota: o recebedor faz seek ponto a ponto. No último ponto, rotas
 * profundas continuam correndo; curl/out/flat "assentam" (arrive) e esperam a bola.
 */
export class RouteRunner {
  idx = 1;
  readonly settle: boolean;

  constructor(readonly pts: [number, number][], routeName: string) {
    const kind = ROUTES[routeName].kind;
    this.settle = kind !== 'deep' && routeName !== 'SLANT' && routeName !== 'DIG';
  }

  get done() {
    return this.idx >= this.pts.length;
  }

  step(p: Player, dt: number) {
    const speed = p.maxSpeed;
    if (!this.done) {
      const [tx, ty] = this.pts[this.idx];
      const last = this.idx === this.pts.length - 1;
      const d = last && this.settle ? arrive(p, tx, ty, speed, dt, 2) : seek(p, tx, ty, speed, dt, 22);
      if (d < 0.6) this.idx++;
      return;
    }
    // Fim da rota
    if (this.settle) {
      const [tx, ty] = this.pts[this.pts.length - 1];
      arrive(p, tx, ty, speed, dt, 2);
    } else {
      // Continua na direção do último trecho
      const [ax, ay] = this.pts[this.pts.length - 2];
      const [bx, by] = this.pts[this.pts.length - 1];
      const d = Math.hypot(bx - ax, by - ay) || 1;
      seek(p, p.x + ((bx - ax) / d) * 5, p.y + ((by - ay) / d) * 5, speed, dt);
    }
    p.x = Math.min(FIELD.width - 0.6, Math.max(0.6, p.x));
  }

  /** Onde o recebedor vai estar daqui a `t` segundos (seguindo a rota em velocidade máxima). */
  predict(p: Player, t: number): [number, number] {
    let x = p.x;
    let y = p.y;
    let left = t * p.maxSpeed;
    let i = this.idx;
    while (left > 0 && i < this.pts.length) {
      const [tx, ty] = this.pts[i];
      const d = Math.hypot(tx - x, ty - y);
      if (d >= left) {
        x += ((tx - x) / d) * left;
        y += ((ty - y) / d) * left;
        return [x, y];
      }
      x = tx;
      y = ty;
      left -= d;
      i++;
    }
    if (left > 0 && !this.settle) {
      const [ax, ay] = this.pts[this.pts.length - 2];
      const [bx, by] = this.pts[this.pts.length - 1];
      const d = Math.hypot(bx - ax, by - ay) || 1;
      x += ((bx - ax) / d) * left;
      y += ((by - ay) / d) * left;
    }
    return [Math.min(FIELD.width - 0.6, Math.max(0.6, x)), y];
  }
}
