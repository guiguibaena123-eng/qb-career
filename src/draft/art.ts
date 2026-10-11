import Phaser from 'phaser';
import type { CareerTeam } from '../data/TeamRepository';
import { getSave } from '../player/PlayerSave';
import { faceCell, PlayerFace, SHAPE } from '../player/PlayerFace';
import { SKINS } from '../player/PlayerFace';

/*
 * Arte do Draft: o palco do QFL Draft é a imagem do design (public/assets/draft, carregada no Boot),
 * exibida ampliada e sem suavização. O comissário e o jogador de terno usam as camadas de
 * assets/draft_suit (a mesma proporção humana) e rostos da base de rostos; o comissário tem braços
 * articulados desenhados em código para as palmas.
 */

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export const STAGE_W = 98;
export const STAGE_H = 212;

/** Palco (98×212 de arte, exibido a 4×). `party` = versão da escolha (serpentinas e balões). */
export function stageTexture(_scene: Phaser.Scene, _team: CareerTeam, party = false) {
  return party ? 'draftimg_stage_party' : 'draftimg_stage';
}

// ------------------------------------------------------------ comissário

/** Cores do comissário: terno azul-marinho, calça mais escura, gravata da liga, pele clara. */
export const COMMISH = {
  jacket: 0x34467e,
  trousers: 0x232c50,
  shoes: 0x15151b,
  shirt: 0xf4f1e8,
  tie: 0xf26b1d,
  skin: 0xeac29b,
};

/** Ombros (px da figura 200×400) e comprimentos dos braços articulados das palmas. */
export const SHOULDER_L = { x: 60, y: 98 };
export const SHOULDER_R = { x: 139, y: 98 };
export const UPPER_LEN = 50;
export const FORE_LEN = 54;
/** Linha do meio do antebraço dentro da textura (pivô do cotovelo), em fração da altura. */
export const FORE_PIVOT_Y = 16 / 26;

/** Tons do paletó (sombra, base, luz, lapela) e contorno. */
const SUIT = { out: '#0D0D12', dark: '#24315a', base: '#34467e', light: '#4a5f9e', lapel: '#1f2a50', lapelHi: '#5a70b0' };

/**
 * Corpo do comissário: calça, sapatos, pescoço, camisa e gravata das camadas do terno (a mesma base,
 * em proporção humana, do jogador de terno) e o paletó desenhado aqui, com todos os detalhes. `clap`:
 * sem braços (os braços articulados das palmas vêm por cima); senão, braços caídos de comprimento real
 * (as mãos na altura da coxa, escondidas atrás do púlpito).
 */
export function commissionerBody(scene: Phaser.Scene, clap: boolean) {
  const key = `draft_commish5_${clap ? 'clap' : 'rest'}`;
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas');
  cv.width = 200;
  cv.height = 400;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const C = COMMISH;
  const L: [string, number][] = [
    ['layer_shadow', 0xffffff],
    ['drsuit_dr_trou', C.trousers],
    ['drsuit_dr_shoes', C.shoes],
    // Sem a camada de pescoço do terno: o rosto da base já traz o pescoço, e o contorno dela deixava
    // duas linhas pretas dos lados do pescoço
    ['drsuit_dr_shirt', C.shirt],
    ['drsuit_dr_tie', C.tie],
  ];
  for (const [k, t] of L) stamp(scene, ctx, k, t);
  trouserDetails(ctx);
  if (!clap) {
    restArm(ctx, false);
    restArm(ctx, true);
  }
  jacket(ctx);
  scene.textures.addCanvas(key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/** Vinco no meio de cada perna e brilho nos sapatos. */
function trouserDetails(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(86, 232, 2, 130);
  ctx.fillRect(112, 232, 2, 130);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(98, 232, 4, 132);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(80, 368, 6, 2);
  ctx.fillRect(108, 368, 6, 2);
}

/** Meia-largura da silhueta do paletó em cada linha (trapézio caindo do pescoço, ombro, cintura, barra). */
function jacketHalf(y: number) {
  if (y < 84) return 0;
  if (y < 96) return 16 + Math.round(((y - 84) / 12) * 22); // caimento do pescoço até a ponta do ombro
  if (y < 100) return 39;
  if (y < 132) return 40;
  if (y < 172) return 40 - Math.round(((y - 132) / 40) * 6);
  return 34 + Math.round(((y - 172) / 60) * 2);
}

/** Meia-largura da abertura em V (camisa e gravata aparecem) em cada linha. */
const vHalf = (y: number) => (y < 80 || y > 172 ? 0 : Math.max(0, Math.round(17 * (1 - (y - 80) / 92))));

/** Paletó completo em pixel art (blocos de 2 px): silhueta, sombras, lapelas, bolsos, botões e lenço. */
function jacket(ctx: CanvasRenderingContext2D) {
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const CX = 100;
  const TOP = 84;
  const BOT = 232;
  for (let y = TOP; y < BOT; y += 2) {
    const h = jacketHalf(y);
    const v = vHalf(y);
    // Contorno, base e sombras laterais (luz vem da esquerda)
    px(CX - h - 2, y, 2, 2, SUIT.out);
    px(CX + h, y, 2, 2, SUIT.out);
    for (const [a, b] of [[CX - h, CX - v], [CX + v, CX + h]] as [number, number][]) {
      if (b <= a) continue;
      px(a, y, b - a, 2, SUIT.base);
    }
    px(CX - h, y, 4, 2, SUIT.light);
    px(CX + h - 8, y, 8, 2, SUIT.dark);
    // Lapelas: faixa ao longo do V, até o recorte (notch) na altura do peito
    if (y >= 88 && y < 150 && v > 0) {
      const lw = y < 118 ? 10 : 10 - Math.round(((y - 118) / 32) * 8);
      if (lw > 0) {
        px(CX - v - lw, y, lw, 2, SUIT.lapel);
        px(CX + v, y, lw, 2, SUIT.lapel);
        px(CX - v - lw, y, 2, 2, SUIT.lapelHi);
        px(CX + v + lw - 2, y, 2, 2, SUIT.out);
      }
    }
    // Borda do V (contorno da camisa)
    if (v > 0) {
      px(CX - v - 2, y, 2, 2, SUIT.out);
      px(CX + v, y, 2, 2, SUIT.out);
    }
  }
  // Recorte das lapelas (notch)
  px(CX - 27, 112, 6, 2, SUIT.out);
  px(CX + 21, 112, 6, 2, SUIT.out);
  // Contorno de cima dos ombros (acompanha o caimento) e costura do ombro
  for (let y = 84; y < 100; y += 2) {
    const h = jacketHalf(y);
    const hp = jacketHalf(y - 2);
    if (h > hp) {
      px(CX - h - 2, y - 2, h - hp + 2, 2, SUIT.out);
      px(CX + hp, y - 2, h - hp + 2, 2, SUIT.out);
    }
  }
  px(CX - 18, 82, 36, 2, SUIT.out);
  for (let i = 0; i < 16; i += 2) {
    px(CX - 22 - i, 90 + Math.floor(i / 2), 2, 2, SUIT.dark);
    px(CX + 20 + i, 90 + Math.floor(i / 2), 2, 2, SUIT.dark);
  }
  // Abertura da frente abaixo do V; na barra, as duas frentes se abrem em curva (a calça aparece)
  for (let y = 172; y < BOT - 10; y += 2) px(CX - 1, y, 2, 2, SUIT.out);
  for (let i = 1; i <= 5; i++) {
    const y = BOT - 12 + i * 2;
    const w = i * 2;
    ctx.clearRect(CX - w, y, w * 2, 2);
    px(CX - w - 2, y, 2, 2, SUIT.out);
    px(CX + w, y, 2, 2, SUIT.out);
  }
  // Botões (dois, com brilho)
  for (const y of [180, 198]) {
    px(CX - 4, y, 6, 6, SUIT.out);
    px(CX - 2, y + 2, 2, 2, '#4a4a58');
    px(CX - 2, y + 2, 1, 1, '#9AA3C0');
  }
  // Bolsos com aba (quadris)
  for (const x0 of [CX - 34, CX + 12]) {
    px(x0, 204, 22, 2, SUIT.out);
    px(x0, 206, 22, 4, SUIT.light);
    px(x0, 210, 22, 2, SUIT.dark);
  }
  // Bolso do peito (lado esquerdo dele = direita da tela) com lenço branco e ponta laranja
  px(CX + 14, 132, 16, 2, SUIT.out);
  px(CX + 16, 126, 4, 6, '#F4F1E8');
  px(CX + 20, 124, 4, 8, '#F4F1E8');
  px(CX + 24, 128, 4, 4, '#F4F1E8');
  px(CX + 20, 124, 2, 2, '#F26B1D');
  px(CX + 16, 130, 12, 2, 'rgba(0,0,0,0.2)');
  // Broche da liga na lapela (direita dele = esquerda da tela)
  px(CX - 22, 104, 6, 6, SUIT.out);
  px(CX - 20, 106, 2, 2, '#F26B1D');
  px(CX - 18, 106, 2, 2, '#FFD23F');
  // Pregas de tecido na cintura (lados) e linha da barra
  px(CX - 30, 150, 2, 16, SUIT.dark);
  px(CX + 28, 150, 2, 16, SUIT.dark);
  // Linha da barra (só nas duas frentes, fora da abertura)
  const hb = jacketHalf(BOT - 2);
  px(CX - hb, BOT - 2, hb - 12, 2, SUIT.out);
  px(CX + 12, BOT - 2, hb - 12, 2, SUIT.out);
}

/**
 * Braço caído ao lado do corpo, com comprimento real: manga (com dobra no cotovelo e botões no punho),
 * punho da camisa e mão relaxada com os dedos levemente curvos, na altura da coxa.
 */
function restArm(ctx: CanvasRenderingContext2D, right: boolean) {
  // Desenha o braço esquerdo da tela e espelha para o direito
  ctx.save();
  if (right) {
    ctx.translate(200, 0);
    ctx.scale(-1, 1);
  }
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  // Manga: um pouco afastada do tronco, levemente inclinada (cotovelo para fora)
  for (let y = 98; y < 206; y += 2) {
    const t = (y - 98) / 108;
    const x = Math.round(52 - Math.sin(t * Math.PI) * 4) & ~1; // cotovelo um pouco para fora
    const w = y < 104 ? 16 : 14;
    px(x - 2, y, w + 4, 2, SUIT.out);
    px(x, y, w, 2, SUIT.base);
    px(x, y, 2, 2, SUIT.light);
    px(x + w - 4, y, 4, 2, SUIT.dark);
    if (y > 146 && y < 152) px(x + 2, y, w - 6, 2, SUIT.dark); // dobra do cotovelo
  }
  px(50, 96, 16, 2, SUIT.out); // topo arredondado do braço, logo abaixo da ponta do ombro
  // Botões do punho
  px(54, 198, 2, 2, '#4a4a58');
  px(58, 198, 2, 2, '#4a4a58');
  // Punho da camisa
  px(50, 206, 14, 4, SUIT.out);
  px(52, 206, 10, 2, '#F4F1E8');
  // Mão relaxada: palma virada para a perna, dedos curvos, polegar para a frente
  const skin = hex(COMMISH.skin);
  px(50, 208, 14, 20, SUIT.out);
  px(52, 208, 10, 16, skin);
  px(54, 224, 6, 2, skin);
  px(52, 210, 2, 12, '#c99c74');
  for (const y of [214, 218]) px(56, y, 6, 1, 'rgba(0,0,0,0.25)');
  px(62, 210, 4, 8, SUIT.out); // polegar
  px(62, 212, 2, 4, skin);
  ctx.restore();
}

/** Braço (manga do paletó) na vertical, apontando para baixo; pivô no ombro, no topo. */
export function upperArmTexture(scene: Phaser.Scene) {
  const key = 'draft_commish_upper';
  if (scene.textures.exists(key)) return key;
  const w = 18;
  const h = UPPER_LEN + 8;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0D0D12';
  ctx.fillRect(2, 0, w - 4, h);
  ctx.fillRect(0, 2, w, h - 4);
  ctx.fillStyle = hex(COMMISH.jacket);
  ctx.fillRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(4, 4, 2, h - 10);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(w - 6, 4, 4, h - 8);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(2, h - 6, w - 4, 2); // dobra do cotovelo
  scene.textures.addCanvas(key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/**
 * Antebraço + punho + mão, na horizontal apontando para a direita; pivô no cotovelo, à esquerda.
 * A mão fica em pé (dedos para cima), com a palma virada para o centro: é ela que bate.
 */
export function foreArmTexture(scene: Phaser.Scene) {
  const key = 'draft_commish_fore';
  if (scene.textures.exists(key)) return key;
  const sleeve = FORE_LEN - 14;
  const w = FORE_LEN + 4;
  const h = 26;
  const cy = Math.round(FORE_PIVOT_Y * h);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const O = '#0D0D12';
  // Manga
  ctx.fillStyle = O;
  ctx.fillRect(0, cy - 8, sleeve + 2, 16);
  ctx.fillStyle = hex(COMMISH.jacket);
  ctx.fillRect(2, cy - 6, sleeve - 2, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(2, cy - 6, sleeve - 2, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(2, cy + 2, sleeve - 2, 4);
  // Punho branco
  ctx.fillStyle = O;
  ctx.fillRect(sleeve, cy - 7, 6, 14);
  ctx.fillStyle = '#F4F1E8';
  ctx.fillRect(sleeve, cy - 5, 4, 10);
  // Mão em pé: palma, dedos para cima e polegar
  const hx = sleeve + 4;
  ctx.fillStyle = O;
  ctx.fillRect(hx, cy - 16, 12, 24);
  ctx.fillRect(hx - 2, cy - 4, 2, 8);
  ctx.fillStyle = hex(COMMISH.skin);
  ctx.fillRect(hx + 2, cy - 14, 8, 20);
  ctx.fillStyle = '#c99c74';
  ctx.fillRect(hx + 2, cy - 14, 2, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (const y of [cy - 10, cy - 6]) ctx.fillRect(hx + 4, y, 6, 1); // dobras dos dedos
  ctx.fillStyle = hex(COMMISH.skin);
  ctx.fillRect(hx - 2, cy - 2, 2, 4); // polegar
  scene.textures.addCanvas(key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/** Púlpito com o logo oficial da QFL na frente e o microfone, `w` px de largura (pixels de tela). */
export function podium(scene: Phaser.Scene, x: number, y: number, w: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x0d0d12, 1);
  g.fillRect(x, y + 10, w, 106);
  g.fillStyle(0x2b3350, 1);
  g.fillRect(x + 3, y + 13, w - 6, 100);
  g.fillStyle(0xffffff, 0.13);
  g.fillRect(x + 3, y + 13, (w - 6) * 0.22, 100);
  g.fillStyle(0x000000, 0.17);
  g.fillRect(x + 3 + (w - 6) * 0.8, y + 13, (w - 6) * 0.2, 100);
  g.fillStyle(0x0d0d12, 1);
  g.fillRect(x - 3, y + 7, w + 6, 22);
  g.fillStyle(0x4a5580, 1);
  g.fillRect(x, y + 10, w, 16);
  // Logo oficial da QFL no centro da frente, com uma sombra atrás
  const size = Math.min(84, w * 0.42);
  const lx = x + w / 2;
  const ly = y + 13 + 50 + 4;
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(lx + 3, ly + 4, size / 2);
  const logo = scene.add.image(lx, ly, 'logoLeague').setDisplaySize(size, size);
  return [g, logo, microphone(scene, lx + 16, y + 7)];
}

/**
 * Microfone de púlpito (pescoço flexível) preso na borda do púlpito em (cx, edge): base com presilha e
 * luz vermelha de "no ar", haste com anéis subindo em leve curva até um pouco acima da linha da barriga
 * do comissário, anel prateado e cápsula com espuma e grade. Desenhado em blocos de 2 px.
 */
function microphone(scene: Phaser.Scene, cx: number, edge: number) {
  const g = scene.add.graphics();
  const O = 0x0d0d12;
  const px = (x: number, y: number, w: number, h: number, c: number, a = 1) => {
    g.fillStyle(c, a);
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };
  // Base presa na borda (presilha), com luz vermelha
  px(cx - 10, edge - 6, 20, 8, O);
  px(cx - 8, edge - 4, 16, 4, 0x3a3f52);
  px(cx - 8, edge - 4, 16, 1, 0x6b7290);
  px(cx + 4, edge - 3, 2, 2, 0xff3b3b);
  // Haste flexível: sai da lateral e curva em direção ao comissário, parando abaixo do queixo
  const H = 22;
  for (let i = 0; i <= H; i += 2) {
    const t = i / H;
    const sx = cx - Math.sin(t * Math.PI * 0.5) * 10;
    const sy = edge - 6 - i;
    px(sx - 3, sy - 2, 6, 2, O);
    px(sx - 2, sy - 2, 4, 2, i % 4 ? 0x2a2e3c : 0x50566e);
  }
  // Anel prateado e cápsula (inclinada para o comissário) com espuma escura e grade
  const tx = cx - 10;
  const ty = edge - 6 - H - 2;
  px(tx - 4, ty - 2, 8, 4, O);
  px(tx - 3, ty - 1, 6, 2, 0xc9ced6);
  px(tx - 6, ty - 18, 12, 16, O);
  px(tx - 4, ty - 16, 8, 12, 0x2b2b33);
  for (let gy = ty - 15; gy < ty - 4; gy += 2) for (let gx = tx - 3; gx < tx + 3; gx += 2) px(gx, gy, 1, 1, 0x5a5f72);
  px(tx - 4, ty - 16, 2, 10, 0xffffff, 0.18); // brilho
  px(tx - 4, ty - 20, 8, 2, O);
  return g;
}

/** Rosto do save (o mesmo da criação). */
export function saveFace() {
  const s = getSave();
  return { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard };
}

/** Desenha uma camada cinza tingida (multiply) num contexto. */
function stamp(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, key: string, tint: number, dx = 0, dy = 0) {
  if (!scene.textures.exists(key)) return;
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  const t = tmp.getContext('2d')!;
  t.drawImage(img, 0, 0);
  if (tint !== 0xffffff) {
    t.globalCompositeOperation = 'multiply';
    t.fillStyle = hex(tint);
    t.fillRect(0, 0, tmp.width, tmp.height);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(img, 0, 0);
  }
  ctx.drawImage(tmp, dx, dy);
}

/**
 * Figura de terno do Draft (camadas 200×400 de assets/draft_suit) segurando a jersey do time com o
 * número 12, e por cima o rosto do save (PlayerFace a 0.5, como no design). (x, y) = canto de cima.
 */
export function suitFigure(scene: Phaser.Scene, x: number, y: number, team: CareerTeam) {
  const s = getSave();
  const kit = team.kits.home;
  const key = `draft_suit2_${team.id}_${s.skin}`;
  if (!scene.textures.exists(key)) {
    const cv = document.createElement('canvas');
    cv.width = 200;
    cv.height = 400;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const skin = SKINS[s.skin % SKINS.length];
    const L: [string, number][] = [
      ['layer_shadow', 0xffffff],
      ['drsuit_dr_trou', 0x2b3560],
      ['drsuit_dr_shoes', 0x15151b],
      // (sem a camada de pescoço: o rosto da base já traz o pescoço, e o contorno dela sobrava)
      ['drsuit_dr_shirt', 0xf4f1e8],
      ['drsuit_dr_tie', team.colors.primary],
      ['drsuit_dr_jacket', 0x3a4e8a],
      ['drsuit_dr_jersey', kit.jersey],
      ['drsuit_dr_jcollar', kit.stripe],
      ['drsuit_dr_jsleeve', kit.stripe],
      ['drsuit_dr_det', 0xffffff],
    ];
    for (const [k, t] of L) stamp(scene, ctx, k, t);
    // Número 12 na jersey: contorno e preenchimento (sprites 14×20 a 2×)
    const out = shade(kit.jersey, 0.45);
    stamp(scene, ctx, 'layer_no_1', out, 74, 140);
    stamp(scene, ctx, 'layer_no_2', out, 98, 140);
    stamp(scene, ctx, 'layer_nf_1', kit.number, 74, 140);
    stamp(scene, ctx, 'layer_nf_2', kit.number, 98, 140);
    stamp(scene, ctx, 'drsuit_dr_hands', skin);
    slopeShoulders(ctx, 0x3a4e8a);
    scene.textures.addCanvas(key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  const c = scene.add.container(x, y);
  c.add(scene.add.image(0, 0, key).setOrigin(0));
  // Rosto: célula de 192 a 0.5 com o canto em (52, 9) → centro em (100, 57)
  c.add(new PlayerFace(scene, 52 + 48, 9 + 48, saveFace(), 0.5));
  // Gola da camisa e nó da gravata por cima do pescoço (a cabeça "veste" o terno)
  c.add(scene.add.image(0, 0, collarTexture(scene, team.colors.primary, 0x3a4e8a, getSave().face)).setOrigin(0));
  // Logo do time na jersey (ao lado do número)
  c.add(scene.add.image(100, 205, team.logo.small).setDisplaySize(26, 26));
  return c;
}

/**
 * Caimento dos ombros (trapézio): o paletó desce do pescoço até a ponta do ombro em vez de ter o topo
 * reto (com calombos). Apaga o que fica acima da linha, contorna a linha e preenche falhas embaixo dela.
 */
function slopeShoulders(ctx: CanvasRenderingContext2D, jacket: number) {
  const img = ctx.getImageData(0, 0, 200, 110);
  const d = img.data;
  const fill = [(jacket >> 16) & 255, (jacket >> 8) & 255, jacket & 255];
  const at = (x: number, y: number) => (y * 200 + x) * 4;
  // Topo do paletó em cada coluna: perto do pescoço em y 84, na ponta do ombro (|dx| 46) em y 96
  const top = (x: number) => 84 + Math.round(Math.min(1, Math.max(0, (Math.abs(x - 99.5) - 16) / 30)) * 12) & ~1;
  for (let x = 0; x < 200; x++) {
    if (Math.abs(x - 99.5) < 16) continue; // pescoço e gola: não mexe
    const t = top(x);
    // Só mexe nas colunas que têm paletó logo abaixo da linha
    let has = false;
    for (let y = t; y < 106; y++) if (d[at(x, y) + 3] > 0) has = true;
    if (!has) continue;
    for (let y = 60; y < t; y++) d[at(x, y) + 3] = 0;
    for (let y = t; y < t + 10; y++) {
      const i = at(x, y);
      if (d[i + 3] === 0) {
        [d[i], d[i + 1], d[i + 2], d[i + 3]] = [...fill, 255];
      }
    }
    for (let y = t; y < t + 2; y++) {
      const i = at(x, y);
      [d[i], d[i + 1], d[i + 2], d[i + 3]] = [13, 13, 18, 255];
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Gola da camisa por cima do pescoço (vai depois do rosto): as duas pontas brancas abraçando o pescoço,
 * a faixa da gola subindo dos lados, o nó da gravata no meio, a gola do paletó atrás e a sombra embaixo
 * do queixo. Desenhado com caminhos e depois "pixelado" (sem semitransparência nas bordas).
 */
export function collarTexture(scene: Phaser.Scene, tie: number, jacket: number, face: number) {
  const shape = SHAPE[((face % SHAPE.length) + SHAPE.length) % SHAPE.length];
  const key = `draft_collar2_${tie}_${jacket}_${shape}`;
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas');
  cv.width = 200;
  cv.height = 120;
  const ctx = cv.getContext('2d')!;
  const poly = (pts: [number, number][], fill: string, stroke = '#0D0D12') => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  };
  const mirror = (pts: [number, number][]) => pts.map(([x, y]) => [200 - x, y] as [number, number]);
  // Bordas reais do pescoço deste rosto, linha a linha (lidas do sprite da cabeça): a gola e o paletó
  // são desenhados colados nelas, então não sobra fundo aparecendo entre o pescoço e a roupa
  const edges = neckEdges(scene, shape);
  const jk = hex(jacket);
  for (let y = 86; y < 104; y += 2) {
    const e = edges(y);
    if (!e) continue;
    const out = Math.min(22, 6 + Math.round((y - 86) * 1.5)); // paletó: largura sobe com o caimento do ombro
    for (const side of [-1, 1]) {
      const edge = side < 0 ? e.l : e.r;
      const at = (d: number, w: number) => (side < 0 ? edge - d - w : edge + d + 1);
      // Gola do paletó (fora) → contorno → faixa branca da gola (encostada no pescoço)
      ctx.fillStyle = jk;
      ctx.fillRect(at(6, out), y, out, 2);
      ctx.fillStyle = '#0D0D12';
      ctx.fillRect(at(4, 2), y, 2, 2);
      ctx.fillStyle = y < 90 ? '#F4F1E8' : '#E2E4EA';
      ctx.fillRect(at(0, 4), y, 4, 2);
    }
  }
  // Contorno de cima da faixa da gola e sombra do queixo no alto do pescoço
  const top = edges(86);
  if (top) {
    ctx.fillStyle = '#0D0D12';
    ctx.fillRect(top.l - 6, 84, 6, 2);
    ctx.fillRect(top.r + 1, 84, 6, 2);
    ctx.fillStyle = 'rgba(60,30,10,0.28)';
    ctx.fillRect(top.l + 1, 84, top.r - top.l - 1, 4);
  }
  // Pontas da gola (caem em direção ao centro, por cima do pescoço)
  const pt: [number, number][] = [[87, 89], [100, 96], [95, 107], [86, 99]];
  poly(pt, '#F4F1E8');
  poly(mirror(pt), '#F4F1E8');
  // Sombra embaixo das pontas
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(88, 100, 6, 3);
  ctx.fillRect(106, 100, 6, 3);
  // Nó da gravata
  poly([[96, 96], [104, 96], [102, 104], [98, 104]], hex(tie));
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(97, 97, 2, 3);
  // Sem semitransparência: cada pixel é cheio ou vazio (pixel art)
  const img = ctx.getImageData(0, 0, 200, 120);
  for (let i = 3; i < img.data.length; i += 4) {
    const a = img.data[i];
    if (a === 0) continue;
    // Sombras (fracas de propósito) ficam; bordas suavizadas viram cheias
    if (a > 110) img.data[i] = 255;
    else if (a < 40) img.data[i] = 0;
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/**
 * Bordas esquerda/direita do pescoço (px da figura) numa linha `y`, lidas do sprite da cabeça do
 * formato `shape` (célula de 192 posta a 0.5 com o canto em (52, 9), como em todas as figuras de terno).
 * Abaixo do fim do pescoço repete a última linha encontrada.
 */
function neckEdges(scene: Phaser.Scene, shape: number) {
  const src = scene.textures.get(faceCell(scene, 'heads', shape)).getSourceImage() as HTMLCanvasElement;
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const x2 = c.getContext('2d')!;
  x2.drawImage(src, 0, 0);
  const d = x2.getImageData(0, 0, 192, 192).data;
  let last: { l: number; r: number } | null = null;
  const rows = new Map<number, { l: number; r: number } | null>();
  for (let y = 80; y < 110; y++) {
    const cy = Math.min(191, (y - 9) * 2);
    let l = -1;
    let r = -1;
    for (let cx = 0; cx < 192; cx++) {
      if (d[(cy * 192 + cx) * 4 + 3] > 0) {
        if (l < 0) l = cx;
        r = cx;
      }
    }
    if (l >= 0) last = { l: Math.floor(52 + l / 2), r: Math.ceil(52 + r / 2) };
    rows.set(y, last);
  }
  return (y: number) => rows.get(y) ?? last;
}

function shade(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f);
  const g = Math.min(255, ((c >> 8) & 255) * f);
  const b = Math.min(255, (c & 255) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
