import Phaser from 'phaser';
import { addCanvasTex } from '../systems/perf';

/*
 * Rosto em sprite (grade 48 px ×4 = células de 192). Um único componente usado em todas as telas
 * (criação, confirmação, Draft, capacete), então o rosto é idêntico em qualquer lugar.
 * As sheets são fatiadas em texturas pequenas sob demanda (sheets de 9216 px passam do limite de
 * textura de alguns celulares).
 */

export const CELL = 192;

/** 8 tons de pele (índice 5 = padrão do jogador novo). */
export const SKINS = [0xf5d5b8, 0xeac29b, 0xd9a67a, 0xc68b5c, 0xa86b3f, 0x8d5524, 0x6b3e1c, 0x4a2a14];
/** 7 cores de cabelo/barba (índice 0 = padrão). */
export const HAIR_COLORS = [0x15110f, 0x3a2414, 0x6b4423, 0xa8742f, 0xd9b45c, 0x8a8a8a, 0xb5301f];
export const HAIR_COUNT = 31;
export const BEARD_COUNT = 12;
export const FACE_COUNT = 20;
/** Formato de cabeça de cada rosto. */
export const SHAPE = [0, 1, 2, 3, 1, 0, 0, 1, 2, 3, 0, 1, 2, 0, 3, 1, 0, 2, 3, 1];

export interface FaceLook {
  face: number;
  skin: number;
  /** -1 = sem cabelo */
  hair: number;
  hairColor: number;
  /** -1 = sem barba */
  beard: number;
  /** Cor de cabelo/barba fora da paleta (ex.: grisalho do comissário); senão usa HAIR_COLORS[hairColor]. */
  hairTint?: number;
  /** Tom de pele fora da paleta; senão usa SKINS[skin]. */
  skinTint?: number;
}

/** Recorta a célula `i` de uma sheet (faces/<sheet>.png) numa textura própria, com cache. */
export function faceCell(scene: Phaser.Scene, sheet: string, i: number): string {
  const key = `fc_${sheet}_${i}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get(`face_${sheet}`).getSourceImage() as HTMLImageElement;
  const cv = document.createElement('canvas');
  cv.width = cv.height = CELL;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, i * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
  const tex = addCanvasTex(scene, key, cv)!;
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/** Ombros do jogador (faces/body.png) pintados com as cores da faculdade: verde → principal, dourado → secundária. */
export function bustTexture(scene: Phaser.Scene, primary: number, secondary: number): string {
  const key = `bust_${primary}_${secondary}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get('face_body').getSourceImage() as HTMLImageElement;
  const cv = document.createElement('canvas');
  cv.width = cv.height = CELL;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, CELL, CELL);
  const d = img.data;
  const rgb = (n: number): [number, number, number] => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const dark = (n: number): [number, number, number] => rgb(n).map((v) => Math.round(v * 0.68)) as [number, number, number];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let c: [number, number, number] | null = null;
    if (r === 46 && g === 125 && b === 79) c = rgb(primary);
    else if (r === 30 && g === 88 && b === 54) c = dark(primary);
    else if (r === 232 && g === 197 && b === 71) c = rgb(secondary);
    if (c) [d[i], d[i + 1], d[i + 2]] = c;
  }
  ctx.putImageData(img, 0, 0);
  addCanvasTex(scene, key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

export class PlayerFace extends Phaser.GameObjects.Container {
  private parts: Phaser.GameObjects.Image[] = [];
  private look: FaceLook;

  /** `scale` 1 = célula de 192 px. Capacete: 0.375 sobre o corpo de 150 px; Draft: 0.5. */
  constructor(scene: Phaser.Scene, x: number, y: number, look: FaceLook, scale = 1, private bust?: [number, number]) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setScale(scale);
    this.look = look;
    this.build();
  }

  /** Mostra os ombros com as cores da faculdade (ou tira, com undefined). */
  setBust(colors?: [number, number]) {
    this.bust = colors;
    this.build();
  }

  /** Troca o visual (qualquer campo) e refaz as camadas. */
  setLook(patch: Partial<FaceLook>) {
    this.look = { ...this.look, ...patch };
    this.build();
  }

  private build() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    const { face, skin, hair, hairColor, beard } = this.look;
    const shape = SHAPE[((face % FACE_COUNT) + FACE_COUNT) % FACE_COUNT];
    const hc = this.look.hairTint ?? HAIR_COLORS[hairColor % HAIR_COLORS.length];
    const layer = (sheet: string, i: number, tint?: number) => {
      const img = this.scene.add.image(0, 0, faceCell(this.scene, sheet, i)).setOrigin(0.5);
      if (tint !== undefined) img.setTint(tint);
      this.add(img);
      this.parts.push(img);
    };
    if (this.bust) {
      const img = this.scene.add.image(0, 0, bustTexture(this.scene, this.bust[0], this.bust[1])).setOrigin(0.5);
      this.add(img);
      this.parts.push(img);
    }
    layer('heads', shape, this.look.skinTint ?? SKINS[skin % SKINS.length]);
    layer('features', face);
    layer('facial', face, hc);
    if (beard >= 0) layer('beards', shape * BEARD_COUNT + (beard % BEARD_COUNT), hc);
    // hair -1 = sem cabelo (dentro do capacete o cabelo vem da camada hair_* do corpo)
    if (hair >= 0) {
      layer('hairmask', hair, hc);
      layer('hairshade', hair);
    }
  }
}
