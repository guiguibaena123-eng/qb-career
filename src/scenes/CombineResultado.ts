import Phaser from 'phaser';
import { attrsFromCombine, finalScore, grade, gradeColor, projection, qbRanking, teamInterest } from '../combine/scoring';
import { GAME_H, GAME_W } from '../config';
import { calcOvr, DEFAULT_ATTRS, getSave, updateSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';

/*
 * Resultado do Combine: nota final (média ponderada), ranking entre ~24 QBs gerados por seed, projeção
 * de rodada e interesse dos times (do registro). Aplica o resultado aos atributos e ao OVR do save:
 * sempre a partir dos valores base do rookie, então abrir a tela de novo não acumula bônus.
 */
export class CombineResultado extends Phaser.Scene {
  constructor() {
    super('CombineResultado');
  }

  create() {
    setupHiRes(this);
    const W = GAME_W;
    const H = GAME_H;
    this.add.rectangle(0, 0, W, H, 0x0a0c1a).setOrigin(0);
    const s0 = getSave();
    const tests = s0.combine?.tests ?? {};
    const final = finalScore(tests);
    const before = calcOvr(DEFAULT_ATTRS);
    const attrs = attrsFromCombine(tests, final);
    const s = updateSave({ attrs, combine: { tests, score: final } });
    const g = grade(final);
    const { rank, total } = qbRanking(final, s.name);

    this.add.existing(title(this, W / 2, 40, 'RESULTADO DO COMBINE', 14, UI.yellow).setOrigin(0.5));
    this.add.existing(title(this, W / 2, 100, String(final), 44, gradeColor(g)).setOrigin(0.5));
    this.add.existing(title(this, W / 2, 148, `NOTA ${g}`, 14, gradeColor(g)).setOrigin(0.5));
    this.add.existing(label(this, W / 2, 182, `RANKING ENTRE QBs: ${rank}º DE ${total}`, 9, '#FFFFFF').setOrigin(0.5));
    this.add.existing(label(this, W / 2, 206, `PROJEÇÃO: ${projection(rank, total)}`, 9, UI.yellow).setOrigin(0.5));

    // Atributos novos e OVR
    const card = this.add.graphics();
    card.fillStyle(0x2a3156, 0.75);
    card.fillRoundedRect(20, 228, W - 40, 190, 14);
    this.add.existing(title(this, 36, 250, `OVR ${before} > ${s.ovr}`, 13, '#FFFFFF').setOrigin(0, 0.5));
    const rows: [string, number][] = [['BRAÇO', attrs.arm], ['PRECISÃO', attrs.accuracy], ['LEITURA', attrs.reading], ['VELOCIDADE', attrs.speed]];
    rows.forEach(([n, v], i) => {
      const y = 290 + i * 30;
      this.add.existing(label(this, 36, y, n, 8, '#C9CEE0').setOrigin(0, 0.5));
      this.add.rectangle(140, y, 170, 10, 0x0a0c1a).setOrigin(0, 0.5);
      this.add.rectangle(140, y, 170 * (v / 100), 10, 0x3ccb5a).setOrigin(0, 0.5);
      this.add.existing(label(this, W - 36, y, String(v), 9, '#FFFFFF').setOrigin(1, 0.5));
    });

    // Interesse dos times
    this.add.existing(label(this, W / 2, 446, 'TIMES MAIS INTERESSADOS', 8, UI.muted).setOrigin(0.5));
    teamInterest(final, s.name).forEach((t, i) => {
      const y = 480 + i * 50;
      const gr = this.add.graphics();
      gr.fillStyle(0x2a3156, 0.6);
      gr.fillRoundedRect(20, y - 20, W - 40, 44, 10);
      this.add.image(48, y + 2, t.team.logo.small).setDisplaySize(32, 32);
      this.add.existing(title(this, 74, y - 8, t.team.abbr, 10, '#FFFFFF').setOrigin(0, 0.5));
      this.add.rectangle(74, y + 10, 190, 8, 0x0a0c1a).setOrigin(0, 0.5);
      this.add.rectangle(74, y + 10, 190 * (t.interest / 100), 8, t.team.colors.primary).setOrigin(0, 0.5);
      this.add.existing(label(this, W - 34, y + 2, `${t.interest}%`, 9, '#FFFFFF').setOrigin(1, 0.5));
    });

    const back = new GlassButton(this, 14 + 55, H - 40, { w: 110, h: 52, radius: 16 });
    back.add(label(this, 0, 0, 'VOLTAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.scene.start('CombineHub'));
    this.add.existing(back);
    const pw = W - 28 - 110 - 10;
    const go = new GlassButton(this, W - 14 - pw / 2, H - 40, { w: pw, h: 52, radius: 16, fill: 0xffd23f, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    go.add(title(this, 0, 0, 'IR PARA O DRAFT', 12, '#1a1a1a').setOrigin(0.5));
    go.onTap = () => this.time.delayedCall(30, () => this.scene.start('DraftEspera'));
    this.add.existing(go);
  }
}
