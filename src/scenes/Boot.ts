import Phaser from 'phaser';
import { GAME_H, GAME_W, logoKey } from '../config';
import { TEAM_LIST } from '../data/teams';
import { queueCareerAssets, sharpenCareerAssets } from '../systems/careerAssets';
import { setupHiRes } from '../systems/hires';

/** Carrega as logos dos 32 times (tamanhos s, m e l) e abre o menu. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    setupHiRes(this);
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    const bar = this.add.graphics();
    const txt = this.add.text(GAME_W / 2, GAME_H / 2 - 30, 'CARREGANDO...', { fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#C9CEE0' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => {
      bar.clear();
      bar.fillStyle(0x0d0d12, 1);
      bar.fillRect(GAME_W / 2 - 82, GAME_H / 2 - 6, 164, 16);
      bar.fillStyle(0xffd23f, 1);
      bar.fillRect(GAME_W / 2 - 80, GAME_H / 2 - 4, 160 * p, 12);
    });
    this.load.once('complete', () => txt.setText('PRONTO'));
    for (const t of TEAM_LIST) for (const s of ['s', 'm', 'l'] as const) this.load.image(logoKey(t.id, s), `${base}logos/${t.id}_${s}.png`);
    queueCareerAssets(this, base);
    // Draft: palco exatamente como no design
    for (const k of ['stage', 'stage_party']) this.load.image(`draftimg_${k}`, `${base}assets/draft/${k}.png`);
  }

  create() {
    // Imagens pequenas ficam mais nítidas com filtro linear; as grandes também (reduzidas pela GPU)
    sharpenCareerAssets(this);
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('draftimg_')) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const q = new URLSearchParams(location.search);
    // ?draft=Espera|Telefone|Anuncio|Escolhido abre direto numa tela do Draft
    this.scene.start(q.has('carreiratest') ? 'CareerTest' : q.get('draft') ? `Draft${q.get('draft')}` : q.get('combine') ? q.get('combine')! :q.has('criar') ? 'CareerCreate' : q.has('hub') ? 'CareerHub' : q.has('jogadortest') ? 'PlayerTest' : 'MainMenu');
  }
}
