import Phaser from 'phaser';

/*
 * Carregador dos assets da carreira (public/assets): camadas do corpo, rostos, figura de terno do Draft
 * e miniaturas de estádio. A lista de arquivos vem de assets/manifest.json (gerado a partir das pastas).
 * Chaves: layer_<nome>, face_<nome>, drsuit_<nome>, stad_<cidade> (ilustrações WebP, suavizadas).
 */

/** `ext`: formato dos arquivos (estádios são ilustrações em WebP); `smooth`: sem o filtro de pixel art. */
const GROUPS: Record<string, { dir: string; prefix: string; ext?: string; smooth?: boolean; lazy?: boolean }> = {
  layers: { dir: 'layers', prefix: 'layer_' },
  faces: { dir: 'faces', prefix: 'face_' },
  draft_suit: { dir: 'draft_suit', prefix: 'drsuit_' },
  // estádios: baixados só quando aparecem (ui/stadiumPhoto.ts loadStadium)
  stadiums: { dir: 'stadiums', prefix: 'stad_', ext: 'webp', smooth: true, lazy: true },
};

/** Chama no preload: lê o manifesto e enfileira todas as imagens. */
export function queueCareerAssets(scene: Phaser.Scene, base: string) {
  scene.load.image('logoLeague', `${base}assets/league_logo.png`);
  // QFL Bowl (a final): logo grande (campo) e pequena (listas)
  scene.load.image('logoQflBowl', `${base}assets/qfl_bowl.png`);
  scene.load.image('logoQflBowlS', `${base}assets/qfl_bowl_s.png`);
  // Fases dos playoffs: Round One (Wild Card), Round Two (Divisional), Semi Bowl (final de conferência)
  for (const [k, f] of [['logoPoR1', 'po_r1'], ['logoPoR2', 'po_r2'], ['logoPoSemi', 'po_semi']]) {
    scene.load.image(k, `${base}assets/${f}.png`);
    scene.load.image(`${k}S`, `${base}assets/${f}_s.png`);
  }
  scene.load.json('career-manifest', `${base}assets/manifest.json`);
  scene.load.once('filecomplete-json-career-manifest', (_k: string, _t: string, data: Record<string, string[]>) => {
    for (const [g, names] of Object.entries(data)) {
      const def = GROUPS[g];
      if (!def || def.lazy) continue;
      for (const n of names) scene.load.image(def.prefix + n, `${base}assets/${def.dir}/${n}.${def.ext ?? 'png'}`);
    }
  });
}

/** Deixa as texturas de pixel art nítidas (NEAREST). */
export function sharpenCareerAssets(scene: Phaser.Scene) {
  for (const def of Object.values(GROUPS)) {
    if (def.smooth) continue;
    for (const k of scene.textures.getTextureKeys()) if (k.startsWith(def.prefix)) scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

/** Quantas imagens de cada grupo foram carregadas (para a cena de teste). */
export function careerAssetCounts(scene: Phaser.Scene) {
  const keys = scene.textures.getTextureKeys();
  const out: Record<string, number> = {};
  for (const [g, def] of Object.entries(GROUPS)) out[g] = keys.filter((k) => k.startsWith(def.prefix)).length;
  return out;
}
