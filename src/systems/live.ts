import { FIELD } from '../config';
import type { RecvKey } from '../data/plays';
import type { Player } from '../entities/Player';
import { blockAssignments, type Scheme } from './ai';
import type { Rng } from './rng';
import type { RouteRunner } from './routes';
import { arrive, dist, nearest, pursue, seek, steer } from './steering';
import { TACKLE_RANGE, tryTackle, type TackleResult } from './tackling';

/*
 * Lance ao vivo: os 22 jogadores se movem ao mesmo tempo, cada um com sua lógica
 * (máquina de estados por regras):
 *   pocket → bola com o QB: rotas, bloqueio, pressão, cobertura (homem / zona)
 *   air    → bola no ar: recebedor ajusta para a queda, defensores atacam a bola
 *   carry  → alguém corre com a bola: bloqueio de campo aberto, perseguição, tackle
 */

export type Phase = 'pocket' | 'air' | 'carry' | 'dead';

export interface Receiver {
  key: RecvKey;
  p: Player;
  runner: RouteRunner | null;
}

export interface LiveEvents {
  onPressure(dl: Player): void;
  onSack(by: Player): void;
  onTackle(by: Player, r: TackleResult): void;
  onBrokenTackle(by: Player, how: 'juke' | 'spin' | 'stiff'): void;
}

export class LivePlay {
  t = 0;
  phase: Phase = 'pocket';
  carrier: Player | null = null;
  /** Para onde a bola vai cair (fase air). */
  landing: { x: number; y: number; target: Player | null } | null = null;
  /** Defensor que escapou do bloqueio. */
  escaper: Player;
  readonly escapeAt: number;
  pressured = false;
  /** Janela de evasão do carregador ('juke' | 'spin'), controlada pela cena. */
  evasive: 'juke' | 'spin' | null = null;
  /** Bola escorregadia (chuva): reduz tackle e aumenta fumble — usado mais tarde. */
  slippery = 0;

  private blocks: Map<Player, Player>;
  private history = new Map<Player, { t: number; x: number; y: number }[]>();
  private engaged = new Map<Player, Player>();
  private ol: Player[];
  private dl: Player[];

  constructor(
    readonly offense: Player[],
    readonly defense: Player[],
    readonly qb: Player,
    readonly receivers: Receiver[],
    readonly scheme: Scheme,
    readonly los: number,
    private rng: Rng,
    private ev: LiveEvents,
  ) {
    this.ol = offense.filter((p) => ['C', 'G', 'T'].includes(p.role));
    this.dl = defense.filter((p) => p.role === 'DL');
    this.blocks = new Map(blockAssignments(this.ol, this.dl).map((b) => [b.from, b.to]));
    // Um DL de ponta escapa do bloqueio depois de alguns segundos (pocket curto)
    this.escaper = rng.chance(0.5) ? this.dl[0] : this.dl[3];
    this.escapeAt = rng.range(2.1, 3.3);
    for (const p of [...offense, ...defense]) {
      p.state = 'live';
      p.wait = 0;
    }
    defense.forEach((d, i) => {
      if (scheme.rushers.includes(i) && d.role !== 'DL') d.state = 'rush';
    });
  }

  /** Segundos até a pressão chegar no QB (para a barra POCKET). */
  get pocketLeft() {
    let best = this.pressured ? Infinity : this.escapeAt - this.t + 0.7;
    for (const d of this.defense) {
      if (d.state !== 'rush' && !(this.pressured && d === this.escaper)) continue;
      best = Math.min(best, Math.max(0, dist(d, this.qb) - 1) / d.maxSpeed);
    }
    return Math.max(0, best);
  }

  throwTo(x: number, y: number, target: Player | null) {
    this.phase = 'air';
    this.landing = { x, y, target };
  }

  startCarry(p: Player) {
    this.phase = 'carry';
    this.carrier = p;
    this.landing = null;
    this.engaged.clear();
  }

  update(dt: number) {
    if (this.phase === 'dead') return;
    this.t += dt;
    for (const p of [...this.offense, ...this.defense]) {
      if (p.wait > 0) p.wait -= dt;
      const h = this.history.get(p) ?? [];
      h.push({ t: this.t, x: p.x, y: p.y });
      if (h.length > 40) h.shift();
      this.history.set(p, h);
    }
    if (this.phase === 'carry') this.updateCarry(dt);
    else this.updatePass(dt);
    this.separate();
  }

  // ------------------------------------------------------------ passe

  private updatePass(dt: number) {
    const qb = this.qb;
    // QB recua para o pocket (5–7 jardas atrás da linha)
    if (this.phase === 'pocket') arrive(qb, qb.x, this.los - 7.3, 6, dt, 1);
    else steer(qb, 0, 0, dt);

    // Recebedores: rotas; o alvo do passe ajusta para o ponto de queda
    for (const r of this.receivers) {
      if (this.landing && r.p === this.landing.target && dist(r.p, this.landing) < 6) {
        arrive(r.p, this.landing.x, this.landing.y, r.p.maxSpeed, dt, 0.8, 24);
      } else r.runner?.step(r.p, dt);
    }

    // Linha ofensiva: fica entre o DL e o QB
    for (const o of this.ol) {
      const d = this.blocks.get(o)!;
      if (d.state === 'free') {
        arrive(o, o.x, Math.min(o.y, this.los - 1.5), 3, dt);
        continue;
      }
      const ux = qb.x - d.x;
      const uy = qb.y - d.y;
      const L = Math.hypot(ux, uy) || 1;
      arrive(o, d.x + (ux / L) * 0.95, d.y + (uy / L) * 0.95, 5, dt, 0.6);
    }

    // Defesa
    this.defense.forEach((d, i) => {
      if (d.wait > 0) return steer(d, 0, 0, dt);
      // Bola no ar: quem está perto ataca o ponto de queda (depois de um tempo de reação)
      if (this.phase === 'air' && this.landing && d.role !== 'DL') {
        const dl = dist(d, this.landing);
        if (dl < 11 && this.t > 0.15) {
          seek(d, this.landing.x, this.landing.y, d.maxSpeed * 1.02, dt);
          return;
        }
      }
      if (d.role === 'DL') return this.rushDL(d, dt);
      if (d.state === 'rush') {
        seek(d, qb.x, qb.y, d.maxSpeed, dt);
        return;
      }
      const zone = this.scheme.zones[i];
      const manKey = this.scheme.man[i];
      if (manKey) this.cover(d, this.receivers.find((r) => r.key === manKey)!.p, dt);
      else if (zone) this.guardZone(d, zone, dt);
      else arrive(d, d.x, d.y, 2, dt);
    });

    // Sack: alguém livre chega no QB com a bola
    if (this.phase === 'pocket') {
      for (const d of this.defense) {
        if ((d.state === 'rush' || d.state === 'free') && dist(d, qb) < 0.95) {
          this.phase = 'dead';
          this.ev.onSack(d);
          return;
        }
      }
    }
  }

  private rushDL(d: Player, dt: number) {
    const qb = this.qb;
    if (d === this.escaper && !this.pressured && this.t >= this.escapeAt && this.phase === 'pocket') {
      this.pressured = true;
      d.state = 'free';
      this.ev.onPressure(d);
    }
    if (d.state === 'free') {
      seek(d, qb.x, qb.y, d.maxSpeed * 1.05, dt);
      return;
    }
    // Disputa de força com o bloqueador mais próximo (+ aleatoriedade)
    const { p: o, d: od } = nearest(this.ol, d.x, d.y);
    if (o && od < 1.4) {
      const push = Math.max(0.12, 0.5 + (d.attrs.strength - o.attrs.strength) / 70 + this.rng.range(-0.25, 0.25));
      const ux = qb.x - d.x;
      const uy = qb.y - d.y;
      const L = Math.hypot(ux, uy) || 1;
      steer(d, (ux / L) * push, (uy / L) * push, dt, 8);
    } else seek(d, qb.x, qb.y, d.maxSpeed * 0.8, dt);
  }

  /** Homem a homem: persegue com atraso de reação (pior cobertura = mais atraso). */
  private cover(d: Player, r: Player, dt: number) {
    const delay = Math.max(0.08, 0.42 - d.attrs.coverage / 280);
    const h = this.history.get(r) ?? [];
    let past = h[0] ?? { x: r.x, y: r.y };
    for (const s of h) if (s.t <= this.t - delay) past = s;
    // Fica um pouco por dentro e por baixo do recebedor
    const inside = r.x < FIELD.width / 2 ? 0.6 : -0.6;
    seek(d, past.x + inside + r.vx * 0.3, past.y + 0.4 + r.vy * 0.3, d.maxSpeed * 0.98, dt);
  }

  /** Zona: guarda a área e persegue quem entra nela. */
  private guardZone(d: Player, z: { x: number; d: number; w: number; h: number }, dt: number) {
    const cx = z.x;
    const cy = this.los + z.d;
    let threat: Player | null = null;
    let best = Infinity;
    for (const r of this.receivers) {
      const nx = (r.p.x - cx) / (z.w / 2 + 2);
      const ny = (r.p.y - cy) / (z.h / 2 + 2);
      const inside = nx * nx + ny * ny;
      if (inside < 1 && inside < best) {
        best = inside;
        threat = r.p;
      }
    }
    if (threat) {
      // Fica entre o recebedor e o QB, um pouco à frente
      seek(d, threat.x + (this.qb.x - threat.x) * 0.08, threat.y + 0.8, d.maxSpeed * 0.92, dt);
    } else arrive(d, cx, cy, d.maxSpeed * 0.85, dt, 2);
  }

  // ---------------------------------------------------- com a bola na mão

  private updateCarry(dt: number) {
    const c = this.carrier!;
    // Ataque: bloqueio de campo aberto no defensor mais perigoso
    for (const o of this.offense) {
      if (o === c) continue;
      const busy = [...this.engaged.values()].includes(o);
      if (busy) {
        const d = [...this.engaged.entries()].find(([, b]) => b === o)![0];
        arrive(o, d.x, d.y - 0.7, 4, dt, 0.5);
        continue;
      }
      const { p: d, d: dd } = nearest(this.defense, c.x, c.y, (q) => !this.engaged.has(q) && q.wait <= 0 && dist(q, c) < 9 && dist(q, o) < 7);
      if (d) {
        seek(o, (d.x + c.x) / 2, (d.y + c.y) / 2, o.maxSpeed * 0.9, dt);
        if (dist(o, d) < 0.9 && dd > 1.2) {
          this.engaged.set(d, o);
          d.wait = 0.5 + (o.attrs.strength - d.attrs.strength + 30) / 60 + this.rng.range(0, 0.6);
        }
      } else arrive(o, o.x, o.y + 1, 3, dt);
    }
    // Defesa: persegue o carregador (pursue) e tenta o tackle
    for (const d of this.defense) {
      if (d.wait > 0) {
        steer(d, 0, 0, dt, 10);
        continue;
      }
      if (this.engaged.has(d)) this.engaged.delete(d);
      pursue(d, c, d.maxSpeed * 1.02, dt, 0.9);
      if (dist(d, c) < TACKLE_RANGE) {
        const r = tryTackle(d, c, this.evasive, this.rng, this.slippery);
        if (r.made) {
          this.phase = 'dead';
          this.ev.onTackle(d, r);
          return;
        }
        d.wait = 0.9; // errou o tackle e caiu
        d.angle = d.x < c.x ? -75 : 75;
        this.ev.onBrokenTackle(d, this.evasive ?? 'stiff');
      }
    }
  }

  /** Separação simples: ninguém atravessa ninguém. */
  private separate() {
    const all = [...this.offense, ...this.defense];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.001 && d < 0.75) {
          const push = (0.75 - d) / 2;
          const k = a === this.carrier || b === this.carrier ? 0.4 : 1;
          a.x -= (dx / d) * push * k;
          a.y -= (dy / d) * push * k;
          b.x += (dx / d) * push * k;
          b.y += (dy / d) * push * k;
        }
      }
    }
  }
}
