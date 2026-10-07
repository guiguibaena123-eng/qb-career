import Phaser from 'phaser';
import { GAME_H, GAME_W, RES } from '../config';

/*
 * Alta resolução: o canvas tem RES× o tamanho lógico (390×844) e cada câmera dá zoom RES,
 * então todo o código continua pensando em 390×844 mas o desenho sai nítido na tela real.
 */

/** Textos nascem com resolução RES (letras nítidas). Chamar uma vez antes de criar o jogo. */
export function patchText() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = Phaser.GameObjects.GameObjectFactory.prototype as any;
  const orig = proto.text;
  proto.text = function (this: unknown, x: number, y: number, text: string, style?: Record<string, unknown>) {
    return orig.call(this, x, y, text, { resolution: RES, ...(style ?? {}) });
  };
}

/** Câmera principal com zoom RES, enquadrando o mundo lógico 390×844. */
export function setupHiRes(scene: Phaser.Scene) {
  const cam = scene.cameras.main;
  cam.setZoom(RES);
  cam.centerOn(GAME_W / 2, GAME_H / 2);
}
