import Phaser from 'phaser';
import { TeamRepository } from '../data/TeamRepository';
import { podium } from '../draft/art';
import { currentDraft, ord } from '../draft/logic';
import { bigButton, board, commissioner, draftScene, ORANGE, spotlights, teamLogo, topBar } from '../draft/ui';
import { C, plate, plateShadow, TV, tvEnter, tvText, wipeTo } from '../ui/tv';
import { GAME_W } from '../config';
import { getSave } from '../player/PlayerSave';
import { vibrate, VIBE } from '../systems/feedback';
import { sfx } from '../systems/sfx';

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
    const com = commissioner(this, 120, 268, 0.75, 489);
    podium(this, 120, 373, 150);
    topBar(this, 'QFL DRAFT', `PICK ${d.pick}`, () => wipeTo(this, 'DraftTelefone'));

    // Painel do anúncio: placa de tinta, faixa amarela e o selo do comissário na borda
    const g = this.add.graphics();
    plateShadow(g, 16, 548, 358, 178);
    plate(g, 16, 548, 358, 178, TV.ink, 0.97);
    g.fillStyle(TV.yellow, 1);
    g.fillRect(28, 548, 346, 4);
    plate(g, 30, 538, 172, 22, TV.plate, 1);
    tvText(this, 116, 549, `COMISSÁRIO · PICK ${d.pick}`, 12, C.ink, 800, 1.2).setOrigin(0.5);
    teamLogo(this, team, GAME_W - 54, 590, 38);
    const line = tvText(this, 32, 594, '', 17, C.white, 700, 0.4).setOrigin(0, 0.5).setWordWrapWidth(266).setLineSpacing(0);
    const name = tvText(this, 32, 632, '', 40, C.yellow, 800, 0.6).setOrigin(0, 0).setLineSpacing(-8);
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
        com.gesture(2600);
        sfx.cue('cheerBig', { vol: 0.7 });
        // Clarão só no painel do anúncio (sem tremer a câmera, que deformava a área do púlpito)
        const flash = this.add.rectangle(16, 548, 358, 178, TV.yellow, 0.3).setOrigin(0);
        this.tweens.add({ targets: flash, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => flash.destroy() });
        typeOut(name, full, 55, () => {
          let on = true;
          this.time.addEvent({ delay: 400, loop: true, callback: () => name.setText(full + ((on = !on) ? '_' : '')) });
        });
      });
    });

    bigButton(this, 'CONTINUAR', ORANGE, () => wipeTo(this, 'DraftEscolhido', team.colors.primary));
    tvEnter(this);
  }
}
