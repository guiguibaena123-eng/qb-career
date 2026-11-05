import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { CombineStage } from './stage';
import { getSave, updateSave, type TestId } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { C, plate, plateShadow, scoreBug, TV, TvButton, tvText, wipeTo } from '../ui/tv';
import { gradeTv } from '../scenes/CombineHub';
import { grade, QB_AVG, rng, TESTS } from './scoring';

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
    // Placar do topo: nome do teste, tentativa e a saída para a lista do Combine
    scoreBug(this, { title: this.heading, step: `TENTATIVA ${Math.min(this.tries + 1, this.attempts)}/${this.attempts}`, onBack: () => wipeTo(this, 'CombineHub'), depth: 50 });
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
    const t = tvText(this, x, y, text, 26, color, 800, 0.6).setOrigin(0.5).setDepth(40);
    t.setStroke('#0B0E14', 6);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  protected buzz(ms = 10) {
    navigator.vibrate?.(ms);
  }

  // ---- fluxo
  private instructionCard() {
    const W = GAME_W;
    const c = this.add.container(0, 0).setDepth(60);
    c.add(this.add.rectangle(0, 0, W, GAME_H, TV.ink, 0.78).setOrigin(0));
    const idx = TESTS.findIndex((t) => t.id === this.testId);
    // As instruções vêm com linhas vazias de espaçamento; no cartão viram passos numerados
    const steps = this.instructions.filter((l) => l.trim());
    const h = 86 + 26 + steps.length * 52 + 64;
    const top = Math.round((GAME_H - h) / 2) - 10;
    const card = this.add.graphics();
    plateShadow(card, 20, top, W - 40, h);
    plate(card, 20, top, W - 40, h, TV.ink2, 1);
    plate(card, 20, top, W - 40, 86, TV.plate, 1);
    plate(card, 20, top, 76, 86, TV.yellow, 1, true, true);
    c.add(card);
    c.add(tvText(this, 58, top + 36, String(idx + 1), 44, C.ink, 800, 0).setOrigin(0.5));
    c.add(tvText(this, 58, top + 70, 'TESTE', 11, C.ink, 800, 1.4).setOrigin(0.5));
    const hd = tvText(this, 112, top + 43, this.heading, 28, C.ink, 800, 0.6).setOrigin(0, 0.5);
    if (hd.width > W - 40 - 112) hd.setScale((W - 40 - 112) / hd.width, 1);
    c.add(hd);
    steps.forEach((l, i) => {
      const y = top + 122 + i * 52;
      const nb = this.add.graphics();
      plate(nb, 40, y - 15, 30, 30, TV.ink3, 1);
      c.add(nb);
      c.add(tvText(this, 55, y, String(i + 1), 16, C.yellow, 800, 0).setOrigin(0.5));
      c.add(tvText(this, 84, y, l, 16, C.white, 700, 0.4).setOrigin(0, 0.5).setWordWrapWidth(W - 40 - 84).setLineSpacing(-2));
    });
    const tip = tvText(this, W / 2, top + h - 30, 'TOQUE PARA COMEÇAR', 16, C.yellow, 800, 2).setOrigin(0.5);
    c.add(tip);
    this.tweens.add({ targets: tip, alpha: 0.35, yoyo: true, repeat: -1, duration: 600 });
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
  }

  private countdown() {
    let n = 3;
    const t = tvText(this, GAME_W / 2, 300, '3', 150, C.yellow, 800, 0).setOrigin(0.5).setDepth(60);
    t.setStroke('#0B0E14', 10);
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
    const gc = gradeTv(g);
    const c = this.add.container(0, 0).setDepth(70);
    c.add(this.add.rectangle(0, 0, W, GAME_H, TV.ink, 0.82).setOrigin(0));
    const top = 150;
    const card = this.add.graphics();
    plateShadow(card, 20, top, W - 40, 300);
    plate(card, 20, top, W - 40, 300, TV.ink2, 1);
    plate(card, 20, top, W - 40, 64, TV.plate, 1);
    c.add(card);
    c.add(tvText(this, 40, top + 22, 'RESULTADO', 13, C.inkSoft, 800, 1.6).setOrigin(0, 0.5));
    const res = tvText(this, 40, top + 44, this.show(raw, extra).toUpperCase(), 24, C.ink, 800, 0.6).setOrigin(0, 0.5);
    if (res.width > W - 80) res.setScale((W - 80) / res.width, 1);
    c.add(res);
    // nota: bloco chapado na cor da nota
    const nb = this.add.graphics();
    plate(nb, 40, top + 86, 132, 118, gc, 1);
    c.add(nb);
    const fg = gc === TV.yellow ? C.ink : C.white;
    c.add(tvText(this, 106, top + 134, String(score), 64, fg, 800, 0).setOrigin(0.5));
    c.add(tvText(this, 106, top + 184, `NOTA ${g}`, 16, fg, 800, 1.6).setOrigin(0.5));
    const test = TESTS.find((t) => t.id === this.testId)!;
    const avg = QB_AVG[this.testId];
    c.add(tvText(this, 192, top + 104, 'MÉDIA DOS QBs', 12, C.muted, 700, 1.2).setOrigin(0, 0.5));
    c.add(tvText(this, 192, top + 128, test.id === 'passing' ? `${avg} PTS` : `${avg}${test.unit === 's' ? ' S' : ' MPH'}`, 22, C.white, 800, 0.4).setOrigin(0, 0.5));
    if (this.best && this.attempts > 1) {
      c.add(tvText(this, 192, top + 160, 'MELHOR NOTA', 12, C.muted, 700, 1.2).setOrigin(0, 0.5));
      c.add(tvText(this, 192, top + 184, `${this.best.score} · TENT. ${this.tries}/${this.attempts}`, 18, C.white, 800, 0.4).setOrigin(0, 0.5));
    }
    c.add(tvText(this, W / 2, top + 260, 'A MELHOR TENTATIVA É A QUE VALE', 13, C.dim, 700, 1.2).setOrigin(0.5));
    let y = top + 340;
    if (this.tries < this.attempts) {
      const again = new TvButton(this, W / 2, y, { w: W - 40, h: 52, fill: TV.ink3, fillAlpha: 1 });
      again.add(tvText(this, 0, 0, 'TENTAR DE NOVO', 19, C.white, 800, 1.4).setOrigin(0.5));
      again.onTap = () => this.time.delayedCall(30, () => this.scene.restart({ tries: this.tries, best: this.best }));
      c.add(again);
      y += 62;
    }
    const ok = new TvButton(this, W / 2, y, { w: W - 40, h: 56, fill: TV.yellow, fillAlpha: 1, primary: true });
    ok.add(tvText(this, 0, 0, 'CONTINUAR', 22, C.ink, 800, 1.6).setOrigin(0.5));
    ok.onTap = () => wipeTo(this, 'CombineHub', TV.yellow);
    c.add(ok);
  }
}
