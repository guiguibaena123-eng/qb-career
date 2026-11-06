import Phaser from 'phaser';
import { addCanvasTex } from '../systems/perf';
import type { KitDef } from '../data/TeamRepository';
import type { LookOptions } from './PlayerSave';
import { HAIR_COLORS, PlayerFace, SKINS, type FaceLook } from './PlayerFace';

/*
 * Corpo do jogador em camadas cinza tingidas (multiply) e compostas num canvas, que fica em cache:
 * só recompõe quando o visual muda. Duas texturas: a base (sombra e pele, abaixo do rosto) e o resto
 * (uniforme, acessórios e capacete, acima do rosto). O rosto é o PlayerFace compartilhado, no meio das duas.
 * Camadas 200×400 (arte 100×200 a 2×), exibidas a 1.5× → 150×300.
 */

export const BODY_W = 200;
export const BODY_H = 400;
export const BODY_SCALE = 0.75; // 200×400 → 150×300
/** Rosto dentro do capacete: escala 0.375, canto em (39, 7) sobre o corpo de 150×300 → centro (75, 43). */
const FACE_SCALE = 0.375;
const FACE_CY = 7 + (192 * FACE_SCALE) / 2;

const WHITE = 0xffffff;
const EYEBLACK = 0x15110f;
/** Viseiras: cor e opacidade (como no design). */
const VISOR: Record<Exclude<LookOptions['visor'], 'none'>, [number, number]> = {
  clear: [0xcfe6ff, 0.16],
  smoke: [0x1b1f33, 0.68],
  mirror: [0xc9a93a, 0.6],
  amber: [0xff9a3c, 0.48],
  blue: [0x3f7fd8, 0.55],
};

type Layer = [name: string, tint: number, alpha?: number];

const key = (s: string) => `layer_${s}`;

function shade(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f);
  const g = Math.min(255, ((c >> 8) & 255) * f);
  const b = Math.min(255, (c & 255) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Camadas abaixo do rosto: só sombra e pele (o rosto em sprite fica logo acima, como no design). */
function baseLayers(skin: number): Layer[] {
  return [
    ['shadow', WHITE],
    ['skin', skin],
  ];
}

/**
 * Camadas acima do rosto, de baixo para cima (mesma ordem do design). Cores do uniforme vêm do kit
 * (travado); as dos acessórios vêm do LookOptions.
 */
function topLayers(look: LookOptions, kit: KitDef, num: number, hairColor: number): Layer[] {
  const L: Layer[] = [];
  const on = (v: string) => v !== 'none';
  if (on(look.eyeblack)) L.push([`eyeblack_${look.eyeblack}`, EYEBLACK]);
  L.push(['pads', WHITE]);
  L.push([`sock_${look.sock}`, look.sockC]);
  if (on(look.sstripe)) L.push([`sstripe_${look.sstripe}_${look.sock}`, look.sstripeC]);
  L.push([`cleat_${look.cleats}`, look.cleatC]);
  if (on(look.cacc)) L.push([`cacc_${look.cacc}_${look.cleats}`, look.caccC]);
  L.push([`pants_${look.pants}`, kit.pants], [`pstripe_${kit.pstripe ?? 'side1'}_${look.pants}`, kit.stripe]);
  if (on(look.knee)) L.push([`knee_${look.pants}`, look.kneeC]);
  if (on(look.under)) L.push([`under_${look.under}`, look.underC]);
  if (on(look.asl)) L.push([`asl_${look.asl}`, look.aslC]);
  L.push([`jersey_${look.jerseyLen}`, kit.jersey], ['yoke', kit.stripe], ['sleeve_2', kit.stripe]);
  // Número 12: contornos e depois preenchimentos (dois dígitos x=[37,49], um dígito x=43, y=58 na arte)
  const digits = String(num).split('');
  const outline = kit.outline ?? shade(kit.jersey, 0.45);
  digits.forEach((d) => L.push([`no_${d}`, outline]));
  digits.forEach((d) => L.push([`nf_${d}`, kit.number]));
  L.push(['collar_v', kit.stripe]);
  if (on(look.towel)) L.push([`towel_${look.towel}`, look.towelC]);
  if (on(look.gloves)) L.push([`glove_${look.gloves}`, look.gloveC]);
  if (on(look.wrist)) {
    L.push([`wrist_${look.wrist}`, look.wristC]);
    if (look.wrist === 'P') L.push(['wrist_Pcard', WHITE]);
  }
  if (on(look.nroll)) L.push([`nroll_${look.nroll}`, look.nrollC]);
  if (on(look.hairOut)) L.push([`hair_${look.hairOut}`, hairColor]);
  if (on(look.mouth)) L.push([`mouth_${look.mouth}`, look.mouthC]);
  // Capacete (cor, faixa e escudo do time)
  L.push([`helmet_${look.helmet}`, kit.helmet], ['hstripe_center', kit.stripe], ['decal_shield', kit.stripe], ['hdet', WHITE]);
  if (look.gloss) L.push(['hgloss', WHITE]);
  if (look.visor !== 'none') {
    const [c, a] = VISOR[look.visor];
    L.push(['visor', c, a]);
  }
  L.push([`mask_${look.mask}`, look.maskC], [`chin_${look.chin}`, look.chinC]);
  return L;
}

/**
 * Camada recortada só na área com pixels. As camadas são 200×400, mas quase todo acessório ocupa um
 * canto pequeno: tingir e desenhar só o recorte deixa cada troca no PERSONALIZAR bem mais rápida.
 */
const crops = new Map<string, { cv: HTMLCanvasElement; x: number; y: number } | null>();
function crop(scene: Phaser.Scene, name: string) {
  if (crops.has(name)) return crops.get(name)!;
  const img = scene.textures.get(key(name)).getSourceImage() as HTMLImageElement;
  const full = document.createElement('canvas');
  full.width = img.width;
  full.height = img.height;
  const fc = full.getContext('2d', { willReadFrequently: true })!;
  fc.drawImage(img, 0, 0);
  // Caixa dos pixels visíveis: lê 4 bytes por vez (Uint32) e para cada busca assim que acha a borda
  const W = img.width;
  const H = img.height;
  const px = new Uint32Array(fc.getImageData(0, 0, W, H).data.buffer);
  const A = 0xff000000; // canal alfa (little-endian: RGBA → 0xAABBGGRR)
  const rowHas = (y: number) => {
    for (let i = y * W, e = i + W; i < e; i++) if (px[i] & A) return true;
    return false;
  };
  let y0 = 0;
  while (y0 < H && !rowHas(y0)) y0++;
  let y1 = H - 1;
  while (y1 >= y0 && !rowHas(y1)) y1--;
  let x0 = W, x1 = -1;
  for (let y = y0; y <= y1; y++) {
    const r = y * W;
    for (let x = 0; x < x0; x++) if (px[r + x] & A) { x0 = x; break; }
    for (let x = W - 1; x > x1; x--) if (px[r + x] & A) { x1 = x; break; }
  }
  if (y0 >= H) x1 = -1;
  let r: { cv: HTMLCanvasElement; x: number; y: number } | null = null;
  if (x1 >= 0) {
    const cv = document.createElement('canvas');
    cv.width = x1 - x0 + 1;
    cv.height = y1 - y0 + 1;
    cv.getContext('2d')!.drawImage(full, x0, y0, cv.width, cv.height, 0, 0, cv.width, cv.height);
    r = { cv, x: x0, y: y0 };
  }
  crops.set(name, r);
  return r;
}

/** Recortes já tingidos (cada cor de cada peça), com limite: os mais antigos saem. */
const tinted = new Map<string, HTMLCanvasElement>();
function tintedCrop(src: HTMLCanvasElement, name: string, tint: number) {
  if (tint === 0xffffff) return src;
  const k = `${name}|${tint}`;
  const hit = tinted.get(k);
  if (hit) {
    tinted.delete(k);
    tinted.set(k, hit);
    return hit;
  }
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const t = cv.getContext('2d')!;
  t.drawImage(src, 0, 0);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
  t.fillRect(0, 0, cv.width, cv.height);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(src, 0, 0);
  tinted.set(k, cv);
  if (tinted.size > 240) tinted.delete(tinted.keys().next().value!);
  return cv;
}

/** Desenha uma camada tingida (multiply) no contexto, na posição dada. */
function stamp(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, name: string, tint: number, dx = 0, dy = 0, alpha = 1) {
  if (!scene.textures.exists(key(name))) return;
  const c = crop(scene, name);
  if (!c) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(tintedCrop(c.cv, name, tint), dx + c.x, dy + c.y);
  ctx.globalAlpha = 1;
}

/** Textura em cache de uma lista de camadas (a chave identifica o conteúdo). */
function composite(scene: Phaser.Scene, layers: Layer[], digits?: number): string {
  const k = `pb_${layers.map((l) => l.join(':')).join('|')}`;
  if (scene.textures.exists(k)) return k;
  const cv = document.createElement('canvas');
  cv.width = BODY_W;
  cv.height = BODY_H;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const seen: Record<string, number> = {};
  for (const [name, tint, alpha] of layers) {
    // Números ficam nas posições de arte: dois dígitos x=[37,49], um dígito x=43, y=58 (a 2×)
    const m = /^(nf|no)_(\d)$/.exec(name);
    if (m && digits !== undefined) {
      const idx = (seen[m[1]] = (seen[m[1]] ?? -1) + 1); // ordem de aparição (funciona com dígitos repetidos: 11, 22...)
      const x = digits === 1 ? 43 : [37, 49][idx];
      stamp(scene, ctx, name, tint, x * 2, 58 * 2, alpha);
    } else stamp(scene, ctx, name, tint, 0, 0, alpha);
  }
  addCanvasTex(scene, k, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return k;
}

/*
 * Memória das texturas compostas: cada combinação de visual vira uma textura 200×400. Conta quantos
 * corpos usam cada uma; as que ninguém usa ficam guardadas (as 40 mais recentes, para DESFAZER e voltar
 * ao visual anterior serem instantâneos) e as mais antigas são apagadas.
 */
const refs = new Map<string, number>();
const idle = new Set<string>();
function retain(k: string) {
  refs.set(k, (refs.get(k) ?? 0) + 1);
  idle.delete(k);
}
function release(scene: Phaser.Scene, k: string | null) {
  if (!k) return;
  const n = (refs.get(k) ?? 1) - 1;
  if (n > 0) return void refs.set(k, n);
  refs.delete(k);
  idle.add(k);
  while (idle.size > 40) {
    const old = idle.values().next().value!;
    idle.delete(old);
    if (scene.textures.exists(old)) scene.textures.remove(old);
  }
}

export interface BodyLook {
  look: LookOptions;
  kit: KitDef;
  face: FaceLook;
  number: number;
}

export class PlayerBody extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Image;
  private fg!: Phaser.GameObjects.Image;
  private faceObj!: PlayerFace;
  private cfg: BodyLook;
  private keys: [string | null, string | null] = [null, null];

  /** (x, y) é o centro dos pés/base do corpo; a caixa fica 150×300 com `scale` 1. */
  constructor(scene: Phaser.Scene, x: number, y: number, cfg: BodyLook, scale = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this.cfg = cfg;
    this.bg = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setScale(BODY_SCALE);
    this.faceObj = new PlayerFace(scene, 0, -BODY_H * BODY_SCALE + FACE_CY, { ...cfg.face, hair: -1 }, FACE_SCALE);
    this.fg = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setScale(BODY_SCALE);
    this.add([this.bg, this.faceObj, this.fg]);
    this.setScale(scale);
    this.refresh();
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.keys.forEach((k) => release(scene, k));
      this.keys = [null, null];
    });
  }

  /** Troca qualquer parte do visual; só recompõe o que mudou (o resto vem do cache). */
  setLook(patch: Partial<BodyLook>) {
    this.cfg = { ...this.cfg, ...patch, look: { ...this.cfg.look, ...(patch.look ?? {}) } };
    this.refresh();
  }

  private refresh() {
    const { look, kit, face, number } = this.cfg;
    const skinHex = face.skinTint ?? SKINS[face.skin % SKINS.length];
    const hairHex = face.hairTint ?? HAIR_COLORS[face.hairColor % HAIR_COLORS.length];
    const kb = composite(this.scene, baseLayers(skinHex));
    const kf = composite(this.scene, topLayers(look, kit, number, hairHex), String(number).length);
    // troca primeiro (a textura antiga só pode sair da memória depois que ninguém a mostra)
    this.bg.setTexture(kb);
    this.fg.setTexture(kf);
    const [ob, of] = this.keys;
    retain(kb);
    retain(kf);
    this.keys = [kb, kf];
    release(this.scene, ob);
    release(this.scene, of);
    // Dentro do capacete o rosto vai sem o cabelo em sprite (o cabelo para fora é a camada hair_*)
    this.faceObj.setLook({ ...face, hair: -1 });
  }
}
