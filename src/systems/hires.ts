import Phaser from 'phaser';
import { GAME_H, GAME_W, RES, VIEW } from '../config';

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

/**
 * Telas de lista (menu da carreira): o palco ocupa a LARGURA da tela (letras e cartões maiores) em vez
 * de encolher para caber a altura inteira; a altura útil passa a ser a que sobra na área segura.
 * Devolve a altura útil (`h`, em unidades do palco, no lugar de GAME_H) e o retângulo visível (`view`,
 * no lugar de VIEW). Sem ganho (computador, tela já cheia) fica igual a setupHiRes.
 */
export function setupFitWidth(scene: Phaser.Scene) {
  const cam = scene.cameras.main;
  const { w: Ws, h: Hs } = VIEW.screen;
  const { t, r, b, l } = VIEW.inset;
  const s = Math.max(Ws / VIEW.w, Hs / VIEW.h); // pt da tela por unidade, no modo normal
  const S2 = (Ws - l - r) / GAME_W; // pt por unidade com o palco na largura toda
  const k = S2 / s;
  const envelop = Math.abs(Ws / Hs - VIEW.w / VIEW.h) < 0.03;
  if (!envelop || k < 1.02) {
    setupHiRes(scene);
    return { h: GAME_H, view: VIEW };
  }
  cam.setZoom(RES * k);
  cam.centerOn((Ws / 2 - l) / S2, (Hs / 2 - t) / S2);
  const view = { ...VIEW, x: -l / S2 - 2, y: -t / S2 - 2, w: Ws / S2 + 4, h: Hs / S2 + 4 };
  return { h: (Hs - t - b) / S2, view };
}
