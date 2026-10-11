import Phaser from 'phaser';
import { GAME_W } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { podium } from '../draft/art';
import { ord, picksBefore, runDraft } from '../draft/logic';
import { bigButton, board, commissioner, draftScene, label, ORANGE, spotlights, teamLogo, title, topBar, UI } from '../draft/ui';
import { fgOn } from '../data/teams';
import { vibrate, VIBE } from '../systems/feedback';

/*
 * DraftEspera — "green room": o comissário anuncia os picks antes do seu, um por vez, com o ticker
 * embaixo. Seu time fica NO RELÓGIO e o botão libera quando chega a sua vez.
 */
export class DraftEspera extends Phaser.Scene {
  constructor() {
    super('DraftEspera');
  }

  create() {
    // O Draft é calculado aqui (a partir do Combine) e gravado no save
    const d = runDraft();
    const team = TeamRepository.get(d.teamId);
    const before = picksBefore(d, 3);
    draftScene(this, team);
    spotlights(this);
    const B = board(this, 'QFL DRAFT', `${ord(d.round)} RODADA · PICK ${before[0]?.pick ?? d.pick}`);
    // Borda do púlpito um pouco acima da linha da barriga do comissário (figura ~165 → tela ~392)
    commissioner(this, 120, 268, 0.75, 489);
    podium(this, 120, 373, 150);

    // Balão de fala do comissário
    const bubble = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0d12, 1);
    bg.fillRect(44, 232, 310, 52);
    bg.fillRect(37, 225, 316, 58);
    bg.fillStyle(0xf4f1e8, 1);
    bg.fillRect(40, 228, 310, 52);
    bg.fillTriangle(185, 279, 205, 279, 195, 290);
    const say = label(this, GAME_W / 2 - 0, 254, '', 11, '#0D0D12').setOrigin(0.5).setAlign('center').setWordWrapWidth(286);
    bubble.add([bg, say]);

    topBar(this, 'QFL DRAFT', 'AO VIVO', () => this.scene.start('CombineResultado'));

    // Ticker: os picks anteriores + o seu (NO RELÓGIO)
    const rows: Phaser.GameObjects.Container[] = [];
    const row = (i: number, pick: number, t: typeof team, top: string, bottom: string, mine: boolean, pos?: string) => {
      const y = 532 + i * 47;
      const c = this.add.container(0, y);
      const g = this.add.graphics();
      g.fillStyle(mine ? 0x2a3156 : 0x22284a, mine ? 0.95 : 0.6);
      g.fillRoundedRect(16, 0, GAME_W - 32, 42, 12);
      g.lineStyle(2, mine ? t.colors.primary : 0xffffff, mine ? 1 : 0.1);
      g.strokeRoundedRect(16, 0, GAME_W - 32, 42, 12);
      c.add(g);
      c.add(title(this, 26, 21, `#${pick}`, 10, UI.yellow).setOrigin(0, 0.5));
      c.add(teamLogo(this, t, 74, 21, 26));
      c.add(title(this, 96, 13, top, 8, '#C9CEE0').setOrigin(0, 0.5));
      const bl = title(this, 96, 30, bottom, 9, mine ? UI.yellow : '#9AA3C0').setOrigin(0, 0.5);
      c.add(bl);
      if (mine) {
        const tag = title(this, GAME_W - 30, 21, 'NO RELÓGIO', 7, fgOn(t.colors.primary)).setOrigin(1, 0.5);
        const tg = this.add.graphics();
        tg.fillStyle(t.colors.primary, 1);
        tg.fillRoundedRect(tag.x - tag.width - 7, 13, tag.width + 14, 16, 6);
        c.add([tg, tag]);
        this.tweens.add({ targets: tg, alpha: 0.55, yoyo: true, repeat: -1, duration: 500 });
      } else if (pos) c.add(title(this, GAME_W - 30, 21, pos, 8, '#9AA3C0').setOrigin(1, 0.5));
      c.setAlpha(0);
      rows.push(c);
      return { c, bl };
    };
    const items = before.map((p, i) => row(i, p.pick, p.team, p.team.name, '...', false, p.pos));
    row(before.length, d.pick, team, team.name, 'SUA VEZ ESTÁ CHEGANDO', true);

    const btn = bigButton(this, `AGUARDAR A VEZ DOS ${team.name}`, ORANGE, () => this.scene.start('DraftTelefone'));
    btn.setAlpha(0.4);
    btn.setEnabled(false);

    // Cartão grande do pick anunciado: aparece no centro (logo, time, jogador, posição), fica um
    // instante e "voa" para a linha dele no ticker, que pisca em destaque
    const showCard = (p: (typeof before)[number], i: number) => {
      const c = this.add.container(GAME_W / 2, 462).setDepth(70);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(-170, -48, 340, 104, 16);
      g.fillStyle(0x0d0d12, 0.96);
      g.fillRoundedRect(-170, -54, 340, 104, 16);
      g.lineStyle(3, p.team.colors.primary, 1);
      g.strokeRoundedRect(-170, -54, 340, 104, 16);
      g.fillStyle(p.team.colors.primary, 1);
      g.fillRoundedRect(-170, -54, 10, 104, { tl: 16, bl: 16, tr: 0, br: 0 });
      c.add(g);
      c.add(teamLogo(this, p.team, -118, -2, 72));
      c.add(title(this, -72, -34, `PICK ${p.pick} · ${p.team.name}`, 9, UI.yellow).setOrigin(0, 0.5));
      const name = title(this, -72, -4, p.player, 15, '#FFFFFF').setOrigin(0, 0.5);
      name.setShadow(2, 2, '#000000', 0, false, true);
      if (name.width > 230) name.setFontSize(Math.floor((15 * 230) / name.width));
      c.add(name);
      const pos = title(this, -72, 26, p.pos, 9, fgOn(p.team.colors.primary)).setOrigin(0, 0.5);
      const pg = this.add.graphics();
      pg.fillStyle(p.team.colors.primary, 1);
      pg.fillRoundedRect(-78, 17, pos.width + 12, 18, 6);
      c.add([pg, pos]);
      c.setScale(0.5).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
      this.cameras.main.flash(120, 255, 255, 255, false);
      vibrate(VIBE.td);
      // Depois vai para a linha do ticker
      this.time.delayedCall(1250, () => {
        this.tweens.add({
          targets: c,
          y: 532 + i * 47 + 21,
          scale: 0.25,
          alpha: 0,
          duration: 280,
          ease: 'Quad.In',
          onComplete: () => {
            c.destroy();
            items[i].bl.setText(p.player).setColor('#FFFFFF');
            const flash = this.add.graphics().setDepth(69);
            flash.lineStyle(3, 0xffd23f, 1);
            flash.strokeRoundedRect(16, 532 + i * 47, GAME_W - 32, 42, 12);
            this.tweens.add({ targets: flash, alpha: 0, duration: 700, delay: 150, onComplete: () => flash.destroy() });
            this.tweens.add({ targets: rows[i], scale: { from: 1.04, to: 1 }, duration: 220 });
          },
        });
      });
    };

    // Suspense: cada pick anterior é anunciado pelo comissário, revelado em destaque e entra no ticker
    let t = 400;
    before.forEach((p, i) => {
      this.time.delayedCall(t, () => {
        B.s.setText(`${ord(d.round)} RODADA · PICK ${p.pick}`);
        say.setText(`COM A ${ord(p.pick)} ESCOLHA, OS ${p.team.name} SELECIONAM...`);
        this.tweens.add({ targets: rows[i], alpha: 1, duration: 250 });
      });
      this.time.delayedCall(t + 1000, () => showCard(p, i));
      t += 2900;
    });
    this.time.delayedCall(t, () => {
      B.s.setText(`${ord(d.round)} RODADA · PICK ${d.pick}`);
      say.setText(d.pick === 1 ? `OS ${team.name} ESTÃO NO RELÓGIO COM A 1ª ESCOLHA...` : `OS ${team.name} ESTÃO NO RELÓGIO...`);
      this.tweens.add({ targets: rows[rows.length - 1], alpha: 1, duration: 250 });
      this.tweens.add({ targets: btn, alpha: 1, duration: 250 });
      btn.setEnabled(true);
      vibrate(VIBE.tap);
    });
  }
}
