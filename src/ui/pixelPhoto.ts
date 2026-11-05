import Phaser from 'phaser';
import { addCanvasTex } from '../systems/perf';

/*
 * Foto do estádio pixelizada (estilo do jogo): recorta o centro da foto na proporção pedida, reduz
 * para poucos pixels e mostra ampliada sem suavização. Textura em cache.
 */
export function pixelPhoto(scene: Phaser.Scene, src: string, w: number, h: number, cols = 44): string {
  const rows = Math.max(1, Math.round((cols * h) / w));
  const key = `px_${src}_${cols}x${rows}`;
  if (scene.textures.exists(key)) return key;
  const img = scene.textures.get(src).getSourceImage() as HTMLImageElement;
  const iw = img.width;
  const ih = img.height;
  // recorte central na proporção w:h
  const want = w / h;
  let sw = iw;
  let sh = ih;
  if (iw / ih > want) sw = ih * want;
  else sh = iw / want;
  const cv = document.createElement('canvas');
  cv.width = cols;
  cv.height = rows;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cols, rows);
  // poucas cores: arredonda os canais (cara de pixel art)
  const d = ctx.getImageData(0, 0, cols, rows);
  for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(d.data[i + k] / 24) * 24;
  ctx.putImageData(d, 0, 0);
  addCanvasTex(scene, key, cv)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}
