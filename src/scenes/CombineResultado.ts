import Phaser from 'phaser';
import { attrsFromCombine, finalScore, grade, projection, qbRanking, teamInterest } from '../combine/scoring';
import { GAME_H, GAME_W } from '../config';
import { calcOvr, DEFAULT_ATTRS, getSave, updateSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { C, feed, onInk, plate, plateShadow, scoreBug, sectionHead, slideIn, TV, tvEnter, TvButton, tvText, wipeTo } from '../ui/tv';
import { gradeTv } from './CombineHub';

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
    feed(this, null, 0.82);
    const s0 = getSave();
    const tests = s0.combine?.tests ?? {};
    const final = finalScore(tests);
    const before = calcOvr(DEFAULT_ATTRS);
    // Depois do Draft o QB já evoluiu: a tela só mostra o resultado, sem recalcular os atributos
    const locked = !!s0.draft;
    const attrs = locked ? s0.attrs : attrsFromCombine(tests, final);
    const s = locked ? s0 : updateSave({ attrs, combine: { tests, score: final } });
    const g = grade(final);
    const gc = gradeTv(g);
    const { rank, total } = qbRanking(final, s.name);
    scoreBug(this, { title: 'RESULTADO DO COMBINE', step: 'FINAL', onBack: () => wipeTo(this, 'CombineHub') });

    // Placa principal: nota em bloco chapado + ranking e projeção numa tarja branca
    const top = 70;
    const hero = this.add.container(0, 0);
    const hg = this.add.graphics();
    plateShadow(hg, 16, top, W - 32, 124);
    plate(hg, 16, top, W - 32, 124, TV.plate, 1);
    plate(hg, 16, top, 128, 124, gc, 1, true, true);
    hero.add(hg);
    const fgc = gc === TV.yellow ? C.ink : C.white;
    hero.add(tvText(this, 80, top + 52, String(final), 64, fgc, 800, 0).setOrigin(0.5));
    hero.add(tvText(this, 80, top + 100, `NOTA ${g}`, 17, fgc, 800, 1.6).setOrigin(0.5));
    hero.add(tvText(this, 160, top + 28, `${rank}º DE ${total} QBs`, 26, C.ink, 800, 0.6).setOrigin(0, 0.5));
    hero.add(tvText(this, 160, top + 56, 'RANKING DO COMBINE', 13, C.inkSoft, 700, 1.2).setOrigin(0, 0.5));
    const pj = this.add.graphics();
    plate(pj, 156, top + 76, W - 32 - 156, 32, TV.ink, 1);
    hero.add(pj);
    const pt = tvText(this, 170, top + 92, `PROJEÇÃO: ${projection(rank, total)}`, 15, C.yellow, 800, 0.8).setOrigin(0, 0.5);
    if (pt.width > W - 32 - 180) pt.setScale((W - 32 - 180) / pt.width, 1);
    hero.add(pt);

    // Atributos novos e OVR
    const ay = top + 152;
    const attrsC = this.add.container(0, 0);
    attrsC.add(sectionHead(this, 16, ay, 'SEU QB DEPOIS DO COMBINE'));
    const ag = this.add.graphics();
    plate(ag, 16, ay + 16, W - 32, 196, TV.ink2, 0.97);
    attrsC.add(ag);
    attrsC.add(tvText(this, 32, ay + 46, 'OVR', 15, C.muted, 700, 1.4).setOrigin(0, 0.5));
    attrsC.add(tvText(this, 76, ay + 46, String(before), 24, C.muted, 800, 0).setOrigin(0, 0.5));
    const arr = this.add.graphics();
    arr.lineStyle(3, TV.plate, 1);
    arr.beginPath();
    arr.moveTo(112, ay + 39);
    arr.lineTo(119, ay + 46);
    arr.lineTo(112, ay + 53);
    arr.strokePath();
    attrsC.add(arr);
    const d = s.ovr - before;
    attrsC.add(tvText(this, 130, ay + 46, String(s.ovr), 28, C.white, 800, 0).setOrigin(0, 0.5));
    attrsC.add(tvText(this, W - 32, ay + 46, d === 0 ? 'SEM MUDANÇA' : `${d > 0 ? '+' : ''}${d} OVR`, 15, d > 0 ? C.green : d < 0 ? C.red : C.muted, 800, 1).setOrigin(1, 0.5));
    const rows: [string, number, number][] = [
      ['BRAÇO', attrs.arm, DEFAULT_ATTRS.arm],
      ['PRECISÃO', attrs.accuracy, DEFAULT_ATTRS.accuracy],
      ['LEITURA', attrs.reading, DEFAULT_ATTRS.reading],
      ['VELOCIDADE', attrs.speed, DEFAULT_ATTRS.speed],
    ];
    const bars = this.add.graphics();
    const bx = 140;
    const bw = W - 32 - bx - 40;
    rows.forEach(([n, v, b0], i) => {
      const y = ay + 86 + i * 32;
      attrsC.add(tvText(this, 32, y, n, 15, C.muted, 700, 1).setOrigin(0, 0.5));
      bars.fillStyle(TV.ink, 1);
      bars.fillRect(bx, y - 5, bw, 10);
      bars.fillStyle(TV.yellow, 1);
      bars.fillRect(bx, y - 5, bw * (Math.min(v, b0) / 100), 10);
      if (v > b0) {
        bars.fillStyle(TV.green, 1);
        bars.fillRect(bx + bw * (b0 / 100), y - 5, bw * ((v - b0) / 100), 10);
      } else if (v < b0) {
        bars.fillStyle(TV.red, 1);
        bars.fillRect(bx + bw * (v / 100), y - 5, bw * ((b0 - v) / 100), 10);
      }
      attrsC.add(tvText(this, W - 32, y, String(v), 18, C.white, 800, 0).setOrigin(1, 0.5));
    });
    attrsC.add(bars);

    // Interesse dos times
    const iy = ay + 238;
    const list = this.add.container(0, 0);
    list.add(sectionHead(this, 16, iy, 'TIMES MAIS INTERESSADOS', 'INTERESSE'));
    teamInterest(final, s.name).forEach((t, i) => {
      const y = iy + 16 + i * 52;
      const gr = this.add.graphics();
      plate(gr, 16, y, W - 32, 48, TV.ink2, 0.97);
      plate(gr, 16, y, 56, 48, t.team.colors.primary, 1, true, true);
      list.add(gr);
      list.add(this.add.image(45, y + 24, t.team.logo.small).setDisplaySize(32, 32));
      list.add(tvText(this, 86, y + 16, t.team.name, 16, C.white, 800, 0.4).setOrigin(0, 0.5));
      const lb = this.add.graphics();
      lb.fillStyle(TV.ink, 1);
      lb.fillRect(86, y + 32, W - 32 - 140, 6);
      lb.fillStyle(onInk(t.team.colors.primary), 1);
      lb.fillRect(86, y + 32, (W - 32 - 140) * (t.interest / 100), 6);
      list.add(lb);
      list.add(tvText(this, W - 30, y + 24, `${t.interest}%`, 18, C.white, 800, 0).setOrigin(1, 0.5));
    });
    slideIn(this, [hero, attrsC, list], 80, 100);

    const back = new TvButton(this, 14 + 55, H - 46, { w: 110, h: 56, fill: TV.ink3, fillAlpha: 1 });
    back.add(tvText(this, 0, 0, 'VOLTAR', 17, C.white, 800, 1.4).setOrigin(0.5));
    back.onTap = () => wipeTo(this, 'CombineHub');
    const pw = W - 28 - 110 - 10;
    const go = new TvButton(this, W - 14 - pw / 2, H - 46, { w: pw, h: 56, fill: TV.yellow, fillAlpha: 1, primary: true });
    go.add(tvText(this, 0, 0, 'IR PARA O DRAFT', 22, C.ink, 800, 1.4).setOrigin(0.5));
    go.onTap = () => wipeTo(this, 'DraftEspera', TV.yellow);
    tvEnter(this);
  }
}
