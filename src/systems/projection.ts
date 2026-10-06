import { CAMERA, FIELD, GAME_H, GAME_W } from '../config';

/** Ponto projetado na tela. `s` é o fator de perspectiva (escala) naquela profundidade. */
export interface ScreenPoint {
  x: number;
  y: number;
  s: number;
}

/**
 * Projeção pseudo-3D de um plano inclinado.
 * - Mundo em jardas: x = largura (0–53,3), y = distância ao longo do campo, h = altura.
 * - s = D / (D + profundidade): perto da câmera s > 1, longe s → 0 (ponto de fuga).
 * - No chão, a tela vai do ponto de fuga (s=0) até o foco (s=1) e além.
 */
export class Projection {
  camX = FIELD.width / 2;
  camY = 25;
  tilt = CAMERA.tiltDefault;
  readonly w = GAME_W;
  readonly h = GAME_H;

  get horizonY() {
    return this.h * CAMERA.vanishRatio;
  }
  get focusY() {
    return this.h * CAMERA.focusRatio;
  }
  /** px de profundidade por jarda; cresce com a inclinação. */
  get depthPx() {
    return CAMERA.depthPxBase * Math.sin((this.tilt * Math.PI) / 180);
  }
  /** Menor y visível sem estourar a perspectiva (atrás da câmera). */
  get nearY() {
    return this.camY - (CAMERA.perspDist * 0.62) / this.depthPx;
  }

  scaleAt(y: number) {
    return CAMERA.perspDist / (CAMERA.perspDist + (y - this.camY) * this.depthPx);
  }

  project(x: number, y: number, h = 0, out: ScreenPoint = { x: 0, y: 0, s: 0 }): ScreenPoint {
    const s = this.scaleAt(y);
    const unit = CAMERA.pxPerYard * CAMERA.zoom * s;
    out.s = s;
    out.x = this.w / 2 + (x - this.camX) * unit;
    out.y = this.horizonY + (this.focusY - this.horizonY) * s - h * unit;
    return out;
  }

  /** Quanto o chão está "achatado" na vertical nessa profundidade (para textos deitados). */
  flattenAt(y: number) {
    const s = this.scaleAt(y);
    return ((this.focusY - this.horizonY) * s * this.depthPx) / (CAMERA.perspDist * CAMERA.pxPerYard * CAMERA.zoom);
  }
}
