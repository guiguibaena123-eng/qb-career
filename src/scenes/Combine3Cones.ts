import Phaser from 'phaser';
import { CombineBase } from '../combine/CombineBase';
import { scoreCones } from '../combine/scoring';
import { Actor, CombineStage, MID, playerLook } from '../combine/stage';
import { GAME_W } from '../config';
import { getSave, type TestId } from '../player/PlayerSave';
import { bottomShade, fieldText, infoPanel } from '../combine/ui';

/*
 * Teste 2 — 3 cones, no campo da partida (visto de costas). O corredor vai sozinho de ponto em ponto
 * e o jogador faz o corte deslizando o dedo na direção da seta quando o anel do cone fecha. Perfeito
 * não perde ritmo, bom perde pouco, falhou derruba o ritmo da perna seguinte e soma +0,3 s.
 * Os pontos estão em jardas (cones a 5 jardas, como no drill de verdade).
 */
type Dir = 'L' | 'R' | 'U' | 'D';
const Y0 = 32;
const P: [number, number][] = [
  [MID, Y0], // largada
  [MID, Y0 + 5],
  [MID - 5, Y0 + 5], // cone
  [MID - 5, Y0 + 10], // cone
  [MID + 5, Y0 + 10], // cone
  [MID + 5, Y0 + 5],
  [MID, Y0 + 5], // linha de chegada
];
const CUT: Dir[] = ['L', 'U', 'R', 'D', 'L']; // corte em P1..P5 = direção da perna seguinte
const BASE = [1.0, 0.85, 1.25, 1.5, 1.25, 0.8]; // segundos de cada perna, com tudo perfeito
const ARROW: Record<Dir, [number, number]> = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };

export class Combine3Cones extends CombineBase {
  constructor() {
    super('Combine3Cones');
  }

  protected testId: TestId = 'cones';
  protected heading = '3 CONES';
  protected instructions = ['O CORREDOR VAI SOZINHO', '', 'DESLIZE O DEDO NA DIREÇÃO DA SETA', 'QUANDO O ANEL DO CONE FECHAR', '', 'CORTE CERTO = TEMPO MENOR'];
  private runner!: Actor;
  private clock!: Phaser.GameObjects.Text;
  private leg = 0;
  private legStart = 0;
  private legDur = 0;
  private judged: (number | null)[] = [];
  private mult = 1;
  private penalty = 0;
  private tStart = 0;
  private f = 1;
  private active = false;
  private down?: { x: number; y: number };
  private panel!: ReturnType<typeof infoPanel>;

  protected world() {
    this.stage = new CombineStage(this, Y0);
    [2, 3, 4].forEach((i) => this.stage.cone(P[i][0], P[i][1]));
    this.runner = this.stage.actor(P[0][0], P[0][1], playerLook());
    this.clock = fieldText(this, GAME_W / 2, 92, 48).setText('0.00');
    bottomShade(this, 190);
    this.panel = infoPanel(this, 'CORTES', 'DESLIZE NA DIREÇÃO DA SETA');
    this.panel.set(0, `0/${CUT.length}`);
  }

  protected scoreOf(raw: number) {
    return scoreCones(raw);
  }

  protected show(raw: number) {
    return `${raw.toFixed(2)} s`;
  }

  protected play() {
    this.f = 1.12 - getSave().attrs.speed / 700; // rookie (60) ≈ 1.03
    this.judged = CUT.map(() => null);
    this.leg = 0;
    this.mult = 1;
    this.penalty = 0;
    this.startLeg();
    this.tStart = this.time.now;
    this.active = true;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.down = { x: p.worldX, y: p.worldY }));
    // O corte vale no instante em que o dedo se afasta o bastante do ponto de toque
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.down || !this.active || !p.isDown) return;
      const dx = p.worldX - this.down.x;
      const dy = p.worldY - this.down.y;
      if (Math.hypot(dx, dy) < 28) return;
      this.down = undefined;
      this.swipe(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : dy < 0 ? 'U' : 'D');
    });
  }

  private startLeg() {
    this.legStart = this.time.now;
    this.legDur = BASE[this.leg] * this.f * this.mult * 1000;
  }

  private arrive() {
    return this.legStart + this.legDur;
  }

  /** Corte: vale para o próximo cone ainda sem nota, se estiver na janela de tempo. */
  private swipe(dir: Dir) {
    const i = this.leg;
    if (i >= CUT.length || this.judged[i] !== null) return;
    const err = Math.abs(this.time.now - this.arrive()) / 1000;
    if (this.time.now < this.arrive() - 600) return;
    const q = dir !== CUT[i] ? 2 : err <= 0.15 ? 0 : err <= 0.3 ? 1 : 2;
    this.judge(i, q);
  }

  private judge(i: number, q: number) {
    this.judged[i] = q;
    this.panel.set((i + 1) / CUT.length, `${i + 1}/${CUT.length}`);
    const s = this.screenAt(P[i + 1][0], P[i + 1][1]);
    if (q === 0) this.popText(s.x, s.y - 70, 'PERFEITO!', '#3CCB5A');
    else if (q === 1) this.popText(s.x, s.y - 70, 'BOM', '#FFD23F');
    else {
      this.popText(s.x, s.y - 70, 'FALHOU +0,3s', '#FF5A5F');
      this.penalty += 0.3;
      this.cameras.main.shake(100, 0.003);
    }
    this.puff(s.x, s.y, q === 0 ? 3 : 7);
    this.buzz(q === 0 ? 12 : 25);
  }

  protected tick() {
    const st = this.stage;
    // Linhas de largada e chegada e marcadores dos pontos de corte sem cone
    st.line(Y0 - 1, MID - 3, MID + 3, 0xffffff, 0.95, 4);
    [1, 5].forEach((i) => st.ring(P[i][0], P[i][1], 0.35, 0xffffff, 0.8, 3));
    st.line(Y0 + 6, MID - 2.5, MID + 2.5, 0xffd23f, 0.9, 4);
    if (!this.active) return;
    const now = this.time.now;
    const i = this.leg;
    const from = P[i];
    const to = P[i + 1];
    const t = Math.min(1, (now - this.legStart) / this.legDur);
    this.runner.x = from[0] + (to[0] - from[0]) * t;
    this.runner.y = from[1] + (to[1] - from[1]) * t;
    this.runner.speed = t < 1 ? 6 : 0;
    this.clock.setText(((now - this.tStart) / 1000 + this.penalty).toFixed(2));

    // Anel que fecha no ponto de corte e seta da direção (a seta fica na tela, por cima)
    if (i < CUT.length) {
      const remain = (this.arrive() - now) / 1000;
      const [cx, cy] = to;
      const open = this.judged[i] === null;
      st.ring(cx, cy, 1.1, open ? 0xffd23f : 0x3a4378, 1, 4);
      if (open) st.ring(cx, cy, 1.1 + Math.max(0, remain) * 4.2, 0xffffff, 0.9, 4);
      const c = this.screenAt(cx, cy);
      const [ax, ay] = ARROW[CUT[i]];
      const g = st.top;
      const k = Math.max(0.7, c.s);
      g.lineStyle(5, 0xffffff, 0.95);
      g.lineBetween(c.x, c.y - 40 * k, c.x + ax * 34, c.y - 40 * k + ay * 34);
      g.fillStyle(0xffffff, 1);
      const bx = c.x + ax * 44;
      const by = c.y - 40 * k + ay * 44;
      g.fillTriangle(bx, by, c.x + ax * 28 - ay * 9, c.y - 40 * k + ay * 28 + ax * 9, c.x + ax * 28 + ay * 9, c.y - 40 * k + ay * 28 - ax * 9);
    }

    if (t >= 1) {
      if (i === P.length - 2) {
        this.active = false;
        const total = (now - this.tStart) / 1000 + this.penalty;
        this.clock.setText(total.toFixed(2));
        this.finish(total);
        return;
      }
      if (this.judged[i] === null && now > this.arrive() + 350) this.judge(i, 2);
      if (this.judged[i] !== null) {
        const q = this.judged[i]!;
        this.mult = q === 0 ? 1 : q === 1 ? 1.04 : 1.12;
        this.leg++;
        this.startLeg();
      }
    }
  }
}
