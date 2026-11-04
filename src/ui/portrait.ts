import Phaser from 'phaser';
import { RES } from '../config';
import { PlayerFace, type FaceLook } from '../player/PlayerFace';

/*
 * Foto do jogador (retrato) numa textura própria, com cache: fundo na cor do time com luz de estúdio,
 * rosto + ombros nas cores do time, e os cantos arredondados recortados — nada passa da moldura.
 * Uma imagem só por foto (as listas longas ficam leves).
 */

export function portraitTexture(scene: Phaser.Scene, face: FaceLook, primary: number, secondary: number, size: number, shape: 'round' | 'slant' = 'round'): string {
  const S = Math.round(size * RES);
  const key = `ptr${shape === 'slant' ? 's' : ''}_${S}_${primary}_${secondary}_${face.face}_${face.skin}_${face.hair}_${face.hairColor}_${face.beard}`;
  if (scene.textures.exists(key)) return key;
  const dt = scene.textures.addDynamicTexture(key, S, S)!;
  const r = Math.round(S * 0.24);
  // Fundo
  const bg = scene.make.graphics({}, false);
  bg.fillStyle(primary, 1);
  bg.fillRect(0, 0, S, S);
  bg.fillStyle(0xffffff, 0.12);
  bg.fillRect(0, 0, S, S * 0.45);
  bg.fillStyle(0x0a0c1a, 0.28);
  bg.fillRect(0, S * 0.62, S, S * 0.38);
  dt.draw(bg);
  // Rosto e ombros
  const f = new PlayerFace(scene, S / 2, S / 2, face, S / 192, [secondary, primary]);
  dt.draw(f);
  f.destroy();
  bg.destroy();
  // Recorta os 4 cantos (fora do arco) ou, no estilo de transmissão, as duas pontas na diagonal
  const cut = scene.make.graphics({}, false);
  cut.fillStyle(0xffffff, 1);
  if (shape === 'slant') {
    const s = Math.min(S * 0.2126, 12 * RES);
    cut.fillTriangle(0, 0, s, 0, 0, S);
    cut.fillTriangle(S, 0, S, S, S - s, S);
    dt.erase(cut);
    cut.destroy();
    return key;
  }
  const corner = (cx: number, cy: number, a0: number) => {
    const pts: Phaser.Math.Vector2[] = [];
    const ox = cx === 0 ? 0 : S;
    const oy = cy === 0 ? 0 : S;
    pts.push(new Phaser.Math.Vector2(ox, oy));
    const ax = cx === 0 ? r : S - r;
    const ay = cy === 0 ? r : S - r;
    for (let i = 0; i <= 10; i++) {
      const a = a0 + (i / 10) * (Math.PI / 2);
      pts.push(new Phaser.Math.Vector2(ax + Math.cos(a) * r, ay + Math.sin(a) * r));
    }
    cut.fillPoints(pts, true);
  };
  corner(0, 0, Math.PI);
  corner(S, 0, -Math.PI / 2);
  corner(S, S, 0);
  corner(0, S, Math.PI / 2);
  dt.erase(cut);
  cut.destroy();
  return key;
}

/** Retrato pronto em (x, y) (canto de cima), com sombra e moldura. Devolve os objetos criados. */
export function portrait(scene: Phaser.Scene, x: number, y: number, size: number, face: FaceLook, primary: number, secondary: number, ring?: number) {
  const r = Math.round(size * 0.24);
  const sh = scene.add.graphics();
  sh.fillStyle(0x000000, 0.3);
  sh.fillRoundedRect(x, y + 3, size, size, r);
  const img = scene.add.image(x, y, portraitTexture(scene, face, primary, secondary, size)).setOrigin(0).setDisplaySize(size, size);
  const o = scene.add.graphics();
  o.lineStyle(ring ? 2 : 1, ring ?? 0xffffff, ring ? 1 : 0.22);
  o.strokeRoundedRect(x, y, size, size, r);
  return [sh, img, o] as const;
}
