import Phaser from 'phaser';
import { STAND_IDS, STAND_NAMES, stadiumOf, type StandChoice } from '../data/stadiums';
import { type SkyWeather, type TimeChoice, type TimeOfDay } from '../systems/daytime';
import { makeStandThumb, THUMB_H, THUMB_W } from '../systems/standThumb';
import { FONT_TITLE, GAME_H, GAME_W, applyMatchup, logoKey, matchConfig, saveMatchConfig, type WeatherChoice } from '../config';
import { TEAM_LIST, autoUniform, fgOn, teamById, uiColor, uniformsOf, type TeamDef } from '../data/teams';
import { difficulty, LEVELS, type Level } from '../systems/difficulty';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';
import { MatchScene } from './MatchScene';

/*
 * Menu principal e Partida Rápida:
 *   MENU      → PARTIDA RÁPIDA | CARREIRA (em breve)
 *   PARTIDA   → seu time e o adversário (32 times com logo e overall), uniforme de cada um, clima e dificuldade
 *   ESCOLHER  → grade com os 32 logos para trocar de time
 * Ao jogar, aplica as escolhas e cria uma partida nova (instância nova de MatchScene).
 */

let matchCounter = 0;
/** Parâmetros de depuração só valem na primeira abertura (depois o menu aparece normal). */
let booted = false;

const hexOf = (css: string) => parseInt(css.slice(1), 16);

export class MainMenu extends Phaser.Scene {
  private view: Phaser.GameObjects.Container | null = null;
  private fxG!: Phaser.GameObjects.Graphics;
  private bits: { x: number; y: number; v: number; s: number; c: number }[] = [];
  private t = 0;
  private ball!: Phaser.GameObjects.Container;
  private level: Level = 'normal';

  constructor() {
    super('MainMenu');
  }

  create() {
    setupHiRes(this);
    // Parâmetros de depuração entram direto na partida
    const q = new URLSearchParams(location.search);
    const debug = ['auto', 'los', 'fim', 'chute', 'defesa', 'descida', 'tatica', 'semintro', 'semmenu', 'jog', 'intro', 'treino'].some((k) => q.has(k));
    if (debug && !booted) {
      booted = true;
      if (q.has('time')) matchConfig.home = teamById(q.get('time')!).id;
      if (q.has('vs')) matchConfig.away = teamById(q.get('vs')!).id;
      if (matchConfig.home === matchConfig.away) matchConfig.away = matchConfig.home === 'kc' ? 'buf' : 'kc';
      if (q.has('uni')) matchConfig.homeUni = Number(q.get('uni')) % 3;
      applyMatchup();
      // ?treino=qb|rb abre direto no treino livre
      const tr = q.get('treino');
      this.launch(tr === 'qb' || tr === 'rb' ? tr : null);
      return;
    }
    booted = true;
    this.level = difficulty.level;
    this.t = 0;
    this.bits = [];
    this.drawBackground();
    this.home();
  }

  // ------------------------------------------------------------ fundo

  private drawBackground() {
    const W = GAME_W;
    const H = GAME_H;
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
    for (const b of this.bits) {
      b.y -= b.v * dt;
      if (b.y < -6) {
        b.y = GAME_H + 6;
        b.x = Math.random() * GAME_W;
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

  private teams(): [TeamDef, TeamDef] {
    return [teamById(matchConfig.home), teamById(matchConfig.away)];
  }

  // ------------------------------------------------------------ menu inicial

  private home() {
    const W = GAME_W;
    const H = GAME_H;
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

    const [h, a] = this.teams();
    const hc = uiColor(h);
    const bw = W - 60;
    const play = new GlassButton(this, W / 2, 444, { w: bw, h: 76, radius: 18, fill: hc, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    play.add(title(this, 0, -12, 'PARTIDA RÁPIDA', 13, fgOn(hc)).setOrigin(0.5));
    play.add(label(this, 0, 10, `${h.abbr}  x  ${a.abbr}`, 11, fgOn(hc)).setOrigin(0.5));
    play.add(label(this, 0, 26, 'ESCOLHA TIMES, UNIFORMES E CLIMA', 8, fgOn(hc)).setOrigin(0.5).setAlpha(0.75));
    play.onTap = () => this.time.delayedCall(30, () => this.setup());
    const career = new GlassButton(this, W / 2, 528, { w: bw, h: 68, radius: 18 });
    career.add(title(this, 0, -6, 'CARREIRA', 13, '#FFFFFF').setOrigin(0.5));
    career.add(label(this, 0, 14, 'ATÉ 3 SAVES · TEMPORADA COMPLETA', 9, UI.muted).setOrigin(0.5));
    career.onTap = () => this.time.delayedCall(30, () => this.scene.start('CareerSlots'));
    const practice = new GlassButton(this, W / 2, 604, { w: bw, h: 68, radius: 18 });
    practice.add(title(this, 0, -6, 'TREINO LIVRE', 13, '#FFFFFF').setOrigin(0.5));
    practice.add(label(this, 0, 14, 'QB NO ALVO · RB NA CORRIDA', 9, UI.muted).setOrigin(0.5));
    practice.onTap = () => this.time.delayedCall(30, () => this.practiceMenu());
    v.add(practice);
    const diff = new GlassButton(this, W / 2, 680, { w: bw, h: 56, radius: 18 });
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
    v.add(label(this, W / 2, H - 28, 'FEITO À MÃO · SEM SOM EXTERNO', 8, UI.muted).setOrigin(0.5));
    v.add(label(this, W / 2, H - 46, 'TOQUE NA TELA · PUXE E SOLTE PARA PASSAR', 8, UI.muted).setOrigin(0.5));
  }

  // ------------------------------------------------------------ partida rápida

  private teamCard(v: Phaser.GameObjects.Container, side: 'home' | 'away', x: number, cy: number, w: number) {
    const t = teamById(side === 'home' ? matchConfig.home : matchConfig.away);
    const c = uiColor(t);
    const card = new GlassButton(this, x, cy, { w, h: 262, radius: 16, fill: c, fillAlpha: 0.22, border: c, borderAlpha: 0.9 });
    card.add(label(this, 0, -118, side === 'home' ? 'SEU TIME' : 'ADVERSÁRIO', 9, side === 'home' ? UI.yellow : '#C9CEE0').setOrigin(0.5));
    card.add(this.add.image(0, -58, logoKey(t.id, 'l')).setDisplaySize(104, 104));
    card.add(title(this, 0, 10, t.name, t.name.length > 11 ? 8 : 10, '#FFFFFF').setOrigin(0.5));
    // Overall
    const g = this.add.graphics();
    g.fillStyle(UI.dark, 1);
    g.fillRoundedRect(-46, 26, 92, 26, 6);
    g.fillStyle(t.ovr >= 88 ? 0x3ccb5a : t.ovr >= 80 ? 0xffd23f : 0xffb02e, 1);
    g.fillRoundedRect(-44, 28, 88, 22, 5);
    card.add(g);
    card.add(title(this, 0, 39, `OVR ${t.ovr}`, 9, '#0D0D12').setOrigin(0.5));
    [['ATQ', t.atk], ['DEF', t.def], ['ESP', t.esp]].forEach(([n, val], k) => {
      const yy = 66 + k * 17;
      card.add(label(this, -w / 2 + 12, yy, n as string, 8, '#C9CEE0').setOrigin(0, 0.5));
      const bx = -w / 2 + 40;
      const bwid = w - 40 - 40;
      const bar = this.add.graphics();
      bar.fillStyle(UI.dark, 1);
      bar.fillRect(bx, yy - 4, bwid, 8);
      bar.fillStyle(0x3a4060, 1);
      bar.fillRect(bx + 1, yy - 3, bwid - 2, 6);
      bar.fillStyle(c, 1);
      bar.fillRect(bx + 1, yy - 3, ((bwid - 2) * Math.max(0, (val as number) - 50)) / 50, 6);
      card.add(bar);
      card.add(title(this, bx + bwid + 5, yy, String(val), 7, '#FFFFFF').setOrigin(0, 0.5));
    });
    card.add(label(this, 0, 118, 'TOQUE PARA TROCAR', 7, UI.muted).setOrigin(0.5));
    card.onTap = () => this.time.delayedCall(30, () => this.picker(side));
    v.add(card);
  }

  /** Ícone de uniforme (camisa + calça) com as cores reais. */
  private uniformIcon(g: Phaser.GameObjects.Graphics, u: ReturnType<typeof uniformsOf>[number]) {
    const j = hexOf(u.jersey);
    const p = hexOf(u.pants);
    const tr = hexOf(u.trim);
    g.fillStyle(UI.dark, 1);
    g.fillRect(-13, -13, 26, 18);
    g.fillRect(-18, -12, 36, 8);
    g.fillRect(-9, 4, 18, 13);
    g.fillStyle(j, 1);
    g.fillRect(-11, -11, 22, 14);
    g.fillRect(-16, -10, 7, 6);
    g.fillRect(9, -10, 7, 6);
    g.fillStyle(tr, 1);
    g.fillRect(-16, -6, 7, 2);
    g.fillRect(9, -6, 7, 2);
    g.fillRect(-4, -11, 8, 2);
    g.fillStyle(p, 1);
    g.fillRect(-7, 5, 14, 10);
    g.fillStyle(tr, 1);
    g.fillRect(-7, 5, 14, 2);
    g.fillStyle(hexOf(u.num), 1);
    g.fillRect(-3, -6, 6, 5);
  }

  private uniformRow(v: Phaser.GameObjects.Container, side: 'home' | 'away', x: number, cy: number, w: number) {
    const t = teamById(side === 'home' ? matchConfig.home : matchConfig.away);
    const ups = uniformsOf(t);
    const bw = (w - 12) / 3;
    const chips: GlassButton[] = [];
    const homeJersey = hexOf(uniformsOf(teamById(matchConfig.home))[matchConfig.homeUni].jersey);
    const sel = side === 'home' ? matchConfig.homeUni : (matchConfig.awayUni ?? autoUniform(t, homeJersey));
    ups.forEach((u, i) => {
      const b = new GlassButton(this, x - w / 2 + bw / 2 + i * (bw + 6), cy, { w: bw, h: 62, radius: 12 });
      const ic = this.add.graphics();
      this.uniformIcon(ic, u);
      ic.setPosition(0, -8);
      b.add(ic);
      b.add(label(this, 0, 24, u.name === 'ALTERNATIVO' ? 'ALT' : u.name, 8, '#FFFFFF').setOrigin(0.5));
      b.onTap = () => {
        if (side === 'home') matchConfig.homeUni = i;
        else matchConfig.awayUni = i;
        this.time.delayedCall(30, () => this.setup());
      };
      const on = i === sel;
      b.setFill(on ? 0xffd23f : 0x2a3156, on ? 0.28 : 0.7);
      b.setBorder(0xffffff, on ? 1 : 0.16);
      chips.push(b);
      v.add(b);
    });
  }

  private setup() {
    const W = GAME_W;
    const H = GAME_H;
    const v = this.fresh();
    v.add(title(this, W / 2, 44, 'PARTIDA RÁPIDA', 15, UI.yellow).setOrigin(0.5));
    v.add(label(this, W / 2, 70, 'TIMES, UNIFORMES, CLIMA E ESTÁDIO', 9, '#C9CEE0').setOrigin(0.5));

    const cardW = (W - 28 - 10) / 2;
    const xL = 14 + cardW / 2;
    const xR = W - 14 - cardW / 2;
    this.teamCard(v, 'home', xL, 222, cardW);
    this.teamCard(v, 'away', xR, 222, cardW);
    const vs = this.add.container(W / 2, 222);
    const vg = this.add.graphics();
    vg.fillStyle(UI.dark, 1);
    vg.fillCircle(0, 0, 15);
    vg.fillStyle(0xffd23f, 1);
    vg.fillCircle(0, 0, 12);
    vs.add([vg, title(this, 0, 0, 'VS', 8, '#0D0D12').setOrigin(0.5)]);
    v.add(vs);

    // ---- uniformes
    const away = teamById(matchConfig.away);
    const auto = matchConfig.awayUni === null;
    v.add(label(this, 20, 372, 'UNIFORME', 9, UI.muted).setOrigin(0, 0.5));
    v.add(label(this, W - 20, 372, auto ? 'ADVERSÁRIO: AUTOMÁTICO' : `ADVERSÁRIO: ${uniformsOf(away)[matchConfig.awayUni!].name}`, 8, UI.muted).setOrigin(1, 0.5));
    this.uniformRow(v, 'home', xL, 412, cardW);
    this.uniformRow(v, 'away', xR, 412, cardW);

    // Atualiza as miniaturas quando o horário ou o clima mudam (definida mais abaixo)
    let retouch: () => void = () => {};

    // ---- clima
    v.add(label(this, 20, 468, 'CLIMA', 9, UI.muted).setOrigin(0, 0.5));
    const opts: { key: WeatherChoice; name: string }[] = [
      { key: 'clear', name: 'LIMPO' },
      { key: 'rain', name: 'CHUVA' },
      { key: 'snow', name: 'NEVE' },
      { key: 'random', name: 'SORTEIO' },
    ];
    const wW = (W - 28 - 18) / 4;
    const chips: Partial<Record<WeatherChoice, GlassButton>> = {};
    const paintWeather = () => {
      for (const o of opts) {
        const on = o.key === matchConfig.weather;
        chips[o.key]!.setFill(on ? 0x3fd0ff : 0x2a3156, on ? 0.28 : 0.7);
        chips[o.key]!.setBorder(0xffffff, on ? 1 : 0.16);
      }
    };
    opts.forEach((o, i) => {
      const x = 14 + wW / 2 + i * (wW + 6);
      const b = new GlassButton(this, x, 504, { w: wW, h: 52, radius: 14 });
      const ic = this.add.graphics();
      this.weatherIcon(ic, o.key);
      ic.setPosition(0, -8).setScale(0.62);
      b.add(ic);
      b.add(label(this, 0, 16, o.name, 8, '#FFFFFF').setOrigin(0.5));
      b.onTap = () => {
        matchConfig.weather = o.key;
        paintWeather();
        retouch();
      };
      chips[o.key] = b;
      v.add(b);
    });

    // ---- horário (dia, tarde, noite)
    v.add(label(this, 20, 548, 'HORÁRIO', 9, UI.muted).setOrigin(0, 0.5));
    const topts: { key: TimeChoice; name: string }[] = [
      { key: 'day', name: 'DIA' },
      { key: 'dusk', name: 'TARDE' },
      { key: 'night', name: 'NOITE' },
      { key: 'random', name: 'SORTEIO' },
    ];
    const tchips: Partial<Record<TimeChoice, GlassButton>> = {};
    const paintTime = () => {
      for (const o of topts) {
        const on = o.key === matchConfig.time;
        tchips[o.key]!.setFill(on ? 0xffa43f : 0x2a3156, on ? 0.3 : 0.7);
        tchips[o.key]!.setBorder(0xffffff, on ? 1 : 0.16);
      }
    };
    topts.forEach((o, i) => {
      const x = 14 + wW / 2 + i * (wW + 6);
      const b = new GlassButton(this, x, 578, { w: wW, h: 40, radius: 12 });
      const ic = this.add.graphics();
      this.timeIcon(ic, o.key);
      ic.setPosition(-wW / 2 + 18, 0);
      b.add(ic);
      b.add(label(this, 12, 0, o.name, 8, '#FFFFFF').setOrigin(0.5));
      b.onTap = () => {
        matchConfig.time = o.key;
        paintTime();
        retouch();
      };
      tchips[o.key] = b;
      v.add(b);
    });

    // ---- dificuldade
    v.add(label(this, 20, 620, 'DIFICULDADE', 9, UI.muted).setOrigin(0, 0.5));
    const levels: Level[] = ['easy', 'normal', 'hard'];
    const lW = (W - 28 - 12) / 3;
    const lchips: Partial<Record<Level, GlassButton>> = {};
    const paintLevel = () => {
      for (const l of levels) {
        const on = l === this.level;
        lchips[l]!.setFill(on ? 0xffd23f : 0x2a3156, on ? 0.25 : 0.7);
        lchips[l]!.setBorder(0xffffff, on ? 1 : 0.16);
      }
    };
    levels.forEach((l, i) => {
      const x = 14 + lW / 2 + i * (lW + 6);
      const b = new GlassButton(this, x, 650, { w: lW, h: 36, radius: 12 });
      b.add(title(this, 0, 0, LEVELS[l].label, 9, l === 'easy' ? '#3CCB5A' : l === 'hard' ? '#FF7B80' : '#FFD23F').setOrigin(0.5));
      b.onTap = () => {
        this.level = l;
        paintLevel();
      };
      lchips[l] = b;
      v.add(b);
    });

    // ---- estádio (miniaturas: o do time da casa + os 5 modelos, com a cidade do time)
    const homeT = teamById(matchConfig.home);
    const st = stadiumOf(homeT.id);
    const hc0 = uiColor(homeT);
    const ac0 = uiColor(teamById(matchConfig.away));
    v.add(label(this, 20, 686, 'ESTÁDIO', 9, UI.muted).setOrigin(0, 0.5));
    v.add(label(this, W - 20, 686, matchConfig.stand === 'auto' ? `DO TIME: ${STAND_NAMES[st.model]}` : STAND_NAMES[matchConfig.stand], 8, UI.muted).setOrigin(1, 0.5));
    const opts2: { key: StandChoice; name: string; model: (typeof STAND_IDS)[number] }[] = [
      { key: 'auto', name: 'DO TIME', model: st.model },
      ...STAND_IDS.map((id) => ({ key: id as StandChoice, name: STAND_NAMES[id], model: id })),
    ];
    const sW = (W - 28 - 5 * 5) / 6;
    const sChips: Partial<Record<StandChoice, GlassButton>> = {};
    const paintStand = () => {
      for (const o of opts2) {
        const on = o.key === matchConfig.stand;
        sChips[o.key]!.setFill(on ? 0xffd23f : 0x2a3156, on ? 0.28 : 0.7);
        sChips[o.key]!.setBorder(0xffffff, on ? 1 : 0.16);
      }
    };
    const thumbs: { key: string; img: Phaser.GameObjects.Image; model: (typeof STAND_IDS)[number] }[] = [];
    const wShown = (): SkyWeather => (matchConfig.weather === 'rain' || matchConfig.weather === 'snow' ? matchConfig.weather : 'clear');
    const todShown = (): TimeOfDay => (matchConfig.time === 'random' ? 'dusk' : matchConfig.time);
    retouch = () => {
      for (const t of thumbs) {
        makeStandThumb(this, t.key, t.model, homeT.id, hc0, ac0, todShown(), wShown());
        t.img.setTexture(t.key);
      }
    };
    opts2.forEach((o, i) => {
      const key = `thumb_${o.key}`;
      makeStandThumb(this, key, o.model, homeT.id, hc0, ac0, todShown(), wShown());
      const x = 14 + sW / 2 + i * (sW + 5);
      const b = new GlassButton(this, x, 732, { w: sW, h: 80, radius: 12 });
      const sc = (sW - 6) / THUMB_W;
      const img = this.add.image(0, -8, key).setScale(sc);
      thumbs.push({ key, img, model: o.model });
      b.add(img);
      b.add(label(this, 0, 29, o.name, 7, o.key === 'auto' ? UI.yellow : '#FFFFFF').setOrigin(0.5));
      void THUMB_H;
      b.onTap = () => {
        matchConfig.stand = o.key;
        paintStand();
      };
      sChips[o.key] = b;
      v.add(b);
    });

    // ---- botões
    const back = new GlassButton(this, 14 + 55, H - 40, { w: 110, h: 52, radius: 16 });
    back.add(title(this, 0, 0, 'VOLTAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.home());
    const hc = uiColor(teamById(matchConfig.home));
    const pw = W - 28 - 110 - 10;
    const play = new GlassButton(this, W - 14 - pw / 2, H - 40, { w: pw, h: 52, radius: 16, fill: hc, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    play.add(title(this, 0, 0, 'JOGAR', 14, fgOn(hc)).setOrigin(0.5));
    play.onTap = () => {
      difficulty.set(this.level);
      applyMatchup();
      saveMatchConfig();
      this.time.delayedCall(30, () => this.launch());
    };
    v.add([back, play]);
    paintWeather();
    paintLevel();
    paintTime();
    paintStand();
  }

  // ------------------------------------------------------------ escolher time (grade com os 32 logos)

  private picker(side: 'home' | 'away') {
    const W = GAME_W;
    const H = GAME_H;
    const v = this.fresh();
    const other = side === 'home' ? matchConfig.away : matchConfig.home;
    const cur = side === 'home' ? matchConfig.home : matchConfig.away;
    v.add(title(this, W / 2, 34, side === 'home' ? 'ESCOLHA O SEU TIME' : 'ESCOLHA O ADVERSÁRIO', 12, UI.yellow).setOrigin(0.5));
    v.add(label(this, W / 2, 58, 'TOQUE NO LOGO · NOTA GERAL (OVR) EMBAIXO', 8, '#C9CEE0').setOrigin(0.5));
    const cols = 4;
    const cw = (W - 16) / cols;
    const chh = 83;
    TEAM_LIST.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 8 + cw / 2 + col * cw;
      const y = 78 + chh / 2 + row * chh;
      const c = uiColor(t);
      const on = t.id === cur;
      const b = new GlassButton(this, x, y, { w: cw - 6, h: chh - 6, radius: 12, fill: on ? c : 0x2a3156, fillAlpha: on ? 0.4 : 0.55, border: 0xffffff, borderAlpha: on ? 1 : 0.14 });
      b.add(this.add.image(0, -10, logoKey(t.id, 'm')).setDisplaySize(52, 52));
      b.add(label(this, 0, 27, `${t.abbr} · ${t.ovr}`, 8, on ? '#FFFFFF' : '#C9CEE0').setOrigin(0.5));
      if (t.id === other) {
        b.setEnabled(false);
        b.setAlpha(0.3);
      }
      b.onTap = () => {
        if (side === 'home') matchConfig.home = t.id;
        else matchConfig.away = t.id;
        matchConfig.awayUni = null;
        if (side === 'home') matchConfig.homeUni = 0;
        this.time.delayedCall(30, () => this.setup());
      };
      v.add(b);
    });
    const back = new GlassButton(this, W / 2, H - 38, { w: W - 28, h: 50, radius: 14 });
    back.add(title(this, 0, 0, 'CANCELAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.setup());
    v.add(back);
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

  /** Ícones do horário: sol, pôr do sol, lua e dado. */
  private timeIcon(g: Phaser.GameObjects.Graphics, k: TimeChoice) {
    if (k === 'day') {
      g.fillStyle(0xffd23f, 1);
      g.fillCircle(0, 0, 6);
      g.fillStyle(0xffe58a, 1);
      for (let a = 0; a < 8; a++) g.fillRect(Math.cos((a * Math.PI) / 4) * 10 - 1, Math.sin((a * Math.PI) / 4) * 10 - 1, 2, 2);
    } else if (k === 'dusk') {
      g.fillStyle(0xff7a30, 1);
      g.beginPath();
      g.arc(0, 4, 8, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(0xffd08a, 1);
      g.fillRect(-11, 4, 22, 2);
      g.fillStyle(0xff9a5a, 1);
      g.fillRect(-7, 8, 14, 1);
    } else if (k === 'night') {
      g.fillStyle(0xdfe6ff, 1);
      g.fillCircle(0, 0, 8);
      g.fillStyle(0x2a3156, 1);
      g.fillCircle(4, -3, 7);
    } else {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-8, -8, 16, 16, 4);
      g.fillStyle(0x0d0d12, 1);
      for (const [x, y] of [[-4, -4], [4, 4], [0, 0], [4, -4], [-4, 4]]) g.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  // ------------------------------------------------------------ iniciar

  // ------------------------------------------------------------ treino livre

  /** Treino livre: escolhe a posição (QB passa nos alvos, RB recebe e corre contra a defesa). */
  private practiceMenu() {
    const W = GAME_W;
    const H = GAME_H;
    const v = this.fresh();
    v.add(title(this, W / 2, 120, 'TREINO LIVRE', 17, UI.yellow).setOrigin(0.5).setAngle(-3));
    v.add(label(this, W / 2, 158, 'ESTÁDIO VAZIO · DE DIA · SEM DEFESA', 9, '#C9CEE0').setOrigin(0.5));
    const hc = uiColor(teamById(matchConfig.home));
    const bw = W - 60;
    const opt = (y: number, name: string, lines: string[], mode: 'qb' | 'rb') => {
      const b = new GlassButton(this, W / 2, y, { w: bw, h: 150, radius: 18, fill: hc, fillAlpha: 0.22, border: hc, borderAlpha: 0.9 });
      b.add(title(this, 0, -44, name, 22, '#FFFFFF').setOrigin(0.5));
      lines.forEach((l, i) => b.add(label(this, 0, -4 + i * 18, l, 9, '#C9CEE0').setOrigin(0.5)));
      b.onTap = () => {
        applyMatchup();
        this.time.delayedCall(30, () => this.launch(mode));
      };
      v.add(b);
    };
    opt(300, 'QB', ['PASSE NOS ALVOS, COMO NO COMBINE', 'RECEBEDORES CORRENDO AS ROTAS', 'SEM DEFESA · TROQUE ROTAS E JOGADAS'], 'qb');
    opt(480, 'RB', ['RECEBA A BOLA DO QB E CORRA', 'CAMPO LIVRE, SEM DEFESA','JUKE · SPIN · SPRINT · MERGULHO'], 'rb');
    const back = new GlassButton(this, W / 2, H - 70, { w: 160, h: 52, radius: 16 });
    back.add(title(this, 0, 0, 'VOLTAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.home());
    v.add(back);
  }

  private launch(practice: 'qb' | 'rb' | null = null) {
    const key = `Match${++matchCounter}`;
    this.game.scene.add(key, new MatchScene(key, practice), false);
    this.scene.start(key);
  }
}
