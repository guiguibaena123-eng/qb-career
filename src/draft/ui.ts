import Phaser from 'phaser';
import { FONT_TITLE, GAME_H, GAME_W } from '../config';
import type { CareerTeam } from '../data/TeamRepository';
import { fgOn } from '../data/teams';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';
import { collarTexture, COMMISH, commissionerBody, FORE_LEN, FORE_PIVOT_Y, foreArmTexture, SHOULDER_L, STAGE_H, STAGE_W, stageTexture, UPPER_LEN, upperArmTexture } from './art';
import { PlayerFace } from '../player/PlayerFace';

/*
 * Peças comuns das telas do Draft (como no design): palco ao fundo, telão com título e rodada/pick,
 * holofotes balançando, barra do topo (voltar, título, pílula) e o botão grande embaixo.
 */

export const ORANGE = 0xf26b1d; // cor da liga (QFL)
export const hexStr = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function draftScene(scene: Phaser.Scene, team: CareerTeam, party = false) {
  setupHiRes(scene);
  scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0c1a).setOrigin(0);
  scene.add.image(-1, 0, stageTexture(scene, team, party)).setOrigin(0).setDisplaySize(STAGE_W * 4, STAGE_H * 4);
  // Escurece o topo (atrás da barra)
  const g = scene.add.graphics();
  for (let i = 0; i < 26; i++) {
    g.fillStyle(0x0a0c1a, 0.95 * (1 - i / 26));
    g.fillRect(0, i * 3, GAME_W, 3);
  }
}

/** Telão (painel com grade fina e brilho laranja): texto grande e linha amarela embaixo. */
export function board(scene: Phaser.Scene, big: string, sub: string, size = 28) {
  const g = scene.add.graphics();
  for (let i = 8; i > 0; i--) {
    g.fillStyle(ORANGE, 0.035);
    g.fillRect(14 - i * 3, 84 - i * 3, 362 + i * 6, 150 + i * 6);
  }
  g.fillStyle(0x0d1230, 1);
  g.fillRect(14, 84, 362, 150);
  g.fillStyle(0xffffff, 0.05);
  for (let x = 14; x < 376; x += 6) g.fillRect(x, 84, 1, 150);
  for (let y = 84; y < 234; y += 6) g.fillRect(14, y, 362, 1);
  g.lineStyle(3, 0x2a3156, 1);
  g.strokeRect(15.5, 85.5, 359, 147);
  // Texto grande: encolhe para caber no telão
  const t = title(scene, GAME_W / 2, 137, big, size, '#FFFFFF').setOrigin(0.5);
  t.setShadow(4, 4, hexStr(ORANGE), 0, false, true);
  if (t.width > 330) t.setFontSize(Math.floor((size * 330) / t.width));
  const s = title(scene, GAME_W / 2, 182, sub, 10, UI.yellow).setOrigin(0.5);
  s.setLetterSpacing?.(3);
  return { t, s };
}

/** Dois holofotes (cones de luz) balançando devagar. */
export function spotlights(scene: Phaser.Scene) {
  const mk = (x: number, delay: number) => {
    const g = scene.add.graphics();
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const y0 = (560 / steps) * i;
      const y1 = y0 + 560 / steps;
      const w0 = 18 + (132 * i) / steps;
      const w1 = 18 + (132 * (i + 1)) / steps;
      g.fillStyle(0xffecaa, 0.38 * (1 - i / steps));
      g.fillPoints([new Phaser.Math.Vector2(75 - w0 / 2, y0), new Phaser.Math.Vector2(75 + w0 / 2, y0), new Phaser.Math.Vector2(75 + w1 / 2, y1), new Phaser.Math.Vector2(75 - w1 / 2, y1)], true);
    }
    g.setPosition(x, 0).setAlpha(0.55);
    scene.tweens.add({ targets: g, alpha: 0.95, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay });
    return g;
  };
  return [mk(10, 0), mk(230, 1200)];
}

/** Barra do topo: VOLTAR (seta), título no meio e pílula à direita. */
export function topBar(scene: Phaser.Scene, text: string, pillText: string, back: () => void) {
  const b = new GlassButton(scene, 16 + 22, 40, { w: 44, h: 44, radius: 14 }).setDepth(80);
  const arrow = scene.add.graphics();
  arrow.lineStyle(2.5, 0xffffff, 1);
  arrow.beginPath();
  arrow.moveTo(2, -5);
  arrow.lineTo(-3, 0);
  arrow.lineTo(2, 5);
  arrow.strokePath();
  b.add(arrow);
  b.onTap = () => scene.time.delayedCall(30, back);
  scene.add.existing(b);
  const t = title(scene, GAME_W / 2, 40, text, 12, '#FFFFFF').setOrigin(0.5).setDepth(80);
  t.setShadow(3, 3, '#0D0D12', 0, false, true);
  const p = title(scene, 0, 40, pillText, 9, '#FFFFFF').setOrigin(1, 0.5).setDepth(81);
  p.setX(GAME_W - 16 - 10);
  // Título encolhe se encostar no botão voltar ou na pílula
  const half = Math.min(GAME_W / 2 - (16 + 44 + 8), p.x - p.width - 10 - 8 - GAME_W / 2);
  if (t.width / 2 > half) t.setFontSize(Math.floor((12 * half * 2) / t.width));
  const g = scene.add.graphics().setDepth(80);
  g.fillStyle(0x2a3156, 0.7);
  g.fillRoundedRect(p.x - p.width - 10, 40 - 15, p.width + 20, 30, 12);
  g.lineStyle(1, 0xffffff, 0.16);
  g.strokeRoundedRect(p.x - p.width - 10, 40 - 15, p.width + 20, 30, 12);
  return { title: t, pill: p };
}

/** Degradê escuro embaixo e o botão largo (cor dada) com seta. */
export function bigButton(scene: Phaser.Scene, text: string, color: number, onTap: () => void) {
  const g = scene.add.graphics().setDepth(84);
  for (let i = 0; i < 60; i++) {
    g.fillStyle(0x0a0c1a, Math.min(1, (i / 60) * 1.6));
    g.fillRect(0, GAME_H - 180 + i * 3, GAME_W, 3);
  }
  const fg = fgOn(color);
  const b = new GlassButton(scene, GAME_W / 2, GAME_H - 30 - 31, { w: GAME_W - 32, h: 62, radius: 18, fill: color, fillAlpha: 1, borderAlpha: 0.35, primary: true }).setDepth(85);
  const t = title(scene, -8, 0, text, text.length > 20 ? 10 : 12, fg).setOrigin(0.5);
  const a = scene.add.graphics();
  a.lineStyle(2.5, Phaser.Display.Color.HexStringToColor(fg).color, 1);
  a.beginPath();
  a.moveTo(t.width / 2 + 4, -5);
  a.lineTo(t.width / 2 + 9, 0);
  a.lineTo(t.width / 2 + 4, 5);
  a.strokePath();
  b.add([t, a]);
  b.onTap = () => scene.time.delayedCall(30, onTap);
  scene.add.existing(b);
  return b;
}

/** Rosto do comissário: rosto 16 (sorriso, marcas de idade), cabelo 8 (penteado de lado), pele clara, grisalho. */
const COMMISH_FACE = { face: 16, skin: 1, hair: 8, hairColor: 5, beard: -1, hairTint: 0xc9ced6, skinTint: COMMISH.skin };

/**
 * Comissário: figura de terno 200×400 (mesma base e proporção do jogador de terno) com o rosto da base
 * de rostos. (x, y) = canto de cima; `scale` 1 = 200×400. `clipBottom` = linha da tela abaixo da qual
 * não aparece (o púlpito cobre). `clap` = braços articulados batendo palmas (devolve o `onClap`).
 */
export function commissioner(scene: Phaser.Scene, x: number, y: number, scale: number, clipBottom?: number, clap = false) {
  const c = scene.add.container(x, y).setScale(scale);
  const body = scene.add.container(0, 0);
  body.add(scene.add.image(0, 0, commissionerBody(scene, clap)).setOrigin(0));
  // Rosto no mesmo lugar do jogador de terno: célula 192 a 0.5 com o canto em (52, 9)
  body.add(new PlayerFace(scene, 52 + 48, 9 + 48, COMMISH_FACE, 0.5));
  // Gola da camisa e nó da gravata por cima do pescoço
  body.add(scene.add.image(0, 0, collarTexture(scene, COMMISH.tie, COMMISH.jacket, COMMISH_FACE.face)).setOrigin(0));
  c.add(body);
  if (clipBottom !== undefined) {
    const m = scene.make.graphics({}, false);
    m.fillRect(x - 10, y - 40, 200 * scale + 20, clipBottom - y + 40);
    c.setMask(m.createGeometryMask());
  }
  if (!clap) {
    // Respira e balança de leve enquanto fala no púlpito
    scene.tweens.add({ targets: body, y: -2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return { c, body, onClap: (_f: () => void) => {} };
  }
  return { c, body, ...clapArms(scene, body) };
}

/**
 * Braços das palmas, com cinemática de verdade: braço gira no ombro, antebraço no cotovelo, e a mão
 * vai do lado do peito até o centro. Fecha rápido (bate), abre mais devagar. O lado direito é o
 * esquerdo espelhado. A cada batida o corpo afunda um pouco e `onClap` é chamado (brilho, som...).
 */
function clapArms(scene: Phaser.Scene, body: Phaser.GameObjects.Container) {
  const deg = Math.PI / 180;
  const sides = [false, true].map((mirror) => {
    const holder = scene.add.container(mirror ? 200 : 0, 0).setScale(mirror ? -1 : 1, 1);
    const upper = scene.add.image(SHOULDER_L.x, SHOULDER_L.y, upperArmTexture(scene)).setOrigin(0.5, 4 / (UPPER_LEN + 8));
    const fore = scene.add.image(0, 0, foreArmTexture(scene)).setOrigin(2 / (FORE_LEN + 4), FORE_PIVOT_Y);
    holder.add([upper, fore]);
    body.add(holder);
    return { upper, fore };
  });
  // t = 0 mãos abertas, 1 mãos juntas
  const pose = { t: 0 };
  const apply = () => {
    const t = pose.t;
    const up = (16 - 6 * t) * deg; // braço abre para fora e fecha um pouco
    const fa = (-50 + 28 * t) * deg; // antebraço sobe e vem para o centro
    for (const s of sides) {
      s.upper.setRotation(up);
      const ex = SHOULDER_L.x - Math.sin(up) * UPPER_LEN;
      const ey = SHOULDER_L.y + Math.cos(up) * UPPER_LEN;
      s.fore.setPosition(ex, ey).setRotation(fa);
    }
  };
  apply();
  let onClap: () => void = () => {};
  const cycle = () => {
    scene.tweens.add({
      targets: pose,
      t: 1,
      duration: 150,
      ease: 'Quad.In',
      onUpdate: apply,
      onComplete: () => {
        onClap();
        // Batida: corpo afunda e volta
        scene.tweens.add({ targets: body, y: 3, duration: 70, yoyo: true, ease: 'Quad.Out' });
        scene.tweens.add({ targets: pose, t: 0, duration: 260, delay: 40, ease: 'Sine.Out', onUpdate: apply, onComplete: () => scene.time.delayedCall(60, cycle) });
      },
    });
  };
  cycle();
  /** Ponto (na figura) onde as mãos se encontram. */
  const up = 10 * deg;
  const fa = -22 * deg;
  const hand = FORE_LEN - 4;
  const meet = { x: 100, y: SHOULDER_L.y + Math.cos(up) * UPPER_LEN + Math.sin(fa) * hand };
  return { meet, onClap: (f: () => void) => (onClap = f) };
}

/** Logo do time (do registro), sempre pixelado. */
export function teamLogo(scene: Phaser.Scene, team: CareerTeam, x: number, y: number, size: number) {
  return scene.add.image(x, y, size > 48 ? team.logo.large : team.logo.small).setDisplaySize(size, size);
}

/** Cartão de vidro (como os painéis do design). */
export function glassCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(x, y + 8, w, h, 18);
  g.fillStyle(0x22284a, 0.88);
  g.fillRoundedRect(x, y, w, h, 18);
  g.lineStyle(1, 0xffffff, 0.14);
  g.strokeRoundedRect(x, y, w, h, 18);
  return g;
}

export { label, title, UI, FONT_TITLE };
