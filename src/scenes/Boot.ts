import Phaser from 'phaser';
import { GAME_H, GAME_W, logoKey, VIEW } from '../config';
import { TEAM_LIST } from '../data/teams';
import { queueCareerAssets, sharpenCareerAssets } from '../systems/careerAssets';
import { setupHiRes } from '../systems/hires';
import { C, plate, plateShadow, TV, tvText } from '../ui/tv';

/** Carrega as logos dos 32 times (tamanhos s, m e l) e abre o menu. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    setupHiRes(this);
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    // Abertura da transmissão: chamada QB CAREER e a barra de carga em amarelo de primeira descida
    const W = GAME_W;
    const H = GAME_H;
    const bg = this.add.graphics();
    bg.fillStyle(TV.ink, 1);
    bg.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    const lx = 40;
    const ly = H / 2 - 120;
    plateShadow(bg, lx, ly, 120, 80);
    plate(bg, lx, ly, 120, 80, TV.yellow, 1, false, true);
    plate(bg, lx, ly + 74, 270, 74, TV.ink2, 1, false, true);
    bg.fillStyle(TV.red, 1);
    bg.fillRect(lx, ly + 148, 226, 5);
    tvText(this, lx + 10, ly + 42, 'QB', 84, C.ink, 800, -2).setOrigin(0, 0.5);
    const car = tvText(this, lx + 12, ly + 111, 'CAREER', 76, C.white, 800, 1).setOrigin(0, 0.5);
    if (car.width > 246) car.setScale(246 / car.width);
    const by = ly + 210;
    const bw = W - 2 * lx;
    const bar = this.add.graphics();
    const txt = tvText(this, lx, by + 30, 'CARREGANDO', 14, C.muted, 700, 2.2).setOrigin(0, 0.5);
    const pct = tvText(this, lx + bw, by + 30, '0%', 14, C.white, 800, 1).setOrigin(1, 0.5);
    const draw = (p: number) => {
      bar.clear();
      plate(bar, lx, by, bw, 12, TV.ink3, 1);
      if (p > 0.01) plate(bar, lx, by, Math.max(14, bw * p), 12, TV.yellow, 1);
      pct.setText(`${Math.round(p * 100)}%`);
    };
    draw(0);
    this.load.on('progress', draw);
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
    this.scene.start(q.has('carreiratest') ? 'CareerTest' : q.get('draft') ? `Draft${q.get('draft')}` : q.has('saves') ? 'CareerSlots' : q.has('prejogo') ? 'PreJogo' : q.has('menu') ? 'CarreiraMenu' : q.get('combine') ? q.get('combine')! :q.has('criar') ? 'CareerCreate' : q.has('hub') ? 'CareerHub' : q.has('jogadortest') ? 'PlayerTest' : 'MainMenu');
  }
}
