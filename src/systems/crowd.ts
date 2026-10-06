import Phaser from 'phaser';
import { TEAMS } from '../config';
import { shadeNum } from './pixelart';
import type { Rng } from './rng';

/** Poses de um torcedor. */
export const enum Pose {
  Sit = 0,
  Stand = 1,
  ArmsUp = 2,
  Sign = 3,
}

export interface Fan {
  empty: boolean;
  pose: Pose;
  shirt: number;
  skin: number;
  top: number; // cor do cabelo ou do boné
  cap: boolean;
  phase: number; // fase da animação de pulo
  reactive: boolean; // pula em big plays
  sign: number; // cor da plaquinha
}

const SKIN = [0xf1c7a5, 0xd9a07a, 0xb07650, 0x7a4b2e, 0x5a3520];
const HAIR = [0x2a1a10, 0x5a3a1a, 0x111111, 0xb8862e, 0x3b2412, 0x8a8a8a];
const HOME_SHIRTS = [TEAMS.home.color, shadeNum(TEAMS.home.color, 0.25), shadeNum(TEAMS.home.color, -0.2)];
const AWAY_SHIRTS = [TEAMS.away.color, shadeNum(TEAMS.away.color, 0.3), shadeNum(TEAMS.away.color, -0.25)];
const OTHER_SHIRTS = [0xf2f2f2, 0x1d1d24, 0x6b6f7a, 0x3fa34d, 0xb33a3a, 0xe6c34a];

/** Gera um torcedor aleatório (cada um é diferente, nada de padrão repetido). */
export function makeFan(rng: Rng, away: boolean): Fan {
  const teamShirts = away ? AWAY_SHIRTS : HOME_SHIRTS;
  const r = rng.next();
  const shirt = r < 0.72 ? rng.pick(teamShirts) : r < 0.84 ? 0xf2f2f2 : rng.pick(OTHER_SHIRTS);
  const cap = rng.chance(0.28);
  const pr = rng.next();
  const pose = pr < 0.62 ? Pose.Sit : pr < 0.86 ? Pose.Stand : pr < 0.96 ? Pose.ArmsUp : Pose.Sign;
  return {
    empty: rng.chance(0.07),
    pose,
    shirt,
    skin: rng.pick(SKIN),
    top: cap ? rng.pick(away ? AWAY_SHIRTS : [...HOME_SHIRTS, 0x1d1d24, 0xf2f2f2]) : rng.pick(HAIR),
    cap,
    phase: rng.range(0, Math.PI * 2),
    reactive: rng.chance(0.75),
    sign: rng.pick([0xffffff, 0xffd23f, TEAMS.home.color, away ? TEAMS.away.color : 0xffffff]),
  };
}

/**
 * Desenha um torcedor com origem nos pés (x, y) e `u` px por jarda.
 * Abaixo de ~1,5 px por jarda vira um bloquinho de cor (nível de detalhe por distância).
 */
export function drawFan(g: Phaser.GameObjects.Graphics, fan: Fan, x: number, y: number, u: number, excite: number, time: number) {
  if (fan.empty) return;
  const jumping = fan.reactive && excite > 0.05;
  const standing = fan.pose !== Pose.Sit || (jumping && excite > 0.4);
  const jump = jumping ? Math.max(0, Math.sin(time * 11 + fan.phase)) * excite * 0.55 * u : 0;
  const by = y - jump;
  const bw = Math.max(1, 0.72 * u);
  const bh = Math.max(1, (standing ? 0.95 : 0.6) * u);
  const hs = Math.max(1, 0.42 * u);

  if (u < 1.5) {
    // Longe: um bloco da camisa com um pixel de cabeça
    g.fillStyle(fan.shirt, 1);
    g.fillRect(x - bw / 2, by - bh, bw, bh);
    g.fillStyle(fan.skin, 1);
    g.fillRect(x - hs / 2, by - bh - hs, hs, hs);
    return;
  }

  // Corpo (camisa)
  g.fillStyle(fan.shirt, 1);
  g.fillRect(x - bw / 2, by - bh, bw, bh);
  // Cabeça
  const hx = x - hs / 2;
  const hy = by - bh - hs;
  g.fillStyle(fan.skin, 1);
  g.fillRect(hx, hy, hs, hs);
  // Cabelo ou boné (com aba)
  g.fillStyle(fan.top, 1);
  g.fillRect(hx, hy, hs, hs * 0.42);
  if (fan.cap) g.fillRect(hx + hs * 0.5, hy + hs * 0.3, hs * 0.75, Math.max(1, hs * 0.18));

  // Braços para cima (pose ou empolgação)
  const armsUp = fan.pose === Pose.ArmsUp || (jumping && excite > 0.6 && fan.phase > 3);
  if (armsUp) {
    const aw = Math.max(1, 0.16 * u);
    const ah = 0.55 * u;
    g.fillStyle(fan.shirt, 1);
    g.fillRect(x - bw / 2 - aw * 0.6, by - bh - ah, aw, ah);
    g.fillRect(x + bw / 2 - aw * 0.4, by - bh - ah, aw, ah);
    g.fillStyle(fan.skin, 1);
    g.fillRect(x - bw / 2 - aw * 0.6, by - bh - ah, aw, aw);
    g.fillRect(x + bw / 2 - aw * 0.4, by - bh - ah, aw, aw);
  } else if (fan.pose === Pose.Sign) {
    // Plaquinha erguida acima da cabeça
    const sw = 1.0 * u;
    const sh = 0.55 * u;
    const sy = hy - sh - 0.15 * u;
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(x - Math.max(0.5, 0.05 * u), sy + sh, Math.max(1, 0.1 * u), 0.2 * u);
    g.fillStyle(fan.sign, 1);
    g.fillRect(x - sw / 2, sy, sw, sh);
    g.fillStyle(fan.sign === 0xffffff ? TEAMS.home.color : 0xffffff, 1);
    g.fillRect(x - sw * 0.35, sy + sh * 0.4, sw * 0.7, Math.max(1, sh * 0.22));
  }
}
