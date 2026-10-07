import Phaser from 'phaser';
import { CAMERA, FIELD, FONT_TITLE, MATCH_SEED, TEAMS } from '../config';
import {
  FORMATION_NAME,
  HOT_ROUTE_CYCLE,
  NICKEL_425,
  PASS_PLAYS,
  RECV_COLORS,
  ROUTES,
  RUN_PLAYS,
  SHOTGUN_TRIPS,
  type RecvKey,
} from '../data/plays';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { blockAssignments, pickScheme, readText, tipText, type Scheme } from '../systems/ai';
import { groundArrow, groundArrowHead, groundPath, groundRing, groundOval, groundSegment } from '../systems/groundfx';
import { Feedback, VIBE, vibrate } from '../systems/feedback';
import { LivePlay, type Receiver } from '../systems/live';
import { aimFromDrag, arcAt, makeThrow, readThrow, riskColor, statusOf, STATUS_COLOR, type Read, type Throw } from '../systems/passing';
import { Rng } from '../systems/rng';
import { bestLane, type Lane } from '../systems/runlane';
import { RouteRunner, routeWorld } from '../systems/routes';
import { CarrierControl } from '../systems/running';
import { nearest } from '../systems/steering';
import { World } from '../systems/world';
import { GameState } from '../state/GameState';
import { Fx } from '../ui/Fx';
import { Hud } from '../ui/Hud';
import { LiveUi } from '../ui/LiveUi';
import { ResultCard, type CardOpts } from '../ui/ResultCard';
import { Replay } from '../systems/replay';
import { bottomGradient, GlassButton, label, Tag, title, UI } from '../ui/widgets';

const KEYS: RecvKey[] = ['A', 'B', 'C', 'D', 'E'];
const MID = FIELD.width / 2;
const PLAY_CLOCK = 25;
const C_BLOCK = 0xf3f3ee;
const C_PRESS = 0xe5484d;
const C_COVER = 0x7fb2ff;
const C_OPEN = 0x3ccb5a;

const hexStr = (c: number) => '#' + c.toString(16).padStart(6, '0');

/**
 * A partida. Fases:
 *  pre  → pré-snap: formação, rotas, hot routes, PASSE | CORRIDA, AUDIBLE, play clock, visão tática
 *  live → lance ao vivo: pocket, passe estilingue, bola no ar, recepção, corrida com a bola
 *  post → resultado rápido (toque para pular) e volta ao pré-snap
 */
export class MatchScene extends Phaser.Scene {
  private state = new GameState();
  private world!: World;
  private offense: Player[] = [];
  private defense: Player[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  private rng = new Rng(MATCH_SEED + 21);

  private mode: 'pass' | 'run' = 'pass';
  private playIdx = 0;
  private runIdx = 0;
  private routes: Record<RecvKey, string> = { ...PASS_PLAYS[0].routes };
  private scheme!: Scheme;
  private tactical = false;
  /** Tempo decorrido (s), para animações. */
  private elapsed = 0;

  private hud!: Hud;
  private tags = new Map<Player, Tag>();
  private qbTag!: Tag;
  private windowTag!: Tag;
  private hint!: Phaser.GameObjects.Container;
  private playName!: Phaser.GameObjects.Text;
  private toggle!: { setMode: (m: 'pass' | 'run') => void };
  private recvButtons: { btn: GlassButton; route: Phaser.GameObjects.Text }[] = [];
  private legend!: Phaser.GameObjects.Container;
  private legendRead!: Phaser.GameObjects.Text;
  private tipBox!: Phaser.GameObjects.Container;
  private tipText!: Phaser.GameObjects.Text;
  private fps?: Phaser.GameObjects.Text;

  // ---- lance ao vivo
  private phase: 'pre' | 'live' | 'post' | 'card' | 'replay' = 'pre';
  private card!: ResultCard;
  private replay!: Replay;
  private replayPill!: Phaser.GameObjects.Container;
  /** O que acontece quando o tempo do resultado acaba (padrão: volta ao pré-snap). */
  private afterPost: (() => void) | null = null;
  /** Lance atual é a conversão de 2 pontos. */
  private twoPt = false;
  private playXp = 0;
  private gameOver = false;
  private preUi: Phaser.GameObjects.GameObject[] = [];
  private fxTop!: Phaser.GameObjects.Graphics;
  private ui!: Fx;
  private feedback!: Feedback;
  private liveUi!: LiveUi;
  private ball!: Ball;
  private live: LivePlay | null = null;
  private receivers: Receiver[] = [];
  private ctl: CarrierControl | null = null;
  private aim = { active: false, sx: 0, sy: 0, cx: 0, cy: 0, mx: 0, my: 0, used: false };
  private thr: Throw | null = null;
  private read: Read | null = null;
  private statusTags = new Map<Player, Tag>();
  private pressureTag!: Tag;
  private holeTag!: Tag;
  private dangerTag!: Tag;
  private meTag!: Tag;
  private lane: Lane | null = null;
  private laneT = 0;
  private lanePts: [number, number][] | null = null;
  private aimTag!: Tag;
  private combo = 0;
  private postTimer = 0;
  private pendingCatch = 0;
  private dust: { x: number; y: number; life: number; vx: number; vy: number }[] = [];
  private playText = '';
  private ballAway = false;
  /** Depuração: ?auto=pass dá o snap e lança sozinho para o B (para testar sem tocar). */
  private auto: string | null = null;
  private airYards = 0;

  constructor() {
    super('MatchScene');
  }

  create() {
    const s = this.state;
    this.world = new World(this, s.los);
    this.fx = this.add.graphics().setDepth(0.8);
    this.spawnPlayers();
    this.scheme = pickScheme(this.rng);

    this.hud = new Hud(this, s);
    // Tudo que nasce aqui é interface do pré-snap (some durante o lance)
    const before = this.children.list.length;
    this.buildFieldTags();
    this.buildBottom();
    this.preUi = this.children.list.slice(before).filter((o) => o !== this.windowTag);
    this.buildTactical();
    this.buildLive();
    this.applyLos();

    // Parâmetros de depuração: ?fps mostra o FPS, ?tatica abre já na visão tática
    const q = new URLSearchParams(location.search);
    if (q.has('tatica')) this.setTactical(true);
    this.auto = q.get('auto');
    if (q.has('seed')) this.rng = new Rng(Number(q.get('seed')));
    // ?los=90 começa perto da end zone; ?fim=20 deixa 20 s no 4º quarto
    if (q.has('los')) {
      this.state.los = Number(q.get('los'));
      this.applyLos();
    }
    if (q.has('fim')) {
      this.state.quarter = 4;
      this.state.clock = Number(q.get('fim'));
      this.hud.refresh();
    }
    if (q.has('fps')) {
      this.fps = label(this, 10, 166, '', 12, '#9BE15D').setDepth(200);
    }
  }

  // ---------------------------------------------------------------- jogadores

  private spawnPlayers() {
    let i = 0;
    for (const slot of SHOTGUN_TRIPS) this.offense.push(new Player(this.world.players, this, 'off', slot, this.state.los, i++));
    for (const slot of NICKEL_425) this.defense.push(new Player(this.world.players, this, 'def', slot, this.state.los, i++));
  }

  private get qb() {
    return this.offense.find((p) => p.role === 'QB')!;
  }
  private recv(k: RecvKey) {
    return this.offense.find((p) => p.key === k)!;
  }

  /** Recoloca todo mundo na formação a partir da linha de scrimmage atual. */
  private applyLos() {
    const s = this.state;
    for (const p of [...this.offense, ...this.defense]) {
      p.x = p.slot.x;
      p.y = s.los + p.slot.d;
      p.vx = p.vy = p.angle = p.hop = 0;
      p.pose = null;
      p.state = 'idle';
      p.sync();
    }
    this.world.field.scrimmageY = s.los;
    this.world.field.firstDownY = s.firstDownLine;
    this.world.targetY = s.los;
    s.playClock = PLAY_CLOCK;
    this.hud.refresh();
  }

  /** Waypoints da rota de um recebedor, no mundo. */
  private routePts(k: RecvKey): [number, number][] {
    const p = this.recv(k);
    const inward = p.x < MID ? 1 : -1;
    return ROUTES[this.routes[k]].pts.map(([i, f]) => [Phaser.Math.Clamp(p.x + i * inward, 1, FIELD.width - 1), p.y + f]);
  }

  // ------------------------------------------------------------ interface

  private buildFieldTags() {
    for (const k of KEYS) {
      const p = this.recv(k);
      const tag = new Tag(this, k === 'E' ? 'E · RB' : k, RECV_COLORS[k], '#0D0D12', 7).setDepth(40);
      tag.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.cycleRoute(k));
      this.tags.set(p, tag);
    }
    this.qbTag = new Tag(this, 'VOCÊ', 0xffd23f, '#0D0D12', 8).setDepth(40);
    this.windowTag = new Tag(this, '', C_OPEN, '#0D0D12', 8).setDepth(41).setVisible(false);

    // Dica central
    this.hint = this.add.container(this.scale.width / 2, 600).setDepth(95);
    const ht = label(this, 0, 0, 'TOQUE NUMA LETRA PARA MUDAR A ROTA', 10, '#E8EAF2').setOrigin(0.5);
    const hb = this.add.graphics();
    hb.fillStyle(UI.dark, 1);
    hb.fillRect(-ht.width / 2 - 12, -13, ht.width + 24, 26);
    hb.fillStyle(UI.dark, 0.8);
    hb.fillRect(-ht.width / 2 - 10, -11, ht.width + 20, 22);
    this.hint.add([hb, ht]);
  }

  private buildBottom() {
    const W = this.scale.width;
    const H = this.scale.height;
    const L = 14;
    const R = W - 14;
    bottomGradient(this, 300, 90);

    // Linha 1: nome da jogada + chave PASSE | CORRIDA
    const y1 = H - 204 + 12;
    label(this, L, y1 + 2, `JOGADA · ${FORMATION_NAME}`, 10, UI.muted).setDepth(95);
    this.playName = title(this, L, y1 + 20, '', 13, UI.yellow).setDepth(95);
    this.toggle = this.buildToggle(R, y1);

    // Linha 2: os 5 recebedores (tocar = hot route)
    const y2 = y1 + 54;
    const gap = 6;
    const bw = (R - L - gap * 4) / 5;
    KEYS.forEach((k, i) => {
      const x = L + i * (bw + gap) + bw / 2;
      const btn = new GlassButton(this, x, y2 + 23, { w: bw, h: 46, radius: 12 }).setDepth(95);
      const letter = title(this, 0, -8, k, 10, '#' + RECV_COLORS[k].toString(16).padStart(6, '0')).setOrigin(0.5);
      const route = label(this, 0, 9, '', 9, '#FFFFFF').setOrigin(0.5);
      btn.add([letter, route]);
      btn.onTap = () => this.cycleRoute(k);
      this.recvButtons.push({ btn, route });
    });

    // Linha 3: AUDIBLE | VISÃO (segurar) | SNAP
    const y3 = y2 + 56;
    const units = (R - L - 20) / 3.6;
    const aud = new GlassButton(this, L + units / 2, y3 + 29, { w: units, h: 58 }).setDepth(95);
    aud.add(title(this, 0, 0, 'AUDIBLE', 9).setOrigin(0.5));
    aud.onTap = () => this.audible();

    const vis = new GlassButton(this, L + units + 10 + units / 2, y3 + 29, { w: units, h: 58, borderAlpha: 0.8, border: 0xffd23f }).setDepth(95);
    vis.add(title(this, 0, 0, 'SEGURE\nVISÃO', 8).setOrigin(0.5).setAlign('center').setLineSpacing(6));
    vis.onDown = () => this.setTactical(true);
    vis.onUp = () => this.setTactical(false);

    const snapW = units * 1.6;
    const snap = new GlassButton(this, R - snapW / 2, y3 + 29, {
      w: snapW,
      h: 58,
      fill: TEAMS.home.color,
      fillAlpha: 1,
      primary: true,
      borderAlpha: 0.35,
    }).setDepth(95);
    snap.add(title(this, 0, 0, 'SNAP', 18, '#0D0D12').setOrigin(0.5));
    snap.onTap = () => this.snap();

    this.refreshPlayUi();
  }

  /** Chave PASSE | CORRIDA (pílula de vidro, segmento ativo na cor do time). */
  private buildToggle(right: number, top: number) {
    const segs = [
      { id: 'pass' as const, text: 'PASSE' },
      { id: 'run' as const, text: 'CORRIDA' },
    ];
    const c = this.add.container(0, 0).setDepth(95);
    const bg = this.add.graphics();
    c.add(bg);
    const texts = segs.map((sg) => title(this, 0, top + 22, sg.text, 8).setOrigin(0.5));
    const widths = texts.map((t) => t.width + 24);
    const total = widths[0] + widths[1] + 6;
    const left = right - total;
    let x = left + 3;
    const xs: number[] = [];
    texts.forEach((t, i) => {
      xs.push(x);
      t.setX(x + widths[i] / 2);
      const zone = this.add.zone(x + widths[i] / 2, top + 22, widths[i], 44).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        navigator.vibrate?.(8);
        this.setMode(segs[i].id);
      });
      c.add(zone);
      x += widths[i];
    });
    c.add(texts);
    const setMode = (m: 'pass' | 'run') => {
      const i = m === 'pass' ? 0 : 1;
      bg.clear();
      bg.fillStyle(UI.glass, 0.75);
      bg.fillRoundedRect(left, top, total, 44, 22);
      bg.lineStyle(1, 0xffffff, 0.16);
      bg.strokeRoundedRect(left, top, total, 44, 22);
      bg.fillStyle(TEAMS.home.color, 1);
      bg.fillRoundedRect(xs[i], top + 3, widths[i], 38, 19);
      texts.forEach((t, j) => t.setColor(j === i ? '#0D0D12' : '#FFFFFF'));
    };
    setMode('pass');
    return { setMode };
  }

  private buildTactical() {
    const W = this.scale.width;
    // Legenda no topo (no lugar da barra de descida)
    this.legend = this.add.container(0, 0).setDepth(110).setVisible(false);
    const lg = this.add.graphics();
    lg.fillStyle(UI.glass, 0.85);
    lg.fillRoundedRect(12, 72, W - 24, 64, 12);
    lg.lineStyle(1, 0xffffff, 0.16);
    lg.strokeRoundedRect(12, 72, W - 24, 64, 12);
    this.legend.add(lg);
    this.legend.add(title(this, 24, 84, 'VISÃO TÁTICA', 10, UI.yellow));
    this.legendRead = label(this, W - 24, 84, '', 10, '#C9CEE0').setOrigin(1, 0);
    this.legend.add(this.legendRead);
    const items: [string, number, 'solid' | 'dash' | 'oval'][] = [
      ['ROTAS', 0xffd23f, 'solid'],
      ['BLOQUEIO', C_BLOCK, 'solid'],
      ['PRESSÃO', C_PRESS, 'solid'],
      ['COBERTURA', C_COVER, 'dash'],
      ['ZONA', C_COVER, 'oval'],
    ];
    let x = 24;
    for (const [txt, col, style] of items) {
      const sw = this.add.graphics();
      if (style === 'oval') {
        sw.fillStyle(col, 0.2);
        sw.fillEllipse(x + 8, 115, 16, 10);
        sw.lineStyle(2, col, 1);
        sw.strokeEllipse(x + 8, 115, 16, 10);
      } else if (style === 'dash') {
        sw.fillStyle(col, 1);
        sw.fillRect(x, 113, 6, 4);
        sw.fillRect(x + 10, 113, 6, 4);
      } else {
        sw.fillStyle(col, 1);
        sw.fillRect(x, 113, 16, 4);
      }
      const t = label(this, x + 21, 109, txt, 9, '#E8EAF2');
      this.legend.add([sw, t]);
      x += 21 + t.width + 12;
    }

    // Dica acima dos botões
    this.tipBox = this.add.container(0, 0).setDepth(110).setVisible(false);
    const tb = this.add.graphics();
    const top = 560;
    tb.fillStyle(UI.glass, 0.85);
    tb.fillRoundedRect(14, top, W - 28, 70, 12);
    tb.lineStyle(1, 0xffffff, 0.16);
    tb.strokeRoundedRect(14, top, W - 28, 70, 12);
    tb.fillStyle(C_OPEN, 1);
    tb.fillRoundedRect(26, top + 24, 22, 22, 6);
    this.tipBox.add(tb);
    this.tipBox.add(title(this, 37, top + 35, '!', 10, '#0D0D12').setOrigin(0.5));
    this.tipText = label(this, 58, top + 35, '', 11, '#E8EAF2')
      .setOrigin(0, 0.5)
      .setWordWrapWidth(W - 28 - 58)
      .setLineSpacing(4);
    this.tipBox.add(this.tipText);
  }

  // --------------------------------------------------------------- ações

  private cycleRoute(k: RecvKey) {
    if (this.mode !== 'pass') return;
    const cur = HOT_ROUTE_CYCLE.indexOf(this.routes[k]);
    this.routes[k] = HOT_ROUTE_CYCLE[(cur + 1) % HOT_ROUTE_CYCLE.length];
    navigator.vibrate?.(10);
    this.refreshPlayUi();
    // Pequeno "pop" na etiqueta
    const tag = this.tags.get(this.recv(k))!;
    this.tweens.add({ targets: tag, scale: { from: 1.35, to: 1 }, duration: 160, ease: 'Back.Out' });
  }

  private setMode(m: 'pass' | 'run') {
    this.mode = m;
    this.toggle.setMode(m);
    this.refreshPlayUi();
  }

  private audible() {
    if (this.mode === 'pass') {
      this.playIdx = (this.playIdx + 1) % PASS_PLAYS.length;
      this.routes = { ...PASS_PLAYS[this.playIdx].routes };
    } else {
      this.runIdx = (this.runIdx + 1) % RUN_PLAYS.length;
    }
    this.toast(this.mode === 'pass' ? PASS_PLAYS[this.playIdx].name : RUN_PLAYS[this.runIdx].name, UI.yellow, 16);
    this.refreshPlayUi();
  }

  private setTactical(on: boolean) {
    this.tactical = on;
    this.legend.setVisible(on);
    this.tipBox.setVisible(on);
    this.hud.setTactical(on);
    this.hint.setVisible(!on);
    this.windowTag.setVisible(on);
    if (on) {
      this.legendRead.setText(readText(this.scheme));
      this.tipText.setText(this.mode === 'pass' ? tipText(this.scheme, this.routes) : 'CORRIDA: SIGA A FAIXA VERDE E LEIA O BLOQUEIO.');
      this.windowTag.setLabel(this.scheme.window.label);
    }
  }

  private snap() {
    if (this.phase !== 'pre') return;
    this.setTactical(false);
    this.startLive();
  }

  /** Atraso de jogo: play clock zerou. */
  private delayOfGame() {
    navigator.vibrate?.([40, 60, 40]);
    this.toast('ATRASO! −5 JDS', '#FF5A5F', 18);
    this.state.los = Math.max(1, this.state.los - 5);
    this.state.distance += 5;
    this.applyLos();
  }

  /** Texto grande que entra com "pop" (escala + leve rotação) e some. */
  private toast(text: string, color: string, size: number, y = 470) {
    const t = this.add
      .text(this.scale.width / 2, y, text, { fontFamily: FONT_TITLE, fontSize: `${size}px`, color, stroke: '#0D0D12', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(150)
      .setScale(0.3)
      .setAngle(-10);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.15, angle: -3, duration: 140, ease: 'Quad.Out' },
        { scale: 1, angle: -4, duration: 90 },
        { alpha: 0, y: y - 20, delay: 650, duration: 220, onComplete: () => t.destroy() },
      ],
    });
  }

  private refreshPlayUi() {
    const pass = this.mode === 'pass';
    this.playName.setText(pass ? PASS_PLAYS[this.playIdx].name : RUN_PLAYS[this.runIdx].name);
    KEYS.forEach((k, i) => {
      const { btn, route } = this.recvButtons[i];
      route.setText(pass ? ROUTES[this.routes[k]].name : 'BLOQ');
      btn.setEnabled(pass);
    });
    this.hint.list.forEach((o) => o instanceof Phaser.GameObjects.Text && o.setText(pass ? 'TOQUE NUMA LETRA PARA MUDAR A ROTA' : 'CORRIDA: O RB SEGUE A FAIXA VERDE'));
    if (this.tactical) this.setTactical(true);
  }

  // -------------------------------------------------------------- desenho

  update(_t: number, dtMs: number) {
    const real = Math.min(dtMs, 50) / 1000;
    const dt = this.feedback.tick(real);
    this.elapsed += dt;
    this.ui.slowmo(this.feedback.slow);
    const s = this.state;

    if (this.auto === 'run' && this.mode !== 'run') this.setMode('run');
    if (this.auto && this.phase === 'pre' && this.elapsed > 0.6) this.snap();
    if (this.auto === 'pass' && this.live?.phase === 'pocket' && this.live.t > 1.3 && this.ball.state === 'held') {
      const b = this.receivers.find((r) => r.key === 'B')!;
      const [px, py] = b.runner!.predict(b.p, 0.7);
      const t = makeThrow(this.qb.x, this.qb.y, px, py, 0.55);
      this.release(t, readThrow(t, this.receivers, this.defense));
    }
    if (this.auto === 'int' && this.live?.phase === 'pocket' && this.live.t > 1.2 && this.ball.state === 'held') {
      const d = this.defense.find((p) => p.role === 'NB')!;
      const t = makeThrow(this.qb.x, this.qb.y, d.x, d.y, 0.5);
      this.release(t, readThrow(t, this.receivers, this.defense));
    }
    if (this.phase === 'pre') {
      // Play clock
      s.playClock -= dt;
      if (s.playClock <= 0) this.delayOfGame();
      this.hud.setPlayClock(Math.max(0, s.playClock));
    } else if (this.phase === 'replay') {
      const cam = this.replay.step(dt * 0.55, this.ball);
      if (cam === null) this.endReplay();
      else this.world.targetY = cam;
    } else if (this.phase !== 'card') {
      this.updateLive(dt);
      if (this.phase === 'live' || this.phase === 'post') this.replay.record(dt, this.ball, this.world.targetY);
    }
    for (const p of [...this.offense, ...this.defense]) p.sync(dt);

    this.world.update(dt);
    this.fx.clear();
    this.fxTop.clear();
    if (this.phase === 'pre') {
      this.drawGround();
      this.placeTags();
    } else {
      this.drawLive();
    }
    this.ball.draw();
    this.ui.update(real);
    this.fps?.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }

  private drawGround() {
    const g = this.fx;
    const proj = this.world.proj;
    const qb = this.qb;

    // Anel amarelo do QB do jogador (pulsa de leve)
    const pulse = 0.85 + Math.sin(this.elapsed * 5) * 0.15;
    groundRing(g, proj, qb.x, qb.y, 1.9, 0.4, 0xffd23f, pulse);

    if (this.tactical) {
      this.drawTactical();
      return;
    }
    if (this.mode === 'pass') {
      for (const k of KEYS) this.drawRoute(k, 0.95, false);
    } else {
      this.drawRunPlan(0.9);
    }
  }

  /** Rota tracejada na cor do recebedor, com quadradinho no fim. */
  private drawRoute(k: RecvKey, alpha: number, arrow: boolean) {
    const g = this.fx;
    const proj = this.world.proj;
    const pts = this.routePts(k);
    const col = RECV_COLORS[k];
    if (arrow) {
      groundArrow(g, proj, pts, 0.42, col, false, alpha);
      return;
    }
    groundPath(g, proj, pts, 0.5, col, alpha, 1.0, 0.7);
    const [ex, ey] = pts[pts.length - 1];
    groundSegment(g, proj, ex, ey - 0.8, ex, ey + 0.8, 1.6, UI.dark, alpha);
    groundSegment(g, proj, ex, ey - 0.6, ex, ey + 0.6, 1.2, col, alpha);
  }

  /** Corrida: faixa verde do RB até o buraco e bloqueios dos recebedores. */
  private drawRunPlan(alpha: number) {
    const g = this.fx;
    const proj = this.world.proj;
    const rb = this.recv('E');
    const qb = this.qb;
    const gap = RUN_PLAYS[this.runIdx].gapX;
    const los = this.state.los;
    const path: [number, number][] = [
      [rb.x, rb.y],
      [qb.x - 0.6, qb.y + 0.6],
      [gap, los - 1],
      [gap, los + 7],
    ];
    groundPath(g, proj, path, 3.2, C_OPEN, 0.25 * alpha);
    groundArrow(g, proj, path, 0.55, C_OPEN, false, alpha);
    for (const k of ['A', 'B', 'C', 'D'] as RecvKey[]) {
      const p = this.recv(k);
      groundArrow(g, proj, [[p.x, p.y], [p.x, p.y + 3]], 0.4, C_BLOCK, false, alpha);
    }
  }

  /** Visão tática: rotas, bloqueios (branco), pressão (vermelho), cobertura (azul) e zonas. */
  private drawTactical() {
    const g = this.fx;
    const proj = this.world.proj;
    const los = this.state.los;
    const sc = this.scheme;
    const qb = this.qb;

    // Zonas
    for (const z of Object.values(sc.zones)) {
      if (!z) continue;
      groundOval(g, proj, z.x, los + z.d, z.w, z.h, C_COVER, 0.16, C_COVER, 0.75, 0.3);
    }
    // Rotas / plano de corrida
    if (this.mode === 'pass') for (const k of KEYS) this.drawRoute(k, 1, true);
    else this.drawRunPlan(1);

    // Bloqueios: cada OL no DL mais próximo
    const ol = this.offense.filter((p) => ['C', 'G', 'T'].includes(p.role));
    const dl = this.defense.filter((p) => p.role === 'DL');
    for (const { from, to } of blockAssignments(ol, dl)) {
      groundArrow(g, proj, [[from.x, from.y], [(from.x + to.x) / 2, (from.y + to.y) / 2 + 0.2]], 0.35, C_BLOCK);
    }
    // Pressão: quem vai no QB
    this.defense.forEach((d, i) => {
      if (!sc.rushers.includes(i)) return;
      const edge = d.role === 'DL' && (i === 0 || i === 3);
      const target: [number, number] = [qb.x + (d.x < qb.x ? -0.8 : 0.8), qb.y + 0.6];
      if (edge || d.role === 'LB') groundArrow(g, proj, [[d.x, d.y], target], 0.35, C_PRESS);
    });
    // Cobertura: zona (tracejado até o centro da zona) ou homem a homem (seta até o recebedor)
    this.defense.forEach((d, i) => {
      const z = sc.zones[i];
      if (z) {
        groundArrow(g, proj, [[d.x, d.y], [d.x + (z.x - d.x) * 0.8, d.y + (los + z.d - d.y) * 0.8]], 0.32, C_COVER, true);
        return;
      }
      const k = sc.man[i];
      if (k) {
        const r = this.recv(k);
        const pts = this.routePts(k);
        const [tx, ty] = pts[Math.min(1, pts.length - 1)];
        groundArrow(g, proj, [[d.x, d.y], [(r.x + tx) / 2, (r.y + ty) / 2]], 0.32, C_COVER);
      }
    });
  }

  /** Etiquetas acima dos jogadores (letras dos recebedores, "VOCÊ" no QB, janela da visão). */
  private placeTags() {
    const proj = this.world.proj;
    const pass = this.mode === 'pass';
    for (const [p, tag] of this.tags) {
      const pt = proj.project(p.x, p.y, 3.7);
      tag.setPosition(pt.x, pt.y);
      tag.setAlpha(pass || p.key === 'E' ? 1 : 0.4);
    }
    // "VOCÊ" fica à direita do QB (o RB está à esquerda, com a etiqueta em cima)
    const q = proj.project(this.qb.x + 2.4, this.qb.y, 2.2);
    this.qbTag.setPosition(q.x + this.qbTag.width / 2, q.y);
    if (this.tactical) {
      const w = this.scheme.window;
      const wp = proj.project(w.x, this.state.los + w.d, 0);
      this.windowTag.setPosition(wp.x, wp.y);
    }
  }

  // =====================================================================
  // LANCE AO VIVO
  // =====================================================================

  private buildLive() {
    this.fxTop = this.add.graphics().setDepth(37);
    this.ui = new Fx(this);
    this.feedback = new Feedback(this);
    this.ball = new Ball(this, this.world.proj, this.fx, this.fxTop);
    this.liveUi = new LiveUi(this, {
      onRun: () => this.scramble(),
      onThrowAway: () => this.throwAway(),
      onSprint: (on) => {
        if (this.ctl) this.ctl.sprint = on;
      },
      onDive: () => {
        if (this.ctl?.dive()) vibrate(VIBE.tap);
      },
      onJuke: () => {
        if (this.ctl?.juke(this.liveUi.joystick.vx)) vibrate(VIBE.tap);
      },
      onSpin: () => {
        if (this.ctl?.spin()) vibrate(VIBE.tap);
      },
    });
    for (const k of KEYS) {
      const t = new Tag(this, '', STATUS_COLOR.LIVRE, '#0D0D12', 6).setDepth(40).setVisible(false);
      this.statusTags.set(this.recv(k), t);
    }
    this.pressureTag = new Tag(this, 'PRESSÃO!', 0xe5484d, '#FFFFFF', 6).setDepth(41).setVisible(false);
    this.holeTag = new Tag(this, 'BURACO!', 0x3ccb5a, '#0D0D12', 8).setDepth(41).setVisible(false);
    this.dangerTag = new Tag(this, 'PERIGO!', 0xe5484d, '#FFFFFF', 6).setDepth(41).setVisible(false);
    this.meTag = new Tag(this, 'VOCÊ CONTROLA', 0xffd23f, '#0D0D12', 8).setDepth(41).setVisible(false);
    this.aimTag = new Tag(this, '', 0x3fd0ff, '#0D0D12', 8).setDepth(42).setVisible(false);
    this.card = new ResultCard(this);
    this.replay = new Replay([...this.offense, ...this.defense]);
    {
      const t = label(this, 6, 0, 'REPLAY', 11, '#FFFFFF').setOrigin(0.5);
      const bg = this.add.graphics();
      bg.fillStyle(UI.dark, 0.8);
      bg.fillRoundedRect(-t.width / 2 - 14, -13, t.width + 30, 26, 10);
      const dot = this.add.circle(-t.width / 2 - 2, 0, 3.5, 0xe5484d);
      this.tweens.add({ targets: dot, alpha: 0.3, yoyo: true, repeat: -1, duration: 420 });
      this.replayPill = this.add.container(this.scale.width / 2, 128, [bg, t, dot]).setDepth(141).setVisible(false);
    }

    // Passe estilingue: toque no campo, arraste para trás e solte
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.phase === 'post') return this.finishPost();
      if (this.phase === 'replay') return this.endReplay();
      if (this.phase !== 'live' || this.live?.phase !== 'pocket') return;
      if (p.y < 110 || p.y > this.scale.height - 110) return;
      this.aim = { active: true, sx: p.x, sy: p.y, cx: p.x, cy: p.y, mx: 0, my: 0, used: true };
      this.liveUi.showDragHint(false);
      this.qb.pose = 'throw';
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.aim.active) return;
      this.aim.cx = p.x;
      this.aim.cy = p.y;
    });
    const release = () => {
      if (!this.aim.active) return;
      this.aim.active = false;
      if (this.phase === 'live' && this.live?.phase === 'pocket' && this.thr) this.release(this.thr, this.read);
      else this.qb.pose = 'carry';
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  private startLive() {
    const s = this.state;
    this.phase = 'live';
    this.replay.clear();
    this.playXp = 0;
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.windowTag.setVisible(false);
    this.hud.setBar('pocket');
    vibrate(VIBE.snap);
    this.feedback.shake(0.003, 80);

    // Recebedores e suas rotas
    this.receivers = KEYS.map((k) => {
      const p = this.recv(k);
      const name = this.routes[k];
      return { key: k, p, runner: this.mode === 'pass' ? new RouteRunner(routeWorld(p.x, p.y, name), name) : null };
    });
    this.live = new LivePlay(this.offense, this.defense, this.qb, this.receivers, this.scheme, s.los, this.rng, {
      onPressure: (d) => this.onPressure(d),
      onSack: (d) => this.onSack(d),
      onTackle: (d, r) => this.onTackle(d, r.big),
      onBrokenTackle: (d, how) => this.onBroken(d, how),
    });
    this.ball.give(this.qb);
    this.qb.pose = 'carry';
    this.thr = null;
    this.read = null;
    this.aim.used = false;
    this.aim.active = false;
    this.ctl = null;
    this.ballAway = false;

    if (this.mode === 'run') {
      // Corrida: entrega para o RB e o controle passa para ele
      this.liveUi.show('none');
      this.time.delayedCall(380, () => this.handoff());
    } else {
      this.playText = PASS_PLAYS[this.playIdx].name;
      this.liveUi.show('pocket');
      this.liveUi.setPower(0, 'ARRASTE PARA TRÁS PARA LANÇAR', '#C9CEE0');
    }
  }

  private handoff() {
    if (!this.live || this.phase !== 'live') return;
    const rb = this.recv('E');
    this.qb.pose = null;
    this.playText = `CORRIDA · ${RUN_PLAYS[this.runIdx].name}`;
    this.startCarry(rb, 'ARRASTE PARA CONDUZIR O RB', RUN_PLAYS[this.runIdx].gapX);
  }

  private startCarry(p: Player, hint: string, gapX?: number) {
    this.ball.give(p);
    p.pose = 'carry';
    if (gapX !== undefined) this.live!.startRun(p, gapX);
    else this.live!.startCarry(p);
    this.lane = null;
    this.lanePts = null;
    this.laneT = 0;
    this.ctl = new CarrierControl(p);
    this.liveUi.show('carry');
    this.liveUi.setCarryHint(hint);
    this.hud.setBar('result');
  }

  /** QB sai do pocket correndo. */
  private scramble() {
    if (!this.live || this.live.phase !== 'pocket') return;
    this.aim.active = false;
    this.playText = 'QB CORRENDO';
    this.startCarry(this.qb, 'CORRA! VOCÊ CONTROLA O QB');
  }

  /** Joga a bola fora: incompleto, sem sack e sem risco. */
  private throwAway() {
    if (!this.live || this.live.phase !== 'pocket') return;
    const qb = this.qb;
    const side = qb.x < MID ? -3 : FIELD.width + 3;
    this.release(makeThrow(qb.x, qb.y, side, qb.y + 9, 0.8), null, true);
  }

  private release(t: Throw, read: Read | null, away = false) {
    this.ball.launch(t);
    this.live!.throwTo(t.tx, t.ty, read?.receiver ?? null);
    this.qb.pose = 'throw';
    this.time.delayedCall(220, () => (this.qb.pose = null));
    this.thr = t;
    this.read = read;
    this.liveUi.show('none');
    this.aimTag.setVisible(false);
    vibrate(VIBE.throw);
    if (!away) this.state.stats.att++;
    this.ballAway = away;
  }

  private updateLive(dt: number) {
    const live = this.live;
    if (!live) return;
    const s = this.state;

    // Mira do passe (suavizada para não tremer)
    if (this.aim.active && live.phase === 'pocket') {
      const k = 1 - Math.pow(0.0001, dt); // lerp independente do FPS
      this.aim.mx += (this.aim.cx - this.aim.sx - this.aim.mx) * k;
      this.aim.my += (this.aim.cy - this.aim.sy - this.aim.my) * k;
      this.thr = aimFromDrag(this.qb, this.aim.mx, this.aim.my);
      this.read = this.thr ? readThrow(this.thr, this.receivers, this.defense) : null;
      if (this.thr && this.read) {
        const r = this.read;
        const name = r.key ? `${r.key} · ${ROUTES[this.routes[r.key]].name} · ${r.status}` : 'NINGUÉM';
        this.liveUi.setPower(this.thr.power, `ALVO: ${name}`, r.key ? hexStr(RECV_COLORS[r.key]) : '#E5484D');
      } else this.liveUi.setPower(0, 'PUXE MAIS PARA TRÁS', '#C9CEE0');
    }

    if (live.phase === 'carry' && this.ctl && live.carrier) {
      const j = this.liveUi.joystick;
      this.ctl.update(j.vx, j.vy, dt);
      live.evasive = this.ctl.evasive;
      this.liveUi.setStamina(this.ctl.stamina);
    }
    live.update(dt);
    if (this.phase !== 'live') return;

    // Bola no ar
    if (this.ball.update(dt) && this.ball.state === 'air') {
      this.resolvePass();
      if (this.phase !== 'live') return;
    }

    // Carregador: placar de jardas ao vivo, touchdown, fora de campo, mergulho terminado
    const c = live.carrier;
    if (live.phase === 'carry' && c) {
      const gained = Math.round(c.y - s.los);
      this.hud.setResult(this.playText, `${gained >= 0 ? '+' : ''}${gained}`, gained >= 0 ? 0x3ccb5a : 0xe5484d);
      if (c.y >= 100) return this.endPlay('td');
      if (c.x < -0.3 || c.x > FIELD.width + 0.3) return this.endPlay('out');
      if (this.ctl?.diveDone) return this.endPlay('dive');
    }
    if (live.phase === 'pocket') {
      const left = live.pocketLeft;
      this.hud.setPocket(left, Math.min(1, left / 3.3));
      if (!this.aim.used) {
        const q = this.world.proj.project(this.qb.x, this.qb.y, 0);
        this.liveUi.showDragHint(true, q.x, Math.min(this.scale.height - 150, q.y + 46));
      }
    }

    // Câmera acompanha a bola / quem está com ela
    const w = this.world;
    if (this.ball.state === 'air') w.targetY = Math.max(s.los - 2, this.ball.y - 6);
    else if (live.phase === 'carry' && c) w.targetY = c.y - 3;
    else w.targetY = s.los - 1;
    w.targetY = Phaser.Math.Clamp(w.targetY, CAMERA.minY, CAMERA.maxY);
  }

  /** A bola chegou: recepção, interceptação, desvio ou incompleto. */
  private resolvePass() {
    const t = this.thr!;
    const read = this.read;
    if (this.ballAway) return this.incomplete('JOGOU FORA', 'SEM RISCO');
    const recv = nearest(
      this.receivers.map((r) => r.p),
      t.tx,
      t.ty,
    );
    const def = nearest(this.defense, t.tx, t.ty);
    const rOk = !!recv.p && recv.d < 2.1;
    const dOk = !!def.p && def.d < 1.7;

    if (dOk && (!rOk || def.d < recv.d - 0.2)) {
      // Defensor chegou primeiro: interceptação ou desvio
      const d = def.p!;
      // Bola limpa no defensor (sem recebedor disputando) = interceptação provável
      const clean = !rOk || recv.d > def.d + 1.2;
      let pInt = clean ? 0.78 - def.d * 0.12 : 0.3 + Math.max(0, recv.d - def.d) * 0.1;
      pInt += (d.attrs.hands - 60) / 200 + (read?.intChance ?? 0) * 0.5;
      pInt = Math.max(0.12, Math.min(0.88, pInt));
      if (this.rng.next() < pInt) return this.interception(d);
      d.pose = 'catch';
      d.angle = d.x < t.tx ? 30 : -30; // mergulho para desviar
      this.time.delayedCall(320, () => {
        d.pose = null;
        d.angle = 0;
      });
      return this.incomplete('DESVIADO!', `#${d.slot.num} DESVIOU O PASSE`);
    }
    if (rOk) {
      const r = recv.p!;
      // Chance decidida pelo que aconteceu NA CHEGADA (não só pela previsão da mira):
      // bola na mão de recebedor livre quase sempre é pega.
      let chance = 0.97 - Math.max(0, recv.d - 0.9) * 0.16;
      chance += (r.attrs.hands - 75) / 300 - t.dist / 500;
      const dd = def.d ?? Infinity;
      if (dd < 1.0) chance -= 0.32;
      else if (dd < 1.7) chance -= 0.18;
      else if (dd < 3) chance -= 0.05;
      else chance = Math.max(chance, 0.9); // livre de verdade: drop raro
      if (read?.receiver === r) chance = Math.max(chance, read.chance);
      chance = Math.min(0.98, chance);
      if (this.rng.next() < chance) return this.reception(r, dOk ? 'NO TRÁFEGO' : 'LIVRE');
      r.pose = 'catch';
      this.time.delayedCall(300, () => (r.pose = null));
      return this.incomplete('ESCAPOU!', `${r.key} #${r.slot.num} DEIXOU ESCAPAR`);
    }
    return this.incomplete('INCOMPLETO', 'NINGUÉM NO LUGAR');
  }

  private reception(r: Player, how: string) {
    const s = this.state;
    const t = this.thr!;
    const long = t.dist >= 25;
    s.stats.comp++;
    this.combo++;
    this.airYards = Math.round(r.y - s.los);
    this.feedback.slowmo(long ? 0.45 : 0.3, 0.25);
    this.ui.edgeFlash(long ? 0xffd23f : 0xffffff, 0.6);
    this.ui.pop(long ? 'QUE BOMBA!' : 'RECEPÇÃO!', UI.yellow, 26, 190);
    this.ui.caption(`${r.key} #${r.slot.num} SEGUROU ${how}`, 240);
    vibrate(VIBE.catch);
    this.world.stand.cheer(long ? 1 : 0.5);
    r.pose = 'catch';
    if (long) {
      r.angle = r.x < MID ? -35 : 35; // estica o corpo para pegar
      this.time.delayedCall(260, () => (r.angle = 0));
    }
    this.playText = `PASSE COMPLETO · ${ROUTES[this.routes[r.key!]].name}`;
    this.gainXp(long ? 25 : 10, r);
    if (this.combo % 3 === 0) {
      this.time.delayedCall(700, () => this.ui.pop(`COMBO x${this.combo}`, '#3FD0FF', 16, 300, 600));
      this.gainXp(50);
    }
    this.live!.phase = 'dead'; // pausa curta até o controle passar ao recebedor
    this.ball.give(r);
    this.time.delayedCall(250, () => {
      if (this.phase !== 'live') return;
      this.startCarry(r, `CORRA! VOCÊ CONTROLA O ${r.key} #${r.slot.num}`);
    });
  }

  private interception(d: Player) {
    const s = this.state;
    s.stats.int++;
    s.confidence = Math.max(0, s.confidence - 1);
    this.combo = 0;
    this.feedback.slowmo(0.4, 0.22);
    this.ui.edgeFlash(0xe5484d, 0.8);
    this.ui.pop('INTERCEPTADO!', '#E5484D', 22, 190, 1100);
    vibrate(VIBE.turnover);
    this.feedback.shake(0.01, 240);
    d.pose = 'catch';
    d.hop = 0.6;
    this.time.delayedCall(320, () => (d.hop = 0));
    this.ball.give(d);
    // Dica: quem estava livre
    let open: Player | null = null;
    for (const r of this.receivers) if (statusOf(r.p, this.defense) === 'LIVRE') open = r.p;
    this.ui.caption(open ? `${open.key} #${open.slot.num} ESTAVA LIVRE` : 'PASSE FORÇADO NA COBERTURA', 240, 1600, '#FFFFFF', 0x5a1418);
    this.time.delayedCall(700, () => this.ui.caption('INT · CONFIANÇA −1', 280, 1300, '#FFFFFF', 0xe5484d));
    this.endPlay('int', d);
  }

  private incomplete(big: string, small: string) {
    if (big !== 'JOGOU FORA') this.combo = 0;
    this.ui.pop(big, '#FFFFFF', 20, 200, 700);
    this.ui.caption(small, 244, 900);
    this.ball.state = 'loose';
    this.endPlay('inc');
  }

  private onPressure(d: Player) {
    this.pressureTag.setVisible(true).setData('p', d);
    vibrate(VIBE.tap);
    this.ui.pop('PRESSÃO!', '#E5484D', 14, 160, 400);
  }

  private onSack(d: Player) {
    const qb = this.qb;
    this.ui.pop('SACK!', '#E5484D', 30, 200, 900);
    vibrate(VIBE.sack);
    this.feedback.shake(0.014, 260);
    this.feedback.slowmo(0.25, 0.3);
    qb.angle = qb.x < d.x ? -80 : 80;
    d.angle = qb.x < d.x ? -60 : 60;
    this.puff(qb.x, qb.y);
    this.combo = 0;
    this.endPlay('sack', d);
  }

  private onTackle(d: Player, big: boolean) {
    const c = this.live!.carrier!;
    c.angle = c.x < d.x ? -80 : 80;
    d.angle = c.x < d.x ? -65 : 65;
    this.puff(c.x, c.y);
    this.feedback.shake(big ? 0.013 : 0.006, big ? 220 : 130);
    vibrate(VIBE.tackle);
    if (big) this.ui.pop('PANCADA!', '#FFFFFF', 16, 200, 500);
    this.endPlay('tackle');
  }

  private onBroken(_d: Player, how: 'juke' | 'spin' | 'stiff') {
    this.ui.pop(how === 'juke' ? 'JUKE!' : how === 'spin' ? 'SPIN!' : 'ESCAPOU!', UI.yellow, 16, 230, 420);
    vibrate(VIBE.block);
    this.world.stand.cheer(0.4);
    this.gainXp(how === 'stiff' ? 3 : 8, this.live?.carrier ?? undefined);
  }

  /** Nuvem de poeira de pixel no chão. */
  private puff(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(0.6, 2.4);
      this.dust.push({ x, y, life: this.rng.range(0.35, 0.7), vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
  }

  private gainXp(n: number, at?: Player) {
    this.state.xp += n;
    this.playXp += n;
    const p = at ? this.world.proj.project(at.x, at.y, 4.2) : { x: this.scale.width / 2, y: 330 };
    this.ui.xp(p.x, p.y, `+${n} XP`);
  }

  /** Fim do lance: atualiza descida/distância, placar e estatísticas; mostra o resultado. */
  private endPlay(kind: 'td' | 'out' | 'dive' | 'tackle' | 'sack' | 'inc' | 'int', by?: Player) {
    if (this.phase !== 'live') return;
    const s = this.state;
    const live = this.live!;
    live.phase = 'dead';
    this.phase = 'post';
    this.postTimer = 1.6;
    this.afterPost = null;
    this.liveUi.show('none');
    this.pressureTag.setVisible(false);
    this.holeTag.setVisible(false);
    this.dangerTag.setVisible(false);
    this.meTag.setVisible(false);
    this.aimTag.setVisible(false);
    this.statusTags.forEach((t) => t.setVisible(false));
    this.ctl = null;
    this.tickClock(Math.round(live.t + (kind === 'inc' || kind === 'out' ? 1 : 6)));

    const c = live.carrier;
    const spot = kind === 'sack' ? this.qb.y : kind === 'inc' || kind === 'int' ? s.los : (c?.y ?? s.los);
    let gained = Math.round(spot - s.los);
    if (kind === 'td') gained = 100 - s.los;
    const passComplete = !!c && c !== this.qb && this.mode === 'pass' && !!this.thr && !this.ballAway && kind !== 'int';
    if (passComplete && !this.twoPt) s.stats.yards += gained;

    let text = this.playText;
    let yardsText = `${gained >= 0 ? '+' : ''}${gained}`;
    const color = gained >= 0 ? 0x3ccb5a : 0xe5484d;
    let chip: [string, number, string] | undefined;

    // Conversão de 2: deu ou não deu, e o lance acaba aí
    if (this.twoPt) {
      this.twoPt = false;
      const good = kind === 'td';
      if (good) {
        s.score.home += 2;
        this.ui.pop('CONVERTEU! +2', UI.yellow, 20, 200, 1300);
        this.ui.burst(50);
        vibrate(VIBE.td);
        this.world.stand.cheer(0.8);
        this.gainXp(30);
      } else {
        this.ui.pop('NÃO CONVERTEU', '#FFFFFF', 16, 200, 1100);
      }
      this.hud.setResult('CONVERSÃO DE 2', good ? '+2' : 'X', good ? 0x3ccb5a : 0xe5484d, ['2 PTS', 0xffd23f, '#0D0D12']);
      this.hud.setBar('result');
      this.hud.refresh();
      this.postTimer = 2.2;
      this.afterPost = () => this.opponentDrive(25, true);
      return;
    }

    if (kind === 'td') {
      s.score.home += 6;
      if (passComplete) s.stats.td++;
      s.confidence = Math.min(5, s.confidence + 1);
      this.ui.pop('TOUCHDOWN!', UI.yellow, 26, 200, 1300);
      this.ui.burst(80);
      this.feedback.shake(0.012, 400);
      vibrate(VIBE.td);
      this.world.stand.cheer(1);
      if (c) {
        c.pose = 'catch';
        c.angle = 0;
      }
      this.gainXp(60);
      text = passComplete ? `PASSE DE ${gained} JDS · TD` : `CORRIDA DE ${gained} JDS · TD`;
      yardsText = `+${gained}`;
      chip = ['TD', TEAMS.home.color, '#0D0D12'];
      this.postTimer = 2.2;
      const card = this.tdCard(gained, passComplete, c);
      this.afterPost = () => this.showCard(card);
    } else if (kind === 'int') {
      const d = by!;
      const at = Phaser.Math.Clamp(Math.round(d.y), 1, 99);
      text = `${TEAMS.away.name} NA ${at <= 50 ? TEAMS.home.abbr : TEAMS.away.abbr} ${at <= 50 ? at : 100 - at}`;
      yardsText = '';
      chip = ['TURNOVER', 0xe5484d, '#FFFFFF'];
      this.postTimer = 2.2;
      s.los = at;
      const card = this.intCard(d);
      this.afterPost = () => this.showCard(card);
    } else if (kind === 'inc') {
      text = this.ballAway ? 'JOGOU FORA' : 'PASSE INCOMPLETO';
      yardsText = '';
      this.advance(0);
    } else {
      if (kind === 'out') this.ui.caption('FORA DE CAMPO', 250, 800);
      if (kind === 'dive') this.ui.caption('MERGULHOU!', 250, 800);
      if (kind === 'sack') text = `SACK${by ? ' · #' + by.slot.num : ''}`;
      if (spot < 0) {
        // Derrubado na própria end zone: safety (+2 para eles) e eles recebem a bola
        s.score.away += 2;
        this.ui.pop('SAFETY!', '#E5484D', 24, 200, 1200);
        vibrate(VIBE.turnover);
        text = `SAFETY · +2 ${TEAMS.away.name}`;
        yardsText = '';
        chip = ['SAFETY', 0xe5484d, '#FFFFFF'];
        this.postTimer = 2;
        this.afterPost = () => this.opponentDrive(35, true);
      } else this.advance(gained);
    }
    if (passComplete && kind !== 'td' && gained >= 20) {
      this.ui.caption(`PASSE DE ${gained} JDS · NO AR ${this.airYards} + ${gained - this.airYards} APÓS`, 290, 1300);
    }
    this.hud.setResult(text, yardsText, color, chip);
    this.hud.setBar('result');
    this.hud.refresh();
  }

  /** Atualiza descida e distância depois de um ganho. */
  private advance(gained: number) {
    const s = this.state;
    s.los = Phaser.Math.Clamp(s.los + gained, 1, 99);
    if (gained >= s.distance) {
      s.down = 1;
      s.distance = Math.min(10, 100 - s.los);
      this.time.delayedCall(350, () => this.ui.pop('1ª DESCIDA!', '#3CCB5A', 16, 300, 600));
    } else {
      s.distance -= gained;
      s.down++;
      if (s.down > 4) {
        // 4ª descida falhou: a bola vira para eles ali mesmo
        this.time.delayedCall(350, () => this.ui.caption('PERDEU NAS DESCIDAS', 300, 1200, '#FFFFFF', 0x5a1418));
        this.postTimer = 2;
        const at = s.los;
        this.afterPost = () => this.opponentDrive(at, false);
      }
    }
  }

  /** Relógio: desconta, vira o quarto e marca o fim de jogo. */
  private tickClock(sec: number) {
    const s = this.state;
    s.clock -= sec;
    if (s.clock > 0) return;
    if (s.quarter < 4) {
      const q = s.quarter;
      s.quarter++;
      s.clock = 15 * 60;
      this.time.delayedCall(900, () => this.ui.caption(`FIM DO ${q}º QUARTO`, 330, 1300, '#0D0D12', 0xffd23f));
    } else {
      s.clock = 0;
      this.gameOver = true;
    }
  }

  // ------------------------------------------------------------ cards

  private statsRow(badInt = false) {
    const st = this.state.stats;
    return [
      { label: 'COMP', value: `${st.comp}/${st.att}` },
      { label: 'JARDAS', value: String(st.yards) },
      { label: 'TD', value: String(st.td) },
      { label: 'INT', value: String(st.int), bad: badInt },
    ];
  }

  private xpBar() {
    const xp = this.state.xp;
    return { kind: 'xp' as const, label: 'CARREIRA · TEMP 1 · SEMANA 3', gain: this.playXp, base: ((xp - this.playXp) % 1000) / 1000 };
  }

  private tdCard(gained: number, pass: boolean, c: Player | null): CardOpts {
    let sub: string;
    if (pass && c?.key) {
      const after = gained - this.airYards;
      sub = `${this.airYards} NO AR + ${after} APÓS A RECEPÇÃO · ${c.key} ${ROUTES[this.routes[c.key]].name}`;
    } else sub = c === this.qb ? 'O QB SAIU DO POCKET E FOI ATÉ O FIM' : this.playText;
    return {
      big: 'TOUCHDOWN!',
      bigColor: UI.yellow,
      bigShadow: '#0D0D12',
      bigSize: 30,
      chip: `+6 ${TEAMS.home.name}`,
      chipBg: TEAMS.home.color,
      chipFg: '#0D0D12',
      header: 'RESUMO DA JOGADA',
      head: `${pass ? 'PASSE' : 'CORRIDA'} DE ${gained} JDS`,
      sub,
      subColor: '#3FD0FF',
      stats: this.statsRow(),
      bar: this.xpBar(),
      teamColor: TEAMS.home.color,
      replay: () => this.startReplay(),
      next: () => this.extraPointChoice(),
    };
  }

  private intCard(d: Player): CardOpts {
    const ROLE: Record<string, [string, string]> = {
      NB: ['NICKEL', 'O NICKEL LEU A ROTA E CORTOU NA FRENTE DO RECEBEDOR'],
      CB: ['CORNER', 'O CORNER JOGOU POR DENTRO E CHEGOU ANTES NA BOLA'],
      S: ['SAFETY', 'O SAFETY VEIO DE CIMA E LEU O PASSE'],
      LB: ['LINEBACKER', 'O LINEBACKER CAIU NA ZONA E LEU SEUS OLHOS'],
      DL: ['DEFENSIVE LINE', 'O PASSE SAIU BAIXO E O DEFENSOR DA LINHA PEGOU'],
    };
    const [rn, why] = ROLE[d.role] ?? ['DEFESA', 'A DEFESA CHEGOU PRIMEIRO NA BOLA'];
    const tgt = this.read?.receiver ?? (this.thr ? nearest(this.receivers.map((r) => r.p), this.thr.tx, this.thr.ty).p : null);
    const head = tgt?.key ? `PASSE PARA ${tgt.key} NA ${ROUTES[this.routes[tgt.key]].name}` : 'PASSE SEM ALVO';
    let open: Player | null = null;
    for (const r of this.receivers) if (r.p !== tgt && statusOf(r.p, this.defense) === 'LIVRE') open = r.p;
    const tip = open?.key
      ? `DICA: CONTRA ${this.scheme.name}, O ${ROUTES[this.routes[open.key]].name} (${open.key}) ESTAVA LIVRE`
      : `DICA: ${tipText(this.scheme, this.routes)}`;
    const s = this.state;
    return {
      big: 'INTERCEPTADO!',
      bigColor: '#FFFFFF',
      bigShadow: '#B3262B',
      bigSize: 24,
      chip: `#${d.slot.num} ${TEAMS.away.name} · ${rn}`,
      chipBg: TEAMS.away.color,
      chipFg: '#FFFFFF',
      header: 'O QUE ACONTECEU',
      head,
      sub: why,
      tip,
      stats: this.statsRow(true),
      bar: { kind: 'conf', value: s.confidence, delta: -1 },
      teamColor: TEAMS.home.color,
      replay: () => this.startReplay(),
      next: () => this.opponentDrive(s.los, false),
    };
  }

  private showCard(o: CardOpts) {
    this.phase = 'card';
    this.ui.slowmo(false);
    this.card.show(o);
  }

  private startReplay() {
    if (this.phase !== 'card') return;
    this.phase = 'replay';
    this.card.setVisible(false);
    this.replayPill.setVisible(true);
    this.replay.start();
  }

  private endReplay() {
    if (this.phase !== 'replay') return;
    this.phase = 'card';
    this.replayPill.setVisible(false);
    this.card.setVisible(true);
  }

  /** Depois do TD: chutar o ponto extra ou tentar a conversão de 2. */
  private extraPointChoice() {
    const s = this.state;
    this.card.show({
      big: 'PONTO EXTRA',
      bigColor: UI.yellow,
      bigShadow: '#0D0D12',
      bigSize: 22,
      chip: `${TEAMS.home.abbr} ${s.score.home} x ${s.score.away} ${TEAMS.away.abbr}`,
      chipBg: 0xffd23f,
      chipFg: '#0D0D12',
      header: 'ESCOLHA',
      head: 'CHUTAR (+1) OU TENTAR 2?',
      sub: 'O CHUTE É QUASE CERTO. A CONVERSÃO DE 2 É UMA JOGADA DA LINHA DE 2 JARDAS.',
      stats: this.statsRow(),
      bar: this.xpBar(),
      teamColor: TEAMS.home.color,
      replay: () => this.tryTwo(),
      replayLabel: 'TENTAR 2',
      next: () => this.kickPat(),
      nextLabel: 'CHUTAR +1',
    });
  }

  /** Ponto extra (o minigame do chute entra na etapa 7). */
  private kickPat() {
    const s = this.state;
    this.card.hide();
    const good = this.rng.chance(0.94);
    if (good) {
      s.score.home += 1;
      this.ui.pop('É BOA! +1', '#3CCB5A', 22, 220, 1000);
      this.world.stand.cheer(0.5);
    } else this.ui.pop('PRA FORA!', '#E5484D', 22, 220, 1000);
    this.hud.setResult('PONTO EXTRA', good ? '+1' : 'X', good ? 0x3ccb5a : 0xe5484d, ['PAT', 0xffd23f, '#0D0D12']);
    this.hud.setBar('result');
    this.hud.refresh();
    this.phase = 'post';
    this.postTimer = 1.8;
    this.afterPost = () => this.opponentDrive(25, true);
  }

  private tryTwo() {
    const s = this.state;
    this.card.hide();
    this.twoPt = true;
    s.los = 98;
    s.down = 1;
    s.distance = 2;
    this.ui.caption('CONVERSÃO DE 2 · DA LINHA DE 2', 300, 1300, '#0D0D12', 0xffd23f);
    this.backToPreSnap();
  }

  /**
   * Campanha deles (por enquanto simulada direto; a tela de defesa entra na etapa 7).
   * `at` = onde eles pegam a bola, nas NOSSAS jardas (eles atacam rumo à jarda 0).
   * `kick` = depois de um placar nosso: kickoff, eles começam na 25 deles.
   */
  private opponentDrive(at: number, kick: boolean) {
    const s = this.state;
    const r = this.rng;
    this.card.hide();
    const start = kick ? 75 : at; // nossa jarda 75 = 25 deles
    const pTd = Phaser.Math.Clamp(0.42 - start * 0.0035, 0.1, 0.42);
    const pFg = 0.2;
    const pTo = 0.1;
    const x = r.next();
    let head: string;
    let ours: number;
    if (x < pTd) {
      s.score.away += 7;
      head = `TD DOS ${TEAMS.away.name} · +7`;
      ours = 25;
    } else if (x < pTd + pFg) {
      s.score.away += 3;
      head = `FIELD GOAL DOS ${TEAMS.away.name} · +3`;
      ours = 25;
    } else if (x < pTd + pFg + pTo) {
      ours = Phaser.Math.Clamp(Math.round(start - r.range(5, 35)), 10, 70);
      head = 'A DEFESA RECUPEROU A BOLA!';
    } else {
      ours = r.int(12, 32);
      head = `${TEAMS.away.name} DERAM PUNT`;
    }
    this.tickClock(r.int(100, 260));
    s.los = ours;
    s.down = 1;
    s.distance = 10;
    this.ui.pop('DEFESA', '#3FD0FF', 18, 190, 1500);
    this.time.delayedCall(350, () => this.ui.caption(head, 240, 1500, '#FFFFFF', 0x22406b));
    this.time.delayedCall(800, () => this.ui.caption(`SUA BOLA ${s.spotText}`, 280, 1200));
    this.hud.setResult(head, '', 0, ['DEFESA', 0x3fd0ff, '#0D0D12']);
    this.hud.setBar('result');
    this.hud.refresh();
    this.phase = 'post';
    this.postTimer = 2.6;
    this.afterPost = null;
  }

  /** Fim de jogo: placar final, estatísticas e novo jogo. */
  private showFinal() {
    const s = this.state;
    const h = s.score.home;
    const a = s.score.away;
    const win = h > a;
    if (win) s.record.home[0]++;
    else if (h < a) s.record.home[1]++;
    if (win) {
      this.ui.burst(90);
      this.world.stand.cheer(1);
    }
    this.playXp = 0;
    this.gainXp(win ? 150 : 50);
    const st = s.stats;
    this.hud.setBar('result');
    this.hud.refresh();
    this.showCard({
      big: win ? 'VITÓRIA!' : h < a ? 'DERROTA' : 'EMPATE',
      bigColor: win ? UI.yellow : '#FFFFFF',
      bigShadow: win ? '#0D0D12' : '#B3262B',
      bigSize: 28,
      chip: `${TEAMS.home.abbr} ${h} x ${a} ${TEAMS.away.abbr}`,
      chipBg: win ? TEAMS.home.color : TEAMS.away.color,
      chipFg: win ? '#0D0D12' : '#FFFFFF',
      header: 'FIM DE JOGO',
      head: `${st.comp}/${st.att} · ${st.yards} JDS`,
      sub: `${st.td} TD · ${st.int} INT · RETROSPECTO ${s.recordText('home')}`,
      stats: this.statsRow(),
      bar: this.xpBar(),
      teamColor: TEAMS.home.color,
      next: () => this.newGame(),
      nextLabel: 'NOVO JOGO',
    });
  }

  private newGame() {
    const s = this.state;
    const rec = s.record;
    const xp = s.xp;
    Object.assign(s, new GameState());
    s.record = rec;
    s.xp = xp;
    s.score = { home: 0, away: 0 };
    s.quarter = 1;
    s.clock = 15 * 60;
    s.down = 1;
    s.distance = 10;
    s.los = 25;
    this.gameOver = false;
    this.card.hide();
    this.phase = 'post';
    this.backToPreSnap();
  }

  /** Toque na tela durante o resultado: pula a espera. */
  private finishPost() {
    if (this.phase === 'post' && this.postTimer < 1.2) this.postTimer = 0;
  }

  private backToPreSnap() {
    if (this.gameOver) {
      this.hud.refresh();
      return this.showFinal();
    }
    this.card.hide();
    this.replayPill.setVisible(false);
    this.phase = 'pre';
    this.live = null;
    this.ballAway = false;
    this.ball.give(this.qb);
    this.ball.hide();
    this.feedback.skipSlowmo();
    this.dust = [];
    this.scheme = pickScheme(this.rng);
    this.applyLos();
    this.hud.setBar('pre');
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(true));
    this.refreshPlayUi();
  }

  private drawLive() {
    const g = this.fx;
    const proj = this.world.proj;
    const live = this.live;

    if (this.phase === 'post') {
      this.postTimer -= this.game.loop.delta / 1000;
      if (this.postTimer <= 0) {
        const next = this.afterPost;
        this.afterPost = null;
        return next ? next() : this.backToPreSnap();
      }
    }
    if (this.phase === 'card' || this.phase === 'replay') return;
    // Poeira dos tackles
    const dt = this.game.loop.delta / 1000;
    for (const d of this.dust) {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const p = proj.project(d.x, d.y, 0.2 + (0.7 - d.life) * 0.6);
      g.fillStyle(0xd8c9a0, Math.max(0, Math.min(1, d.life * 1.6)));
      g.fillRect(p.x - 2, p.y - 2, 3 + p.s * 3, 3 + p.s * 3);
    }
    this.dust = this.dust.filter((d) => d.life > 0);
    if (!live) return;

    // Anel amarelo: QB no pocket, ou quem você controla
    const me = live.carrier ?? this.qb;
    groundRing(g, proj, me.x, me.y, 1.9, 0.4, 0xffd23f, 0.9);

    // Rotas (fracas) durante o pocket
    if (live.phase === 'pocket' && this.mode === 'pass') {
      for (const r of this.receivers) {
        if (!r.runner || r.runner.done) continue;
        const pts = r.runner.pts.slice(r.runner.idx - 1);
        pts[0] = [r.p.x, r.p.y];
        if (pts.length > 1) groundPath(g, proj, pts, 0.4, RECV_COLORS[r.key], 0.35, 1, 0.7);
      }
    }

    // Etiquetas LIVRE / APERTADO / MARCADO acima dos recebedores
    const showStatus = live.phase === 'pocket' && this.mode === 'pass';
    for (const r of this.receivers) {
      const t = this.statusTags.get(r.p)!;
      if (!showStatus) {
        t.setVisible(false);
        continue;
      }
      const st = statusOf(r.p, this.defense);
      const pt = proj.project(r.p.x, r.p.y, 3.7);
      t.setVisible(true)
        .setLabel(`${r.key} ${st}`, STATUS_COLOR[st], st === 'MARCADO' ? '#FFFFFF' : '#0D0D12')
        .setPosition(pt.x, pt.y);
    }
    if (this.pressureTag.visible) {
      const d = this.pressureTag.getData('p') as Player;
      const pt = proj.project(d.x, d.y, 3.7);
      this.pressureTag.setPosition(pt.x, pt.y);
      if (live.phase !== 'pocket') this.pressureTag.setVisible(false);
    }

    // Corrida: faixa verde (melhor caminho), BURACO!, PERIGO! e "VOCÊ CONTROLA"
    const c = live.carrier;
    if (live.phase === 'carry' && c) this.drawLane(c, dt);
    else {
      this.holeTag.setVisible(false);
      this.dangerTag.setVisible(false);
      this.meTag.setVisible(false);
    }

    // Prévia do passe: arco liso + sombra + mira no ponto de queda
    if (this.aim.active && live.phase === 'pocket' && this.thr) this.drawAim(this.thr, this.read);
    else this.aimTag.setVisible(false);

    // Ponto de queda enquanto a bola voa (anel tracejado)
    if (this.ball.state === 'air' && this.thr) groundRing(g, proj, this.thr.tx, this.thr.ty, 1.6, 0.3, 0x3fd0ff, 0.8, 24, true);
  }

  private drawLane(c: Player, dt: number) {
    const g = this.fx;
    const proj = this.world.proj;
    const live = this.live!;
    this.laneT -= dt;
    if (this.laneT <= 0 || !this.lane) {
      this.lane = bestLane(c, this.defense, (d) => live.isBlocked(d), this.state.los);
      this.laneT = 0.15;
    }
    const lane = this.lane;
    // Suaviza a faixa (sem tremer quando a leitura muda)
    const k = 1 - Math.exp(-dt * 10);
    if (!this.lanePts) this.lanePts = lane.pts.map((p) => [...p] as [number, number]);
    this.lanePts[0] = [c.x, c.y];
    for (let i = 1; i < lane.pts.length; i++) {
      this.lanePts[i][0] += (lane.pts[i][0] - this.lanePts[i][0]) * k;
      this.lanePts[i][1] += (lane.pts[i][1] - this.lanePts[i][1]) * k;
    }
    const open = lane.open > 2.2;
    const col = open ? 0x3ccb5a : 0xffd23f;
    if (!this.ctl?.diving) {
      groundPath(g, proj, this.lanePts, 2.4, 0xffffff, 0.22);
      groundPath(g, proj, this.lanePts, 2.0, col, 0.42);
      const n = this.lanePts.length;
      const [ex, ey] = this.lanePts[n - 1];
      const [px, py] = this.lanePts[n - 2];
      groundArrowHead(g, proj, ex, ey, ex - px, ey - py, 3.6, col, 0.8);
    }
    if (lane.hole && open) {
      const p = proj.project(lane.hole.x, lane.hole.y + 1.2, 0);
      this.holeTag.setVisible(true).setPosition(p.x, p.y);
    } else this.holeTag.setVisible(false);
    if (lane.danger) {
      const p = proj.project(lane.danger.x, lane.danger.y, 3.7);
      this.dangerTag.setVisible(true).setPosition(p.x, p.y);
    } else this.dangerTag.setVisible(false);
    const who = c === this.qb ? 'QB' : c.role === 'RB' ? 'RB' : this.receivers.find((r) => r.p === c)?.key ?? '';
    const p = proj.project(c.x, c.y, 0);
    this.meTag.setVisible(true).setLabel(`VOCÊ CONTROLA · ${who} #${c.slot.num}`).setPosition(p.x, p.y + 30);
  }

  /** Trajetória: curva com 50 pontos (brilho na cor do recebedor + linha branca), sombra tracejada e mira. */
  private drawAim(t: Throw, r: Read | null) {
    const g = this.fx;
    const top = this.fxTop;
    const proj = this.world.proj;
    const N = 50;
    const pts: Phaser.Math.Vector2[] = [];
    const shadow: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const [x, y, h] = arcAt(t, i / N);
      const p = proj.project(x, y, h);
      pts.push(new Phaser.Math.Vector2(p.x, p.y));
      const q = proj.project(x, y, 0);
      shadow.push({ x: q.x, y: q.y });
    }
    // Sombra no chão (tracejada escura)
    g.lineStyle(3, 0x000000, 0.4);
    for (let i = 0; i < N; i += 3) g.lineBetween(shadow[i].x, shadow[i].y, shadow[i + 1].x, shadow[i + 1].y);
    // Arco: brilho na cor do recebedor + linha branca
    const glow = r?.key ? RECV_COLORS[r.key] : 0xe5484d;
    top.lineStyle(10, glow, 0.35);
    top.strokePoints(pts, false);
    top.lineStyle(3.5, 0xffffff, 1);
    top.strokePoints(pts, false);

    // Mira deitada no gramado: brilho, anel grosso (cor do risco), anel branco, ponto, cruz, pulsando
    const risk = riskColor(r?.chance ?? 0);
    const pulse = 1 + Math.sin(this.elapsed * 9) * 0.07;
    const { tx, ty } = t;
    groundOval(g, proj, tx, ty, 6.4 * pulse, 6.4 * pulse, risk, 0.12, risk, 0, 0.01);
    groundOval(g, proj, tx, ty, 4.8 * pulse, 4.8 * pulse, risk, 0.16, risk, 0, 0.01);
    groundRing(g, proj, tx, ty, 2.2 * pulse, 0.55, risk, 1);
    groundRing(g, proj, tx, ty, 1.1, 0.28, 0xffffff, 1);
    groundRing(g, proj, tx, ty, 0.15, 0.3, risk, 1, 12);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      groundSegment(g, proj, tx + dx * 2.9, ty + dy * 2.9, tx + dx * 3.9, ty + dy * 3.9, 0.3, 0xffffff, 1);
    }

    // Etiqueta "QUEDA · B LIVRE · 78%"
    const p = proj.project(tx, ty + 3.4, 0);
    const txt = r?.key ? `QUEDA · ${r.key} ${r.status} · ${Math.round(r.chance * 100)}%` : 'QUEDA · NINGUÉM';
    this.aimTag
      .setVisible(true)
      .setLabel(txt, r?.key ? RECV_COLORS[r.key] : 0xe5484d, r?.key ? '#0D0D12' : '#FFFFFF')
      .setPosition(p.x, p.y);
  }
}
