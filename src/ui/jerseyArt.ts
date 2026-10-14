import Phaser from 'phaser';
import { RES } from '../config';

/*
 * Camisa de futebol americano (vista de costas) desenhada em canvas. Tudo fica recortado dentro da
 * silhueta (nada sai para fora): tecido com malha e volume, ombreiras e painéis laterais em degradê
 * suave, listras que acompanham as mangas, gola canelada, pespontos, nome e número só nas costas.
 * O contorno grosso é desenhado por último e cobre as bordas. Textura em cache pelo conteúdo.
 */

export interface JerseyOpts {
  primary: number;
  secondary: number;
  name: string;
  number: string;
  /** Tamanho na tela (pontos do jogo). */
  w: number;
  h: number;
}

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const mix = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const lum = (c: number) => (((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114) / 255;

export function jerseyTexture(scene: Phaser.Scene, o: JerseyOpts): string {
  const key = `jersey2_${o.primary}_${o.secondary}_${o.name}_${o.number}_${o.w}x${o.h}`;
  if (scene.textures.exists(key)) return key;
  const W = 300;
  const H = 320;
  const cv = document.createElement('canvas');
  cv.width = Math.round(o.w * RES);
  cv.height = Math.round(o.h * RES);
  const c = cv.getContext('2d')!;
  c.scale(cv.width / W, cv.height / H);
  const P = o.primary;
  const S = o.secondary;
  const dark = mix(P, 0x000000, 0.38);
  const light = mix(P, 0xffffff, 0.2);
  const ink = Math.abs(lum(S) - lum(P)) > 0.28 ? S : lum(P) > 0.55 ? 0x0d0d12 : 0xffffff;
  const trim = ink === S ? (lum(P) > 0.5 ? 0x0d0d12 : 0xffffff) : S;

  // Silhueta só com curvas (ombros arredondados, mangas curtas, tronco levemente acinturado)
  const body = () => {
    c.beginPath();
    c.moveTo(112, 20);
    c.bezierCurveTo(130, 32, 170, 32, 188, 20); // gola
    c.bezierCurveTo(214, 22, 246, 30, 264, 50); // ombro
    c.bezierCurveTo(280, 70, 292, 100, 296, 118); // manga (lado de fora)
    c.bezierCurveTo(280, 128, 262, 134, 248, 138); // boca da manga
    c.bezierCurveTo(244, 128, 240, 118, 236, 112); // axila
    c.bezierCurveTo(232, 170, 234, 240, 240, 298); // lateral
    c.bezierCurveTo(180, 310, 120, 310, 60, 298); // barra
    c.bezierCurveTo(66, 240, 68, 170, 64, 112);
    c.bezierCurveTo(60, 118, 56, 128, 52, 138);
    c.bezierCurveTo(38, 134, 20, 128, 4, 118);
    c.bezierCurveTo(8, 100, 20, 70, 36, 50);
    c.bezierCurveTo(54, 30, 86, 22, 112, 20);
    c.closePath();
  };

  // Sombra no chão/fundo
  c.save();
  c.translate(5, 8);
  body();
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fill();
  c.restore();

  c.save();
  body();
  c.clip();
  // Tecido: degradê vertical
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(light));
  g.addColorStop(0.5, css(P));
  g.addColorStop(1, css(dark));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // Painéis laterais: degradê suave da cor secundária vindo das laterais (sem borda reta)
  for (const [x0, x1] of [[50, 96], [250, 204]]) {
    const pg = c.createLinearGradient(x0, 0, x1, 0);
    pg.addColorStop(0, css(mix(S, dark, 0.2), 0.75));
    pg.addColorStop(0.55, css(mix(S, P, 0.5), 0.25));
    pg.addColorStop(1, css(P, 0));
    c.fillStyle = pg;
    c.fillRect(Math.min(x0, x1), 130, Math.abs(x1 - x0), 190);
  }
  // Ombreiras: tom mais escuro com transição suave
  const yk = c.createLinearGradient(0, 30, 0, 96);
  yk.addColorStop(0, css(mix(P, 0x000000, 0.25), 0.9));
  yk.addColorStop(0.75, css(mix(P, 0x000000, 0.2), 0.55));
  yk.addColorStop(1, css(P, 0));
  c.fillStyle = yk;
  c.fillRect(0, 20, W, 80);
  // Volume: luz no centro das costas e sombra nas laterais e axilas
  const vol = c.createRadialGradient(150, 150, 20, 150, 170, 190);
  vol.addColorStop(0, 'rgba(255,255,255,0.10)');
  vol.addColorStop(0.6, 'rgba(255,255,255,0)');
  vol.addColorStop(1, 'rgba(0,0,0,0.30)');
  c.fillStyle = vol;
  c.fillRect(0, 0, W, H);
  // Malha (furinhos do tecido de jogo)
  c.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 4; y < H; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) c.fillRect(x, y, 1.6, 1.6);
  // Mangas: duas listras que acompanham a manga (o recorte some com as pontas)
  const sleeve = (cx: number, cy: number, ang: number) => {
    c.save();
    c.translate(cx, cy);
    c.rotate(ang);
    c.fillStyle = css(trim);
    c.fillRect(-60, -10, 120, 6);
    c.fillRect(-60, 4, 120, 6);
    c.fillStyle = css(S);
    c.fillRect(-60, -4, 120, 8);
    // punho canelado
    c.fillStyle = css(mix(P, 0x000000, 0.35));
    c.fillRect(-60, 16, 120, 12);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = -60; i < 60; i += 4) c.fillRect(i, 16, 1.4, 12);
    c.restore();
  };
  // Recorte extra: as listras ficam só nas mangas (fora do tronco)
  c.save();
  c.beginPath();
  c.rect(0, 0, W, H);
  c.moveTo(66, 300);
  c.lineTo(64, 112);
  c.bezierCurveTo(62, 90, 60, 66, 58, 40);
  c.lineTo(242, 40);
  c.bezierCurveTo(240, 66, 238, 90, 236, 112);
  c.lineTo(234, 300);
  c.closePath();
  c.clip('evenodd');
  sleeve(36, 104, 0.36);
  sleeve(264, 104, -0.36);
  c.restore();
  // Gola canelada (faixa larga que acompanha a curva, só a parte de dentro aparece)
  c.lineCap = 'round';
  c.lineWidth = 16;
  c.strokeStyle = css(trim);
  c.beginPath();
  c.moveTo(100, 14);
  c.bezierCurveTo(128, 30, 172, 30, 200, 14);
  c.stroke();
  c.lineWidth = 8;
  c.strokeStyle = css(S);
  c.stroke();
  // Pespontos
  c.setLineDash([5, 4]);
  c.lineWidth = 1.3;
  c.strokeStyle = 'rgba(255,255,255,0.25)';
  const seam = (f: () => void) => {
    c.beginPath();
    f();
    c.stroke();
  };
  seam(() => {
    c.moveTo(40, 72);
    c.bezierCurveTo(100, 88, 200, 88, 260, 72);
  });
  seam(() => {
    c.moveTo(72, 118);
    c.bezierCurveTo(74, 180, 72, 240, 68, 292);
  });
  seam(() => {
    c.moveTo(228, 118);
    c.bezierCurveTo(226, 180, 228, 240, 232, 292);
  });
  seam(() => {
    c.moveTo(60, 288);
    c.bezierCurveTo(120, 298, 180, 298, 240, 288);
  });
  c.setLineDash([]);
  // Barra dobrada (sombra suave)
  const hem = c.createLinearGradient(0, 284, 0, 310);
  hem.addColorStop(0, 'rgba(0,0,0,0)');
  hem.addColorStop(1, 'rgba(0,0,0,0.3)');
  c.fillStyle = hem;
  c.fillRect(0, 284, W, 30);

  // Nome (só letras, levemente arqueado como na camisa de verdade)
  const name = (o.name || 'SOBRENOME').toUpperCase();
  c.font = `${name.length > 9 ? 15 : 18}px "Press Start 2P", monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  const tw = c.measureText(name).width;
  const sx = Math.min(1, 150 / tw);
  const chars = name.split('');
  let x = 150 - (tw * sx) / 2;
  for (const ch of chars) {
    const cw = c.measureText(ch).width * sx;
    const t = (x + cw / 2 - 150) / 90;
    const y = 104 + t * t * 6; // arco suave
    c.save();
    c.translate(x + cw / 2, y);
    c.scale(sx, 1);
    c.lineWidth = 5;
    c.strokeStyle = css(trim);
    c.strokeText(ch, 0, 0);
    c.fillStyle = css(ink);
    c.fillText(ch, 0, 0);
    c.restore();
    x += cw;
  }

  // Número (só nas costas): sombra, contorno duplo e brilho dentro do número
  const num = o.number || '?';
  c.font = `${num.length > 1 ? 84 : 96}px "Press Start 2P", monospace`;
  const ny = 206;
  c.lineWidth = 18;
  c.strokeStyle = 'rgba(0,0,0,0.55)';
  c.strokeText(num, 153, ny + 4);
  c.lineWidth = 14;
  c.strokeStyle = css(trim);
  c.strokeText(num, 150, ny);
  c.lineWidth = 6;
  c.strokeStyle = css(mix(ink, 0x000000, 0.25));
  c.strokeText(num, 150, ny);
  const ng = c.createLinearGradient(0, ny - 42, 0, ny + 42);
  ng.addColorStop(0, css(mix(ink, 0xffffff, 0.35)));
  ng.addColorStop(0.5, css(ink));
  ng.addColorStop(1, css(mix(ink, 0x000000, 0.15)));
  c.fillStyle = ng;
  c.fillText(num, 150, ny);
  c.restore();

  // Contorno por último: cobre todas as bordas (nada vaza da silhueta)
  body();
  c.lineWidth = 6;
  c.lineJoin = 'round';
  c.strokeStyle = '#0d0d12';
  c.stroke();
  // Fio de luz interno no topo
  c.save();
  body();
  c.clip();
  body();
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(255,255,255,0.12)';
  c.translate(0, 2);
  c.stroke();
  c.restore();

  scene.textures.addCanvas(key, cv);
  return key;
}
