import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { getSave } from '../player/PlayerSave';
import { TeamRepository } from '../data/TeamRepository';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';

/*
 * Aba CARREIRA do menu: reúne o que já existe da carreira (por etapa). As próximas etapas entram aqui
 * (criação, Combine, Draft, menu da carreira).
 */
export class CareerHub extends Phaser.Scene {
  constructor() {
    super('CareerHub');
  }

  create() {
    setupHiRes(this);
    const W = GAME_W;
    const H = GAME_H;
    this.add.rectangle(0, 0, W, H, 0x0a0c1a).setOrigin(0);
    this.add.existing(title(this, W / 2, 60, 'CARREIRA', 20, UI.yellow).setOrigin(0.5));
    const s = getSave();
    this.add.existing(label(this, W / 2, 96, `${s.name} #${s.number} · OVR ${s.ovr}`, 9, '#C9CEE0').setOrigin(0.5));

    const items: [string, string, string][] = [
      ['CRIAR CARREIRA', 'NOME, FACULDADE E VISUAL DO JOGADOR', 'CareerCreate'],
      ['COMBINE', '4 TESTES: 40 JARDAS, CONES, PASSE E BRAÇO', 'CombineHub'],
      ['MENU DA CARREIRA', 'CLUBE, ELENCO, STATS, TABELA, NOTÍCIAS E JOGOS', 'CarreiraMenu'],
      ['DRAFT', s.draft ? `${TeamRepository.get(s.draft.teamId).name} · PICK ${s.draft.pick} · ${s.draft.round}ª RODADA` : 'SALA DE ESPERA, LIGAÇÃO, ANÚNCIO E ESCOLHA', 'DraftEspera'],
      ['ETAPA 1 · TIMES E ASSETS', '32 TIMES, ESTÁDIOS, KITS E SAVE', 'CareerTest'],
      ['ETAPA 2 · JOGADOR E ROSTO', 'CAMADAS, KITS E ROSTO EDITÁVEL', 'PlayerTest'],
    ];
    items.forEach(([t, sub, scene], i) => {
      const b = new GlassButton(this, W / 2, 190 + i * 86, { w: W - 40, h: 70, radius: 16 });
      b.add(title(this, 0, -8, t, 10, '#FFFFFF').setOrigin(0.5));
      b.add(label(this, 0, 14, sub, 8, UI.muted).setOrigin(0.5));
      b.onTap = () => this.time.delayedCall(30, () => this.scene.start(scene));
      this.add.existing(b);
    });
    this.add.existing(label(this, W / 2, 190 + items.length * 86 + 10, 'PRÓXIMAS ETAPAS ENTRAM AQUI', 8, UI.muted).setOrigin(0.5));
    backButton(this);
  }
}

/** Botão VOLTAR das telas de carreira: sem parâmetro volta ao menu; 'hub' volta à aba CARREIRA. */
export function backButton(scene: Phaser.Scene, to: 'MainMenu' | 'CareerHub' = 'MainMenu') {
  const b = new GlassButton(scene, 14 + 50, GAME_H - 36, { w: 100, h: 44, radius: 14 });
  b.add(label(scene, 0, 0, 'VOLTAR', 9, '#FFFFFF').setOrigin(0.5));
  b.onTap = () => scene.time.delayedCall(30, () => scene.scene.start(to));
  b.setScrollFactor(0).setDepth(60);
  scene.add.existing(b);
  return b;
}
