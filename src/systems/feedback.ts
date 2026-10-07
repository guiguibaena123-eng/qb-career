import Phaser from 'phaser';

/*
 * Game feel: vibração (Vibration API), tremida de tela e câmera lenta curta.
 * A câmera lenta é um multiplicador de tempo que a cena aplica no seu dt.
 */

export const VIBE = {
  tap: 8,
  snap: 25,
  throw: 18,
  catch: [20, 30, 30],
  tackle: 45,
  sack: [60, 40, 80],
  block: [30, 30, 30],
  turnover: [90, 50, 140],
  td: [40, 40, 40, 40, 120],
} as const;

export function vibrate(p: number | readonly number[]) {
  try {
    navigator.vibrate?.(p as number | number[]);
  } catch {
    /* alguns navegadores bloqueiam: sem problema */
  }
}

export class Feedback {
  /** Multiplicador de tempo (1 = normal; 0,25 = câmera lenta). */
  timeScale = 1;
  private slowLeft = 0;

  constructor(private scene: Phaser.Scene) {}

  shake(strength = 0.006, ms = 140) {
    this.scene.cameras.main.shake(ms, strength);
  }

  /** Câmera lenta por `realSec` segundos reais. */
  slowmo(realSec = 0.3, scale = 0.25) {
    this.slowLeft = realSec;
    this.timeScale = scale;
  }

  get slow() {
    return this.slowLeft > 0;
  }

  /** Chamar todo frame com o dt REAL; devolve o dt do jogo. */
  tick(realDt: number) {
    if (this.slowLeft > 0) {
      this.slowLeft -= realDt;
      if (this.slowLeft <= 0) this.timeScale = 1;
    }
    return realDt * this.timeScale;
  }

  skipSlowmo() {
    this.slowLeft = 0;
    this.timeScale = 1;
  }
}
