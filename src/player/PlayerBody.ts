import Phaser from 'phaser';
import type { KitDef } from '../data/TeamRepository';
import type { LookOptions } from './PlayerSave';
import { PlayerFace, SKINS, type FaceLook } from './PlayerFace';

/*
 * Corpo do jogador em camadas cinza tingidas (multiply) e compostas num canvas, que fica em cache:
 * só recompõe quando o visual muda. Duas texturas: a base (abaixo do rosto) e o capacete (acima do
 * rosto). O rosto é o PlayerFace compartilhado, no meio das duas.
 * Camadas 200×400 (arte 100×200 a 2×), exibidas a 1.5× → 150×300.
 */

export const BODY_W = 200;
export const BODY_H = 400;
export const BODY_SCALE = 0.75; // 200×400 → 150×300
/** Rosto dentro do capacete: escala 0.375, canto em (39, 7) sobre o corpo de 150×300 → centro (75, 43). */
const FACE_SCALE = 0.375;
const FACE_CY = 7 + (192 * FACE_SCALE) / 2;

const WHITE = 0xf4f1e8;
const GRAY = 0xb8bccb;
const BLACK = 0x14141c;

type Layer = [name: string, tint: number];

const key = (s: string) => `layer_${s}`;

function shade(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f);
  const g = Math.min(255, ((c >> 8) & 255) * f);
  const b = Math.min(255, (c & 255) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Camadas de baixo do rosto (corpo, uniforme, número), de baixo para cima. */
function baseLayers(look: LookOptions, kit: KitDef, skin: number, num: number): Layer[] {
  const L: Layer[] = [
    ['shadow', 0xffffff],
    ['skin', skin],
    ['pads', shade(kit.jersey, 0.8)],
    [`pants_${look.pants}`, kit.pants],
    [`pstripe_side1_${look.pants}`, kit.stripe],
    [`knee_${look.pants === 'long' ? 'long' : look.pants === 'short' ? 'short' : 'reg'}`, shade(kit.pants, 0.85)],
    [`sock_${look.cleats}`, WHITE],
    [`sstripe_band_${look.cleats}`, kit.stripe],
    [`cleat_${look.cleats}`, BLACK],
    [`cacc_toe_${look.cleats}`, kit.stripe],
  ];
  if (look.under !== 'none') L.push([`under_${look.under}`, WHITE]);
  L.push([`jersey_${look.jerseyLen}`, kit.jersey], ['collar_v', kit.stripe], ['sleeve_2', kit.stripe], ['yoke', shade(kit.jersey, 0.88)]);
  // Número 12 (preenchimento + contorno): dois dígitos nas posições x=[37,49] (arte), y=58.
  return L.concat(numberLayers(num, kit));
}

function numberLayers(n: number, kit: KitDef): Layer[] {
  const out: Layer[] = [];
  const digits = String(n).split('');
  digits.forEach((d) => out.push([`nf_${d}`, kit.number], [`no_${d}`, shade(kit.jersey, 0.45)]));
  return out;
}

/** Camadas acima do rosto: luvas, toalha e capacete (cor da equipe). */
function topLayers(look: LookOptions, kit: KitDef): Layer[] {
  const L: Layer[] = [];
  if (look.gloves !== 'none') L.push([`glove_${look.gloves}`, kit.stripe], ['wrist_L', WHITE], ['wrist_R', WHITE]);
  if (look.towel) L.push(['towel_F', WHITE]);
  L.push([`helmet_${look.helmet}`, kit.helmet], ['hdet', kit.stripe]);
  if (look.gloss) L.push(['hgloss', 0xffffff]);
  L.push([`mask_${look.mask}`, GRAY]);
  if (look.visor) L.push(['visor', 0x8fd0ff]);
  L.push([`chin_${look.chin}`, GRAY]);
  if (look.eyeblack !== 'none') L.push([`eyeblack_${look.eyeblack}`, BLACK]);
  return L;
}

/** Desenha uma camada tingida (multiply) no contexto, na posição dada. */
function stamp(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, name: string, tint: number, dx = 0, dy = 0) {
  if (!scene.textures.exists(key(name))) return;
  const img = scene.textures.get(key(name)).getSourceImage() as HTMLImageElement;
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  const t = tmp.getContext('2d')!;
  t.drawImage(img, 0, 0);
  if (tint !== 0xffffff) {
    t.globalCompositeOperation = 'multiply';
    t.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
    t.fillRect(0, 0, tmp.width, tmp.height);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(img, 0, 0);
  }
  ctx.drawImage(tmp, dx, dy);
}

/** Textura em cache de uma lista de camadas (a chave identifica o conteúdo). */
function composite(scene: Phaser.Scene, id: string, layers: Layer[], digits?: number): string {
  const k = `pb_${id}`;
  if (scene.textures.exists(k)) return k;
  const cv = document.createElement('canvas');
  cv.width = BODY_W;
  cv.height = BODY_H;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (const [name, tint] of layers) {
    // Números ficam nas posições de arte: dois dígitos x=[37,49], um dígito x=43, y=58 (a 2×)
    const m = /^(nf|no)_(\d)$/.exec(name);
    if (m && digits !== undefined) {
      const idx = layers.filter(([n]) => n.startsWith(m[1] + '_')).findIndex(([n]) => n === name);
      const x = digits === 1 ? 43 : [37, 49][idx];
      stamp(scene, ctx, name, tint, x * 2, 58 * 2);
    } else stamp(scene, ctx, name, tint);
  }
  scene.textures.addCanvas(k, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return k;
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

  /** (x, y) é o centro dos pés/base do corpo; a caixa fica 150×300 com `scale` 1. */
  constructor(scene: Phaser.Scene, x: number, y: number, cfg: BodyLook, scale = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this.cfg = cfg;
    this.bg = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setScale(BODY_SCALE);
    this.faceObj = new PlayerFace(scene, 0, -BODY_H * BODY_SCALE + FACE_CY, cfg.face, FACE_SCALE);
    this.fg = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setScale(BODY_SCALE);
    this.add([this.bg, this.faceObj, this.fg]);
    this.setScale(scale);
    this.refresh();
  }

  /** Troca qualquer parte do visual; só recompõe o que mudou (o resto vem do cache). */
  setLook(patch: Partial<BodyLook>) {
    this.cfg = { ...this.cfg, ...patch, look: { ...this.cfg.look, ...(patch.look ?? {}) } };
    this.refresh();
  }

  private refresh() {
    const { look, kit, face, number } = this.cfg;
    const sk = face.skin;
    const skinHex = SKINS[sk % SKINS.length];
    const kc = `${kit.jersey}_${kit.number}_${kit.pants}_${kit.stripe}_${kit.helmet}`;
    const baseId = `b_${kc}_${sk}_${look.pants}_${look.cleats}_${look.under}_${look.jerseyLen}_${number}`;
    const topId = `t_${kc}_${look.gloves}_${look.towel}_${look.helmet}_${look.gloss}_${look.mask}_${look.visor}_${look.chin}_${look.eyeblack}`;
    this.bg.setTexture(composite(this.scene, baseId, baseLayers(look, kit, skinHex, number), String(number).length));
    this.fg.setTexture(composite(this.scene, topId, topLayers(look, kit)));
    this.faceObj.setLook(face);
  }
}
