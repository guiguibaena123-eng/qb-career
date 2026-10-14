import Phaser from 'phaser';
import { grade, gradeColor, SKIP_SCORE, TESTS } from '../combine/scoring';
import { GAME_H, GAME_W } from '../config';
import { getSave, updateSave, type TestId } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';

/*
 * Hub do Combine: lista os 4 testes (pendente/feito, resultado e nota). VER RESULTADO só libera com os
 * 4 resolvidos. Decisão: o jogador pode PULAR um teste, que vale nota fixa 40 (D) na média final.
 */
export function fmtRaw(id: TestId, raw: number, extra?: number) {
  return id === 'sprint40' || id === 'cones' ? `${raw.toFixed(2)} s` : id === 'passing' ? `${Math.round(raw)} pts` : `${raw.toFixed(0)} mph · ${(extra ?? 0).toFixed(0)} jd`;
}

export class CombineHub extends Phaser.Scene {
  constructor() {
    super('CombineHub');
  }

  create() {
    setupHiRes(this);
    const W = GAME_W;
    const H = GAME_H;
    this.add.rectangle(0, 0, W, H, 0x0a0c1a).setOrigin(0);
    this.add.existing(title(this, W / 2, 50, 'COMBINE', 20, UI.yellow).setOrigin(0.5));
    this.add.existing(label(this, W / 2, 84, 'QUATRO TESTES ANTES DO DRAFT', 8, UI.muted).setOrigin(0.5));
    const tests = getSave().combine?.tests ?? {};
    let done = 0;
    TESTS.forEach((t, i) => {
      const r = tests[t.id];
      if (r) done++;
      const y = 160 + i * 112;
      const b = new GlassButton(this, W / 2, y, { w: W - 36, h: 96, radius: 16, border: r ? 0x3ccb5a : 0xffffff, borderAlpha: r ? 0.8 : 0.16 });
      b.add(label(this, -(W - 36) / 2 + 16, -30, `TESTE ${i + 1}`, 7, UI.muted).setOrigin(0, 0.5));
      b.add(title(this, -(W - 36) / 2 + 16, -8, t.name, 12, '#FFFFFF').setOrigin(0, 0.5));
      if (r) {
        b.add(label(this, -(W - 36) / 2 + 16, 22, r.skipped ? 'PULADO (NOTA 40)' : fmtRaw(t.id, r.raw, r.extra), 9, '#C9CEE0').setOrigin(0, 0.5));
        b.add(title(this, (W - 36) / 2 - 20, -6, r.grade, 20, gradeColor(r.grade)).setOrigin(1, 0.5));
        b.add(label(this, (W - 36) / 2 - 20, 22, `NOTA ${r.score}`, 8, UI.muted).setOrigin(1, 0.5));
      } else {
        b.add(label(this, -(W - 36) / 2 + 16, 22, 'PENDENTE', 9, '#FFD23F').setOrigin(0, 0.5));
      }
      b.onTap = () => this.time.delayedCall(30, () => this.scene.start(t.scene));
      this.add.existing(b);
      if (!r) {
        const skip = new GlassButton(this, W - 18 - 52 - 8, y + 26, { w: 70, h: 28, radius: 8 });
        skip.add(label(this, 0, 0, 'PULAR', 8, UI.muted).setOrigin(0.5));
        skip.onTap = () => {
          const c = getSave().combine;
          updateSave({ combine: { ...c, tests: { ...c?.tests, [t.id]: { raw: 0, score: SKIP_SCORE, grade: grade(SKIP_SCORE), skipped: true } } } });
          this.scene.restart();
        };
        this.add.existing(skip);
      }
    });

    const res = new GlassButton(this, W / 2 + 40, H - 40, { w: W - 28 - 120, h: 52, radius: 16, fill: 0xffd23f, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    res.add(title(this, 0, 0, 'VER RESULTADO', 12, '#1a1a1a').setOrigin(0.5));
    res.onTap = () => this.time.delayedCall(30, () => this.scene.start('CombineResultado'));
    res.setEnabled(done === TESTS.length);
    this.add.existing(res);
    const back = new GlassButton(this, 14 + 50, H - 40, { w: 100, h: 52, radius: 16 });
    back.add(label(this, 0, 0, 'SAIR', 9, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.scene.start('CareerSlots'));
    this.add.existing(back);
    const reset = new GlassButton(this, W / 2, H - 98, { w: 150, h: 28, radius: 8 });
    reset.add(label(this, 0, 0, 'REINICIAR COMBINE', 7, UI.muted).setOrigin(0.5));
    reset.onTap = () => {
      updateSave({ combine: { tests: {} } });
      this.scene.restart();
    };
    this.add.existing(reset);
  }
}
