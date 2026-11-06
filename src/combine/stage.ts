import Phaser from 'phaser';
import { sfx } from '../systems/sfx';
import { Ball } from '../entities/Ball';
import { makeLookTexture, PLAYER_SCALE, type Pose } from '../entities/Player';
import { COLLEGES } from '../data/colleges';
import { HAIR_COLORS, SKINS } from '../player/PlayerFace';
import { getSave } from '../player/PlayerSave';
import { shadowLights } from '../systems/daytime';
import type { Billboard } from '../systems/billboards';
import { World } from '../systems/world';
import { FIELD, FONT_TITLE, matchConfig } from '../config';
import { sidelineOptions } from '../entities/Sideline';
import { fieldOptions } from '../systems/field';
import { standOptions } from '../systems/grandstand';

/*
 * Palco do Combine: usa o mesmo mundo da partida (campo, arquibancada, laterais, câmera pseudo-3D,
 * sprites de jogador e bola), então o Combine tem o mesmo gráfico do jogo rápido.
 */
export const MID = FIELD.width / 2;

const hexStr = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export interface ActorLook {
  jersey: number;
  helmet: number;
  pants: number;
  trim: number;
  num: number;
  skin: number;
  digits: string;
  hair: number;
}

/** Visual do jogador do save com o uniforme da faculdade. */
export function playerLook(): ActorLook {
  const s = getSave();
  const c = COLLEGES.find((k) => k.id === s.college.id) ?? COLLEGES[0];
  const p = parseInt(c.colors[0].slice(1), 16);
  const q = parseInt(c.colors[1].slice(1), 16);
  return { jersey: p, helmet: p, pants: 0x232a4a, trim: q, num: q, skin: SKINS[s.skin % SKINS.length], digits: String(Math.max(0, s.number)), hair: HAIR_COLORS[s.hairColor % HAIR_COLORS.length] };
}

/** Pessoa em campo: posição em jardas, sprite do jogo e animação de corrida. */
export class Actor {
  x: number;
  y: number;
  hop = 0;
  pose: Pose | null = null;
  speed = 0;
  /** Volume das pisadas (0 = sem som). O seu jogador é 1; quem está longe, menos. */
  stepVol = 1;
  private animT = 0;
  private lastFrame = -1;

  constructor(readonly bb: Billboard, x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  sync(dt: number) {
    this.bb.x = this.x;
    this.bb.y = this.y;
    this.bb.h = this.hop;
    let frame: Pose = this.pose ?? 'idle';
    if (!this.pose && this.speed > 0.6) {
      this.animT += dt * (2 + this.speed * 0.9);
      const i = Math.floor(this.animT * 2) % 4;
      frame = (['run1', 'run3', 'run2', 'run4'] as const)[i];
      // pisada: o pé toca o chão nos quadros run1 e run2 (um passo a cada dois quadros)
      if (i !== this.lastFrame && i % 2 === 0 && this.stepVol > 0) sfx.play('step', { vol: this.stepVol * Math.min(1, 0.55 + this.speed / 16), x: this.x });
      this.lastFrame = i;
    } else this.lastFrame = -1;
    if (this.bb.img.frame.name !== frame) this.bb.img.setFrame(frame);
  }
}

export class CombineStage {
  readonly world: World;
  /** Desenho no chão (anéis, linhas) e por cima de tudo (setas, rastro). Limpos a cada quadro. */
  readonly ground: Phaser.GameObjects.Graphics;
  readonly top: Phaser.GameObjects.Graphics;
  ball?: Ball;
  private actors: Actor[] = [];
  private texts: { t: Phaser.GameObjects.Text; x: number; y: number }[] = [];

  /** O Combine recria o mundo a cada cena: remove texturas geradas antes (como a partida faz). */
  static reset(scene: Phaser.Scene) {
    const keep = ['__', 'logo', 'layer_', 'face_', 'drsuit_', 'stad_', 'draftimg_'];
    for (const k of scene.textures.getTextureKeys()) if (!keep.some((p) => k.startsWith(p))) scene.textures.remove(k);
  }

  constructor(private scene: Phaser.Scene, camY: number) {
    // Estádio alto (clássico) com arquibancadas vazias e laterais só de treinadores, imprensa,
    // especialistas e prospectos. As opções valem só enquanto esta cena existe.
    const before = matchConfig.stand;
    matchConfig.stand = 'classica';
    standOptions.empty = true;
    sidelineOptions.combine = true;
    fieldOptions.combine = true;
    this.world = new World(scene, camY, 'clear');
    matchConfig.stand = before;
    scene.events.once('shutdown', () => {
      standOptions.empty = false;
      sidelineOptions.combine = false;
      fieldOptions.combine = false;
    });
    this.ground = scene.add.graphics().setDepth(0.8);
    this.top = scene.add.graphics().setDepth(37);
  }

  get proj() {
    return this.world.proj;
  }

  /** Jogador de costas (como o ataque na partida) com o visual dado. */
  actor(x: number, y: number, look: ActorLook): Actor {
    const key = `cb_${look.jersey}_${look.helmet}_${look.pants}_${look.trim}_${look.num}_${look.skin}_${look.digits}_${look.hair}`;
    makeLookTexture(this.scene, key, {
      front: false,
      helmet: hexStr(look.helmet),
      jersey: hexStr(look.jersey),
      pants: hexStr(look.pants),
      trim: hexStr(look.trim),
      sock: hexStr(look.trim),
      skin: hexStr(look.skin),
      glove: '#F4F1E8',
      num: look.digits,
      numColor: hexStr(look.num),
      casual: true,
      hair: hexStr(look.hair),
    });
    const a = new Actor(this.world.players.add(key, x, y, { scale: PLAYER_SCALE, shadow: 2.2 }), x, y);
    a.bb.img.setFrame('idle');
    this.actors.push(a);
    return a;
  }

  /** Cone laranja de pixel art (em pé no campo). */
  cone(x: number, y: number) {
    if (!this.scene.textures.exists('cone')) {
      const t = this.scene.textures.createCanvas('cone', 48, 60)!;
      const c = t.getContext();
      c.scale(3, 3);
      const row = (yy: number, w: number, col: string) => {
        c.fillStyle = '#141414';
        c.fillRect(8 - w / 2 - 1, yy, w + 2, 3);
        c.fillStyle = col;
        c.fillRect(8 - w / 2, yy + 0.4, w, 2.2);
      };
      row(0, 2, '#FF7A1A');
      row(2, 4, '#FF7A1A');
      row(4, 6, '#F4F1E8');
      row(6, 8, '#F4F1E8');
      row(8, 10, '#FF7A1A');
      row(10, 12, '#FF7A1A');
      row(12, 14, '#FF7A1A');
      c.fillStyle = '#141414';
      c.fillRect(0, 17, 16, 3);
      c.fillStyle = '#E86A10';
      c.fillRect(1, 17.4, 14, 2.2);
      t.refresh();
      t.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    return this.world.players.add('cone', x, y, { scale: 0.95, shadow: 1 });
  }

  /** Texto deitado no gramado (números de jarda, marcas). */
  mark(text: string, x: number, y: number, size = 14, color = '#FFFFFF') {
    const t = this.scene.add.text(0, 0, text, { fontFamily: FONT_TITLE, fontSize: `${size}px`, color }).setOrigin(0.5).setDepth(5).setAlpha(0.85);
    this.texts.push({ t, x, y });
    return t;
  }

  /** Bola do jogo (voo em arco, sombra e rastro). */
  makeBall() {
    this.ball = new Ball(this.scene, this.proj, this.ground, this.top);
    this.ball.lights = shadowLights(this.world.tod);
    // som do lançamento: o braço (esforço) e a bola saindo da mão
    const ball = this.ball;
    const launch = ball.launch.bind(ball);
    ball.launch = (t: Parameters<Ball['launch']>[0]) => {
      sfx.play('effort', { vol: 0.55 });
      sfx.play('throw', { vol: 1.1 });
      return launch(t);
    };
    return this.ball;
  }

  /** Linha atravessando o campo na jarda `y`. */
  line(y: number, x0: number, x1: number, color = 0xffffff, alpha = 0.9, w = 3) {
    const a = this.proj.project(x0, y, 0);
    const b = this.proj.project(x1, y, 0);
    this.ground.lineStyle(w * a.s, color, alpha);
    this.ground.lineBetween(a.x, a.y, b.x, b.y);
  }

  /** Anel achatado no chão (alvo, cone). */
  ring(x: number, y: number, r: number, color: number, alpha = 1, w = 3) {
    const c = this.proj.project(x, y, 0);
    const px = r * 10 * c.s;
    this.ground.lineStyle(w, color, alpha);
    this.ground.strokeEllipse(c.x, c.y, px * 2, px * 2 * this.proj.flattenAt(y));
  }

  /** Começo do quadro: limpa o desenho e atualiza o mundo. */
  begin(dt: number) {
    this.ground.clear();
    this.top.clear();
    this.world.update(dt);
  }

  /** Fim do quadro: sincroniza os atores, os textos e a bola. */
  end(dt: number) {
    for (const a of this.actors) a.sync(dt);
    for (const m of this.texts) {
      const p = this.proj.project(m.x, m.y, 0);
      m.t.setPosition(p.x, p.y).setScale(p.s, p.s * this.proj.flattenAt(m.y));
    }
    if (this.ball) {
      this.ball.draw();
    }
  }
}
