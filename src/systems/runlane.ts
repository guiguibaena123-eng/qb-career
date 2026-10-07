import { FIELD } from '../config';
import type { Player } from '../entities/Player';

/*
 * Leitura da corrida (o que a faixa verde mostra):
 * testa várias "trilhas" à frente do carregador e escolhe a que passa mais longe
 * dos defensores livres (os bloqueados contam pouco). Também aponta o buraco
 * e o defensor mais perigoso (o que chega primeiro).
 */

export interface Lane {
  pts: [number, number][];
  /** Folga da trilha (jardas até o defensor livre mais próximo). */
  open: number;
  hole: { x: number; y: number } | null;
  danger: Player | null;
}

/** Menor distância do ponto (px,py) ao segmento a→b. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function bestLane(c: Player, defense: Player[], blocked: (d: Player) => boolean, los: number): Lane {
  const behind = c.y < los + 0.5;
  const y1 = behind ? los + 1.2 : c.y + 4;
  const y2 = y1 + 6;
  let best: Lane | null = null;
  let bestScore = -Infinity;
  for (let dx = -9; dx <= 9; dx += 1.5) {
    const x1 = Math.max(1, Math.min(FIELD.width - 1, c.x + dx));
    const x2 = Math.max(1, Math.min(FIELD.width - 1, x1 + dx * 0.25));
    const pts: [number, number][] = [
      [c.x, c.y],
      [x1, y1],
      [x2, y2],
    ];
    let open = 12;
    for (const d of defense) {
      if (d.y < c.y - 1.5) continue; // já ficou para trás
      let dd = Math.min(segDist(d.x, d.y, pts[0][0], pts[0][1], x1, y1), segDist(d.x, d.y, x1, y1, x2, y2));
      if (blocked(d)) dd += 2.6;
      open = Math.min(open, dd);
    }
    const score = open - Math.abs(dx) * 0.12;
    if (score > bestScore) {
      bestScore = score;
      best = { pts, open, hole: behind ? { x: x1, y: los + 0.6 } : null, danger: null };
    }
  }
  // Perigo: defensor livre que chega primeiro no carregador
  let t = Infinity;
  for (const d of defense) {
    if (blocked(d) || d.y < c.y - 1) continue;
    const tt = Math.hypot(d.x - c.x, d.y - c.y) / d.maxSpeed;
    if (tt < t) {
      t = tt;
      best!.danger = d;
    }
  }
  if (t > 1.6) best!.danger = null;
  return best!;
}
