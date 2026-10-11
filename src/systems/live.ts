import { difficulty } from './difficulty';
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

/** Raio do corpo (jardas): ninguém chega mais perto que isso de ninguém. */
const BODY = 0.85;
/** Caído no chão ocupa menos espaço, mas continua sendo um obstáculo. */
const BODY_DOWN = 0.6;

/**
 * Colisão entre jogadores: ninguém atravessa ninguém. A sobreposição é desfeita por inteiro
 * (algumas iterações), dividida pela massa (força; quem carrega a bola pesa mais), e a
 * velocidade de um contra o outro é anulada para não "entrarem" de novo no frame seguinte.
 * Quem está caído não é empurrado.
 */
export function separatePlayers(all: Player[], heavy: Player | null = null, isDown: (p: Player) => boolean = () => false) {
  const inv = all.map((p) => (isDown(p) ? 0 : 1 / ((0.8 + p.attrs.strength / 100) * (p === heavy ? 1.6 : 1))));
  const down = all.map(isDown);
  for (let it = 0; it < 3; it++) {
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        if (down[i] && down[j]) continue;
        const a = all[i];
        const b = all[j];
        const r = down[i] || down[j] ? BODY_DOWN : BODY;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d < 0.001) {
          dx = i % 2 ? 1 : -1;
          dy = 0;
          d = 1;
        }
        const nx = dx / d;
        const ny = dy / d;
        const wa = inv[i];
        const wb = inv[j];
        const s = (r - Math.min(d, r)) / (wa + wb);
        a.x -= nx * s * wa;
        a.y -= ny * s * wa;
        b.x += nx * s * wb;
        b.y += ny * s * wb;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const k = rv / (wa + wb);
          a.vx += nx * k * wa;
          a.vy += ny * k * wa;
          b.vx -= nx * k * wb;
          b.vy -= ny * k * wb;
        }
      }
    }
  }
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
  /** Corrida desenhada: buraco alvo e até quando cada DL fica preso no bloqueio. */
  runGap: number | null = null;
  private shedAt = new Map<Player, number>();
  /** Quem foi derrubado (perdeu no físico): fica no chão até o tempo acabar. */
  private downs = new Map<Player, { until: number; state: string }>();
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
    this.escapeAt = this.dl.length ? rng.range(2.1, 3.3) + difficulty.d.pocket : Infinity; // treino sem defesa: pocket eterno
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

  /** Corrida desenhada: o RB recebe e a linha bloqueia empurrando os DL para longe do buraco. */
  startRun(p: Player, gapX: number, hold = 1, fool = 0) {
    this.startCarry(p);
    this.runGap = gapX;
    for (const o of this.ol) {
      const d = this.blocks.get(o);
      if (!d || d.state === 'free') continue;
      // Disputa de força: bloqueador forte segura mais
      const h = (1.2 + (o.attrs.strength - d.attrs.strength) / 45 + this.rng.range(0, 1.1)) * hold;
      this.shedAt.set(d, this.t + Math.max(0.5, h));
    }
    // Segundo nível (LB/S) lê a jogada com um atraso de reação
    for (const d of this.defense) if (d.role !== 'DL') d.wait = Math.max(d.wait, this.rng.range(0.2, 0.45) + fool);
  }

  /** Defensor preso num bloqueio agora (a faixa verde quase o ignora). */
  isBlocked(d: Player) {
    return d.wait > 0 || (this.shedAt.get(d) ?? -1) > this.t;
  }

  /** Está caído no chão agora. */
  isDown(p: Player) {
    return this.downs.has(p);
  }

  /** Derruba o jogador: ele para onde está, deitado, e só levanta depois de `secs`. */
  knockDown(p: Player, secs: number, fromX: number) {
    const prev = this.downs.get(p);
    this.downs.set(p, { until: this.t + secs, state: prev?.state ?? p.state });
    p.state = 'down';
    p.wait = Math.max(p.wait, secs);
    p.vx = p.vy = 0;
    p.pose = null;
    p.angle = p.x < fromX ? -80 : 80;
  }

  update(dt: number) {
    if (this.phase === 'dead') return;
    this.t += dt;
    for (const [p, d] of this.downs) {
      if (d.until > this.t) continue;
      this.downs.delete(p);
      p.state = d.state;
      p.angle = 0;
    }
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
    this.keepInBounds();
  }

  // ------------------------------------------------------------ passe

  private updatePass(dt: number) {
    const qb = this.qb;
    // QB recua para o pocket (5–7 jardas atrás da linha)
    if (this.phase === 'pocket') arrive(qb, qb.x, this.los - 7.3, 6, dt, 1);
    else steer(qb, 0, 0, dt);

    // Recebedores: rotas; o alvo do passe ajusta para o ponto de queda
    // Quem está mais perto da queda (inclusive recebedor parado) vai buscar a bola
    let chaser: Player | null = null;
    if (this.landing) {
      const L = this.landing;
      chaser = L.target && dist(L.target, L) < 9 ? L.target : null;
      if (!chaser) {
        const n = nearest(this.receivers.map((r) => r.p), L.x, L.y);
        if (n.p && n.d < 9) chaser = n.p;
      }
    }
    for (const r of this.receivers) {
      if (this.landing && r.p === chaser) {
        arrive(r.p, this.landing.x, this.landing.y, r.p.maxSpeed, dt, 0.6, 24);
      } else r.runner?.step(r.p, dt);
    }

    // Linha ofensiva: fica entre o DL e o QB
    for (const o of this.ol) {
      const d = this.blocks.get(o);
      if (!d || d.state === 'free') {
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
    // Corrida desenhada: OL segura o DL e empurra para longe do buraco
    const held = new Set<Player>();
    if (this.runGap !== null) {
      for (const o of this.ol) {
        const d = this.blocks.get(o);
        if (!d || (this.shedAt.get(d) ?? -1) <= this.t) continue;
        held.add(o);
        const away = d.x < this.runGap ? -1 : 1;
        arrive(o, d.x - away * 0.55, d.y - 0.75, 4.5, dt, 0.4);
        const push = Math.max(0.15, 0.6 + (d.attrs.strength - o.attrs.strength) / 70);
        const ux = c.x - d.x;
        const uy = c.y - d.y;
        const L = Math.hypot(ux, uy) || 1;
        steer(d, (ux / L) * push + away * 0.9, (uy / L) * push, dt, 8);
      }
    }
    // Ataque: bloqueio de campo aberto no defensor mais perigoso
    for (const o of this.offense) {
      if (o === c || held.has(o)) continue;
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
          d.wait = Math.max(0.15, 0.25 + (o.attrs.strength - d.attrs.strength + 20) / 90 + this.rng.range(0, 0.35));
        }
      } else arrive(o, o.x, o.y + 1, 3, dt);
    }
    // Defesa: persegue o carregador (pursue) e tenta o tackle
    for (const d of this.defense) {
      if (this.isDown(d)) {
        // caído: fica no chão, não segue ninguém
        d.vx = d.vy = 0;
        continue;
      }
      if ((this.shedAt.get(d) ?? -1) > this.t) continue; // preso no bloqueio
      if (d.wait > 0) {
        steer(d, 0, 0, dt, 10);
        continue;
      }
      if (this.engaged.has(d)) this.engaged.delete(d);
      pursue(d, c, d.maxSpeed * 1.07, dt, 0.9);
      if (dist(d, c) < TACKLE_RANGE) {
        const r = tryTackle(d, c, this.evasive, this.rng, this.slippery);
        if (r.made) {
          this.phase = 'dead';
          this.ev.onTackle(d, r);
          return;
        }
        // Perdeu no físico (ou no drible): cai e fica no chão um tempo
        const how = this.evasive ?? 'stiff';
        this.knockDown(d, this.rng.range(1.1, 1.6) + (how === 'stiff' ? 0.3 : 0), c.x);
        this.ev.onBrokenTackle(d, how);
      }
    }
  }

  private separate() {
    separatePlayers([...this.offense, ...this.defense], this.carrier, (p) => this.isDown(p));
  }

  /** Ninguém sai das 4 linhas (laterais e linhas de fundo das end zones); só quem tem a bola pode pisar fora. */
  private keepInBounds() {
    for (const p of [...this.offense, ...this.defense]) {
      if (p === this.carrier) {
        p.y = Math.min(p.y, 109.6);
        continue;
      }
      if (p.x < 0.4 || p.x > FIELD.width - 0.4) {
        p.x = Math.max(0.4, Math.min(FIELD.width - 0.4, p.x));
        p.vx = 0;
      }
      if (p.y < -9.6 || p.y > 109.6) {
        p.y = Math.max(-9.6, Math.min(109.6, p.y));
        p.vy = 0;
      }
    }
  }
}
