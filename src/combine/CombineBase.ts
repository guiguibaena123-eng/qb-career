import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { CombineStage } from './stage';
import { getSave, updateSave, type TestId } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';
import { grade, gradeColor, QB_AVG, rng, TESTS } from './scoring';

/*
 * Base dos 4 testes do Combine: cartão de instrução (pula com toque), contagem 3-2-1, teste,
 * cartão de resultado (nota 0–100, letra, comparação com a média dos QBs) e salvamento no PlayerSave.
 * Cada teste só implementa o fundo (`world`), a jogada (`play`) e a nota (`scoreOf`).
 */
export interface Attempt {
  raw: number;
  score: number;
  extra?: number;
}

export abstract class CombineBase extends Phaser.Scene {
  constructor(key: string) {
    super(key);
  }

  protected abstract testId: TestId;
  protected abstract heading: string;
  protected abstract instructions: string[];
  protected attempts = 2;
  protected tries = 0;
  protected best?: Attempt;
  /** Mundo da partida (campo, estádio, câmera). Cada teste o cria em `world()`. */
  protected stage!: CombineStage;

  protected abstract world(): void;
  /** Roda a jogada; ao terminar chama `finish`. `rand` é o gerador com seed desta tentativa. */
  protected abstract play(rand: () => number): void;
  protected abstract scoreOf(raw: number, extra?: number): number;
  protected abstract show(raw: number, extra?: number): string;

  /** Anda a jogada de um quadro (dt em segundos). */
  protected tick(_dt: number): void {}

  /** Ponto da tela de uma posição do campo (jardas), para textos e efeitos. */
  protected screenAt(x: number, y: number, h = 0) {
    return this.stage.proj.project(x, y, h);
  }

  update(_: number, dt: number) {
    if (!this.stage) return;
    this.stage.begin(dt / 1000);
    this.tick(dt / 1000);
    this.stage.end(dt / 1000);
  }

  init(data: { tries?: number; best?: Attempt }) {
    CombineStage.reset(this);
    this.tries = data?.tries ?? 0;
    this.best = data?.best;
  }

  create() {
    setupHiRes(this);
    this.world();
    if (import.meta.env.DEV) (window as unknown as { __qb: unknown }).__qb = this; // gancho de teste automático
    this.add.existing(title(this, GAME_W / 2, 30, this.heading, 13, UI.yellow).setOrigin(0.5).setDepth(50));
    if (this.tries > 0) this.countdown();
    else this.instructionCard();
  }

  protected puff(x: number, y: number, n = 6) {
    for (let i = 0; i < n; i++) {
      const c = this.add.circle(x + Phaser.Math.Between(-6, 6), y, Phaser.Math.Between(3, 6), 0xd8c9a0, 0.7).setDepth(20);
      this.tweens.add({ targets: c, x: c.x + Phaser.Math.Between(-24, 24), y: y - Phaser.Math.Between(8, 26), alpha: 0, scale: 1.8, duration: 450, onComplete: () => c.destroy() });
    }
  }

  protected popText(x: number, y: number, text: string, color: string) {
    const t = title(this, x, y, text, 16, color).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  protected buzz(ms = 10) {
    navigator.vibrate?.(ms);
  }

  // ---- fluxo
  private instructionCard() {
    const W = GAME_W;
    const c = this.add.container(0, 0).setDepth(60);
    c.add(this.add.rectangle(0, 0, W, GAME_H, 0x000000, 0.7).setOrigin(0));
    const card = this.add.graphics();
    card.fillStyle(0x2a3156, 1);
    card.fillRoundedRect(24, 220, W - 48, 330, 18);
    card.lineStyle(2, 0xffd23f, 0.8);
    card.strokeRoundedRect(24, 220, W - 48, 330, 18);
    c.add(card);
    c.add(title(this, W / 2, 252, this.heading, 14, UI.yellow).setOrigin(0.5));
    this.instructions.forEach((l, i) => c.add(label(this, W / 2, 300 + i * 34, l, 9, '#FFFFFF').setOrigin(0.5).setAlign('center')));
    const tip = label(this, W / 2, 520, 'TOQUE PARA COMEÇAR', 9, UI.muted).setOrigin(0.5);
    c.add(tip);
    this.tweens.add({ targets: tip, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    let gone = false;
    const zone = this.add.zone(0, 0, W, GAME_H).setOrigin(0).setInteractive().setDepth(61);
    const go = () => {
      if (gone) return;
      gone = true;
      c.destroy();
      zone.destroy();
      this.countdown();
    };
    zone.once('pointerup', go);
    this.time.delayedCall(3500, go);
  }

  private countdown() {
    let n = 3;
    const t = title(this, GAME_W / 2, 300, '3', 60, '#FFFFFF').setOrigin(0.5).setDepth(60);
    const tick = () => {
      if (n === 0) {
        t.destroy();
        this.play(rng(`${getSave().name}-${this.testId}-${this.tries}`));
        return;
      }
      t.setText(String(n)).setScale(1.4);
      this.tweens.add({ targets: t, scale: 1, duration: 300 });
      this.buzz(8);
      n--;
      this.time.delayedCall(700, tick);
    };
    tick();
  }

  /** O teste terminou com este valor: guarda a melhor tentativa, salva e mostra o resultado. */
  protected finish(raw: number, extra?: number) {
    const score = this.scoreOf(raw, extra);
    this.tries++;
    if (!this.best || score > this.best.score) this.best = { raw, score, extra };
    const b = this.best;
    const save = getSave();
    updateSave({ combine: { ...save.combine, tests: { ...save.combine?.tests, [this.testId]: { raw: b.raw, score: b.score, grade: grade(b.score), extra: b.extra } } } });
    this.cameras.main.shake(180, 0.004);
    this.time.delayedCall(450, () => this.resultCard(raw, extra, score));
  }

  private resultCard(raw: number, extra: number | undefined, score: number) {
    const W = GAME_W;
    const g = grade(score);
    const c = this.add.container(0, 0).setDepth(70);
    c.add(this.add.rectangle(0, 0, W, GAME_H, 0x000000, 0.75).setOrigin(0));
    const card = this.add.graphics();
    card.fillStyle(0x2a3156, 1);
    card.fillRoundedRect(24, 170, W - 48, 440, 18);
    card.lineStyle(2, 0xffd23f, 0.8);
    card.strokeRoundedRect(24, 170, W - 48, 440, 18);
    c.add(card);
    c.add(label(this, W / 2, 200, 'RESULTADO', 9, UI.yellow).setOrigin(0.5));
    c.add(title(this, W / 2, 252, this.show(raw, extra), 20, '#FFFFFF').setOrigin(0.5));
    c.add(title(this, W / 2, 330, String(score), 40, gradeColor(g)).setOrigin(0.5));
    c.add(title(this, W / 2, 384, `NOTA ${g}`, 16, gradeColor(g)).setOrigin(0.5));
    const test = TESTS.find((t) => t.id === this.testId)!;
    const avg = QB_AVG[this.testId];
    c.add(label(this, W / 2, 428, `MÉDIA DOS QBs: ${test.id === 'passing' ? avg + ' pts' : avg + (test.unit === 's' ? ' s' : ' mph')}`, 9, UI.muted).setOrigin(0.5));
    if (this.best && this.attempts > 1) c.add(label(this, W / 2, 452, `MELHOR NOTA: ${this.best.score}  ·  TENTATIVA ${this.tries}/${this.attempts}`, 8, UI.muted).setOrigin(0.5));
    let y = 520;
    if (this.tries < this.attempts) {
      const again = new GlassButton(this, W / 2, y, { w: W - 80, h: 46, radius: 14 });
      again.add(title(this, 0, 0, 'TENTAR DE NOVO', 11, '#FFFFFF').setOrigin(0.5));
      again.onTap = () => this.time.delayedCall(30, () => this.scene.restart({ tries: this.tries, best: this.best }));
      c.add(again);
      y += 54;
    }
    const ok = new GlassButton(this, W / 2, y, { w: W - 80, h: 46, radius: 14, fill: 0xffd23f, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    ok.add(title(this, 0, 0, 'CONTINUAR', 12, '#1a1a1a').setOrigin(0.5));
    ok.onTap = () => this.time.delayedCall(30, () => this.scene.start('CombineHub'));
    c.add(ok);
  }
}
