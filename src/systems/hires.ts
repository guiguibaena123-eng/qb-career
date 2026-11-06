import Phaser from 'phaser';
import { RES, VIEW } from '../config';

/*
 * Alta resolução: o canvas tem RES× o tamanho lógico (390×844) e cada câmera dá zoom RES,
 * então todo o código continua pensando em 390×844 mas o desenho sai nítido na tela real.
 */

/**
 * Medidas de texto em memória. Com espaçamento entre letras, o Phaser mede cada letra de cada texto
 * (measureText) ao criar e ao desenhar; montar uma tela de menu chegava a centenas de medições iguais
 * ("A" em 14px 700 Saira...). A medida só depende da fonte e do texto, então guarda e reaproveita.
 * Instalado depois que as fontes carregaram (senão guardaria a medida da fonte padrão).
 */
function cacheMeasureText() {
  const proto = CanvasRenderingContext2D.prototype;
  const orig = proto.measureText;
  if ((orig as unknown as { __cached?: boolean }).__cached) return;
  const cache = new Map<string, TextMetrics>();
  const fn = function (this: CanvasRenderingContext2D, text: string) {
    const k = this.font + '\u0000' + text;
    let m = cache.get(k);
    if (m === undefined) {
      m = orig.call(this, text);
      if (cache.size > 30000) cache.clear();
      cache.set(k, m);
    }
    return m;
  };
  (fn as unknown as { __cached: boolean }).__cached = true;
  proto.measureText = fn;
}

/** Textos nascem com resolução RES (letras nítidas). Chamar uma vez antes de criar o jogo. */
export function patchText() {
  cacheMeasureText();
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

/**
 * Câmera principal com zoom RES, enquadrando a tela inteira (VIEW): o palco 390×844 fica na área
 * segura e as bordas (notch, laterais, barra de início) mostram a continuação dos fundos.
 */
export function setupHiRes(scene: Phaser.Scene) {
  const cam = scene.cameras.main;
  cam.setZoom(RES);
  cam.centerOn(VIEW.x + VIEW.w / 2, VIEW.y + VIEW.h / 2);
}
