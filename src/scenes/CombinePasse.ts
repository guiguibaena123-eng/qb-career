import Phaser from 'phaser';
import { sfx } from '../systems/sfx';
import { CombineBase } from '../combine/CombineBase';
import { clamp } from '../combine/scoring';
import { Actor, CombineStage, MID, playerLook } from '../combine/stage';
import { GAME_H, GAME_W } from '../config';
import type { TestId } from '../player/PlayerSave';
import { aimFromDrag, arcAt, riskColor, type Throw } from '../systems/passing';
import { groundOval, groundRing, groundSegment } from '../systems/groundfx';
import { Tag } from '../ui/widgets';
import { forcePanel } from '../combine/forcePanel';
import { bottomShade, pill } from '../combine/ui';

/*
 * Teste 3 — precisão de passe, no campo da partida e com a mesma mecânica de passe do jogo (passe
 * estilingue: arraste para trás e solte; a força vem do tamanho do arrasto). 10 lançamentos para
 * recebedores em movimento (curtos, médios e longos, com velocidades diferentes). Centro = 100,
 * anel = 50–75, borda = 25; bônus por lançar na frente do alvo. Nota = média dos 10. Série única.
 */
const THROWS = 10;
const R = 2.6; // raio do alvo (jardas)
const QB_Y = 28;

export class CombinePasse extends CombineBase {
  constructor() {
    super('CombinePasse');
  }

  protected testId: TestId = 'passing';
  protected heading = 'PRECISÃO DE PASSE';
  protected attempts = 1;
  protected instructions = ['10 PASSES EM RECEBEDORES EM MOVIMENTO', '', 'ARRASTE PARA TRÁS E SOLTE', 'A BOLA VAI PARA O LADO OPOSTO', '', 'LANCE NA FRENTE DO ALVO!'];
  private qb!: Actor;
  private wr!: Actor;
  private vx = 0;
  private vy = 0;
  private yMin = 0;
  private yMax = 0;
  private info!: ReturnType<typeof pill>;
  private panel!: ReturnType<typeof forcePanel>;
  private aimTag!: Tag;
  private thr: Throw | null = null;
  private elapsed = 0;
  private n = 0;
  private scores: number[] = [];
  private hits = 0;
  private combo = 0;
  private locked = true;
  private flying: { t: Throw; wr0: { x: number; y: number } } | null = null;
  private rand!: () => number;
  private drag?: { sx: number; sy: number; cx: number; cy: number; mx: number; my: number };

  protected world() {
    this.stage = new CombineStage(this, QB_Y + 19);
    this.qb = this.stage.actor(MID, QB_Y, playerLook());
    // Recebedor: uniforme alternativo (cores invertidas da faculdade)
    const l = playerLook();
    this.wr = this.stage.actor(MID, QB_Y + 14, { ...l, jersey: l.trim, helmet: l.trim, pants: l.trim, trim: l.jersey, num: l.jersey, digits: '88' });
    this.wr.stepVol = 0.35; // longe: pisadas baixinhas
    this.stage.makeBall();
    this.info = pill(this, 116);
    bottomShade(this, 190);
    this.panel = forcePanel(this);
    this.aimTag = new Tag(this, '', 0xe5484d, '#FFFFFF', 8).setDepth(41).setVisible(false);
  }

  protected scoreOf(raw: number) {
    return Math.round(raw);
  }

  protected show(raw: number) {
    return `${this.hits}/${THROWS} ALVOS · MÉDIA ${Math.round(raw)}`;
  }

  protected play(rand: () => number) {
    this.rand = rand;
    this.n = 0;
    this.scores = [];
    this.hits = 0;
    this.combo = 0;
    this.spawn();
    // Passe estilingue do jogo rápido: toque no campo, arraste para trás e solte
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.locked || p.worldY < 110 || p.worldY > GAME_H - 110) return;
      this.drag = { sx: p.worldX, sy: p.worldY, cx: p.worldX, cy: p.worldY, mx: 0, my: 0 };
      this.panel.hint(false);
      this.qb.pose = 'throw';
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.drag) {
        this.drag.cx = p.worldX;
        this.drag.cy = p.worldY;
      }
    });
    this.input.on('pointerup', () => this.release());
  }

  /** Novo alvo: curto (lento), médio ou longo (rápido) conforme o lançamento. */
  private spawn() {
    const r = this.rand;
    const kind = this.n % 3; // 0 curto, 1 médio, 2 longo
    const speed = [3.2, 5.2, 7.5][kind] * (0.8 + r() * 0.5);
    const dir = r() < 0.5 ? 1 : -1;
    this.yMin = QB_Y + [18, 30, 42][kind];
    this.yMax = this.yMin + 5;
    this.wr.x = 10 + r() * 33;
    this.wr.y = this.yMin + r() * 5;
    this.vx = dir * speed;
    this.vy = (r() - 0.5) * speed * 0.35;
    this.locked = false;
    this.qb.pose = null;
    this.info.set(`LANÇAMENTO ${this.n + 1}/${THROWS}   ACERTOS ${this.hits}   COMBO ${this.combo}`);
  }

  private release() {
    if (!this.drag || this.locked) return;
    const t = this.thr;
    this.drag = undefined;
    this.thr = null;
    this.aimTag.setVisible(false);
    this.panel.set(0, 'ARRASTE PARA TRÁS PARA LANÇAR', '#C9CEE0');
    if (!t) {
      this.qb.pose = null;
      return;
    }
    this.locked = true;
    this.time.delayedCall(350, () => (this.qb.pose = null));
    this.flying = { t, wr0: { x: this.wr.x, y: this.wr.y } };
    this.stage.ball!.launch(t);
    this.buzz(10);
  }

  private land(t: Throw, wr0: { x: number; y: number }) {
    const d = Math.hypot(t.tx - this.wr.x, t.ty - this.wr.y);
    let s = d <= R * 0.33 ? 100 : d <= R * 0.66 ? 75 : d <= R ? 50 : d <= R * 1.4 ? 25 : 0;
    // bônus por lançar na frente do alvo (para onde ele ia)
    const sp = Math.hypot(this.vx, this.vy) || 1;
    const lead = ((t.tx - wr0.x) * this.vx + (t.ty - wr0.y) * this.vy) / sp;
    if (s >= 50 && lead > R * 0.5) s = Math.min(100, s + 10);
    this.scores.push(s);
    // recebedor pega a bola, ou ela quica no gramado
    sfx.play(s >= 50 ? 'catch' : 'bounce', { vol: s >= 50 ? 0.9 : 0.6, x: this.wr.x });
    if (s >= 50) {
      this.hits++;
      this.combo++;
    } else this.combo = 0;
    const txt = s >= 100 ? 'PERFEITO!' : s >= 75 ? 'ÓTIMO!' : s >= 50 ? 'BOM' : s >= 25 ? 'NA BORDA' : 'FALHOU';
    const p = this.screenAt(t.tx, t.ty);
    this.popText(p.x, p.y - 40, `${txt}${this.combo > 2 ? ' x' + this.combo : ''}`, s >= 50 ? '#3CCB5A' : '#FF5A5F');
    this.puff(p.x, p.y, s >= 50 ? 3 : 6);
    this.buzz(s >= 50 ? 15 : 30);
    this.n++;
    this.stage.ball!.state = 'held';
    this.stage.ball!.hide();
    if (this.n >= THROWS) {
      this.time.delayedCall(700, () => this.finish(this.scores.reduce((a, b) => a + b, 0) / THROWS));
    } else this.time.delayedCall(700, () => this.spawn());
  }

  protected tick(s: number) {
    const st = this.stage;
    // O recebedor corre por uma faixa de campo, indo e voltando
    if (this.n < THROWS) {
      this.wr.x += this.vx * s;
      this.wr.y += this.vy * s;
      if (this.wr.x < 6 || this.wr.x > 47) this.vx *= -1;
      if (this.wr.y < this.yMin || this.wr.y > this.yMax) this.vy *= -1;
      this.wr.x = clamp(this.wr.x, 5.5, 47.5);
      this.wr.speed = Math.hypot(this.vx, this.vy);
      st.world.targetY = QB_Y + 19;
    }
    // Alvo no gramado (anéis do centro à borda) em volta do recebedor
    if (this.n < THROWS) {
      st.ring(this.wr.x, this.wr.y, R, 0xffffff, 0.95, 4);
      st.ring(this.wr.x, this.wr.y, R * 0.66, 0xffd23f, 0.95, 4);
      st.ring(this.wr.x, this.wr.y, R * 0.33, 0xff3b3b, 0.95, 4);
    }
    if (this.flying) {
      if (st.ball!.update(s)) {
        const f = this.flying;
        this.flying = null;
        this.land(f.t, f.wr0);
      }
    }
    this.elapsed += s;
    // Mira suavizada (não treme), como na partida
    this.thr = null;
    if (this.drag) {
      const d = this.drag;
      const k = 1 - Math.pow(0.0001, s);
      d.mx += (d.cx - d.sx - d.mx) * k;
      d.my += (d.cy - d.sy - d.my) * k;
      this.thr = aimFromDrag({ x: this.qb.x, y: this.qb.y }, d.mx, d.my);
    }
    if (this.thr) this.drawAim(this.thr);
    else {
      this.aimTag.setVisible(false);
      if (this.drag) this.panel.set(0, 'PUXE MAIS PARA TRÁS', '#C9CEE0');
    }
    // Dica de arrastar sobre o QB enquanto ninguém lançou
    if (!this.locked && !this.drag) {
      const q = this.screenAt(this.qb.x, this.qb.y);
      this.panel.hint(true, q.x, Math.min(GAME_H - 150, q.y + 46));
    } else if (this.locked) this.panel.hint(false);
  }

  /** Trajetória e mira no mesmo desenho do jogo rápido: arco com brilho, sombra tracejada e mira no gramado. */
  private drawAim(t: Throw) {
    const g = this.stage.ground;
    const top = this.stage.top;
    const proj = this.stage.proj;
    const N = 50;
    const pts: Phaser.Math.Vector2[] = [];
    const shadow: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const [x, y, h] = arcAt(t, i / N);
      const p = proj.project(x, y, h);
      pts.push(new Phaser.Math.Vector2(p.x, p.y));
      const q = proj.project(x, y, 0);
      shadow.push({ x: q.x, y: q.y });
    }
    g.lineStyle(3, 0x000000, 0.4);
    for (let i = 0; i < N; i += 3) g.lineBetween(shadow[i].x, shadow[i].y, shadow[i + 1].x, shadow[i + 1].y);
    // Chance de acerto: onde o recebedor estará quando a bola chegar
    const fx = this.wr.x + this.vx * t.T;
    const fy = this.wr.y + this.vy * t.T;
    const miss = Math.hypot(t.tx - fx, t.ty - fy);
    const chance = clamp(1 - miss / (R * 1.8), 0, 1);
    const risk = riskColor(chance);
    top.lineStyle(10, 0x3fd0ff, 0.35);
    top.strokePoints(pts, false);
    top.lineStyle(3.5, 0xffffff, 1);
    top.strokePoints(pts, false);
    const pulse = 1 + Math.sin(this.elapsed * 9) * 0.07;
    const { tx, ty } = t;
    groundOval(g, proj, tx, ty, 6.4 * pulse, 6.4 * pulse, risk, 0.12, risk, 0, 0.01);
    groundOval(g, proj, tx, ty, 4.8 * pulse, 4.8 * pulse, risk, 0.16, risk, 0, 0.01);
    groundRing(g, proj, tx, ty, 2.2 * pulse, 0.55, risk, 1);
    groundRing(g, proj, tx, ty, 1.1, 0.28, 0xffffff, 1);
    groundRing(g, proj, tx, ty, 0.15, 0.3, risk, 1, 12);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      groundSegment(g, proj, tx + dx * 2.9, ty + dy * 2.9, tx + dx * 3.9, ty + dy * 3.9, 0.3, 0xffffff, 1);
    }
    const p = proj.project(tx, ty + 3.4, 0);
    const word = chance >= 0.62 ? 'LIVRE' : chance >= 0.38 ? 'APERTADO' : 'LONGE';
    this.aimTag.setVisible(true).setLabel(`QUEDA · ${word} · ${Math.round(chance * 100)}%`, risk, risk === 0xe5484d ? '#FFFFFF' : '#0D0D12').setPosition(p.x, p.y);
    this.panel.set(t.power, `ALVO: ${word}`, `#${risk.toString(16).padStart(6, '0')}`);
  }
}
