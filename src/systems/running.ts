import { FIELD } from '../config';
import type { Player } from '../entities/Player';
import { steer } from './steering';

/*
 * Controle de quem está com a bola (recebedor após a recepção, RB, QB correndo):
 *   joystick → direção (sem tocar, segue correndo para frente)
 *   SPRINT   → +25% de velocidade, gasta fôlego
 *   JUKE     → corte lateral rápido; janela curta que quebra tackles
 *   SPIN     → giro de 360°; janela que quebra tackles, perde um pouco de velocidade
 *   MERGULHO → mergulha para frente ~2 jardas e o lance acaba
 */

const JUKE_TIME = 0.28;
const SPIN_TIME = 0.42;
const DIVE_TIME = 0.62;
/** Fases do mergulho (fração do tempo): impulso até DIVE_UP, voo até DIVE_LAND, depois desliza no chão. */
const DIVE_UP = 0.16;
const DIVE_LAND = 0.68;

export class CarrierControl {
  stamina = 1;
  sprint = false;
  private jukeT = 0;
  private jukeDir = 1;
  private spinT = 0;
  private spinDir = 1;
  private diveT = 0;
  private cooldown = 0;
  /** Mergulho terminou: o lance acaba onde ele caiu. */
  diveDone = false;
  /** Escorregou (neve): perde o equilíbrio por um instante. */
  slipChance = 0;
  /** Sorteio (a cena passa o gerador com semente). */
  rand: () => number = Math.random;
  /** Escorregou agora (a cena mostra o aviso). */
  onSlip?: () => void;
  /** Caiu no chão no fim do mergulho (a cena solta poeira). */
  onLand?: () => void;
  private slipT = 0;

  constructor(private p: Player) {}

  /** Janela de evasão ativa (para o tackle). */
  get evasive(): 'juke' | 'spin' | null {
    if (this.jukeT > JUKE_TIME * 0.15) return 'juke';
    if (this.spinT > 0) return 'spin';
    return null;
  }

  get diving() {
    return this.diveT > 0;
  }

  juke(dirX: number) {
    if (this.cooldown > 0 || this.diving || this.slipT > 0) return false;
    // Gramado molhado/neve: o corte pode escorregar
    if (this.rand() < this.slipChance) {
      this.slip();
      return false;
    }
    this.jukeT = JUKE_TIME;
    this.jukeDir = dirX === 0 ? (this.p.x < FIELD.width / 2 ? 1 : -1) : Math.sign(dirX);
    this.cooldown = 0.7;
    return true;
  }

  private slip() {
    this.slipT = 0.5;
    this.cooldown = 0.6;
    this.onSlip?.();
  }

  spin() {
    if (this.cooldown > 0 || this.diving || this.slipT > 0) return false;
    if (this.rand() < this.slipChance * 0.7) {
      this.slip();
      return false;
    }
    this.spinT = SPIN_TIME;
    // Gira para o lado em que está indo (ou para o meio do campo)
    this.spinDir = this.p.vx > 0.3 ? 1 : this.p.vx < -0.3 ? -1 : this.p.x < FIELD.width / 2 ? 1 : -1;
    this.cooldown = 0.9;
    return true;
  }

  dive() {
    if (this.diving || this.diveDone) return false;
    this.diveT = DIVE_TIME;
    return true;
  }

  /** jx, jy: joystick na tela (−1..1; jy negativo = para cima = para frente). */
  update(jx: number, jy: number, dt: number) {
    const p = this.p;
    this.cooldown = Math.max(0, this.cooldown - dt);

    // Fôlego: gasta no sprint, recupera devagar
    if (this.sprint && this.stamina > 0) this.stamina = Math.max(0, this.stamina - dt * 0.38);
    else this.stamina = Math.min(1, this.stamina + dt * 0.12);
    const sprinting = this.sprint && this.stamina > 0.02;

    if (this.diveT > 0) {
      this.diveT -= dt;
      const k = Math.min(1, 1 - this.diveT / DIVE_TIME);
      p.angle = 0;
      p.sx = p.sy = 1;
      if (k < DIVE_UP) {
        // 1) Impulso: agacha e sobe os braços com a bola, ainda no chão
        p.pose = 'diveUp';
        p.hop = 0;
        steer(p, p.vx * 0.6, Math.max(p.vy * 0.85, 3), dt, 30);
      } else if (k < DIVE_LAND) {
        // 2) Voo: corpo esticado no ar, em arco, ganhando distância para a frente
        p.pose = 'dive';
        const u = (k - DIVE_UP) / (DIVE_LAND - DIVE_UP);
        p.hop = Math.sin(u * Math.PI) * 0.75;
        steer(p, p.vx * 0.4, Math.max(p.vy, 7.5), dt, 40);
      } else {
        // 3) Chão: cai de barriga e desliza até parar
        if (p.pose !== 'diveFlat') this.onLand?.();
        p.pose = 'diveFlat';
        p.hop = 0;
        steer(p, 0, 0, dt, 16);
      }
      if (this.diveT <= 0) {
        this.diveDone = true;
        p.hop = 0;
      }
      return;
    }

    if (this.slipT > 0) {
      this.slipT -= dt;
      p.angle = Math.sin(this.slipT * 30) * 12;
      steer(p, p.vx * 0.35, p.vy * 0.35, dt, 6);
      if (this.slipT <= 0) p.angle = 0;
      return;
    }

    // Direção: joystick; sem tocar, continua para frente
    let dx = jx;
    let dy = -jy;
    const mag = Math.min(1, Math.hypot(dx, dy));
    if (mag < 0.15) {
      dx = 0;
      dy = 1;
    } else {
      const n = Math.hypot(dx, dy);
      dx /= n;
      dy /= n;
    }
    let speed = p.maxSpeed * (sprinting ? 1.25 : 1) * (mag < 0.15 ? 0.92 : 0.6 + mag * 0.4);
    if (this.spinT > 0) speed *= 0.85;
    let vx = dx * speed;
    let vy = dy * speed;

    if (this.jukeT > 0) {
      this.jukeT -= dt;
      vx += this.jukeDir * 7.5;
      vy *= 0.75;
    }
    if (this.spinT > 0) {
      this.spinT -= dt;
      // Giro no próprio eixo: costas → perfil → de frente → outro perfil → costas (quadros desenhados)
      const k = 1 - Math.max(0, this.spinT) / SPIN_TIME;
      const dir = this.spinDir;
      if (k < 0.12 || k >= 0.88) {
        p.pose = 'carry';
        p.sx = 1;
      } else if (k < 0.38) {
        p.pose = 'carrySide';
        p.sx = dir;
      } else if (k < 0.62) {
        p.pose = 'carryTurn';
        p.sx = 1;
      } else {
        p.pose = 'carrySide';
        p.sx = -dir;
      }
      p.hop = Math.sin(k * Math.PI) * 0.15;
      // Passo para o lado durante o giro, para onde ele está indo
      vx += dir * 5.5 * Math.sin(k * Math.PI);
      if (this.spinT <= 0) {
        p.pose = 'carry';
        p.sx = 1;
        p.hop = 0;
      }
    }
    steer(p, vx, vy, dt, this.jukeT > 0 || this.spinT > 0 ? 60 : 20);
  }
}
