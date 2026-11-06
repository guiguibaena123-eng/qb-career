import Phaser from 'phaser';
import { GAME_H, GAME_W, VIEW } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { currentDraft } from '../draft/logic';
import { bigButton, draftScene, teamLogo, topBar } from '../draft/ui';
import { C, plate, TV, tvEnter, tvText, wipeTo } from '../ui/tv';
import { getSave } from '../player/PlayerSave';
import { rng } from '../combine/scoring';
import { vibrate, VIBE } from '../systems/feedback';

/*
 * DraftTelefone — o telefone toca: o técnico do time que vai te escolher liga antes do anúncio.
 * Tela de chamada: logo do time num círculo com anéis pulsando e o selo do telefone tremendo, quem
 * liga e o relógio até o anúncio. ATENDER conecta (a mensagem aparece digitada e o relógio vira a
 * duração da ligação); CONTINUAR segue para o anúncio.
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
    this.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, TV.ink, 0.9).setOrigin(0);
    topBar(this, 'LIGAÇÃO', `PICK ${d.pick}`, () => wipeTo(this, 'DraftEspera'));

    // Chamada recebida: o logo do time dentro de um círculo na cor dele, anéis pulsando e o selo verde
    // do telefone tremendo no canto
    const cx = GAME_W / 2;
    const cy = 262;
    // cor do time; se for muito escura, clareia (o anel sumia no fundo escuro)
    const p0 = team.colors.primary;
    const l0 = (0.299 * ((p0 >> 16) & 255) + 0.587 * ((p0 >> 8) & 255) + 0.114 * (p0 & 255)) / 255;
    const tc = l0 < 0.35 ? Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(p0), Phaser.Display.Color.ValueToColor(0xffffff), 100, 38) : null;
    const ringC = tc ? Phaser.Display.Color.GetColor(tc.r, tc.g, tc.b) : p0;
    const rings = [0, 700, 1400].map((delay) => {
      const ring = this.add.circle(cx, cy, 80).setStrokeStyle(3, ringC).setScale(0.9).setAlpha(0);
      this.tweens.add({ targets: ring, scale: 1.75, alpha: { from: 0.9, to: 0 }, duration: 2100, repeat: -1, delay, ease: 'Quad.Out' });
      return ring;
    });
    const disc = this.add.graphics();
    disc.fillStyle(TV.ink, 1);
    disc.fillCircle(cx, cy, 84);
    disc.fillStyle(ringC, 1);
    disc.fillCircle(cx, cy, 80);
    disc.fillStyle(TV.ink2, 1);
    disc.fillCircle(cx, cy, 70);
    disc.fillStyle(0xffffff, 0.06);
    disc.fillCircle(cx - 8, cy - 10, 58);
    teamLogo(this, team, cx, cy, 104);
    const badge = this.add.container(cx + 58, cy + 58);
    const bg = this.add.graphics();
    bg.fillStyle(TV.ink, 1);
    bg.fillCircle(0, 0, 25);
    bg.fillStyle(TV.green, 1);
    bg.fillCircle(0, 0, 21);
    // Fone (desenho do design, em 16×16 ampliado)
    const k = 22 / 16;
    const icon = [[3, 2], [6, 2], [7, 5], [5.5, 6.5], [6.5, 8.5], [7.5, 9.5], [9.5, 10.5], [11, 9], [14, 10], [14, 13], [12, 13], [6, 13], [3, 8], [3, 2]].map(([x, y]) => new Phaser.Math.Vector2((x - 8) * k, (y - 8) * k));
    bg.fillStyle(0xffffff, 1);
    bg.fillPoints(icon, true);
    badge.add(bg);
    const shake = this.tweens.add({ targets: badge, angle: { from: -12, to: 12 }, duration: 110, yoyo: true, repeat: -1 });
    const buzz = this.time.addEvent({ delay: 1100, loop: true, callback: () => vibrate([90, 60, 90]) });

    // Quem liga: título pequeno, nome do time e o técnico
    const head = tvText(this, cx, 386, 'CHAMADA RECEBIDA', 13, C.muted, 800, 2.4).setOrigin(0.5);
    const tn = tvText(this, cx, 418, team.name, 30, C.white, 800, 0.8).setOrigin(0.5);
    if (tn.width > GAME_W - 48) tn.setScale((GAME_W - 48) / tn.width);
    const coach = COACHES[Math.floor(rng(`coach-${team.id}`)() * COACHES.length)];
    const status = tvText(this, cx, 450, `TÉCNICO ${coach}`, 15, C.yellow, 800, 1.6).setOrigin(0.5);
    this.tweens.add({ targets: head, alpha: 0.35, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Mensagem: só aparece quando atende (antes ficava uma caixa vazia)
    const box = this.add.container(0, 0).setAlpha(0);
    const mg = this.add.graphics();
    plate(mg, 28, 488, GAME_W - 56, 100, TV.plate, 1);
    plate(mg, 28, 488, 10, 100, ringC, 1, true, false);
    const msg = tvText(this, 54, 538, '', 18, C.ink, 800, 0.4).setOrigin(0, 0.5).setWordWrapWidth(GAME_W - 104).setLineSpacing(0);
    box.add([mg, msg]);
    const full = `${s.name}, NÓS VAMOS TE ESCOLHER NA PICK ${d.pick}. PRONTO PRA SER DOS ${team.name}?`;

    // Relógio até o anúncio; depois de atender, a duração da chamada
    const dot = this.add.circle(GAME_W / 2 - 104, 628, 4, TV.red);
    this.tweens.add({ targets: dot, alpha: 0, duration: 500, yoyo: true, repeat: -1, ease: 'Stepped' });
    let left = 92;
    let talk = -1;
    const mmss = (v: number) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
    const clock = tvText(this, GAME_W / 2 + 6, 628, '', 15, C.muted, 700, 1.4).setOrigin(0.5);
    const paint = () => clock.setText(talk >= 0 ? `EM LIGAÇÃO · ${mmss(talk)}` : `${mmss(left)} PARA O ANÚNCIO`);
    paint();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => (talk >= 0 ? talk++ : (left = Math.max(0, left - 1)), paint()) });

    // Atender: para de tocar, conecta e o técnico fala (texto digitado); depois segue
    let answered = false;
    const btn = bigButton(this, 'ATENDER', 0x3ccb5a, () => {
      if (answered) return wipeTo(this, 'DraftAnuncio');
      answered = true;
      shake.stop();
      badge.setAngle(0);
      buzz.remove();
      this.tweens.killTweensOf(rings);
      rings.forEach((r) => r.setVisible(false));
      this.tweens.killTweensOf(head);
      head.setAlpha(1).setText('EM LIGAÇÃO').setColor(C.green);
      dot.setFillStyle(TV.green);
      talk = 0;
      paint();
      vibrate(VIBE.tap);
      box.y = 14;
      this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 260, ease: 'Quad.Out' });
      let i = 0;
      this.time.addEvent({
        delay: 28,
        repeat: full.length - 1,
        callback: () => {
          msg.setText(full.slice(0, ++i));
          if (i === full.length) btnText.setText('CONTINUAR');
        },
      });
    });
    const btnText = btn.list.find((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
    tvEnter(this);
  }
}
