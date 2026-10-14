import Phaser from 'phaser';
import { isDome, STAND_IDS, STAND_NAMES, stadiumOf, type StandChoice } from '../data/stadiums';
import { pixelPhoto } from '../ui/pixelPhoto';
import { type SkyWeather, type TimeChoice, type TimeOfDay } from '../systems/daytime';
import { makeStandThumb, THUMB_H, THUMB_W } from '../systems/standThumb';
import { FONT_TITLE, GAME_H, GAME_W, applyMatchup, broadcast, finalGame, logoKey, playoffLogo, matchConfig, saveMatchConfig, venue, type WeatherChoice } from '../config';
import { PRIME } from '../career/season';
import { TeamRepository, type KitDef } from '../data/TeamRepository';
import { PlayerBody } from '../player/PlayerBody';
import { DEFAULT_LOOK } from '../player/PlayerSave';
import { TEAM_LIST, autoUniform, fgOn, teamById, uiColor, uniformsOf, type TeamDef, type Uniform } from '../data/teams';
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
    const card = new GlassButton(this, x, cy, { w, h: 232, radius: 16, fill: c, fillAlpha: 0.22, border: c, borderAlpha: 0.9 });
    card.add(label(this, 0, -102, side === 'home' ? 'SEU TIME' : 'ADVERSÁRIO', 9, side === 'home' ? UI.yellow : '#C9CEE0').setOrigin(0.5));
    card.add(this.add.image(0, -50, logoKey(t.id, 'l')).setDisplaySize(88, 88));
    card.add(title(this, 0, 8, t.name, t.name.length > 11 ? 8 : 10, '#FFFFFF').setOrigin(0.5));
    const g = this.add.graphics();
    g.fillStyle(UI.dark, 1);
    g.fillRoundedRect(-46, 21, 92, 24, 6);
    g.fillStyle(t.ovr >= 88 ? 0x3ccb5a : t.ovr >= 80 ? 0xffd23f : 0xffb02e, 1);
    g.fillRoundedRect(-44, 23, 88, 20, 5);
    card.add(g);
    card.add(title(this, 0, 33, `OVR ${t.ovr}`, 9, '#0D0D12').setOrigin(0.5));
    [['ATQ', t.atk], ['DEF', t.def], ['ESP', t.esp]].forEach(([n, val], k) => {
      const yy = 58 + k * 16;
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
    card.add(label(this, 0, 104, 'TOQUE PARA TROCAR', 7, UI.muted).setOrigin(0.5));
    card.onTap = () => this.time.delayedCall(30, () => this.picker(side));
    v.add(card);
  }

  /** Kit e visual do corpo (PlayerBody) a partir de um uniforme da Partida Rápida. */
  private bodyCfg(u: Uniform, number: number) {
    const j = hexOf(u.jersey);
    const tr = hexOf(u.trim);
    const kit: KitDef = { helmet: hexOf(u.helmet), jersey: j, number: hexOf(u.num), pants: hexOf(u.pants), stripe: tr, pstripe: 'side2' };
    const look = { ...DEFAULT_LOOK, sockC: hexOf(u.sock), sstripeC: tr, underC: j, gloveC: tr, caccC: tr, mouthC: tr, maskC: 0xc9ceda };
    return { look, kit, face: { face: 6, skin: 4, hair: -1, hairColor: 0, beard: -1 }, number };
  }

  /** Fileira com os 3 uniformes de um time, cada um vestido num corpo de jogador. */
  private uniformRow(v: Phaser.GameObjects.Container, side: 'home' | 'away', y: number) {
    const W = GAME_W;
    const t = teamById(side === 'home' ? matchConfig.home : matchConfig.away);
    const ups = uniformsOf(t);
    const homeJersey = hexOf(uniformsOf(teamById(matchConfig.home))[matchConfig.homeUni].jersey);
    const auto = side === 'away' && matchConfig.awayUni === null;
    const sel = side === 'home' ? matchConfig.homeUni : (matchConfig.awayUni ?? autoUniform(t, homeJersey));
    v.add(this.add.image(28, y, logoKey(t.id, 's')).setDisplaySize(18, 18));
    v.add(label(this, 42, y, side === 'home' ? `SEU TIME · ${t.name}` : `ADVERSÁRIO · ${t.name}`, 8, side === 'home' ? UI.yellow : '#C9CEE0').setOrigin(0, 0.5));
    if (side === 'away') {
      const at = label(this, W - 20, y, auto ? 'AUTOMÁTICO ✓' : 'VOLTAR AO AUTOMÁTICO', 8, auto ? '#3CCB5A' : '#9AA3C0').setOrigin(1, 0.5);
      if (!auto) {
        at.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          matchConfig.awayUni = null;
          this.time.delayedCall(30, () => this.setup());
        });
      }
      v.add(at);
    }
    const bw = (W - 28 - 12) / 3;
    const bh = 142;
    ups.forEach((u, i) => {
      const on = i === sel;
      const b = new GlassButton(this, 14 + bw / 2 + i * (bw + 6), y + 14 + bh / 2, { w: bw, h: bh, radius: 14 });
      b.setFill(on ? 0xffd23f : 0x2a3156, on ? 0.22 : 0.6);
      b.setBorder(on ? 0xffd23f : 0xffffff, on ? 1 : 0.16);
      // chão e corpo vestido
      const fl = this.add.graphics();
      fl.fillStyle(0x000000, 0.35);
      fl.fillEllipse(0, bh / 2 - 24, bw * 0.55, 8);
      b.add(fl);
      b.add(new PlayerBody(this, 0, bh / 2 - 24, this.bodyCfg(u, side === 'home' ? 12 : 21), 0.36));
      b.add(label(this, 0, bh / 2 - 11, u.name, 8, on ? '#FFD23F' : '#FFFFFF').setOrigin(0.5));
      b.onTap = () => {
        if (side === 'home') matchConfig.homeUni = i;
        else matchConfig.awayUni = i;
        this.time.delayedCall(30, () => this.setup());
      };
      v.add(b);
    });
  }

  /** Estádio da partida: o do mandante (casa ou fora) ou o de outro time escolhido. */
  private hostId() {
    if (matchConfig.side === 'final') return matchConfig.standTeam ?? matchConfig.home;
    return matchConfig.standTeam ?? (matchConfig.side === 'away' ? matchConfig.away : matchConfig.home);
  }

  // ---- Partida rápida, etapa 1: CONFRONTO (times, local e uniformes)
  private setup() {
    const W = GAME_W;
    const H = GAME_H;
    const v = this.fresh();
    v.add(title(this, W / 2, 40, 'PARTIDA RÁPIDA', 15, UI.yellow).setOrigin(0.5));
    v.add(label(this, W / 2, 64, '1 DE 2 · CONFRONTO, LOCAL E UNIFORMES', 8, '#C9CEE0').setOrigin(0.5));

    const cardW = (W - 28 - 10) / 2;
    const xL = 14 + cardW / 2;
    const xR = W - 14 - cardW / 2;
    this.teamCard(v, 'home', xL, 196, cardW);
    this.teamCard(v, 'away', xR, 196, cardW);
    const vs = this.add.container(W / 2, 196);
    const vg = this.add.graphics();
    vg.fillStyle(UI.dark, 1);
    vg.fillCircle(0, 0, 15);
    vg.fillStyle(0xffd23f, 1);
    vg.fillCircle(0, 0, 12);
    vs.add([vg, title(this, 0, 0, matchConfig.side === 'away' ? '@' : matchConfig.side === 'final' ? '★' : 'VS', 8, '#0D0D12').setOrigin(0.5)]);
    v.add(vs);

    // ---- local: em casa ou fora (antes dos outros detalhes)
    v.add(label(this, 20, 328, 'LOCAL DA PARTIDA', 9, UI.muted).setOrigin(0, 0.5));
    const lw = (W - 28 - 12) / 3;
    (['home', 'away', 'final'] as const).forEach((sd, i) => {
      const on = matchConfig.side === sd;
      const host = teamById(sd === 'away' ? matchConfig.away : matchConfig.home);
      const b = new GlassButton(this, 14 + lw / 2 + i * (lw + 6), 362, { w: lw, h: 50, radius: 14 });
      const fc = sd === 'final' ? 0xc8102e : 0xffd23f;
      b.setFill(on ? fc : 0x2a3156, on ? 0.3 : 0.6);
      b.setBorder(on ? (sd === 'final' ? 0xffd23f : fc) : 0xffffff, on ? 1 : 0.16);
      const ic = this.add.graphics();
      if (sd === 'final') {
        b.add(this.add.image(-lw / 2 + 22, 0, 'logoQflBowlS').setDisplaySize(34, 34));
      } else if (sd === 'home') {
        // casinha
        ic.fillStyle(0xffffff, 1);
        ic.fillTriangle(-9, 0, 9, 0, 0, -9);
        ic.fillRect(-6, 0, 12, 9);
      } else {
        // aviãozinho
        ic.fillStyle(0xffffff, 1);
        ic.fillRect(-10, -1, 20, 3);
        ic.fillTriangle(-2, -1, 4, -1, -4, -9);
        ic.fillTriangle(-2, 2, 4, 2, -4, 10);
        ic.fillTriangle(-10, -1, -10, 2, -13, -5);
      }
      ic.setPosition(-lw / 2 + 20, 0);
      b.add(ic);
      b.add(title(this, -lw / 2 + 38, -8, sd === 'home' ? 'CASA' : sd === 'away' ? 'FORA' : 'QFL BOWL', 8, on ? '#FFD23F' : '#FFFFFF').setOrigin(0, 0.5));
      const sn = sd === 'final' ? 'A GRANDE FINAL' : TeamRepository.get(host.id).stadium.name;
      const st = label(this, -lw / 2 + 38, 10, sn, 6, '#C9CEE0').setOrigin(0, 0.5);
      if (st.width > lw - 44) st.setScale((lw - 44) / st.width, 1);
      b.add(st);
      b.onTap = () => {
        matchConfig.side = sd;
        matchConfig.standTeam = null;
        this.time.delayedCall(30, () => this.setup());
      };
      v.add(b);
    });

    // ---- uniformes (corpo inteiro)
    v.add(label(this, 20, 404, 'UNIFORMES', 9, UI.muted).setOrigin(0, 0.5));
    this.uniformRow(v, 'home', 424);
    this.uniformRow(v, 'away', 590);

    // ---- botões
    const back = new GlassButton(this, 14 + 55, H - 40, { w: 110, h: 52, radius: 16 });
    back.add(title(this, 0, 0, 'VOLTAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.home());
    const pw = W - 28 - 110 - 10;
    const next = new GlassButton(this, W - 14 - pw / 2, H - 40, { w: pw, h: 52, radius: 16, fill: 0xffd23f, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    next.add(title(this, 0, 0, 'PRÓXIMO ›', 13, '#0D0D12').setOrigin(0.5));
    next.onTap = () => this.time.delayedCall(30, () => this.details());
    v.add([back, next]);
  }

  // ---- Partida rápida, etapa 2: DETALHES (clima, horário, dificuldade e estádio)
  private details() {
    const W = GAME_W;
    const H = GAME_H;
    const v = this.fresh();
    v.add(title(this, W / 2, 40, 'PARTIDA RÁPIDA', 15, UI.yellow).setOrigin(0.5));
    v.add(label(this, W / 2, 64, '2 DE 2 · CLIMA, HORÁRIO, DIFICULDADE E ESTÁDIO', 8, '#C9CEE0').setOrigin(0.5));

    // Atualiza as miniaturas quando o horário ou o clima mudam (definida mais abaixo)
    let retouch: () => void = () => {};
    const wW = (W - 28 - 18) / 4;

    // ---- clima (estádio coberto e final: sempre limpo, sem escolha)
    const host = teamById(this.hostId());
    const lockWx = isDome(host.id) || matchConfig.side === 'final';
    v.add(label(this, 20, 98, 'CLIMA', 9, UI.muted).setOrigin(0, 0.5));
    if (lockWx) v.add(label(this, W - 20, 98, matchConfig.side === 'final' ? 'FINAL: SEMPRE LIMPO' : 'ESTÁDIO COBERTO: SEMPRE LIMPO', 8, '#FFD23F').setOrigin(1, 0.5));
    const opts: { key: WeatherChoice; name: string }[] = [
      { key: 'clear', name: 'LIMPO' },
      { key: 'rain', name: 'CHUVA' },
      { key: 'snow', name: 'NEVE' },
      { key: 'random', name: 'SORTEIO' },
    ];
    const chips: Partial<Record<WeatherChoice, GlassButton>> = {};
    const paintWeather = () => {
      for (const o of opts) {
        const on = lockWx ? o.key === 'clear' : o.key === matchConfig.weather;
        chips[o.key]!.setFill(on ? 0x3fd0ff : 0x2a3156, on ? 0.28 : 0.7);
        chips[o.key]!.setBorder(0xffffff, on ? 1 : 0.16);
        chips[o.key]!.setAlpha(lockWx && !on ? 0.3 : 1);
      }
    };
    opts.forEach((o, i) => {
      const b = new GlassButton(this, 14 + wW / 2 + i * (wW + 6), 136, { w: wW, h: 54, radius: 14 });
      const ic = this.add.graphics();
      this.weatherIcon(ic, o.key);
      ic.setPosition(0, -8).setScale(0.62);
      b.add(ic);
      b.add(label(this, 0, 16, o.name, 8, '#FFFFFF').setOrigin(0.5));
      b.onTap = () => {
        if (lockWx) return;
        matchConfig.weather = o.key;
        paintWeather();
        retouch();
      };
      if (lockWx && o.key !== 'clear') b.setEnabled(false);
      chips[o.key] = b;
      v.add(b);
    });

    // ---- horário
    v.add(label(this, 20, 184, 'HORÁRIO', 9, UI.muted).setOrigin(0, 0.5));
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
      const b = new GlassButton(this, 14 + wW / 2 + i * (wW + 6), 214, { w: wW, h: 40, radius: 12 });
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
    v.add(label(this, 20, 256, 'DIFICULDADE', 9, UI.muted).setOrigin(0, 0.5));
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
      const b = new GlassButton(this, 14 + lW / 2 + i * (lW + 6), 286, { w: lW, h: 38, radius: 12 });
      b.add(title(this, 0, 0, LEVELS[l].label, 9, l === 'easy' ? '#3CCB5A' : l === 'hard' ? '#FF7B80' : '#FFD23F').setOrigin(0.5));
      b.onTap = () => {
        this.level = l;
        paintLevel();
      };
      lchips[l] = b;
      v.add(b);
    });

    // ---- estádio: foto pixelizada do selecionado + de quem é (a arquibancada é a do próprio estádio)
    const hostTeamR = TeamRepository.get(host.id);
    const st = stadiumOf(host.id);
    const fin = matchConfig.side === 'final';
    const wShown = (): SkyWeather => (lockWx ? 'clear' : matchConfig.weather === 'rain' || matchConfig.weather === 'snow' ? matchConfig.weather : 'clear');
    const todShown = (): TimeOfDay => (matchConfig.time === 'random' ? 'dusk' : matchConfig.time);
    v.add(label(this, 20, 330, 'ESTÁDIO', 9, UI.muted).setOrigin(0, 0.5));
    const pv = this.add.graphics();
    pv.fillStyle(0x000000, 0.35);
    pv.fillRoundedRect(14, 348, 178, 196, 16);
    pv.fillStyle(0x1c2142, 1);
    pv.fillRoundedRect(14, 344, 178, 196, 16);
    pv.lineStyle(2, fin ? 0xffd23f : 0xffd23f, 0.9);
    pv.strokeRoundedRect(14, 344, 178, 196, 16);
    v.add(pv);
    // Foto do estádio pixelizada, com o horário e o clima por cima
    const photo = hostTeamR.stadium.image;
    if (photo && this.textures.exists(photo)) v.add(this.add.image(103, 442, pixelPhoto(this, photo, 168, 186, 60)).setDisplaySize(168, 186));
    const mood = this.add.rectangle(103, 442, 168, 186, 0x000000, 0);
    v.add(mood);
    const paintMood = () => {
      const w = wShown();
      const t = todShown();
      const col = t === 'night' ? 0x0a1030 : t === 'dusk' ? 0xff7a30 : w === 'snow' ? 0xffffff : w === 'rain' ? 0x3a4560 : 0x000000;
      const a = t === 'night' ? 0.3 : t === 'dusk' ? 0.16 : w === 'snow' ? 0.25 : w === 'rain' ? 0.3 : 0;
      mood.setFillStyle(col, a);
    };
    paintMood();
    retouch = paintMood;
    if (isDome(host.id)) v.add(label(this, 103, 528, 'COBERTO · SEMPRE LIMPO', 7, '#FFD23F').setOrigin(0.5));
    if (fin) v.add(this.add.image(170, 364, 'logoQflBowlS').setDisplaySize(34, 34));
    // Informações e escolha do dono do estádio
    const ix = 206;
    v.add(this.add.image(ix + 12, 362, logoKey(host.id, 's')).setDisplaySize(24, 24));
    const nm = title(this, ix + 30, 362, hostTeamR.stadium.name, 7, '#FFFFFF').setOrigin(0, 0.5);
    if (nm.width > W - 14 - ix - 34) nm.setScale((W - 14 - ix - 34) / nm.width);
    v.add(nm);
    const who = fin ? 'FINAL · CAMPO NEUTRO' : matchConfig.standTeam ? 'CAMPO NEUTRO' : matchConfig.side === 'away' ? 'CASA DO ADVERSÁRIO' : 'SUA CASA';
    v.add(label(this, ix, 384, who, 8, fin || matchConfig.standTeam ? '#3FD0FF' : UI.yellow).setOrigin(0, 0.5));
    v.add(label(this, ix, 400, `${hostTeamR.stadium.capacity.toLocaleString('pt-BR')} LUGARES`, 8, '#9AA3C0').setOrigin(0, 0.5));
    v.add(label(this, ix, 416, `ARQUIBANCADA ${STAND_NAMES[st.model]}`, 8, '#9AA3C0').setOrigin(0, 0.5));
    const bw2 = W - 14 - ix;
    const mand = new GlassButton(this, ix + bw2 / 2, 452, { w: bw2, h: 40, radius: 12 });
    mand.add(label(this, 0, 0, fin ? 'SEU ESTÁDIO' : 'DO MANDANTE', 8, '#FFFFFF').setOrigin(0.5));
    const on1 = !matchConfig.standTeam;
    mand.setFill(on1 ? 0xffd23f : 0x2a3156, on1 ? 0.25 : 0.6);
    mand.setBorder(on1 ? 0xffd23f : 0xffffff, on1 ? 1 : 0.16);
    mand.onTap = () => {
      matchConfig.standTeam = null;
      this.time.delayedCall(30, () => this.details());
    };
    const other = new GlassButton(this, ix + bw2 / 2, 500, { w: bw2, h: 40, radius: 12 });
    other.add(label(this, 0, 0, fin ? 'ESCOLHER ESTÁDIO ›' : 'DE OUTRO TIME ›', 8, '#FFFFFF').setOrigin(0.5));
    other.setFill(!on1 ? 0x3fd0ff : 0x2a3156, !on1 ? 0.25 : 0.6);
    other.setBorder(!on1 ? 0x3fd0ff : 0xffffff, !on1 ? 1 : 0.16);
    other.onTap = () => this.time.delayedCall(30, () => this.picker('stand'));
    v.add([mand, other]);
    // Na final: as regras do campo e da torcida continuam (qualquer estádio)
    if (fin) {
      const fg = this.add.graphics();
      fg.fillStyle(0xc8102e, 0.22);
      fg.fillRoundedRect(14, 556, W - 28, 92, 16);
      fg.lineStyle(2, 0xffd23f, 0.8);
      fg.strokeRoundedRect(14, 556, W - 28, 92, 16);
      v.add(fg);
      v.add(this.add.image(52, 602, 'logoQflBowlS').setDisplaySize(64, 64));
      v.add(title(this, 92, 580, 'A GRANDE FINAL', 9, '#FFD23F').setOrigin(0, 0.5));
      v.add(label(this, 92, 600, 'LOGO DA LIGA NO MEIO · QFL BOWL NAS 30', 7, '#E8EAF2').setOrigin(0, 0.5));
      v.add(label(this, 92, 616, 'END ZONES DOS DOIS TIMES', 7, '#E8EAF2').setOrigin(0, 0.5));
      v.add(label(this, 92, 632, 'TORCIDA DE TODAS AS CORES · CLIMA LIMPO', 7, '#E8EAF2').setOrigin(0, 0.5));
    }

    // ---- botões
    const back = new GlassButton(this, 14 + 55, H - 40, { w: 110, h: 52, radius: 16 });
    back.add(title(this, 0, 0, '‹ VOLTAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => this.setup());
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
  }

  // ------------------------------------------------------------ escolher time (grade com os 32 logos)

  private picker(side: 'home' | 'away' | 'stand') {
    const W = GAME_W;
    const H = GAME_H;
    const v = this.fresh();
    const other = side === 'home' ? matchConfig.away : side === 'away' ? matchConfig.home : '';
    const cur = side === 'home' ? matchConfig.home : side === 'away' ? matchConfig.away : this.hostId();
    v.add(title(this, W / 2, 34, side === 'home' ? 'ESCOLHA O SEU TIME' : side === 'away' ? 'ESCOLHA O ADVERSÁRIO' : 'ESTÁDIO DE QUAL TIME?', 12, UI.yellow).setOrigin(0.5));
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
        if (side === 'stand') {
          // estádio de outro time = campo neutro (o mandante volta a ser o padrão escolhendo um dos dois)
          const local = matchConfig.side === 'away' ? matchConfig.away : matchConfig.home;
          matchConfig.standTeam = t.id === local ? null : t.id;
          this.time.delayedCall(30, () => this.details());
          return;
        }
        if (side === 'home') matchConfig.home = t.id;
        else matchConfig.away = t.id;
        matchConfig.awayUni = null;
        matchConfig.standTeam = null;
        if (side === 'home') matchConfig.homeUni = 0;
        this.time.delayedCall(30, () => this.setup());
      };
      v.add(b);
    });
    const back = new GlassButton(this, W / 2, H - 38, { w: W - 28, h: 50, radius: 14 });
    back.add(title(this, 0, 0, 'CANCELAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => (side === 'stand' ? this.details() : this.setup()));
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
    // Estádio: o do mandante (fora = do adversário) ou o de outro time escolhido; treino = o seu
    venue.id = practice ? null : this.hostId() === matchConfig.home ? null : this.hostId();
    // Arquibancada: sempre a do estádio escolhido
    matchConfig.stand = 'auto';
    // QFL Bowl (a final): campo e estádio especiais e a apresentação da final
    const fin = !practice && matchConfig.side === 'final';
    finalGame.on = fin;
    playoffLogo.key = fin ? 'logoQflBowl' : null;
    broadcast.prime = fin ? PRIME.QFL : null;
    const key = `Match${++matchCounter}`;
    this.game.scene.add(key, new MatchScene(key, practice), false);
    this.scene.start(key);
  }
}
