import Phaser from 'phaser';
import { RES } from '../config';
import { addCanvasTex } from '../systems/perf';

/*
 * Ilustração do estádio recortada na proporção pedida (centro), na resolução da tela e com suavização
 * de qualidade (os estádios são desenhos em alta, não pixel art). Textura em cache.
 */
export function stadiumPhoto(scene: Phaser.Scene, src: string, w: number, h: number): string {
  const key = `ph_${src}_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const img = scene.textures.get(src).getSourceImage() as HTMLImageElement;
  const iw = img.width;
  const ih = img.height;
  const want = w / h;
  let sw = iw;
  let sh = ih;
  if (iw / ih > want) sw = ih * want;
  else sh = iw / want;
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * RES);
  cv.height = Math.round(h * RES);
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
  addCanvasTex(scene, key, cv)!.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/** Estádios são baixados só quando aparecem (cada ilustração tem ~190 KB; as 30 juntas pesariam na abertura). */
const loading = new Set<string>();

/** Pede a ilustração `key` (stad_<cidade>) e chama `done` quando ela estiver pronta. */
export function loadStadium(scene: Phaser.Scene, key: string, done: () => void) {
  if (scene.textures.exists(key)) return done();
  scene.textures.once(`${Phaser.Textures.Events.ADD_KEY}${key}`, done);
  if (loading.has(key)) return;
  loading.add(key);
  scene.load.image(key, `${import.meta.env.BASE_URL}assets/stadiums/${key.replace(/^stad_/, '')}.webp`);
  scene.load.once(`${Phaser.Loader.Events.FILE_LOAD_ERROR}`, () => loading.delete(key));
  scene.load.start();
}

/**
 * Lugar reservado para a ilustração do estádio (mantém a ordem de camadas): se já está baixada, monta na
 * hora; senão baixa e monta quando chegar, aparecendo com um fade curto. `build` recebe o container.
 */
export function stadiumSlot(scene: Phaser.Scene, key: string, build: (slot: Phaser.GameObjects.Container) => void) {
  const slot = scene.add.container(0, 0);
  const ready = scene.textures.exists(key);
  loadStadium(scene, key, () => {
    if (!slot.active || !slot.scene) return;
    build(slot);
    if (!ready) {
      slot.setAlpha(0);
      scene.tweens.add({ targets: slot, alpha: 1, duration: 260, ease: 'Quad.Out' });
    }
  });
  return slot;
}
