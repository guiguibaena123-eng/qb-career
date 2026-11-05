import type { Ball } from '../entities/Ball';
import { POSES, type Player, type Pose } from '../entities/Player';

/*
 * Replay: grava um quadro por frame durante o lance (posição, velocidade, pose,
 * rotação e altura de cada jogador; bola; câmera) e reproduz em câmera lenta.
 */

const N = 9; // x, y, vx, vy, angle, hop, pose, sx, sy
const MAX_FRAMES = 60 * 25;

interface Frame {
  t: number;
  ps: Float32Array;
  ball: [number, number, number, number]; // x, y, h, visível
  cam: number;
}

export class Replay {
  private frames: Frame[] = [];
  private t = 0;
  private i = 0;
  playing = false;

  constructor(private players: Player[]) {}

  get length() {
    return this.frames.length ? this.frames[this.frames.length - 1].t : 0;
  }

  clear() {
    this.frames = [];
    this.t = 0;
  }

  record(dt: number, ball: Ball, camY: number) {
    if (this.frames.length >= MAX_FRAMES) return;
    this.t += dt;
    const ps = new Float32Array(this.players.length * N);
    this.players.forEach((p, k) => {
      const o = k * N;
      ps[o] = p.x;
      ps[o + 1] = p.y;
      ps[o + 2] = p.vx;
      ps[o + 3] = p.vy;
      ps[o + 4] = p.angle;
      ps[o + 5] = p.hop;
      ps[o + 6] = p.pose ? POSES.indexOf(p.pose) : -1;
      ps[o + 7] = p.sx;
      ps[o + 8] = p.sy;
    });
    this.frames.push({ t: this.t, ps, ball: [ball.x, ball.y, ball.h, ball.state === 'held' ? 0 : 1], cam: camY });
  }

  start() {
    this.playing = this.frames.length > 1;
    this.t = 0;
    this.i = 0;
  }

  /** Avança e aplica o quadro; devolve a câmera (ou null quando acaba). */
  step(dt: number, ball: Ball): number | null {
    if (!this.playing) return null;
    this.t += dt;
    while (this.i < this.frames.length - 1 && this.frames[this.i + 1].t <= this.t) this.i++;
    const f = this.frames[this.i];
    this.players.forEach((p, k) => {
      const o = k * N;
      p.x = f.ps[o];
      p.y = f.ps[o + 1];
      p.vx = f.ps[o + 2];
      p.vy = f.ps[o + 3];
      p.angle = f.ps[o + 4];
      p.hop = f.ps[o + 5];
      const pi = f.ps[o + 6];
      p.pose = pi < 0 ? null : (POSES[pi] as Pose);
      p.sx = f.ps[o + 7];
      p.sy = f.ps[o + 8];
    });
    ball.x = f.ball[0];
    ball.y = f.ball[1];
    ball.h = f.ball[2];
    ball.holder = null;
    ball.state = f.ball[3] ? 'loose' : 'held';
    if (this.i >= this.frames.length - 1) this.playing = false;
    return f.cam;
  }
}
