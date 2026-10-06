import Phaser from 'phaser';
import { GAME_H, GAME_W, MATCH_SEED, TEAMS } from '../config';
import { hex, shade } from './pixelart';
import { Rng } from './rng';

/*
 * Arquibancada plana ao fundo (sem estádio 3D): cobre a tela toda atrás do campo.
 * Cada fileira é uma textura própria, gerada por código uma única vez — assim o custo
 * por frame é quase zero e as fileiras podem "pular" separadas quando a torcida vibra.
 */

const ROW_H = 12; // altura de cada fileira (px)
const SEAT_W = 7; // largura de cada lugar (px)
const AISLES = [58, 195, 332]; // centro das escadas (px)
const AISLE_W = 12;
const AWAY_FROM_X = 338; // setor visitante à direita da última escada
const AWAY_ROWS = 34; // só nas fileiras de cima
const EXITS = [
  { x: 126, row: 18 },
  { x: 264, row: 18 },
  { x: 126, row: 44 },
  { x: 264, row: 44 },
];
const EXIT_W = 22;
const EXIT_ROWS = 3;

const SKIN = ['#f1c7a5', '#d9a07a', '#b07650', '#7a4b2e', '#5a3520'];
const HAIR = ['#2a1a10', '#5a3a1a', '#111111', '#b8862e', '#3b2412', '#8a8a8a'];
const OTHER = ['#f2f2f2', '#1d1d24', '#6b6f7a', '#3fa34d', '#b33a3a', '#e6c34a'];
const HOME = [hex(TEAMS.home.color), shade(TEAMS.home.color, 0.25), shade(TEAMS.home.color, -0.2)];
const AWAY = [hex(TEAMS.away.color), shade(TEAMS.away.color, 0.3), shade(TEAMS.away.color, -0.25)];

const inAisle = (x: number) => AISLES.some((a) => Math.abs(x - a) < AISLE_W / 2 + SEAT_W / 2);
const inExit = (x: number, row: number) =>
  EXITS.some((e) => row >= e.row && row < e.row + EXIT_ROWS && Math.abs(x - e.x) < EXIT_W / 2 + 2);

/** Desenha um torcedor em pixel art com os pés em (x, base). */
function drawFan(ctx: CanvasRenderingContext2D, rng: Rng, x: number, base: number, away: boolean) {
  if (rng.chance(0.07)) return; // cadeira vazia
  const r = rng.next();
  const shirt = r < 0.72 ? rng.pick(away ? AWAY : HOME) : r < 0.84 ? '#f2f2f2' : rng.pick(OTHER);
  const skin = rng.pick(SKIN);
  const pr = rng.next();
  const pose = pr < 0.6 ? 'sit' : pr < 0.85 ? 'stand' : pr < 0.96 ? 'arms' : 'sign';
  const bodyH = pose === 'sit' ? 4 : 6;
  const top = base - bodyH;

  ctx.fillStyle = shirt; // camisa
  ctx.fillRect(x - 2, top, 5, bodyH);
  ctx.fillStyle = skin; // cabeça
  ctx.fillRect(x - 1, top - 3, 3, 3);
  if (rng.chance(0.3)) {
    ctx.fillStyle = rng.pick(away ? AWAY : [...HOME, '#1d1d24']); // boné com aba
    ctx.fillRect(x - 1, top - 4, 3, 2);
    ctx.fillRect(x + 1, top - 3, 2, 1);
  } else {
    ctx.fillStyle = rng.pick(HAIR); // cabelo
    ctx.fillRect(x - 1, top - 4, 3, 1);
    ctx.fillRect(x - 1, top - 3, 1, 1);
  }
  if (pose === 'arms') {
    ctx.fillStyle = shirt;
    ctx.fillRect(x - 3, top - 4, 1, 4);
    ctx.fillRect(x + 3, top - 4, 1, 4);
    ctx.fillStyle = skin;
    ctx.fillRect(x - 3, top - 5, 1, 1);
    ctx.fillRect(x + 3, top - 5, 1, 1);
  } else if (pose === 'sign') {
    ctx.fillStyle = rng.pick(['#ffffff', '#ffd23f', HOME[0]]);
    ctx.fillRect(x - 3, top - 9, 8, 4);
    ctx.fillStyle = away ? AWAY[0] : HOME[0];
    ctx.fillRect(x - 2, top - 8, 6, 1);
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(x, top - 5, 1, 2);
  }
}

export class CrowdBackdrop {
  private rows: { img: Phaser.GameObjects.Image; phase: number; y: number }[] = [];
  private flashes: Phaser.GameObjects.Graphics;
  private flashList: { x: number; y: number; life: number }[] = [];
  private fx = new Rng(MATCH_SEED + 7);
  private time = 0;
  /** Empolgação (0..1): as fileiras pulam e os flashes aumentam. */
  excite = 0;

  constructor(scene: Phaser.Scene) {
    const rng = new Rng(MATCH_SEED);
    const count = Math.ceil(GAME_H / ROW_H) + 2;
    // Fundo escuro atrás das fileiras (aparece quando elas pulam)
    scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x1e2030).setOrigin(0).setDepth(-3);

    for (let row = 0; row < count; row++) {
      const key = `crowd_row_${row}`;
      const tex = scene.textures.createCanvas(key, GAME_W, ROW_H + 10)!;
      const ctx = tex.getContext();
      const base = ROW_H + 10; // a fileira desenha também a cabeça/plaquinha acima dela
      const awayRow = row < AWAY_ROWS;

      // Degrau de concreto, espelho escuro e encosto das cadeiras
      ctx.fillStyle = row % 2 ? '#5a5d6c' : '#525565';
      ctx.fillRect(0, 10, GAME_W, ROW_H);
      ctx.fillStyle = '#383a48';
      ctx.fillRect(0, base - 2, GAME_W, 2);
      for (let x = 0; x < GAME_W; x++) {
        const away = awayRow && x > AWAY_FROM_X;
        ctx.fillStyle = away ? shade(TEAMS.away.color, -0.2) : shade(TEAMS.home.color, -0.45);
        if (!inAisle(x)) ctx.fillRect(x, base - 7, 1, 3);
      }
      // Escadas: degrau claro, faixa amarela e corrimão no meio
      for (const a of AISLES) {
        ctx.fillStyle = '#8b8f9c';
        ctx.fillRect(a - AISLE_W / 2, 10, AISLE_W, ROW_H);
        ctx.fillStyle = '#e6c34a';
        ctx.fillRect(a - AISLE_W / 2, base - 2, AISLE_W, 1);
        ctx.fillStyle = '#c9ced8';
        ctx.fillRect(a, 10, 1, ROW_H);
      }
      // Torcedores, um por lugar (com pequena variação para não ficar em grade)
      for (let x = 3; x < GAME_W; x += SEAT_W) {
        if (inAisle(x) || inExit(x, row)) continue;
        drawFan(ctx, rng, x + rng.int(-1, 1), base - 3, awayRow && x > AWAY_FROM_X);
      }
      // Saídas: túnel escuro (a placa verde fica na fileira de cima)
      for (const e of EXITS) {
        if (row >= e.row && row < e.row + EXIT_ROWS) {
          ctx.fillStyle = '#06070c';
          ctx.fillRect(e.x - EXIT_W / 2, 10, EXIT_W, ROW_H);
        }
        if (row === e.row - 1) {
          ctx.fillStyle = '#1f9d4a';
          ctx.fillRect(e.x - 14, base - 9, 28, 8);
          ctx.fillStyle = '#ffffff';
          ctx.font = '6px Silkscreen';
          ctx.textAlign = 'center';
          ctx.fillText('SAÍDA', e.x, base - 3);
        }
      }
      tex.refresh();

      const y = row * ROW_H - 10;
      const img = scene.add.image(0, y, key).setOrigin(0).setDepth(-2 + row * 0.001);
      this.rows.push({ img, phase: rng.range(0, Math.PI * 2), y });
    }
    this.flashes = scene.add.graphics().setDepth(-1.5);
  }

  cheer(amount = 1) {
    this.excite = Math.min(1, this.excite + amount);
  }

  update(dt: number) {
    this.time += dt;
    this.excite = Math.max(0, this.excite - dt * 0.45);

    // Fileiras pulam em ondas quando a torcida vibra
    for (const r of this.rows) {
      const jump = this.excite > 0.01 ? Math.max(0, Math.sin(this.time * 11 + r.phase)) * 3 * this.excite : 0;
      r.img.y = r.y - jump;
    }

    // Flashes de câmera aleatórios
    if (this.fx.next() < (1.5 + this.excite * 14) * dt) {
      this.flashList.push({ x: this.fx.range(4, GAME_W - 4), y: this.fx.range(4, GAME_H * 0.6), life: 0.14 });
    }
    const g = this.flashes;
    g.clear();
    for (const f of this.flashList) {
      f.life -= dt;
      if (f.life <= 0) continue;
      const k = f.life / 0.14;
      g.fillStyle(0xffffff, 0.35 * k);
      g.fillCircle(f.x, f.y, 5 * k + 1);
      g.fillStyle(0xffffff, k);
      g.fillRect(f.x - 5 * k, f.y - 0.5, 10 * k, 1);
      g.fillRect(f.x - 0.5, f.y - 5 * k, 1, 10 * k);
    }
    this.flashList = this.flashList.filter((f) => f.life > 0);
  }
}
