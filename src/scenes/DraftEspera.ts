import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { podium } from '../draft/art';
import { ord, picksBefore, runDraft } from '../draft/logic';
import { bigButton, board, commissioner, draftScene, ORANGE, spotlights, teamLogo, topBar } from '../draft/ui';
import { C, inkOn, plate, plateLine, plateShadow, TV, tvEnter, tvText, wipeTo } from '../ui/tv';
import { vibrate, VIBE } from '../systems/feedback';
import { getSave } from '../player/PlayerSave';
import { sfx } from '../systems/sfx';

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
    // Com a temporada já criada, o Draft é o que está no save (refazer zeraria a carreira)
    const sv = getSave();
    const d = sv.draft && sv.career.schedule.length ? sv.draft : runDraft();
    const team = TeamRepository.get(d.teamId);
    const before = picksBefore(d, 3);
    draftScene(this, team);
    spotlights(this);
    const B = board(this, 'QFL DRAFT', `${ord(d.round)} RODADA · PICK ${before[0]?.pick ?? d.pick}`);
    // Borda do púlpito um pouco acima da linha da barriga do comissário (figura ~165 → tela ~392)
    const com = commissioner(this, 120, 268, 0.75, 489);
    podium(this, 120, 373, 150);

    // Balão de fala do comissário
    const bubble = this.add.container(0, 0);
    // Legenda da transmissão (tarja branca) com o que o comissário diz
    const bg = this.add.graphics();
    plateShadow(bg, 30, 226, GAME_W - 60, 58);
    plate(bg, 30, 226, GAME_W - 60, 58, TV.plate, 1);
    plate(bg, 30, 226, 8, 58, TV.yellow, 1, true, false);
    bg.fillStyle(TV.plate, 1);
    bg.fillTriangle(150, 283, 172, 283, 158, 296);
    const say = tvText(this, GAME_W / 2 + 4, 255, '', 16, C.ink, 800, 0.6).setOrigin(0.5).setAlign('center').setWordWrapWidth(GAME_W - 100).setLineSpacing(-2);
    bubble.add([bg, say]);

    topBar(this, 'QFL DRAFT', `PICK ${d.pick}`, () => wipeTo(this, 'CombineResultado'));

    // Ticker: os picks anteriores + o seu (NO RELÓGIO)
    const rows: Phaser.GameObjects.Container[] = [];
    const row = (i: number, pick: number, t: typeof team, top: string, bottom: string, mine: boolean, pos?: string) => {
      const y = 532 + i * 47;
      const c = this.add.container(0, y);
      const g = this.add.graphics();
      plate(g, 16, 0, GAME_W - 32, 42, mine ? TV.ink3 : TV.ink2, 0.97);
      plate(g, 16, 0, 46, 42, mine ? TV.yellow : TV.ink, 1, true, true);
      if (mine) plateLine(g, 16, 0, GAME_W - 32, 42, TV.yellow, 1, 2);
      c.add(g);
      c.add(tvText(this, 40, 21, String(pick), 18, mine ? C.ink : C.yellow, 800, 0).setOrigin(0.5));
      c.add(teamLogo(this, t, 84, 21, 28));
      c.add(tvText(this, 106, 12, top, 13, C.muted, 700, 0.8).setOrigin(0, 0.5));
      const bl = tvText(this, 106, 30, bottom, 16, mine ? C.yellow : C.white, 800, 0.4).setOrigin(0, 0.5);
      c.add(bl);
      if (mine) {
        const tag = tvText(this, GAME_W - 34, 21, 'NO RELÓGIO', 12, inkOn(t.colors.primary), 800, 1.4).setOrigin(1, 0.5);
        const tg = this.add.graphics();
        plate(tg, tag.x - tag.width - 12, 10, tag.width + 24, 22, t.colors.primary, 1);
        c.add([tg, tag]);
        this.tweens.add({ targets: tg, alpha: 0.55, yoyo: true, repeat: -1, duration: 500 });
      } else if (pos) c.add(tvText(this, GAME_W - 34, 21, pos, 15, C.muted, 800, 1).setOrigin(1, 0.5));
      c.setAlpha(0);
      rows.push(c);
      return { c, bl };
    };
    const items = before.map((p, i) => row(i, p.pick, p.team, p.team.name, '...', false, p.pos));
    row(before.length, d.pick, team, team.name, 'SUA VEZ ESTÁ CHEGANDO', true);

    const btn = bigButton(this, `AGUARDE: VEZ DOS ${team.name}`, ORANGE, () => wipeTo(this, 'DraftTelefone', TV.green));
    btn.setAlpha(0.4);
    btn.setEnabled(false);

    // Cartão grande do pick anunciado: aparece no centro (logo, time, jogador, posição), fica um
    // instante e "voa" para a linha dele no ticker, que pisca em destaque
    const showCard = (p: (typeof before)[number], i: number) => {
      const c = this.add.container(GAME_W / 2, 462).setDepth(70);
      // Lower-third do pick: bloco na cor do time com o logo + tarja branca com o nome
      const g = this.add.graphics();
      plateShadow(g, -170, -54, 340, 104);
      plate(g, -170, -54, 340, 104, TV.plate, 1);
      plate(g, -170, -54, 104, 104, p.team.colors.primary, 1, true, true);
      c.add(g);
      c.add(teamLogo(this, p.team, -116, -2, 72));
      c.add(tvText(this, -50, -32, `PICK ${p.pick} · ${p.team.name}`, 13, C.inkSoft, 800, 1).setOrigin(0, 0.5));
      const name = tvText(this, -50, -4, p.player, 26, C.ink, 800, 0.4).setOrigin(0, 0.5);
      if (name.width > 205) name.setScale(205 / name.width, 1);
      c.add(name);
      const pos = tvText(this, -44, 27, p.pos, 14, inkOn(p.team.colors.primary), 800, 1.4).setOrigin(0, 0.5);
      const pg = this.add.graphics();
      plate(pg, -52, 16, pos.width + 22, 22, p.team.colors.primary, 1);
      c.add([pg, pos]);
      c.setScale(0.5).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
      // clarão curto e suave (tela branca inteira cegava no celular)
      const fl = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffffff, 0.22).setOrigin(0).setDepth(68);
      this.tweens.add({ targets: fl, alpha: 0, duration: 220, ease: 'Quad.Out', onComplete: () => fl.destroy() });
      vibrate(VIBE.td);
      sfx.cue('cheerMed', { vol: 0.45 });
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
            items[i].bl.setText(p.player).setColor(C.white);
            const flash = this.add.graphics().setDepth(69);
            plateLine(flash, 16, 532 + i * 47, GAME_W - 32, 42, TV.yellow, 1, 3);
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
        com.gesture(1700);
        this.tweens.add({ targets: rows[i], alpha: 1, duration: 250 });
      });
      this.time.delayedCall(t + 1000, () => showCard(p, i));
      t += 2900;
    });
    this.time.delayedCall(t, () => {
      B.s.setText(`${ord(d.round)} RODADA · PICK ${d.pick}`);
      com.gesture(2200);
      say.setText(d.pick === 1 ? `OS ${team.name} ESTÃO NO RELÓGIO COM A 1ª ESCOLHA...` : `OS ${team.name} ESTÃO NO RELÓGIO...`);
      this.tweens.add({ targets: rows[rows.length - 1], alpha: 1, duration: 250 });
      this.tweens.add({ targets: btn, alpha: 1, duration: 250 });
      btn.setEnabled(true);
      vibrate(VIBE.tap);
      sfx.cue('cheerSwell', { vol: 0.4 });
      // Relógio do pick no telão (como na TV): 10:00 descendo
      let left = 600;
      const clock = () => B.s.setText(`NO RELÓGIO · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
      clock();
      this.time.addEvent({ delay: 1000, loop: true, callback: () => ((left = Math.max(0, left - 1)), clock()) });
    });
    tvEnter(this);
  }
}
