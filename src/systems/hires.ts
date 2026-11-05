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
  // Medidas da fonte (altura da linha) guardadas por fonte: o Phaser mediria de novo a cada texto criado
  const metrics = new Map<string, unknown>();
  proto.text = function (this: unknown, x: number, y: number, text: string, style?: Record<string, unknown>) {
    const st: Record<string, unknown> = { resolution: RES, ...(style ?? {}) };
    const mk = st.metrics ? null : [st.font, st.fontFamily, st.fontSize, st.fontStyle, st.testString].join('|');
    if (mk && metrics.has(mk)) st.metrics = metrics.get(mk);
    const t = orig.call(this, x, y, text, st) as Phaser.GameObjects.Text;
    if (mk && !metrics.has(mk)) metrics.set(mk, t.style.getTextMetrics());
    return t;
  };
  // setColor redesenha o texto e reenvia a imagem para a placa de vídeo mesmo com a cor igual;
  // vários textos (relógio de jogada, letreiro do muro, barra de força) chamam isso todo quadro.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tp = Phaser.GameObjects.Text.prototype as any;
  const origColor = tp.setColor;
  tp.setColor = function (this: Phaser.GameObjects.Text, color: string) {
    if (this.style.color === color) return this;
    return origColor.call(this, color);
  };
}

/** Câmera principal com zoom RES, enquadrando o mundo lógico 390×844. */
export function setupHiRes(scene: Phaser.Scene) {
  const cam = scene.cameras.main;
  cam.setZoom(RES);
  cam.centerOn(GAME_W / 2, GAME_H / 2);
}
