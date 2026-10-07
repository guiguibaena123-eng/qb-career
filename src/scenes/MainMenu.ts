import Phaser from 'phaser';
import { FONT_TITLE, matchConfig, ROSTER, setUserTeam, type TeamName, type WeatherChoice } from '../config';
import { difficulty, LEVELS, type Level } from '../systems/difficulty';
import { helmet } from '../ui/Intro';
import { GlassButton, label, title, UI } from '../ui/widgets';
import { MatchScene } from './MatchScene';

/*
 * Menu principal e Partida Rápida:
 *   MENU      → PARTIDA RÁPIDA | CARREIRA (em breve)
 *   PARTIDA   → escolha do seu time (LOBOS / TOUROS), clima (limpo, chuva, neve, sorteio) e dificuldade
 * Ao jogar, aplica as escolhas e cria uma partida nova (instância nova de MatchScene).
 */

let matchCounter = 0;
/** Parâmetros de depuração só valem na primeira abertura (depois o menu aparece normal). */
let booted = false;

export class MainMenu extends Phaser.Scene {
  private view: Phaser.GameObjects.Container | null = null;
  private fxG!: Phaser.GameObjects.Graphics;
  private bits: { x: number; y: number; v: number; s: number; c: number }[] = [];
  private t = 0;
  private ball!: Phaser.GameObjects.Container;
  private team: TeamName = 'LOBOS';
  private weather: WeatherChoice = 'random';
  private level: Level = 'normal';

  constructor() {
    super('MainMenu');
  }

  create() {
    // Parâmetros de depuração entram direto na partida
    const q = new URLSearchParams(location.search);
    const debug = ['auto', 'los', 'fim', 'chute', 'defesa', 'descida', 'tatica', 'semintro', 'semmenu', 'jog', 'intro'].some((k) => q.has(k));
    if (debug && !booted) {
      booted = true;
      if (q.get('time') === 'touros') setUserTeam('TOUROS');
      this.launch();
      return;
    }
    booted = true;
    this.team = matchConfig.team;
    this.weather = matchConfig.weather;
    this.level = difficulty.level;
    this.t = 0;
    this.bits = [];
    this.drawBackground();
    this.home();
  }

  // ------------------------------------------------------------ fundo

  private drawBackground() {
    const W = this.scale.width;
    const H = this.scale.height;
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a0c1a, 0x0a0c1a, 0x16204a, 0x16204a, 1);
    g.fillRect(0, 0, W, H);
    // Campo em perspectiva na parte de baixo
    const hy = H * 0.52;
    g.fillGradientStyle(0x1f5a1c, 0x1f5a1c, 0x2f7a2b, 0x2f7a2b, 1);
    g.fillTriangle(W / 2, hy, -W * 0.8, H, W * 1.8, H);
    g.fillStyle(0x0a0c1a, 0.45);
    g.fillRect(0, hy, W, H - hy);
    g.lineStyle(2, 0xffffff, 0.16);
    for (let i = 0; i < 9; i++) {
      const k = Math.pow(i / 9, 1.8);
      const y = hy + (H - hy) * k;
      g.lineBetween(W / 2 - (W * 1.3 * (y - hy)) / (H - hy), y, W / 2 + (W * 1.3 * (y - hy)) / (H - hy), y);
    }
    g.lineBetween(W / 2, hy, W / 2, H);
    g.setDepth(-5);
    this.fxG = this.add.graphics().setDepth(-4);
    for (let i = 0; i < 40; i++) this.bits.push({ x: Math.random() * W, y: Math.random() * H, v: 10 + Math.random() * 28, s: 2 + Math.floor(Math.random() * 3), c: [0xffd23f, 0xf26b1d, 0x3fd0ff, 0xffffff][i % 4] });
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    this.t += dt;
    const g = this.fxG;
    if (!g) return;
    g.clear();
    const H = this.scale.height;
    for (const b of this.bits) {
      b.y -= b.v * dt;
      if (b.y < -6) {
        b.y = H + 6;
        b.x = Math.random() * this.scale.width;
      }
      g.fillStyle(b.c, 0.35);
      g.fillRect(b.x, b.y, b.s, b.s);
    }
    if (this.ball?.active) {
      this.ball.y = 250 + Math.sin(this.t * 2.4) * 8;
      this.ball.setAngle(-18 + Math.sin(this.t * 1.7) * 6);
    }
  }

  private fresh() {
    this.view?.destroy();
    this.ball = undefined as unknown as Phaser.GameObjects.Container;
    return (this.view = this.add.container(0, 0));
  }

  // ------------------------------------------------------------ menu inicial

  private home() {
    const W = this.scale.width;
    const H = this.scale.height;
    const v = this.fresh();
    const t1 = this.add
      .text(W / 2, 112, 'QB', { fontFamily: FONT_TITLE, fontSize: '54px', color: UI.yellow, stroke: '#0D0D12', strokeThickness: 10, shadow: { offsetX: 6, offsetY: 9, color: '#0D0D12', fill: true, stroke: true } })
      .setOrigin(0.5)
      .setAngle(-4);
    const t2 = this.add
      .text(W / 2, 172, 'CAREER', { fontFamily: FONT_TITLE, fontSize: '34px', color: '#FFFFFF', stroke: '#0D0D12', strokeThickness: 8, shadow: { offsetX: 5, offsetY: 7, color: '#0D0D12', fill: true, stroke: true } })
      .setOrigin(0.5)
      .setAngle(-4);
    t1.setScale(0.4).setAlpha(0);
    t2.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: t1, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' });
    this.tweens.add({ targets: t2, scale: 1, alpha: 1, duration: 420, delay: 160, ease: 'Back.Out' });
    const sub = label(this, W / 2, 214, 'FUTEBOL AMERICANO · ESTILO RETRÔ', 10, '#C9CEE0').setOrigin(0.5);

    // Bola quicando
    this.ball = this.add.container(W / 2, 250);
    const bg = this.add.graphics();
    bg.fillStyle(UI.dark, 1);
    bg.fillEllipse(0, 0, 76, 44);
    bg.fillStyle(0x8a4b1f, 1);
    bg.fillEllipse(0, 0, 70, 38);
    bg.fillStyle(0xa8612b, 1);
    bg.fillEllipse(-4, -6, 50, 14);
    bg.fillStyle(0xffffff, 1);
    bg.fillRect(-14, -2, 28, 4);
    for (let i = -10; i <= 10; i += 5) bg.fillRect(i, -6, 2, 12);
    this.ball.add(bg);
    this.ball.setScale(1.1);
    v.add([t1, t2, sub, this.ball]);

    const bw = W - 60;
    const play = new GlassButton(this, W / 2, 470, { w: bw, h: 68, radius: 18, fill: ROSTER[this.team].color, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    play.add(title(this, 0, -6, 'PARTIDA RÁPIDA', 13, ROSTER[this.team].fg).setOrigin(0.5));
    play.add(label(this, 0, 14, 'ESCOLHA TIME E CLIMA', 9, ROSTER[this.team].fg).setOrigin(0.5).setAlpha(0.8));
    play.onTap = () => this.time.delayedCall(30, () => this.setup());
    const career = new GlassButton(this, W / 2, 552, { w: bw, h: 68, radius: 18 });
    career.add(title(this, 0, -6, 'CARREIRA', 13, '#FFFFFF').setOrigin(0.5));
    career.add(label(this, 0, 14, 'EM BREVE', 9, UI.muted).setOrigin(0.5));
    career.setEnabled(false);
    const diff = new GlassButton(this, W / 2, 634, { w: bw, h: 56, radius: 18 });
    const dt = title(this, 0, 0, '', 10, '#FFFFFF').setOrigin(0.5);
    diff.add(dt);
    const paint = () => dt.setText(`DIFICULDADE: ${LEVELS[this.level].label}`);
    paint();
    diff.onTap = () => {
      this.level = this.level === 'easy' ? 'normal' : this.level === 'normal' ? 'hard' : 'easy';
      difficulty.set(this.level);
      paint();
    };
    v.add([play, career, diff]);
    v.add(label(this, W / 2, H - 28, 'FEITO À MÃO · SEM IMAGENS · SEM SOM EXTERNO', 8, UI.muted).setOrigin(0.5));
    v.add(label(this, W / 2, H - 46, 'TOQUE NA TELA · PUXE E SOLTE PARA PASSAR', 8, UI.muted).setOrigin(0.5));
  }

  // ------------------------------------------------------------ partida rápida

  private setup() {
    const W = this.scale.width;
    const H = this.scale.height;
    const v = this.fresh();
    v.add(title(this, W / 2, 50, 'PARTIDA RÁPIDA', 15, UI.yellow).setOrigin(0.5));
    v.add(label(this, W / 2, 78, 'MONTE SEU JOGO', 10, '#C9CEE0').setOrigin(0.5));

    // ---- SEU TIME
    v.add(label(this, 20, 112, 'SEU TIME', 10, UI.muted).setOrigin(0, 0.5));
    const cardW = (W - 28 - 10) / 2;
    const cards: Record<TeamName, GlassButton> = {} as Record<TeamName, GlassButton>;
    const tags: Record<TeamName, Phaser.GameObjects.Container> = {} as Record<TeamName, Phaser.GameObjects.Container>;
    (['LOBOS', 'TOUROS'] as TeamName[]).forEach((name, i) => {
      const t = ROSTER[name];
      const x = 14 + cardW / 2 + i * (cardW + 10);
      const c = new GlassButton(this, x, 262, { w: cardW, h: 270, radius: 16 });
      const block = this.add.graphics();
      block.fillStyle(t.color, 1);
      block.fillRoundedRect(-cardW / 2 + 8, -127, cardW - 16, 112, 10);
      block.fillStyle(0x0a0c1a, 0.35);
      block.fillRoundedRect(-cardW / 2 + 8, -127, cardW - 16, 112, 10);
      c.add(block);
      const h = helmet(this, t.color, i === 1);
      h.setPosition(i === 1 ? 44 : -44, -118);
      c.add(h);
      c.add(title(this, 0, -34, t.abbr, 14, '#FFFFFF').setOrigin(0.5).setStroke('#0D0D12', 5));
      c.add(title(this, 0, 2, t.name, 11, '#FFFFFF').setOrigin(0.5));
      c.add(label(this, 0, 22, `RETROSPECTO ${t.record.join('-')}`, 9, UI.muted).setOrigin(0.5));
      [['ATQ', t.rating.atk], ['DEF', t.rating.def], ['ESP', t.rating.esp]].forEach(([n, val], k) => {
        const yy = 48 + k * 22;
        c.add(label(this, -cardW / 2 + 12, yy, n as string, 9, '#C9CEE0').setOrigin(0, 0.5));
        const bx = -cardW / 2 + 44;
        const bwid = cardW - 44 - 40;
        const bar = this.add.graphics();
        bar.fillStyle(UI.dark, 1);
        bar.fillRect(bx, yy - 5, bwid, 10);
        bar.fillStyle(0x3a4060, 1);
        bar.fillRect(bx + 1, yy - 4, bwid - 2, 8);
        bar.fillStyle(t.color, 1);
        bar.fillRect(bx + 1, yy - 4, ((bwid - 2) * (val as number)) / 100, 8);
        c.add(bar);
        c.add(title(this, bx + bwid + 5, yy, String(val), 7, '#FFFFFF').setOrigin(0, 0.5));
      });
      // Selo "SEU TIME"
      const tg = this.add.container(0, 117);
      const tgb = this.add.graphics();
      tgb.fillStyle(UI.dark, 1);
      tgb.fillRect(-45, -13, 90, 26);
      tgb.fillStyle(0xffd23f, 1);
      tgb.fillRect(-43, -11, 86, 22);
      tg.add([tgb, title(this, 0, 0, 'SEU TIME', 8, '#0D0D12').setOrigin(0.5)]);
      c.add(tg);
      tags[name] = tg;
      c.onTap = () => {
        this.team = name;
        paintTeam();
      };
      cards[name] = c;
      v.add(c);
    });
    const playBtnRef: { b: GlassButton | null; t: Phaser.GameObjects.Text | null } = { b: null, t: null };
    const paintTeam = () => {
      (['LOBOS', 'TOUROS'] as TeamName[]).forEach((n) => {
        const on = n === this.team;
        cards[n].setFill(ROSTER[n].color, on ? 0.3 : 0.06);
        cards[n].setBorder(on ? 0xffffff : 0xffffff, on ? 1 : 0.12);
        cards[n].setAlpha(on ? 1 : 0.75);
        tags[n].setVisible(on);
      });
      playBtnRef.b?.setFill(ROSTER[this.team].color, 1, true);
      playBtnRef.t?.setColor(ROSTER[this.team].fg);
    };

    // ---- CLIMA
    v.add(label(this, 20, 424, 'CLIMA', 10, UI.muted).setOrigin(0, 0.5));
    const opts: { key: WeatherChoice; name: string }[] = [
      { key: 'clear', name: 'LIMPO' },
      { key: 'rain', name: 'CHUVA' },
      { key: 'snow', name: 'NEVE' },
      { key: 'random', name: 'SORTEIO' },
    ];
    const wW = (W - 28 - 18) / 4;
    const chips: Partial<Record<WeatherChoice, GlassButton>> = {};
    opts.forEach((o, i) => {
      const x = 14 + wW / 2 + i * (wW + 6);
      const b = new GlassButton(this, x, 478, { w: wW, h: 84, radius: 14 });
      const ic = this.add.graphics();
      this.weatherIcon(ic, o.key);
      ic.setPosition(0, -12);
      b.add(ic);
      b.add(label(this, 0, 28, o.name, 9, '#FFFFFF').setOrigin(0.5));
      b.onTap = () => {
        this.weather = o.key;
        paintWeather();
      };
      chips[o.key] = b;
      v.add(b);
    });
    const paintWeather = () => {
      for (const o of opts) {
        const on = o.key === this.weather;
        chips[o.key]!.setFill(on ? 0x3fd0ff : 0x2a3156, on ? 0.28 : 0.7);
        chips[o.key]!.setBorder(0xffffff, on ? 1 : 0.16);
      }
    };

    // ---- DIFICULDADE
    v.add(label(this, 20, 548, 'DIFICULDADE', 10, UI.muted).setOrigin(0, 0.5));
    const levels: Level[] = ['easy', 'normal', 'hard'];
    const lW = (W - 28 - 12) / 3;
    const lchips: Partial<Record<Level, GlassButton>> = {};
    levels.forEach((l, i) => {
      const x = 14 + lW / 2 + i * (lW + 6);
      const b = new GlassButton(this, x, 590, { w: lW, h: 48, radius: 14 });
      b.add(title(this, 0, 0, LEVELS[l].label, 9, l === 'easy' ? '#3CCB5A' : l === 'hard' ? '#FF7B80' : '#FFD23F').setOrigin(0.5));
      b.onTap = () => {
        this.level = l;
        paintLevel();
      };
      lchips[l] = b;
      v.add(b);
    });
    const paintLevel = () => {
      for (const l of levels) {
        const on = l === this.level;
        lchips[l]!.setFill(on ? 0xffd23f : 0x2a3156, on ? 0.25 : 0.7);
        lchips[l]!.setBorder(0xffffff, on ? 1 : 0.16);
      }
    };

    // ---- botões
    const back = new GlassButton(this, 14 + 55, H - 52, { w: 110, h: 60, radius: 16 });
    back.add(title(this, 0, 0, 'VOLTAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.home());
    const pw = W - 28 - 110 - 10;
    const play = new GlassButton(this, W - 14 - pw / 2, H - 52, { w: pw, h: 60, radius: 16, fill: ROSTER[this.team].color, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    const pt = title(this, 0, 0, 'JOGAR', 14, ROSTER[this.team].fg).setOrigin(0.5);
    play.add(pt);
    playBtnRef.b = play;
    playBtnRef.t = pt;
    play.onTap = () => {
      setUserTeam(this.team);
      matchConfig.weather = this.weather;
      difficulty.set(this.level);
      this.time.delayedCall(30, () => this.launch());
    };
    v.add([back, play]);
    paintTeam();
    paintWeather();
    paintLevel();
  }

  /** Ícones simples do clima, desenhados em pixels. */
  private weatherIcon(g: Phaser.GameObjects.Graphics, k: WeatherChoice) {
    if (k === 'clear') {
      g.fillStyle(0xffd23f, 1);
      g.fillCircle(0, 0, 11);
      g.fillStyle(0xffe58a, 1);
      for (let a = 0; a < 8; a++) {
        const r = (a * Math.PI) / 4;
        g.fillRect(Math.cos(r) * 18 - 2, Math.sin(r) * 18 - 2, 4, 4);
      }
    } else if (k === 'rain') {
      g.fillStyle(0xc9cee0, 1);
      g.fillRoundedRect(-16, -14, 32, 14, 7);
      g.fillCircle(-5, -16, 8);
      g.fillCircle(6, -15, 7);
      g.fillStyle(0x3fd0ff, 1);
      for (const x of [-10, 0, 10]) g.fillRect(x, 4, 3, 10);
    } else if (k === 'snow') {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-1, -16, 3, 32);
      g.fillRect(-16, -1, 32, 3);
      g.fillRect(-12, -12, 3, 3);
      g.fillRect(10, -12, 3, 3);
      g.fillRect(-12, 10, 3, 3);
      g.fillRect(10, 10, 3, 3);
    } else {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-14, -14, 28, 28, 6);
      g.fillStyle(0x0d0d12, 1);
      for (const [x, y] of [[-7, -7], [7, 7], [0, 0], [7, -7], [-7, 7]]) g.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  // ------------------------------------------------------------ iniciar

  private launch() {
    const key = `Match${++matchCounter}`;
    this.game.scene.add(key, new MatchScene(key), false);
    this.scene.start(key);
  }
}
