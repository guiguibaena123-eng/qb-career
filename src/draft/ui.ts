import Phaser from 'phaser';
import { FONT_TITLE, GAME_H, GAME_W } from '../config';
import type { CareerTeam } from '../data/TeamRepository';
import { setupHiRes } from '../systems/hires';
import { UI } from '../ui/widgets';
import { C, inkOn, label, plate, plateShadow, scoreBug, title, TV, TvButton, tvText } from '../ui/tv';
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

/** Telão do palco: placa de tinta com grade de LED bem fraca, faixa amarela no topo e o texto grande. */
export function board(scene: Phaser.Scene, big: string, sub: string, size = 28) {
  const g = scene.add.graphics();
  const x = 14;
  const y = 84;
  const w = GAME_W - 28;
  const h = 150;
  plateShadow(g, x, y, w, h);
  plate(g, x, y, w, h, TV.ink, 0.96);
  g.fillStyle(0xffffff, 0.035);
  for (let xx = x + 14; xx < x + w - 10; xx += 6) g.fillRect(xx, y + 4, 1, h - 8);
  for (let yy = y + 6; yy < y + h; yy += 6) g.fillRect(x + 12, yy, w - 24, 1);
  g.fillStyle(TV.yellow, 1);
  g.fillRect(x + 12, y, w - 12, 4);
  const t = tvText(scene, GAME_W / 2, y + 62, big, Math.round(size * 2), C.white, 800, 1.5).setOrigin(0.5);
  if (t.width > w - 40) t.setScale((w - 40) / t.width);
  const sl = scene.add.graphics();
  sl.fillStyle(TV.rule, 1);
  sl.fillRect(GAME_W / 2 - 110, y + 100, 220, 1);
  const st = tvText(scene, GAME_W / 2, y + 122, sub, 17, C.yellow, 800, 3).setOrigin(0.5);
  return { t, s: st };
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

/** Barra do topo: o placar da transmissão (voltar, AO VIVO, título e o passo à direita). */
export function topBar(scene: Phaser.Scene, text: string, pillText: string, back: () => void) {
  return scoreBug(scene, { title: text, step: pillText, onBack: back, depth: 80 });
}

/** Cor do botão no pacote da transmissão (o laranja antigo da liga vira o amarelo de primeira descida). */
const btnColor = (c: number) => (c === ORANGE ? TV.yellow : c === 0x3ccb5a ? TV.green : c);

/** Degradê escuro embaixo e o botão largo (cor dada) com seta desenhada. */
export function bigButton(scene: Phaser.Scene, text: string, color: number, onTap: () => void) {
  const g = scene.add.graphics().setDepth(84);
  for (let i = 0; i < 60; i++) {
    g.fillStyle(TV.ink, Math.min(1, (i / 60) * 1.6));
    g.fillRect(0, GAME_H - 180 + i * 3, GAME_W, 3);
  }
  const c = btnColor(color);
  const fg = inkOn(c);
  const bw = GAME_W - 32;
  const b = new TvButton(scene, GAME_W / 2, GAME_H - 46, { w: bw, h: 62, fill: c, fillAlpha: 1, primary: true }).setDepth(85);
  const t = tvText(scene, -14, 0, text, 24, fg, 800, 1.4).setOrigin(0.5);
  if (t.width > bw - 100) t.setScale((bw - 100) / t.width, 1);
  const a = scene.add.graphics();
  a.lineStyle(3, parseInt(fg.slice(1), 16), 1);
  a.beginPath();
  a.moveTo(bw / 2 - 34, -9);
  a.lineTo(bw / 2 - 25, 0);
  a.lineTo(bw / 2 - 34, 9);
  a.strokePath();
  b.add([t, a]);
  b.onTap = () => scene.time.delayedCall(30, onTap);
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

/** Placa de conteúdo (substitui o cartão de vidro). */
export function glassCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  plateShadow(g, x, y, w, h);
  plate(g, x, y, w, h, TV.ink2, 0.97);
  return g;
}

export { label, title, UI, FONT_TITLE };
