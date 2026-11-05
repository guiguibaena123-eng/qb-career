import Phaser from 'phaser';
import { arcAt, type Throw } from '../systems/passing';
import type { ShadowLight } from '../systems/daytime';
import type { Projection, ScreenPoint } from '../systems/projection';
import type { Player } from './Player';

/*
 * A bola: na mão de alguém, em voo (seguindo o arco do passe) ou solta no chão.
 * Desenhada em pixel art com sombra no chão e um rastro curto quando voa.
 */

const p: ScreenPoint = { x: 0, y: 0, s: 0 };
const g0: ScreenPoint = { x: 0, y: 0, s: 0 };
const g1: ScreenPoint = { x: 0, y: 0, s: 0 };

export class Ball {
  /** Luzes das sombras no chão (noite/tarde); null = só a sombra simples. */
  lights: ShadowLight[] | null = null;
  state: 'held' | 'air' | 'loose' = 'held';
  holder: Player | null = null;
  throw: Throw | null = null;
  /** Progresso do voo (0–1). */
  u = 0;
  x = 0;
  y = 0;
  h = 0;
  private img: Phaser.GameObjects.Image;
  private trail: { x: number; y: number }[] = [];
  private spin = 0;
  /** Passe: espiral (gira em volta do próprio eixo). Chutes (field goal, punt, kickoff): de ponta a ponta, meio torto. */
  spinMode: 'spiral' | 'tumble' = 'spiral';
  /** Bola em pé no chão (presa pelo segurador antes do field goal); sai sozinho quando ela começa a voar. */
  upright = false;
  /** Kickoff: o tee no chão (fica lá depois do chute, até alguém pegar a bola). */
  tee: { x: number; y: number } | null = null;
  /** Posição do quadro anterior (direção do voo). */
  private prev = { x: 0, y: 0, h: 0 };

  constructor(private scene: Phaser.Scene, private proj: Projection, private ground: Phaser.GameObjects.Graphics, private fxTop: Phaser.GameObjects.Graphics) {
    makeBallTexture(scene);
    this.img = scene.add.image(0, 0, 'ball2', 'b0').setDepth(36).setVisible(false);
  }

  give(pl: Player) {
    this.state = 'held';
    this.holder = pl;
    this.throw = null;
    this.tee = null;
    this.trail = [];
  }

  launch(t: Throw) {
    this.state = 'air';
    this.holder = null;
    this.throw = t;
    this.u = 0;
    this.trail = [];
    this.spinMode = 'spiral';
    this.upright = false;
    this.tee = null;
  }

  /** Avança o voo; devolve true quando chega no ponto de queda. */
  update(dt: number) {
    if (this.state === 'air' && this.throw) {
      this.u = Math.min(1, this.u + dt / this.throw.T);
      [this.x, this.y, this.h] = arcAt(this.throw, this.u);
      this.spin += dt;
      return this.u >= 1;
    }
    if (this.state === 'held' && this.holder) {
      this.x = this.holder.x;
      this.y = this.holder.y;
      this.h = 1.2;
    }
    return false;
  }

  draw() {
    const show = this.state !== 'held';
    this.img.setVisible(show);
    if (!show) return;
    const pr = this.proj;
    pr.project(this.x, this.y, this.h, p);
    pr.project(this.x, this.y, 0, g0);
    // Sombra no chão
    const u = g0.s * 10;
    this.ground.fillStyle(0x000000, 0.35);
    this.ground.fillEllipse(g0.x, g0.y, u * 0.9, u * 0.35);
    // À noite/tarde: uma sombra no chão para cada luz, mais afastada quanto mais alta a bola
    if (this.lights && this.h > 0.3) {
      for (const l of this.lights) {
        let dx = this.x - l.x;
        let dy = this.y - l.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const off = this.h * 0.45 * (l.len / 3.1) * Math.min(1, d / 35);
        pr.project(this.x + dx * off, this.y + dy * off, 0, g1);
        this.ground.fillStyle(0x000000, Math.min(0.3, l.a * 1.3));
        this.ground.fillEllipse(g1.x, g1.y, u * 0.7, u * 0.26);
      }
    }
    // Bola solta (chutes, fumble) avança o giro aqui: nos chutes o update() do voo não é chamado
    if (this.state === 'loose') this.spin += Math.min(0.05, this.scene.game.loop.delta / 1000);
    const base = Math.max(0.35, p.s * 0.9) / 3;
    this.img.setPosition(p.x, p.y);
    // Direção do voo no mundo (do quadro anterior para este)
    const dx = this.x - this.prev.x;
    const dy = this.y - this.prev.y;
    const dh = this.h - this.prev.h;
    this.prev.x = this.x;
    this.prev.y = this.y;
    this.prev.h = this.h;
    const d = Math.hypot(dx, dy, dh);
    if (this.tee) {
      // tee laranja do kickoff
      pr.project(this.tee.x, this.tee.y, 0, g1);
      const tu = g1.s * 10;
      this.ground.fillStyle(0x0d0d12, 1);
      this.ground.fillRect(g1.x - tu * 0.2, g1.y - tu * 0.14, tu * 0.4, tu * 0.16);
      this.ground.fillStyle(0xff7a1f, 1);
      this.ground.fillRect(g1.x - tu * 0.17, g1.y - tu * 0.12, tu * 0.34, tu * 0.12);
      this.ground.fillStyle(0xffc27a, 1);
      this.ground.fillRect(g1.x - tu * 0.17, g1.y - tu * 0.12, tu * 0.34, tu * 0.03);
    }
    if (this.upright && (d < 0.004 || d > 3)) {
      // em pé (no chão com o segurador, ou no tee do kickoff), um pouco inclinada para trás
      pr.project(this.x, this.y, this.tee ? 0.12 : 0, g0);
      this.trail = [];
      this.img.setFrame('b2').setOrigin(0.07, 0.5).setPosition(g0.x, g0.y).setScale(base * 0.74, base * 0.84).setRotation(-Math.PI / 2 - 0.12);
      return;
    }
    this.img.setOrigin(0.5);
    if (this.upright && d >= 0.004) {
      this.upright = false;
      this.spin = 0; // o giro de ponta a ponta começa da bola em pé
    }
    if (this.h < 0.35 || d < 0.004 || d > 3) {
      // parada / rolando no chão
      this.trail = [];
      this.img.setFrame('b0').setScale(base).setAngle(-20);
      return;
    }
    // Rastro curto (só voando)
    this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > 7) this.trail.shift();
    this.trail.forEach((t, i) => {
      const k = (i + 1) / this.trail.length;
      this.fxTop.fillStyle(0xffffff, 0.35 * k);
      this.fxTop.fillCircle(t.x, t.y, 1 + k * 2.5 * p.s);
    });

    // Eixo da bola apontado para onde ela voa, visto pela câmera: projeta a ponta e o fim da bola.
    // Indo para longe da câmera ela encurta (vista mais de ponta).
    const k = 0.3 / d;
    pr.project(this.x + dx * k, this.y + dy * k, this.h + dh * k, g1);
    pr.project(this.x - dx * k, this.y - dy * k, this.h - dh * k, g0);
    const sx = g1.x - g0.x;
    const sy = g1.y - g0.y;
    const ang = Math.atan2(sy, sx);
    const f = Phaser.Math.Clamp(Math.hypot(sx, sy) / (0.6 * p.s * 10), 0.55, 1);
    if (this.spinMode === 'spiral') {
      // espiral: os cordões dão a volta na bola (~6 voltas por segundo) e a ponta balança de leve
      const ph = (this.spin * 6) % 1;
      this.img
        .setFrame(`b${Math.floor(ph * BALL_FRAMES)}`)
        .setScale(base * f, base)
        .setRotation(ang + Math.sin(this.spin * 9) * 0.05);
    } else {
      // de ponta a ponta (chute de campo / kickoff): o eixo da bola gira em 3D no plano do voo,
      // começando em pé e virando para trás (o chute pega embaixo da bola); projetado pela câmera.
      const fx = dx / d, fy = dy / d, fh = dh / d;
      // "para cima" perpendicular ao voo
      let ux = -fh * fx, uy = -fh * fy, uh = 1 - fh * fh;
      const un = Math.hypot(ux, uy, uh) || 1;
      ux /= un;
      uy /= un;
      uh /= un;
      // de lado (horizontal, perpendicular ao voo)
      let sx2 = fy, sy2 = -fx;
      const sn = Math.hypot(sx2, sy2) || 1;
      sx2 /= sn;
      sy2 /= sn;
      // meio torto: o plano do giro fica um pouco inclinado para o lado (a bola nunca sai perfeita do pé)
      const psi = 0.32 + Math.sin(this.spin * 1.3) * 0.1;
      const cp = Math.cos(psi), sp = Math.sin(psi);
      const vx = cp * ux + sp * sx2, vy = cp * uy + sp * sy2, vh = cp * uh;
      // rápido como uma moeda virando (~5,5 voltas por segundo)
      const th = Math.PI / 2 + this.spin * Math.PI * 2 * 5.5;
      const c = Math.cos(th), s = Math.sin(th);
      const ax = c * fx + s * vx, ay = c * fy + s * vy, ah = c * fh + s * vh;
      const L = 0.3;
      pr.project(this.x + ax * L, this.y + ay * L, this.h + ah * L, g1);
      pr.project(this.x - ax * L, this.y - ay * L, this.h - ah * L, g0);
      const tx = g1.x - g0.x;
      const ty = g1.y - g0.y;
      const fl = Phaser.Math.Clamp(Math.hypot(tx, ty) / (0.6 * p.s * 10), 0.6, 1);
      // cada meia volta mostra um lado da bola (cordões / costas), como a cara e a coroa da moeda
      this.img
        .setFrame(Math.cos(th - Math.PI / 2) > 0 ? 'b0' : `b${BALL_FRAMES / 2}`)
        .setScale(base * 1.15 * fl, base * 1.15)
        .setRotation(Math.atan2(ty, tx) + Math.sin(this.spin * 2) * 0.06);
    }
  }

  hide() {
    this.img.setVisible(false);
  }
}

const BALL_FRAMES = 8;
const BW = 60;
const BH = 36;

/** Bola de futebol americano em 8 fases da rotação (os cordões dão a volta em torno do eixo comprido). */
function makeBallTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('ball2')) return;
  const t = scene.textures.createCanvas('ball2', BW * BALL_FRAMES, BH)!;
  const c = t.getContext();
  const cx = BW / 2;
  const cy = BH / 2;
  const rx = 27;
  const ry = 15;
  const shape = (ox: number) => {
    // bola com as pontas afinadas
    c.beginPath();
    c.moveTo(ox + cx - rx, cy);
    c.bezierCurveTo(ox + cx - rx * 0.6, cy - ry * 1.32, ox + cx + rx * 0.6, cy - ry * 1.32, ox + cx + rx, cy);
    c.bezierCurveTo(ox + cx + rx * 0.6, cy + ry * 1.32, ox + cx - rx * 0.6, cy + ry * 1.32, ox + cx - rx, cy);
    c.closePath();
  };
  for (let i = 0; i < BALL_FRAMES; i++) {
    const ox = i * BW;
    const a = (i / BALL_FRAMES) * Math.PI * 2; // fase da rotação
    c.save();
    shape(ox);
    c.fillStyle = '#0d0d12';
    c.lineWidth = 4;
    c.strokeStyle = '#0d0d12';
    c.stroke();
    const g = c.createLinearGradient(0, cy - ry, 0, cy + ry);
    g.addColorStop(0, '#b9733a');
    g.addColorStop(0.45, '#8a4b1f');
    g.addColorStop(1, '#4f2810');
    c.fillStyle = g;
    c.fill();
    c.clip();
    // gomos: costuras que acompanham a rotação
    c.strokeStyle = 'rgba(40,18,6,0.55)';
    c.lineWidth = 1.2;
    for (const off of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      const ya = Math.sin(a + off);
      if (Math.cos(a + off) < 0) continue;
      c.beginPath();
      c.moveTo(ox + cx - rx, cy);
      c.quadraticCurveTo(ox + cx, cy + ya * ry * 1.25, ox + cx + rx, cy);
      c.stroke();
    }
    // cordões: aparecem na frente e somem atrás da bola
    const ly = cy + Math.sin(a) * ry * 0.72;
    const vis = Math.cos(a);
    if (vis > -0.15) {
      const al = Math.min(1, (vis + 0.15) * 1.6);
      c.fillStyle = `rgba(250,248,240,${al})`;
      c.fillRect(ox + cx - 9, ly - 1.4, 18, 2.8);
      for (let j = -3; j <= 3; j++) c.fillRect(ox + cx + j * 2.8 - 0.8, ly - 3.6, 1.6, 7.2);
    }
    // faixas brancas perto das pontas (dão a leitura do giro)
    c.fillStyle = 'rgba(250,248,240,0.85)';
    c.fillRect(ox + cx - rx * 0.62, 0, 3, BH);
    c.fillRect(ox + cx + rx * 0.62 - 3, 0, 3, BH);
    // brilho que corre com a rotação
    c.fillStyle = 'rgba(255,230,190,0.35)';
    c.beginPath();
    c.ellipse(ox + cx - 4, cy - ry * 0.45 + Math.sin(a) * 2, rx * 0.5, ry * 0.18, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    t.add(`b${i}`, 0, ox, 0, BW, BH);
  }
  t.refresh();
}
