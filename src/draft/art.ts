import Phaser from 'phaser';
import { addCanvasTex } from '../systems/perf';
import type { CareerTeam } from '../data/TeamRepository';
import { getSave } from '../player/PlayerSave';
import { PlayerFace } from '../player/PlayerFace';
import { SKINS } from '../player/PlayerFace';

/*
 * Arte do Draft: o palco do QFL Draft é a imagem do design (public/assets/draft, carregada no Boot),
 * exibida ampliada e sem suavização. O comissário e o jogador de terno usam as camadas de
 * assets/draft_suit (geradas por tools/draft/suit.py) e rostos da base de rostos; as palmas do
 * comissário são quadros desenhados (mãos abertas → batida), nítidos em pixel art.
 */

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export const STAGE_W = 98;
export const STAGE_H = 212;

/** Palco (98×212 de arte, exibido a 4×). `party` = versão da escolha (serpentinas e balões). */
export function stageTexture(_scene: Phaser.Scene, _team: CareerTeam, party = false) {
  return party ? 'draftimg_stage_party' : 'draftimg_stage';
}

// ------------------------------------------------------------ figuras de terno

/** Cores do comissário: terno azul-marinho, calça mais escura, gravata da liga, pele clara. */
export const COMMISH = {
  jacket: 0x34467e,
  trousers: 0x232c50,
  shoes: 0x18181e,
  shirt: 0xf4f1e8,
  tie: 0xf26b1d,
  skin: 0xeac29b,
};

/** Poses dos braços (camadas s2_<pose>_* de tools/draft/suit.py). */
export type SuitPose = 'rest' | 'gest' | 'hold' | 'clap0' | 'clap1' | 'clap2' | 'clap3' | 'clap4';
export const CLAP_FRAMES: SuitPose[] = ['clap0', 'clap1', 'clap2', 'clap3', 'clap4'];
/** Onde as mãos se encontram na batida (px da figura 200×400). */
export const CLAP_MEET = { x: 100, y: 128 };

interface SuitColors {
  jacket: number;
  trousers: number;
  shoes: number;
  shirt: number;
  tie: number;
  skin: number;
}

/**
 * Figura de terno (200×400) numa pose: corpo (calça, sapatos, camisa, gravata, paletó, sombra no chão)
 * e os braços da pose, tudo das camadas em cinza tingidas com as cores dadas. `jersey` (só na pose
 * 'hold'): a jersey vai entre os braços e as mãos, com o número.
 */
function suitTexture(scene: Phaser.Scene, key: string, c: SuitColors, pose: SuitPose, jersey?: { body: number; trim: number; number: number; digits: string }) {
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas');
  cv.width = 200;
  cv.height = 400;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const L: [string, number][] = [
    ['drsuit_s2_det', 0xffffff],
    ['drsuit_s2_trou', c.trousers],
    ['drsuit_s2_shoes', c.shoes],
    ['drsuit_s2_shirt', c.shirt],
    ['drsuit_s2_tie', c.tie],
    ['drsuit_s2_jacket', c.jacket],
    [`drsuit_s2_${pose}_sleeve`, c.jacket],
    [`drsuit_s2_${pose}_cuff`, c.shirt],
  ];
  for (const [k, t] of L) stamp(scene, ctx, k, t);
  if (jersey) {
    stamp(scene, ctx, 'drsuit_s2_jersey', jersey.body);
    stamp(scene, ctx, 'drsuit_s2_jtrim', jersey.trim);
    // Número no peito (sprites 28×40 com o dígito em x 4..28), centralizado
    const ds = jersey.digits.split('');
    const x0 = 100 - (ds.length * 24) / 2 - 4;
    const out = shade(jersey.body, 0.45);
    ds.forEach((n, i) => stamp(scene, ctx, `layer_no_${n}`, out, x0 + i * 24, 136));
    ds.forEach((n, i) => stamp(scene, ctx, `layer_nf_${n}`, jersey.number, x0 + i * 24, 136));
  }
  stamp(scene, ctx, `drsuit_s2_${pose}_skin`, c.skin);
  addCanvasTex(scene, key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/** Corpo do comissário numa pose (sem o rosto, que vai por cima). */
export function commissionerBody(scene: Phaser.Scene, pose: SuitPose) {
  return suitTexture(scene, `draft_commish6_${pose}`, COMMISH, pose);
}

/** Luminância (0..1) de uma cor, para escolher o terno que contrasta com a jersey. */
function lum(c: number) {
  return (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255;
}

/**
 * Jogador de terno segurando a jersey do time pelos ombros (número do save e logo), com o rosto do
 * save (PlayerFace a 0.5) e a gola por cima. Jersey escura → terno cinza claro; clara → grafite.
 * (x, y) = canto de cima.
 */
export function suitFigure(scene: Phaser.Scene, x: number, y: number, team: CareerTeam) {
  const s = getSave();
  const kit = team.kits.home;
  const light = lum(kit.jersey) < 0.42;
  const suit = light ? { jacket: 0xaeb3bf, trousers: 0x8f95a3 } : { jacket: 0x3b3f4c, trousers: 0x2b2f3a };
  const digits = String(Math.max(0, Math.min(99, s.number ?? 12)));
  const key = `draft_suit6_${team.id}_${s.skin}_${digits}`;
  const colors = { ...suit, shoes: 0x18181e, shirt: 0xf4f1e8, tie: team.colors.primary, skin: SKINS[s.skin % SKINS.length] };
  suitTexture(scene, key, colors, 'hold', { body: kit.jersey, trim: kit.stripe, number: kit.number, digits });
  const c = scene.add.container(x, y);
  c.add(scene.add.image(0, 0, key).setOrigin(0));
  // Rosto: célula de 192 a 0.5 com o canto em (52, 9) → centro em (100, 57)
  c.add(new PlayerFace(scene, 52 + 48, 9 + 48, saveFace(), 0.5));
  // Gola da camisa e nó da gravata por cima do pescoço (a cabeça "veste" o terno)
  c.add(scene.add.image(0, 0, collarTexture(scene, team.colors.primary)).setOrigin(0));
  // Logo do time na barra da jersey
  c.add(scene.add.image(100, 206, team.logo.small).setDisplaySize(22, 22));
  return c;
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
 * Gola da camisa e nó da gravata (vão depois do rosto, por cima do pescoço): camadas s2_collar e s2_knot
 * de tools/draft/suit.py, desenhadas junto com a linha do ombro do paletó (o pescoço é igual em todos
 * os rostos), então gola e ombros ficam contínuos.
 */
export function collarTexture(scene: Phaser.Scene, tie: number) {
  const key = `draft_collar3_${tie}`;
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas');
  cv.width = 200;
  cv.height = 120;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  stamp(scene, ctx, 'drsuit_s2_collar', 0xf4f1e8);
  stamp(scene, ctx, 'drsuit_s2_knot', tie);
  addCanvasTex(scene, key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

function shade(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f);
  const g = Math.min(255, ((c >> 8) & 255) * f);
  const b = Math.min(255, (c & 255) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
