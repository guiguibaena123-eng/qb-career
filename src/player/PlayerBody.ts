import Phaser from 'phaser';
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

/** Desenha uma camada tingida (multiply) no contexto, na posição dada. */
function stamp(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, name: string, tint: number, dx = 0, dy = 0, alpha = 1) {
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
  ctx.globalAlpha = alpha;
  ctx.drawImage(tmp, dx, dy);
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
  for (const [name, tint, alpha] of layers) {
    // Números ficam nas posições de arte: dois dígitos x=[37,49], um dígito x=43, y=58 (a 2×)
    const m = /^(nf|no)_(\d)$/.exec(name);
    if (m && digits !== undefined) {
      const idx = layers.filter(([n]) => n.startsWith(m[1] + '_')).findIndex(([n]) => n === name);
      const x = digits === 1 ? 43 : [37, 49][idx];
      stamp(scene, ctx, name, tint, x * 2, 58 * 2, alpha);
    } else stamp(scene, ctx, name, tint, 0, 0, alpha);
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
    this.faceObj = new PlayerFace(scene, 0, -BODY_H * BODY_SCALE + FACE_CY, { ...cfg.face, hair: -1 }, FACE_SCALE);
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
    const skinHex = face.skinTint ?? SKINS[face.skin % SKINS.length];
    const hairHex = face.hairTint ?? HAIR_COLORS[face.hairColor % HAIR_COLORS.length];
    this.bg.setTexture(composite(this.scene, baseLayers(skinHex)));
    this.fg.setTexture(composite(this.scene, topLayers(look, kit, number, hairHex), String(number).length));
    // Dentro do capacete o rosto vai sem o cabelo em sprite (o cabelo para fora é a camada hair_*)
    this.faceObj.setLook({ ...face, hair: -1 });
  }
}
