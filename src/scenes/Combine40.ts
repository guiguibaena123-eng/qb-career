import Phaser from 'phaser';
import { CombineBase } from '../combine/CombineBase';
import { score40 } from '../combine/scoring';
import { Actor, CombineStage, MID, playerLook } from '../combine/stage';
import { GAME_H, GAME_W } from '../config';
import { getSave, type TestId } from '../player/PlayerSave';
import { bottomShade, fieldText, MeterBar, sideButtons } from '../combine/ui';

/*
 * Teste 1 — 40 jardas, no mesmo campo e câmera da partida (visto de costas, a câmera acompanha o
 * corredor). "PRONTO… JÁ!" (reação), depois toques ESQ/DIR alternados dentro da zona verde de
 * cadência. A velocidade vem de uma simulação simples: cada toque certo soma aceleração, o resto
 * perde velocidade; o atributo de velocidade do rookie escala o ganho.
 */
const DRAG = 0.45; // perda de velocidade por segundo
const GAIN = 1.9; // jardas/s ganhas por toque certo (rookie, velocidade 60)
const ZONE = 0.09; // tolerância do ritmo (s)
const START = 30; // jarda da linha de largada

export class Combine40 extends CombineBase {
  constructor() {
    super('Combine40');
  }

  protected testId: TestId = 'sprint40';
  protected heading = '40 JARDAS';
  protected instructions = ['TOQUE NO "JÁ!" PARA LARGAR', '', 'DEPOIS TOQUE ESQ E DIR ALTERNANDO', 'NO RITMO DA ZONA VERDE', '', 'CORRA O MAIS RÁPIDO POSSÍVEL'];
  private runner!: Actor;
  private phase: 'wait' | 'go' | 'run' | 'done' = 'wait';
  private x = 0;
  private v = 0;
  private t0 = 0;
  private penalty = 0;
  private reaction = 0;
  private lastTap = 0;
  private lastSide: 'L' | 'R' | null = null;
  private clock!: Phaser.GameObjects.Text;
  private cadence!: MeterBar;
  private banner!: Phaser.GameObjects.Text;
  private splits = new Set<number>();
  private speedFactor = 1;

  protected world() {
    this.stage = new CombineStage(this, START - 8);
    this.runner = this.stage.actor(MID, START, playerLook());
    for (const y of [10, 20, 30, 40]) this.stage.mark(y === 40 ? 'META' : `${y}`, MID - 11, START + y, 24, '#FFD23F');
    this.clock = fieldText(this, GAME_W / 2, 92, 52).setText('0.00');
    this.banner = fieldText(this, GAME_W / 2, 200, 46, '#FFC400');
    bottomShade(this, 300);
    this.cadence = new MeterBar(this, GAME_H - 150);
    this.drawCadence(0);
  }

  protected scoreOf(raw: number) {
    return score40(raw);
  }

  protected show(raw: number) {
    return `${raw.toFixed(2)} s`;
  }

  protected play(rand: () => number) {
    this.speedFactor = 0.9 + getSave().attrs.speed / 600;
    this.phase = 'wait';
    this.banner.setText('PRONTO...');
    sideButtons(this, 'ESQ', 'DIR', () => this.tap('L'), () => this.tap('R'));
    this.time.delayedCall(800 + rand() * 1000, () => {
      this.phase = 'go';
      this.t0 = this.time.now;
      this.banner.setText('JÁ!');
    });
  }

  private ideal() {
    return this.x < 30 ? 0.27 : 0.23; // fadiga: nos últimos 10 jardas o ritmo acelera
  }

  private feet() {
    return this.screenAt(MID, START + this.x);
  }

  private tap(side: 'L' | 'R') {
    const now = this.time.now;
    if (this.phase === 'wait') {
      if (this.penalty === 0) {
        this.penalty = 0.2;
        this.popText(GAME_W / 2, 250, 'QUEIMOU! +0,2s', '#FF5A5F');
      }
      return;
    }
    if (this.phase === 'go') {
      this.phase = 'run';
      this.reaction = (now - this.t0) / 1000;
      this.banner.setText('');
      this.v += GAIN * this.speedFactor;
      this.lastTap = now;
      this.lastSide = side;
      this.popText(GAME_W / 2, 250, `REAÇÃO ${this.reaction.toFixed(2)}s`, this.reaction < 0.25 ? '#3CCB5A' : '#FFD23F');
      const f = this.feet();
      this.puff(f.x, f.y);
      return;
    }
    if (this.phase !== 'run') return;
    const gap = (now - this.lastTap) / 1000;
    if (side === this.lastSide) {
      this.v *= 0.9;
      this.popText(GAME_W / 2, 250, 'ALTERNE!', '#FF5A5F');
    } else if (Math.abs(gap - this.ideal()) <= ZONE) {
      this.v += GAIN * this.speedFactor;
      this.popText(GAME_W / 2, 250, 'PERFEITO!', '#3CCB5A');
      const f = this.feet();
      this.puff(f.x, f.y, 3);
      this.buzz();
    } else {
      this.v *= 0.97;
      this.popText(GAME_W / 2, 250, gap > this.ideal() ? 'LENTO' : 'RÁPIDO', '#FFD23F');
    }
    this.lastTap = now;
    this.lastSide = side;
  }

  /** Barra de cadência no desenho da partida: a faixa verde é o ritmo ideal e a agulha, o tempo desde o último toque. */
  private drawCadence(elapsed: number) {
    const max = 0.5;
    this.cadence?.draw((Math.min(elapsed, max) / max) * 2 - 1, (this.ideal() / max) * 2 - 1, ZONE / (max / 2), true);
  }

  protected tick(s: number) {
    const st = this.stage;
    // Faixa de largada, parciais de 10 em 10 jardas e linha de chegada no gramado
    st.line(START, MID - 9, MID + 9, 0xffffff, 0.95, 4);
    for (const y of [10, 20, 30]) st.line(START + y, MID - 7, MID + 7, 0xffffff, 0.45, 3);
    st.line(START + 40, MID - 9, MID + 9, 0xffd23f, 0.95, 5);
    this.runner.y = START + Math.min(this.x, 40);
    this.runner.speed = this.phase === 'run' ? this.v : 0;
    st.world.targetY = this.runner.y - 8;
    if (this.phase === 'run') {
      this.v = Math.max(0, this.v - DRAG * this.v * s);
      this.x += this.v * s;
      const el = (this.time.now - this.t0) / 1000;
      this.clock.setText((el + this.penalty).toFixed(2));
      this.drawCadence((this.time.now - this.lastTap) / 1000);
      for (const m of [10, 20]) {
        if (this.x >= m && !this.splits.has(m)) {
          this.splits.add(m);
          const f = this.feet();
          this.popText(f.x, f.y - 90, `${m}j  ${el.toFixed(2)}s`, '#C9CEE0');
        }
      }
      if (this.x >= 40) {
        this.phase = 'done';
        this.runner.speed = 0;
        const total = el + this.penalty;
        this.clock.setText(total.toFixed(2));
        const f = this.feet();
        this.popText(f.x, f.y - 90, `40j  ${total.toFixed(2)}s`, '#FFD23F');
        this.finish(total);
      }
    }
  }
}
