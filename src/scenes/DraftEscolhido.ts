import Phaser from 'phaser';
import { GAME_W } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { suitFigure } from '../draft/art';
import { currentDraft, money, ord } from '../draft/logic';
import { bigButton, board, commissioner, draftScene, spotlights, teamLogo, topBar } from '../draft/ui';
import { C, plate, plateShadow, TV, tvEnter, tvText, wipeTo } from '../ui/tv';
import { getSave } from '../player/PlayerSave';
import { vibrate, VIBE } from '../systems/feedback';
import { sfx } from '../systems/sfx';

/*
 * DraftEscolhido — festa no palco: o jogador de terno segura a jersey do time (número 12 e logo), com
 * o rosto do save; o comissário bate palmas, confete cai e o cartão mostra o contrato. ASSINAR
 * CONTRATO leva ao menu da carreira.
 */
export class DraftEscolhido extends Phaser.Scene {
  constructor() {
    super('DraftEscolhido');
  }

  create() {
    const d = currentDraft();
    const team = TeamRepository.get(d.teamId);
    const s = getSave();
    draftScene(this, team, true);
    spotlights(this);
    board(this, team.name, `PICK ${d.pick} · ${ord(d.round)} RODADA`, 34);
    topBar(this, 'VOCÊ FOI ESCOLHIDO', `PICK ${d.pick}`, () => wipeTo(this, 'DraftAnuncio'));

    // Comissário batendo palmas (à esquerda); a cada batida, um brilho sai das mãos
    const CX = -22;
    const CY = 258;
    const CS = 0.95;
    const com = commissioner(this, CX, CY, CS, undefined, true);
    const meet = 'meet' in com ? com.meet : { x: 100, y: 128 };
    com.onClap(() => {
      const bx = CX + meet.x * CS;
      const by = CY + meet.y * CS;
      const burst = this.add.graphics().setPosition(bx, by);
      // Faíscas em cruz e nas diagonais, com contorno escuro (pixel art)
      for (const [dx, dy, w] of [[0, -20, 6], [0, 20, 6], [-22, 0, 6], [22, 0, 6], [-15, -15, 4], [15, -15, 4], [-15, 15, 4], [15, 15, 4]]) {
        burst.fillStyle(0x0d0d12, 1);
        burst.fillRect(dx - w / 2 - 2, dy - w / 2 - 2, w + 4, w + 4);
        burst.fillStyle(0xffd23f, 1);
        burst.fillRect(dx - w / 2, dy - w / 2, w, w);
      }
      burst.fillStyle(0xffffff, 0.9);
      burst.fillRect(-4, -4, 8, 8);
      burst.setScale(0.4);
      this.tweens.add({ targets: burst, scale: 1.1, alpha: 0, duration: 300, ease: 'Quad.Out', onComplete: () => burst.destroy() });
    });

    // Jogador de terno com a jersey do time (rosto do save)
    const fig = suitFigure(this, 95, 240, team);
    // Entra subindo a jersey e depois respira, orgulhoso (sem pular sem parar)
    fig.y = 252;
    this.tweens.add({ targets: fig, y: 240, duration: 420, ease: 'Back.Out' });
    this.tweens.add({ targets: fig, y: 237, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 420 });

    // Confete caindo (cores do time e da festa)
    const cols = [team.colors.primary, 0xf4f1e8, 0xffd23f, 0x3fd0ff, 0xff6fb5];
    for (let i = 0; i < 26; i++) {
      const w = [6, 8, 10][i % 3];
      const c = this.add.rectangle(Phaser.Math.Between(10, GAME_W - 10), -20, w, w + 4, cols[i % cols.length]).setStrokeStyle(1, 0x0d0d12);
      this.tweens.add({ targets: c, y: 900, angle: 540, duration: Phaser.Math.Between(2700, 4400), delay: Phaser.Math.Between(0, 3000), repeat: -1 });
    }

    // Cartão do contrato
    // Tarja do contrato: bloco do time + placa branca com nome e valores + selo do pick
    const cg = this.add.graphics();
    plateShadow(cg, 16, 660, 358, 74);
    plate(cg, 16, 660, 358, 74, TV.plate, 1);
    plate(cg, 16, 660, 64, 74, team.colors.primary, 1, true, true);
    plate(cg, GAME_W - 104, 668, 80, 58, TV.yellow, 1);
    teamLogo(this, team, 48, 697, 40);
    const nm = tvText(this, 92, 684, `${s.name} · QB · #${s.number}`, 21, C.ink, 800, 0.4).setOrigin(0, 0.5);
    if (nm.width > 170) nm.setScale(170 / nm.width, 1);
    const sub = tvText(this, 92, 711, `${d.contract.years} ANOS · ${money(d.contract.value)}`, 14, C.inkSoft, 700, 0.8).setOrigin(0, 0.5);
    if (sub.width > 170) sub.setScale(170 / sub.width, 1);
    tvText(this, GAME_W - 64, 688, 'PICK', 12, C.ink, 800, 1.6).setOrigin(0.5);
    tvText(this, GAME_W - 64, 708, String(d.pick), 26, C.ink, 800, 0).setOrigin(0.5);

    vibrate(VIBE.td);
    sfx.cue('cheerBig', { vol: 0.6 });
    sfx.cue('cheerSwell', { vol: 0.45, delay: 2.2 });
    // Assinar: vai para o menu da carreira
    bigButton(this, 'ASSINAR CONTRATO', team.colors.primary, () => {
      vibrate(VIBE.tap);
      wipeTo(this, 'CarreiraMenu', team.colors.primary);
    });
    tvEnter(this);
  }
}
