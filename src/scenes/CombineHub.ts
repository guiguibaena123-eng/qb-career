import Phaser from 'phaser';
import { grade, SKIP_SCORE, TESTS } from '../combine/scoring';
import { GAME_H, GAME_W } from '../config';
import { getSave, updateSave, type TestId } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { C, feed, plate, scoreBug, sectionHead, slideIn, TV, tvEnter, TvButton, tvText, wipeTo } from '../ui/tv';

/*
 * Hub do Combine: lista os 4 testes (pendente/feito, resultado e nota). VER RESULTADO só libera com os
 * 4 resolvidos. Decisão: o jogador pode PULAR um teste, que vale nota fixa 40 (D) na média final.
 * PULAR e REINICIAR pedem dois toques (não dá para desfazer).
 */
export function fmtRaw(id: TestId, raw: number, extra?: number) {
  return id === 'sprint40' || id === 'cones' ? `${raw.toFixed(2)} s` : id === 'passing' ? `${Math.round(raw)} pts` : `${raw.toFixed(0)} mph · ${(extra ?? 0).toFixed(0)} jd`;
}

/** Cor da nota no pacote da transmissão: A/B = verde (status bom), C = amarelo, D = vermelho. */
export const gradeTv = (g: string) => (g[0] === 'A' || g[0] === 'B' ? TV.green : g[0] === 'C' ? TV.yellow : TV.red);

const DESC: Record<TestId, string> = {
  sprint40: 'VELOCIDADE EM LINHA RETA',
  cones: 'AGILIDADE E MUDANÇA DE DIREÇÃO',
  passing: 'ACERTE OS ALVOS EM MOVIMENTO',
  arm: 'VELOCIDADE E DISTÂNCIA DO LANÇAMENTO',
};

export class CombineHub extends Phaser.Scene {
  private armed = '';
  private first = true;

  constructor() {
    super('CombineHub');
  }

  create() {
    setupHiRes(this);
    this.armed = '';
    this.first = true;
    this.draw();
    tvEnter(this);
  }

  private arm(key: string, fire: () => void) {
    if (this.armed !== key) {
      this.armed = key;
      this.time.delayedCall(2600, () => {
        if (this.armed === key) {
          this.armed = '';
          this.draw();
        }
      });
    } else {
      this.armed = '';
      fire();
    }
    this.time.delayedCall(20, () => this.draw());
  }

  private draw() {
    this.children.removeAll(true);
    const W = GAME_W;
    const H = GAME_H;
    feed(this, null, 0.82);
    const tests = getSave().combine?.tests ?? {};
    const done = TESTS.filter((t) => tests[t.id]).length;
    scoreBug(this, { title: 'COMBINE', step: `${done} DE ${TESTS.length} TESTES`, onBack: () => wipeTo(this, 'CareerSlots') });

    // progresso: quatro placas, as feitas em verde
    const pg = this.add.graphics();
    const pw = (W - 24 - 9) / 4;
    TESTS.forEach((t, i) => plate(pg, 12 + i * (pw + 3), 62, pw, 7, tests[t.id] ? TV.green : TV.ink3));
    sectionHead(this, 16, 98, 'QUATRO TESTES ANTES DO DRAFT');

    const items: Phaser.GameObjects.GameObject[] = [];
    const bw = W - 32;
    const bh = 118;
    TESTS.forEach((t, i) => {
      const r = tests[t.id];
      const y = 122 + i * (bh + 10);
      const b = new TvButton(this, 16 + bw / 2, y + bh / 2, { w: bw, h: bh, fill: r ? TV.plate : TV.ink2, fillAlpha: 1 });
      const x0 = -bw / 2;
      // bloco do número do teste
      const blk = this.add.graphics();
      plate(blk, x0, -bh / 2, 64, bh, r ? TV.ink : TV.ink3, 1);
      b.add(blk);
      b.add(tvText(this, x0 + 33, -6, String(i + 1), 44, r ? C.white : C.yellow, 800, 0).setOrigin(0.5));
      b.add(tvText(this, x0 + 33, 30, 'TESTE', 11, C.muted, 700, 1.4).setOrigin(0.5));
      const tx = x0 + 82;
      const fg = r ? C.ink : C.white;
      b.add(tvText(this, tx, -30, t.name, 24, fg, 800, 0.6).setOrigin(0, 0.5));
      b.add(tvText(this, tx, -6, DESC[t.id], 13, r ? C.inkSoft : C.muted, 600, 0.6).setOrigin(0, 0.5));
      if (r) {
        b.add(tvText(this, tx, 30, r.skipped ? 'PULADO · NOTA FIXA 40' : fmtRaw(t.id, r.raw, r.extra).toUpperCase(), 17, C.ink, 800, 0.6).setOrigin(0, 0.5));
        const gc = gradeTv(r.grade);
        const gb = this.add.graphics();
        plate(gb, bw / 2 - 86, -bh / 2 + 14, 70, 62, gc, 1);
        b.add(gb);
        b.add(tvText(this, bw / 2 - 51, -bh / 2 + 45, r.grade, 34, gc === TV.yellow ? C.ink : C.white, 800, 0).setOrigin(0.5));
        b.add(tvText(this, bw / 2 - 51, bh / 2 - 22, `NOTA ${r.score}`, 13, C.inkSoft, 700, 1).setOrigin(0.5));
      } else {
        const chip = this.add.graphics();
        plate(chip, tx - 2, 18, 92, 22, TV.yellow);
        b.add(chip);
        b.add(tvText(this, tx + 44, 29, 'PENDENTE', 12, C.ink, 800, 1.4).setOrigin(0.5));
        // seta: tocar abre o teste
        const ar = this.add.graphics();
        ar.lineStyle(3, TV.plate, 1);
        ar.beginPath();
        ar.moveTo(bw / 2 - 32, -9);
        ar.lineTo(bw / 2 - 23, 0);
        ar.lineTo(bw / 2 - 32, 9);
        ar.strokePath();
        b.add(ar);
      }
      b.onTap = () => wipeTo(this, t.scene, TV.yellow);
      items.push(b);
      if (!r) {
        const armed = this.armed === t.id;
        const sw = armed ? 132 : 78;
        const skip = new TvButton(this, 16 + bw - 46 - sw / 2, y + bh - 26, { w: sw, h: 32, fill: armed ? TV.red : TV.ink3, fillAlpha: 1 });
        skip.add(tvText(this, 0, 0, armed ? 'TOQUE P/ PULAR' : 'PULAR', 13, C.white, 800, 1.2).setOrigin(0.5));
        skip.onTap = () =>
          this.arm(t.id, () => {
            const c = getSave().combine;
            updateSave({ combine: { ...c, tests: { ...c?.tests, [t.id]: { raw: 0, score: SKIP_SCORE, grade: grade(SKIP_SCORE), skipped: true } } } });
          });
        items.push(skip);
      }
    });

    // reiniciar (dois toques) — só quando há algo para apagar
    if (done) {
      const armed = this.armed === 'reset';
      const rw = armed ? 220 : 170;
      const reset = new TvButton(this, W / 2, H - 104, { w: rw, h: 32, fill: armed ? TV.red : TV.ink, fillAlpha: 0.9 });
      reset.add(tvText(this, 0, 0, armed ? 'TOQUE P/ APAGAR OS TESTES' : 'REINICIAR COMBINE', 13, armed ? C.white : C.muted, 700, 1.2).setOrigin(0.5));
      reset.onTap = () => this.arm('reset', () => updateSave({ combine: { tests: {} } }));
    }

    const back = new TvButton(this, 14 + 55, H - 46, { w: 110, h: 56, fill: TV.ink3, fillAlpha: 1 });
    back.add(tvText(this, 0, 0, 'SAIR', 17, C.white, 800, 1.4).setOrigin(0.5));
    back.onTap = () => wipeTo(this, 'CareerSlots');
    const rw = W - 28 - 110 - 10;
    const ready = done === TESTS.length;
    const res = new TvButton(this, W - 14 - rw / 2, H - 46, { w: rw, h: 56, fill: TV.yellow, fillAlpha: 1, primary: true });
    res.add(tvText(this, 0, 0, ready ? 'VER RESULTADO' : `FALTAM ${TESTS.length - done} TESTES`, 21, C.ink, 800, 1.2).setOrigin(0.5));
    res.onTap = () => wipeTo(this, 'CombineResultado', TV.yellow);
    if (!ready) {
      // bloqueado: placa de tinta com texto apagado (amarelo transparente vira oliva)
      res.setFill(TV.ink3, 1, false);
      (res.list.find((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text).setColor(C.muted);
      res.setEnabled(false);
      res.setAlpha(1);
    }
    if (this.first) slideIn(this, items, 50, 80);
    this.first = false;
  }
}
