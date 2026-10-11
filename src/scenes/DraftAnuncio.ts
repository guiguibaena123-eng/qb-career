import Phaser from 'phaser';
import { TeamRepository } from '../data/TeamRepository';
import { podium } from '../draft/art';
import { currentDraft, ord } from '../draft/logic';
import { bigButton, board, commissioner, draftScene, label, ORANGE, spotlights, teamLogo, title, topBar, UI } from '../draft/ui';
import { getSave } from '../player/PlayerSave';
import { vibrate, VIBE } from '../systems/feedback';

/*
 * DraftAnuncio — o comissário anuncia o pick no púlpito; no painel, "COM A Nª ESCOLHA DO DRAFT, OS
 * <TIME> SELECIONAM..." e então o nome do jogador aparece digitado, com cursor piscando.
 */
export class DraftAnuncio extends Phaser.Scene {
  constructor() {
    super('DraftAnuncio');
  }

  create() {
    const d = currentDraft();
    const team = TeamRepository.get(d.teamId);
    const s = getSave();
    draftScene(this, team);
    spotlights(this);
    board(this, 'QFL DRAFT', `${ord(d.round)} RODADA · PICK ${d.pick}`);
    // Púlpito e comissário idênticos aos da sala de espera (mesma largura, tamanho e posição)
    commissioner(this, 120, 268, 0.75, 489);
    podium(this, 120, 373, 150);
    topBar(this, 'QFL DRAFT', 'AO VIVO', () => this.scene.start('DraftTelefone'));

    // Painel do anúncio (borda na cor da liga, sombra dura)
    const g = this.add.graphics();
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(22, 554, 358, 178);
    g.fillStyle(ORANGE, 1);
    g.fillRect(13, 545, 364, 184);
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(16, 548, 358, 178);
    teamLogo(this, team, 16 + 16 + 13, 548 + 16 + 15, 30);
    title(this, 70, 579, `COMISSÁRIO · PICK ${d.pick}`, 9, '#F26B1D').setOrigin(0, 0.5);
    const line = label(this, 32, 618, '', 12, '#E8EAF2').setOrigin(0, 0.5).setWordWrapWidth(326).setLineSpacing(4);
    const name = title(this, 32, 650, '', 17, UI.yellow).setOrigin(0, 0).setLineSpacing(8);
    name.setShadow(3, 3, '#0D0D12', 0, false, true);
    const college = s.college.name.split(' ')[0];
    const full = `${s.name}, QB\n${college}`;

    const typeOut = (t: Phaser.GameObjects.Text, text: string, speed: number, done?: () => void) => {
      let i = 0;
      this.time.addEvent({
        delay: speed,
        repeat: text.length - 1,
        callback: () => {
          t.setText(text.slice(0, ++i));
          if (i === text.length) done?.();
        },
      });
    };
    typeOut(line, `COM A ${ord(d.pick)} ESCOLHA DO DRAFT, OS ${team.name} SELECIONAM...`, 30, () => {
      // Pausa de suspense e o nome aparece
      this.time.delayedCall(900, () => {
        vibrate(VIBE.td);
        // Clarão só no painel do anúncio (sem tremer a câmera, que deformava a área do púlpito)
        const flash = this.add.rectangle(16, 548, 358, 178, 0xffd23f, 0.35).setOrigin(0);
        this.tweens.add({ targets: flash, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => flash.destroy() });
        typeOut(name, full, 55, () => {
          let on = true;
          this.time.addEvent({ delay: 400, loop: true, callback: () => name.setText(full + ((on = !on) ? '_' : '')) });
        });
      });
    });

    bigButton(this, 'CONTINUAR', ORANGE, () => this.scene.start('DraftEscolhido'));
  }
}
