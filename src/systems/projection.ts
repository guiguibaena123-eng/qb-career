import { CAMERA, FIELD } from '../config';

/** Ponto projetado na tela. `s` é o fator de escala da perspectiva naquela profundidade. */
export interface ScreenPoint {
  x: number;
  y: number;
  s: number;
}

/*
 * Projeção igual à do design (plano inclinado com rotateX + perspective do CSS).
 *
 * O mundo é medido em jardas (x = largura 0–53,3; y = distância, 0 = nossa linha de gol).
 * Internamente ele vira o "plano" do design, em px: X = 50 + x·10, T = 1290 − y·10
 * (10 px por jarda; a end zone adversária fica no alto). O plano gira em torno da base
 * (tela y = 900, abaixo da tela), com perspectiva 700 px e origem de perspectiva em (195, 300).
 * O horizonte fica acima do topo da tela: não aparece céu, só arquibancada.
 */
export const PLANE = {
  pxPerYard: 10,
  originX: 50, // X do plano onde x = 0
  goalT: 1290, // T do plano onde y = 0
  pivotT: 1300,
  centerX: 316.5,
  persp: 700,
  originY: 300, // perspective-origin
  pivotScreen: 600, // distância da origem de perspectiva até a base do plano
  screenCX: 195,
  /** T + shift que fica no "foco" da câmera (a linha de scrimmage no design). */
  focusT: 897,
};

export const toPlaneX = (x: number) => PLANE.originX + x * PLANE.pxPerYard;
export const toPlaneT = (y: number) => PLANE.goalT - y * PLANE.pxPerYard;

export class Projection {
  /** Jarda (eixo y) que fica no foco da câmera. */
  camY = 25;
  /** A câmera fica sempre centralizada no campo. */
  readonly camX = FIELD.width / 2;
  tilt = CAMERA.tiltDefault;
  readonly w = 390;
  readonly h = 844;

  get sin() {
    return Math.sin((this.tilt * Math.PI) / 180);
  }
  get cos() {
    return Math.cos((this.tilt * Math.PI) / 180);
  }
  /** Deslocamento do plano (o translateY do design) para pôr camY no foco. */
  get shift() {
    return PLANE.focusT - toPlaneT(this.camY);
  }

  project(x: number, y: number, h = 0, out: ScreenPoint = { x: 0, y: 0, s: 0 }): ScreenPoint {
    const Z = CAMERA.zoom;
    const dx = (toPlaneX(x) - PLANE.centerX) * Z; // centerX = meio do campo (x = 26,65)
    const dy = (toPlaneT(y) + this.shift - PLANE.pivotT) * Z;
    const f = PLANE.persp / (PLANE.persp - dy * this.sin);
    out.s = f * Z;
    out.x = PLANE.screenCX + (dx - 0.5) * f;
    out.y = PLANE.originY + (PLANE.pivotScreen + dy * this.cos) * f - h * PLANE.pxPerYard * out.s;
    return out;
  }

  /** px de tela por jarda naquela profundidade. */
  unitAt(y: number) {
    return this.project(this.camX, y).s * PLANE.pxPerYard;
  }

  /** Jarda que aparece numa linha da tela (inversa da projeção, no chão). */
  yAtScreen(sy: number) {
    const dy = (PLANE.persp * (sy - PLANE.originY - PLANE.pivotScreen)) / (PLANE.persp * this.cos + (sy - PLANE.originY) * this.sin);
    const T = dy / CAMERA.zoom + PLANE.pivotT - this.shift;
    return (PLANE.goalT - T) / PLANE.pxPerYard;
  }

  /** Menor y visível: tudo antes disso está abaixo da tela. */
  get nearY() {
    return this.yAtScreen(this.h + 60);
  }

  /** Quanto o chão está "achatado" na vertical nessa profundidade (para textos deitados). */
  flattenAt(y: number) {
    const a = this.project(this.camX, y);
    const ay = a.y;
    const unit = a.s * PLANE.pxPerYard;
    const by = this.project(this.camX, y + 0.5).y;
    return Math.abs(ay - by) / (unit * 0.5);
  }
}
