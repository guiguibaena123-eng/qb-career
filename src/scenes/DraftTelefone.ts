import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { currentDraft } from '../draft/logic';
import { bigButton, board, draftScene, glassCard, teamLogo, topBar } from '../draft/ui';
import { C, plate, TV, tvEnter, tvText, wipeTo } from '../ui/tv';
import { getSave } from '../player/PlayerSave';
import { rng } from '../combine/scoring';
import { vibrate, VIBE } from '../systems/feedback';

/*
 * DraftTelefone — o telefone toca: o técnico do time que vai te escolher liga antes do anúncio.
 * Tela escurecida, telefone verde tremendo com ondas, cartão com o logo do time e a mensagem, e o
 * relógio até o anúncio. ATENDER conecta a ligação e segue para o anúncio.
 */
const COACHES = ['MARQUES', 'OLIVEIRA', 'SANTANA', 'MEDEIROS', 'QUEIROZ', 'FONSECA', 'BITTENCOURT', 'DUARTE'];

export class DraftTelefone extends Phaser.Scene {
  constructor() {
    super('DraftTelefone');
  }

  create() {
    const d = currentDraft();
    const team = TeamRepository.get(d.teamId);
    const s = getSave();
    draftScene(this, team);
    board(this, 'QFL DRAFT', `${d.round}ª RODADA · PICK ${d.pick}`);
    this.add.rectangle(0, 0, GAME_W, GAME_H, TV.ink, 0.88).setOrigin(0);
    topBar(this, 'LIGAÇÃO', `PICK ${d.pick}`, () => wipeTo(this, 'DraftEspera'));

    // Telefone: duas ondas verdes e o botão redondo tremendo
    const cx = GAME_W / 2;
    const cy = 250;
    for (const delay of [0, 800]) {
      const ring = this.add.circle(cx, cy, 100).setStrokeStyle(4, TV.green).setScale(0.6);
      this.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 1600, repeat: -1, delay, ease: 'Quad.Out' });
    }
    const phone = this.add.container(cx, cy);
    const pg = this.add.graphics();
    pg.fillStyle(TV.ink, 1);
    pg.fillCircle(0, 0, 54);
    pg.fillStyle(TV.green, 1);
    pg.fillCircle(0, 0, 50);
    pg.fillStyle(0xffffff, 0.3);
    pg.fillRect(-34, -46, 68, 4);
    pg.fillStyle(0x000000, 0.2);
    pg.fillRect(-34, 40, 68, 6);
    // Fone (desenho do design, em 16×16 ampliado)
    const k = 52 / 16;
    const icon = [[3, 2], [6, 2], [7, 5], [5.5, 6.5], [6.5, 8.5], [7.5, 9.5], [9.5, 10.5], [11, 9], [14, 10], [14, 13], [12, 13], [6, 13], [3, 8], [3, 2]].map(([x, y]) => new Phaser.Math.Vector2((x - 8) * k, (y - 8) * k));
    pg.fillStyle(0xffffff, 1);
    pg.fillPoints(icon, true);
    pg.lineStyle(2, TV.ink, 1);
    pg.strokePoints(icon, true);
    phone.add(pg);
    const shake = this.tweens.add({ targets: phone, angle: { from: -8, to: 8 }, duration: 175, yoyo: true, repeat: -1 });
    const buzz = this.time.addEvent({ delay: 1100, loop: true, callback: () => vibrate([90, 60, 90]) });

    // Cartão da ligação: logo, time, técnico e a mensagem
    glassCard(this, 24, 372, 342, 176);
    teamLogo(this, team, 24 + 16 + 20, 372 + 16 + 21, 40);
    tvText(this, 92, 392, team.name, 20, C.white, 800, 0.6).setOrigin(0, 0.5);
    const coach = COACHES[Math.floor(rng(`coach-${team.id}`)() * COACHES.length)];
    const status = tvText(this, 92, 416, `TÉCNICO ${coach} · CHAMANDO...`, 14, C.muted, 700, 1).setOrigin(0, 0.5);
    const mg = this.add.graphics();
    plate(mg, 40, 446, 310, 86, TV.plate, 1);
    plate(mg, 40, 446, 10, 86, team.colors.primary, 1, true, false);
    const msg = tvText(this, 62, 489, '', 17, C.ink, 800, 0.4).setOrigin(0, 0.5).setWordWrapWidth(276).setLineSpacing(0);
    const full = `${s.name}, NÓS VAMOS TE ESCOLHER NA PICK ${d.pick}. PRONTO PRA SER DOS ${team.name}?`;
    msg.setText('...').setAlpha(0.6);

    // Relógio até o anúncio
    const dot = this.add.circle(GAME_W / 2 - 100, 580, 4, TV.red);
    this.tweens.add({ targets: dot, alpha: 0, duration: 500, yoyo: true, repeat: -1, ease: 'Stepped' });
    let left = 92;
    const clock = tvText(this, GAME_W / 2 + 6, 580, '', 15, C.muted, 700, 1.4).setOrigin(0.5);
    const paint = () => clock.setText(`${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')} PARA O ANÚNCIO`);
    paint();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => (left = Math.max(0, left - 1), paint()) });

    // Atender: para de tocar, conecta e o técnico fala (texto digitado); depois segue
    let answered = false;
    const btn = bigButton(this, 'ATENDER', 0x3ccb5a, () => {
      if (answered) return wipeTo(this, 'DraftAnuncio');
      answered = true;
      shake.stop();
      phone.setAngle(0);
      buzz.remove();
      vibrate(VIBE.tap);
      status.setText(`TÉCNICO ${coach} · LIGAÇÃO`);
      msg.setAlpha(1).setText('');
      let i = 0;
      this.time.addEvent({
        delay: 28,
        repeat: full.length - 1,
        callback: () => {
          msg.setText(full.slice(0, ++i));
          if (i === full.length) {
            btnText.setText('CONTINUAR');
          }
        },
      });
    });
    const btnText = btn.list.find((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
    tvEnter(this);
  }
}
