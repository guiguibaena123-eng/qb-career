import { sfx, type Sfx } from '../systems/sfx';
import Phaser from 'phaser';
import { CAMERA, CLOCK_RATE, FIELD, FONT_TITLE, GAME_H, GAME_W, MATCH_SEED, QUARTER_SECONDS, TEAMS, broadcast, finalGame, hostTeam, logoKey, matchConfig, playoffLogo, venue, VIEW } from '../config';
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
import { LivePlay, separatePlayers, type Receiver } from '../systems/live';
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
import { difficulty } from '../systems/difficulty';
import { Replay } from '../systems/replay';
import { setupHiRes } from '../systems/hires';
import { Daylight, shadowLights } from '../systems/daytime';
import { pickWeather, Weather } from '../systems/weather';
import { standOptions } from '../systems/grandstand';

/** Linha de scrimmage do treino livre (todo lance recomeça daqui). */
const PRACTICE_LOS = 30;
/** Raio do alvo do treino de QB (o mesmo do Combine). */
const TARGET_R = 2.6;
import { simulateDrive, spotName } from '../systems/oppdrive';
import { KickUi } from '../ui/KickUi';
import { DefenseScreen } from '../ui/DefenseScreen';
import { Menu } from '../ui/Menu';
import { Intro } from '../ui/Intro';
import { gradCard } from '../ui/gradcard';
import { careerMatch, finishCareerMatch, leaveCareerMatch } from '../integration/MatchBridge';
import { ROUND_INFO } from '../career/playoffs';
import { TeamRepository } from '../data/TeamRepository';
import { getSave } from '../player/PlayerSave';
import { bottomGradient, label, Tag, title, UI } from '../ui/widgets';
import { C, plate, plateLine, plateShadow, TV, TvButton, tvText } from '../ui/tv';

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
/** Tempo (s) até a defesa chegar no chutador do field goal. O timer mostra 2,0 s; o resto é a corrida do chutador. */
const RUSH_ARRIVE = 2.45;

export class MatchScene extends Phaser.Scene {
  private state = new GameState();
  private world!: World;
  private offense: Player[] = [];
  private defense: Player[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  /** Cada partida usa uma semente nova (clima, sorteio e lances mudam); ?seed=N fixa para testes. */
  private rng = new Rng((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);

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
  private toggle!: { setMode: (m: 'pass' | 'run') => void; left: number };
  private recvButtons: { btn: TvButton; route: Phaser.GameObjects.Text }[] = [];
  private legend!: Phaser.GameObjects.Container;
  private legendRead!: Phaser.GameObjects.Text;
  private tipBox!: Phaser.GameObjects.Container;
  private tipText!: Phaser.GameObjects.Text;
  private fps?: Phaser.GameObjects.Text;

  // ---- lance ao vivo
  private phase: 'pre' | 'live' | 'post' | 'card' | 'replay' | 'kick' | 'defense' | 'intro' | 'kickoff' | 'celebrate' = 'pre';
  private intro!: Intro;
  private koFree = new URLSearchParams(location.search).has('kofree');
  private ko: {
    stage: 'setup' | 'run' | 'fly' | 'catch' | 'return' | 'end';
    /** O retornador chegou na end zone: touchdown (sem tackle). */
    td?: boolean;
    t: number;
    kickers: Player[];
    recvs: Player[];
    kicker: Player;
    returner: Player;
    dir: number;
    yK: number;
    land: number;
    to: [number, number];
    receive: boolean;
    fell: boolean;
    tackler: Player | null;
    stumble: number;
  } | null = null;
  private weather!: Weather;
  private kickUi!: KickUi;
  private defenseScreen!: DefenseScreen;
  private menu!: Menu;
  private kick: {
    kind: 'pat' | 'fg' | 'punt';
    t: number;
    stage: 'aim' | 'approach' | 'flight' | 'blocked' | 'done';
    off: number;
    good: boolean;
    from: [number, number, number];
    to: [number, number, number];
    apex: number;
    T: number;
    land: number;
    chance?: number;
    clock: number;
    rush?: boolean;
    rushers?: { p: Player; sx: number; sy: number; tx: number; ty: number }[];
    window?: number;
    post?: boolean;
    short?: boolean;
  } | null = null;
  private card!: ResultCard;
  private replay!: Replay;
  private replayPill!: Phaser.GameObjects.Container;
  /** O que acontece quando o tempo do resultado acaba (padrão: volta ao pré-snap). */
  private afterPost: (() => void) | null = null;
  /** Lance atual é a conversão de 2 pontos. */
  private twoPt = false;
  private get thrOut() {
    const t = this.thr;
    return !!t && (t.tx < 0 || t.tx > FIELD.width || t.ty > 110 || t.ty < -10);
  }
  private playXp = 0;
  private gameOver = false;
  /** Prorrogação (null = tempo regulamentar): posses encerradas e se a bola está com você. */
  private ot: { poss: number; onUs: boolean } | null = null;
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
  /** Touchdown: quem marcou entra de vez na end zone e comemora (pulinhos com a bola para cima). */
  private tdRun: { p: Player; dir: 1 | -1; goal: number; t: number; cel: number } | null = null;
  private pendingCatch = 0;
  private dust: { x: number; y: number; life: number; vx: number; vy: number }[] = [];
  private playText = '';
  private ballAway = false;
  /** Depuração: ?auto=pass dá o snap e lança sozinho para o B (para testar sem tocar). */
  private auto: string | null = null;
  private airYards = 0;

  /**
   * Treino livre (null = partida normal): estádio vazio, sem placar/relógio/descidas, cada lance
   * volta para a mesma linha. 'qb' = passe nos alvos sem defesa; 'rb' = corrida contra a defesa.
   */
  private practiceStats = { plays: 0, hits: 0, sum: 0, combo: 0, yards: 0, best: 0 };

  constructor(
    key = 'MatchScene',
    readonly practice: 'qb' | 'rb' | null = null,
    /** Partida da carreira (MatchBridge): OVR do save e resultado gravado no fim. */
    readonly career = false,
  ) {
    super(key);
  }

  /** Cada partida começa sem texturas de partidas anteriores (as cores dos times podem ter mudado). */
  init() {
    // Assets da carreira (camadas, rostos, terno do Draft, estádios) vêm do Boot e não são recriados: ficam
    const keep = ['__', 'logo', 'layer_', 'face_', 'drsuit_', 'stad_', 'draftimg_'];
    for (const k of this.textures.getTextureKeys()) if (!keep.some((p) => k.startsWith(p))) this.textures.remove(k);
  }

  create() {
    setupHiRes(this);
    const s = this.state;
    if (this.career) Object.assign(s.qb, { ovr: getSave().ovr, number: getSave().number }); // HUD com o OVR (calcOvr) e o número da carreira
    if (import.meta.env.DEV) (window as unknown as { __qb: unknown }).__qb = this; // gancho de teste automático
    if (this.practice) {
      // Treino: arquibancada sem torcedores (o resto do gráfico igual ao da partida)
      s.los = PRACTICE_LOS;
      standOptions.empty = true;
      this.events.once('shutdown', () => (standOptions.empty = false));
    }
    // Treino: sempre de dia e com tempo limpo
    const time = matchConfig.time;
    if (this.practice) matchConfig.time = 'day';
    const weatherKind = this.practice ? 'clear' : pickWeather(this.rng);
    this.world = new World(this, s.los, weatherKind);
    matchConfig.time = time;
    if (this.practice) standOptions.empty = false;
    this.fx = this.add.graphics().setDepth(0.8);
    this.spawnPlayers();
    if (this.practice) {
      // Treino: sem defesa em campo
      for (const d of this.defense) {
        d.bb.img.destroy();
        const items = this.world.players.items;
        items.splice(items.indexOf(d.bb), 1);
      }
      this.defense = [];
    }
    this.scheme = pickScheme(this.rng);

    this.hud = new Hud(this, s);
    // Tudo que nasce aqui é interface do pré-snap (some durante o lance)
    const before = this.children.list.length;
    this.buildFieldTags();
    this.buildBottom();
    this.preUi = this.children.list.slice(before).filter((o) => o !== this.windowTag);
    this.buildTactical();
    this.buildLive();
    this.buildPause();
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

    // Clima e vento da partida
    new Daylight(this, this.world.tod, GAME_W, GAME_H);
    this.weather = new Weather(this, weatherKind, this.rng, this.world.tod === 'night');
    this.world.sideline.snow = this.weather.kind === 'snow';
    this.state.wind = { dir: this.rng.chance(0.5) ? -1 : 1, mph: this.rng.int(0, 18) };
    this.kickUi = new KickUi(this);
    this.defenseScreen = new DefenseScreen(this);
    this.menu = new Menu(this);
    this.intro = new Intro(this, this.rng);
    // Som da partida: torcida (fora do treino livre), jogadores, bola e juiz
    sfx.startMatch(!this.practice);
    this.events.once('shutdown', () => sfx.endMatch());
    if (this.career) this.careerIntro();
    else if (finalGame.on) Object.assign(this.intro.info, { mode: 'PARTIDA RÁPIDA · A GRANDE FINAL', arena: 'QFL BOWL · CAMPO NEUTRO', homeHosts: true });
    else Object.assign(this.intro.info, { arena: TeamRepository.get(venue.id ?? TEAMS.home.id).stadium.name, homeHosts: venue.id !== TEAMS.away.id });
    // ?chute=fg|punt|pat abre direto no chute; ?defesa abre a campanha deles
    const kq = q.get('chute');
    if (kq === 'fg' || kq === 'punt' || kq === 'pat') this.time.delayedCall(300, () => this.startKick(kq));
    if (q.has('defesa')) this.time.delayedCall(300, () => this.opponentDrive(25, true));
    if (q.has('descida')) this.state.down = Number(q.get('descida'));
    if (q.has('ko')) this.time.delayedCall(300, () => this.startKickoff(q.get('ko') === '1'));
    const debug = ['ko', 'auto', 'los', 'fim', 'chute', 'defesa', 'descida', 'tatica', 'semintro', 'jog'].some((k) => q.has(k));
    if (this.practice) {
      this.setMode(this.practice === 'rb' ? 'run' : 'pass');
      this.hud.hide(); // treino: sem placar
      this.hud.setResult(`TREINO LIVRE · ${this.practice.toUpperCase()}`, '', 0xffd23f, ['TREINO', 0xffd23f, '#0D0D12']);
      this.time.delayedCall(250, () => this.toast(this.practice === 'qb' ? 'TREINO DE QB · ACERTE OS ALVOS' : 'TREINO DE RB · CORRA!', UI.yellow, 14));
    } else if (!debug) this.startIntro();
    else if (this.state.down === 4) this.time.delayedCall(200, () => this.fourthDown());
    if (q.get('intro') === 'moeda') this.time.delayedCall(100, () => this.startIntro());
  }

  // ---------------------------------------------------------------- jogadores

  private spawnPlayers() {
    let i = 0;
    // Carreira: o QB usa o número escolhido na criação do jogador
    const qbNum = this.career ? Math.max(0, getSave().number) : null;
    for (const slot of SHOTGUN_TRIPS) {
      const sl = qbNum !== null && slot.role === 'QB' ? { ...slot, num: qbNum } : slot;
      this.offense.push(new Player(this.world.players, this, 'off', sl, this.state.los, i++));
    }
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
      p.y = Math.min(108.5, s.los + p.slot.d);
      p.vx = p.vy = p.angle = p.hop = 0;
      p.sx = p.sy = 1;
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
    this.hint = this.add.container(GAME_W / 2, 600).setDepth(95);
    const ht = label(this, 0, 0, 'TOQUE NUMA LETRA PARA MUDAR A ROTA', 10, '#E8EAF2').setOrigin(0.5);
    const hb = this.add.graphics();
    hb.fillStyle(UI.dark, 1);
    hb.fillRect(-ht.width / 2 - 12, -13, ht.width + 24, 26);
    hb.fillStyle(UI.dark, 0.8);
    hb.fillRect(-ht.width / 2 - 10, -11, ht.width + 20, 22);
    this.hint.add([hb, ht]);
  }

  // ------------------------------------------------------------ pause

  private paused = false;
  private pauseBtn!: TvButton;
  private pauseUi: Phaser.GameObjects.GameObject[] = [];

  /** Botão de pause (canto direito, abaixo do placar) + menu de pausa (pacote da transmissão). */
  private buildPause() {
    const W = GAME_W;
    const H = GAME_H;
    const btn = (this.pauseBtn = new TvButton(this, W - 12 - 24, 142, { w: 48, h: 40, fill: TV.ink, fillAlpha: 0.9 }));
    btn.setDepth(98);
    const ic = this.add.graphics();
    ic.fillStyle(0xffffff, 1);
    ic.fillRect(-7, -8, 5, 16);
    ic.fillRect(2, -8, 5, 16);
    btn.add(ic);
    btn.onTap = () => this.setPaused(true);

    // Menu
    const dim = this.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, TV.ink, 0.88).setOrigin(0).setDepth(200).setInteractive();
    const D = 201;
    // chamada: PAUSA numa placa amarela, igual à abertura do jogo
    const lg = this.add.graphics().setDepth(D);
    plateShadow(lg, 20, 150, 196, 76);
    plate(lg, 20, 150, 196, 76, TV.yellow, 1, false, true);
    const t = tvText(this, 34, 189, 'PAUSA', 72, C.ink, 800, 0).setOrigin(0, 0.5).setDepth(D);
    if (t.width > 170) t.setScale(170 / t.width);
    // mini placar: os dois times, o placar, o quarto e o relógio
    const sb = this.add.graphics().setDepth(D);
    const sy = 250;
    plateShadow(sb, 20, sy, W - 40, 64);
    plate(sb, 20, sy, W - 40, 64, TV.ink2, 1);
    plate(sb, 20, sy, 70, 64, TEAMS.home.color, 1, true, true);
    plate(sb, W - 90, sy, 70, 64, TEAMS.away.color, 1, true, true);
    const ha = tvText(this, 55, sy + 32, TEAMS.home.abbr, 22, TEAMS.home.fg, 800, 1).setOrigin(0.5).setDepth(D);
    const aa = tvText(this, W - 55, sy + 32, TEAMS.away.abbr, 22, TEAMS.away.fg, 800, 1).setOrigin(0.5).setDepth(D);
    const info = tvText(this, W / 2, sy + 24, '', 34, C.white, 800, 1).setOrigin(0.5).setDepth(D);
    const sub = tvText(this, W / 2, sy + 50, '', 13, C.muted, 700, 1.4).setOrigin(0.5).setDepth(D);
    this.pauseUi = [dim, lg, t, sb, ha, aa, info, sub];
    const mk = (y: number, text: string, onTap: () => void, primary = false) => {
      const b = new TvButton(this, W / 2, y, { w: W - 40, h: 60, fill: primary ? TEAMS.home.color : TV.ink3, fillAlpha: 1, primary }).setDepth(D);
      const tx = tvText(this, 0, 0, text, 21, primary ? TEAMS.home.fg : C.white, 800, 1.4).setOrigin(0.5);
      b.add(tx);
      b.onTap = onTap;
      this.pauseUi.push(b);
      return { b, tx };
    };
    // Ações sem volta pedem dois toques: o primeiro arma em vermelho
    const arm = (o: { b: TvButton; tx: Phaser.GameObjects.Text }, text: string, fire: () => void) => {
      let armed = false;
      return () => {
        if (!armed) {
          armed = true;
          o.b.setFill(TV.red, 1);
          o.tx.setText('TOQUE DE NOVO PARA CONFIRMAR');
          setTimeout(() => {
            armed = false;
            if (o.tx.active) {
              o.b.setFill(TV.ink3, 1);
              o.tx.setText(text);
            }
          }, 2500);
          return;
        }
        armed = false;
        o.b.setFill(TV.ink3, 1);
        o.tx.setText(text);
        fire();
      };
    };
    // A dificuldade só se escolhe no menu, antes da partida
    mk(400, 'CONTINUAR', () => this.setPaused(false), true);
    const rs = mk(472, 'REINICIAR PARTIDA', () => {});
    rs.b.onTap = arm(rs, 'REINICIAR PARTIDA', () => {
      this.setPaused(false);
      this.newGame();
    });
    const menuText = this.career ? 'SAIR (NÃO CONTA)' : 'MENU PRINCIPAL';
    const mm = mk(544, menuText, () => {});
    mm.b.onTap = arm(mm, menuText, () => this.toMenu());
    this.pauseInfo = info;
    this.pauseSub = sub;
    this.pauseUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    // Pausa sozinho se o jogador sair do app/aba no meio do lance
    const onHidden = () => {
      if (this.phase === 'live' || this.phase === 'kick') this.setPaused(true);
    };
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden));
  }
  private pauseSub!: Phaser.GameObjects.Text;

  /** Abertura da carreira: semana, o seu QB (nome, OVR, pontos fortes) e o estádio do mandante. */
  private careerIntro() {
    const sv = getSave();
    const cm = careerMatch()!;
    const A = sv.attrs;
    const traits = ([[A.arm, 'BRAÇO FORTE'], [A.accuracy, 'PRECISO'], [A.reading, 'BOA LEITURA'], [A.speed, 'MÓVEL']] as [number, string][])
      .sort((a, b) => b[0] - a[0])
      .slice(0, 2)
      .map((t) => t[1])
      .join(' · ');
    const host = TeamRepository.get(cm.home ? TEAMS.home.id : cm.opp);
    Object.assign(this.intro.info, { mode: cm.round ? `CARREIRA · ${ROUND_INFO[cm.round].sub}` : `CARREIRA · SEMANA ${cm.week}`, qb: `#${sv.number} · ${sv.name}`, ovr: sv.ovr, traits, arena: cm.final ? 'QFL BOWL · CAMPO NEUTRO' : host.stadium.name, homeHosts: cm.home });
  }

  /** Volta ao menu principal e descarta esta partida. */
  private toMenu() {
    const key = this.scene.key;
    this.time.paused = false;
    this.tweens.resumeAll();
    // Carreira: volta ao menu da carreira (sair no meio do jogo não conta resultado)
    if (this.career) leaveCareerMatch();
    else {
      venue.id = null;
      finalGame.on = false;
      broadcast.prime = null;
      playoffLogo.key = null;
    }
    // Sons da partida param na hora (torcida, comemorações longas ainda tocando)
    sfx.endMatch();
    this.scene.start(this.career ? 'CarreiraMenu' : 'MainMenu');
    // Descarta a partida só depois que ela encerrou de verdade: remover na hora (toque chega entre quadros)
    // destruía a cena sem o evento 'shutdown' — a torcida e outros desligamentos nunca rodavam.
    const game = this.game;
    const drop = () => {
      if (game.scene.isActive(key) || game.scene.isPaused(key)) return void game.events.once(Phaser.Core.Events.POST_STEP, drop);
      game.scene.remove(key);
    };
    game.events.once(Phaser.Core.Events.POST_STEP, drop);
  }
  private pauseInfo!: Phaser.GameObjects.Text;

  private setPaused(on: boolean) {
    if (this.paused === on) return;
    this.paused = on;
    sfx.setPaused(on);
    this.pauseUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(on));
    if (on) {
      const s = this.state;
      this.pauseInfo.setText(`${s.score.home}  ×  ${s.score.away}`);
      this.pauseSub.setText(`${s.quarterText} · ${s.clockText}`);
      this.liveUi.joystick.reset();
      if (this.ctl) this.ctl.sprint = false;
      this.aim.active = false;
      this.time.paused = true;
      this.tweens.pauseAll();
    } else {
      this.time.paused = false;
      this.tweens.resumeAll();
    }
  }


  private buildBottom() {
    const W = GAME_W;
    const H = GAME_H;
    const L = 14;
    const R = W - 14;
    bottomGradient(this, 300, 90);

    // Linha 1: nome da jogada + chave PASSE | CORRIDA
    const y1 = H - 204 + 12;
    tvText(this, L, y1 + 8, `JOGADA · ${FORMATION_NAME}`, 12, C.muted, 700, 1.2).setOrigin(0, 0.5).setDepth(95);
    this.playName = tvText(this, L, y1 + 31, '', 24, C.yellow, 800, 0.6).setOrigin(0, 0.5).setDepth(95);
    this.toggle = this.buildToggle(R, y1);

    // Linha 2: os 5 recebedores (tocar = hot route) — placa com a letra na cor do recebedor
    const y2 = y1 + 54;
    const gap = 6;
    const bw = (R - L - gap * 4) / 5;
    KEYS.forEach((k, i) => {
      const x = L + i * (bw + gap) + bw / 2;
      const btn = new TvButton(this, x, y2 + 23, { w: bw, h: 46 }).setDepth(95);
      const col = RECV_COLORS[k];
      const chip = this.add.graphics();
      chip.fillStyle(col, 1);
      chip.fillRect(-bw / 2 + 10, -23, bw - 20, 3);
      const letter = tvText(this, 0, -9, k, 20, '#' + col.toString(16).padStart(6, '0'), 800, 0).setOrigin(0.5);
      const route = tvText(this, 0, 11, '', 12, C.white, 700, 0.8).setOrigin(0.5);
      btn.add([chip, letter, route]);
      btn.onTap = () => this.cycleRoute(k);
      this.recvButtons.push({ btn, route });
    });

    // Linha 3: AUDIBLE | VISÃO (segurar) | SNAP
    const y3 = y2 + 56;
    const units = (R - L - 20) / 3.6;
    const aud = new TvButton(this, L + units / 2, y3 + 29, { w: units, h: 58 }).setDepth(95);
    aud.add(tvText(this, 0, 0, 'AUDIBLE', 19, C.white, 800, 1).setOrigin(0.5));
    aud.onTap = () => this.audible();

    const vis = new TvButton(this, L + units + 10 + units / 2, y3 + 29, { w: units, h: 58, border: TV.yellow, borderAlpha: 1 }).setDepth(95);
    vis.add(tvText(this, 0, -9, 'SEGURE', 12, C.muted, 700, 1.2).setOrigin(0.5));
    vis.add(tvText(this, 0, 9, 'VISÃO', 19, C.yellow, 800, 1).setOrigin(0.5));
    vis.onDown = () => this.setTactical(true);
    vis.onUp = () => this.setTactical(false);

    const snapW = units * 1.6;
    const snap = new TvButton(this, R - snapW / 2, y3 + 29, { w: snapW, h: 58, fill: TEAMS.home.color, fillAlpha: 1, primary: true }).setDepth(95);
    snap.add(tvText(this, 0, 0, 'SNAP', 32, TEAMS.home.fg, 800, 2).setOrigin(0.5));
    snap.onTap = () => this.snap();

    this.refreshPlayUi();
  }

  /** Chave PASSE | CORRIDA (placa da transmissão, segmento ativo na cor do time). */
  private buildToggle(right: number, top: number) {
    const segs = [
      { id: 'pass' as const, text: 'PASSE' },
      { id: 'run' as const, text: 'CORRIDA' },
    ];
    const c = this.add.container(0, 0).setDepth(95);
    const bg = this.add.graphics();
    c.add(bg);
    const texts = segs.map((sg) => tvText(this, 0, top + 22, sg.text, 16, C.white, 800, 1).setOrigin(0.5));
    const widths = texts.map((t) => t.width + 30);
    const total = widths[0] + widths[1] + 8;
    const left = right - total;
    let x = left + 4;
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
      plateShadow(bg, left, top, total, 44, true, true, 0.8);
      plate(bg, left, top, total, 44, TV.ink2, 1);
      plateLine(bg, left, top, total, 44, TV.rule, 1, 1);
      plate(bg, xs[i], top + 5, widths[i], 34, TEAMS.home.color, 1);
      texts.forEach((t, j) => t.setColor(j === i ? TEAMS.home.fg : C.muted));
    };
    setMode('pass');
    return { setMode, left };
  }

  private buildTactical() {
    const W = GAME_W;
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
    if (this.practice) m = this.practice === 'rb' ? 'run' : 'pass'; // treino: posição fixa
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
      this.tipText.setText(this.mode === 'pass' ? tipText(this.scheme, this.routes) : RUN_PLAYS[this.runIdx].tip);
      this.windowTag.setLabel(this.scheme.window.label);
    }
  }

  private snap() {
    if (this.phase !== 'pre') return;
    this.setTactical(false);
    this.startLive();
    // "HUT!" e o choque da linha logo depois
    sfx.play('hut', { x: this.qb.x });
    sfx.play('pads', { vol: 0.5, delay: 0.17 });
    if (Math.random() < 0.65) sfx.play('effort', { delay: 0.2 });
  }

  /** Atraso de jogo: play clock zerou. */
  private delayOfGame() {
    sfx.play('whistle');
    navigator.vibrate?.([40, 60, 40]);
    this.toast('ATRASO! −5 JDS', '#FF5A5F', 18);
    this.state.los = Math.max(1, this.state.los - 5);
    this.state.distance += 5;
    this.applyLos();
  }

  /** Texto grande que entra com "pop" (escala + leve rotação) e some. */
  private toast(text: string, color: string, size: number, y = 470) {
    const t = this.add
      .text(GAME_W / 2, y, text, { fontFamily: FONT_TITLE, fontSize: `${size}px`, color, stroke: '#0D0D12', strokeThickness: 6 })
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
    this.playName.setText(pass ? PASS_PLAYS[this.playIdx].name : RUN_PLAYS[this.runIdx].name).setScale(1);
    // nome longo encolhe na horizontal em vez de encostar na chave PASSE | CORRIDA
    const pmax = this.toggle.left - this.playName.x - 10;
    if (this.playName.width > pmax) this.playName.setScale(pmax / this.playName.width, 1);
    KEYS.forEach((k, i) => {
      const { btn, route } = this.recvButtons[i];
      route.setText(pass ? ROUTES[this.routes[k]].name : 'BLOQ').setScale(1);
      if (route.width > btn.width - 12) route.setScale((btn.width - 12) / route.width, 1);
      btn.setEnabled(pass);
    });
    this.hint.list.forEach((o) => o instanceof Phaser.GameObjects.Text && o.setText(pass ? 'TOQUE NUMA LETRA PARA MUDAR A ROTA' : 'CORRIDA: O RB SEGUE A FAIXA VERDE'));
    if (this.tactical) this.setTactical(true);
  }

  // -------------------------------------------------------------- desenho

  update(_t: number, dtMs: number) {
    // Pause: o botão fica visível só quando faz sentido
    this.pauseBtn.setVisible(!this.paused && (this.phase === 'kickoff' || this.phase === 'pre' || this.phase === 'live' || this.phase === 'post' || this.phase === 'kick'));
    if (this.paused) return;
    sfx.setExcite(this.world.stand.excite, this.phase === 'live', this.hostile && this.phase === 'pre');
    const real = Math.min(dtMs, 50) / 1000;
    const dt = this.feedback.tick(real);
    this.elapsed += dt;
    this.ui.slowmo(this.feedback.slow);
    const s = this.state;

    if (this.auto === 'run' && this.mode !== 'run') this.setMode('run');
    if (this.auto === 'run' && this.mode === 'run' && this.phase === 'pre' && new URLSearchParams(location.search).has('jog')) this.runIdx = Number(new URLSearchParams(location.search).get('jog')) % RUN_PLAYS.length;
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
      if (this.practice) s.playClock = PLAY_CLOCK; // treino: sem play clock
      s.playClock -= dt;
      if (s.playClock <= 0) this.delayOfGame();
      this.hud.setPlayClock(Math.max(0, s.playClock));
    } else if (this.phase === 'replay') {
      const cam = this.replay.step(dt * 0.55, this.ball);
      if (cam === null) this.endReplay();
      else this.world.targetY = cam;
    } else if (this.phase === 'intro') {
      // abertura: nada se move
    } else if (this.phase === 'kickoff') {
      this.updateKickoff(dt);
    } else if (this.phase === 'kick') {
      this.updateKick(dt);
    } else if (this.phase === 'celebrate') {
      this.updateCelebrate(dt);
    } else if (this.phase !== 'card' && this.phase !== 'defense') {
      this.updateLive(dt);
      if (this.phase === 'live' || this.phase === 'post') this.replay.record(dt, this.ball, this.world.targetY);
    }
    if (this.phase === 'post' || this.phase === 'kickoff') this.stepTdRun(dt);
    else this.tdRun = null;
    Player.preSnap = this.phase === 'pre';
    for (const p of this.offense) p.sync(dt);
    for (const p of this.defense) p.sync(dt);

    this.world.update(dt);
    this.fx.clear();
    this.fxTop.clear();
    if (this.phase === 'pre') {
      this.drawGround();
      this.placeTags();
    } else if (this.phase === 'celebrate') {
      this.drawTrophy();
    } else {
      this.drawLive();
    }
    this.ball.draw();
    this.ui.update(real);
    this.weather.update(real, this.world.proj);
    this.kickUi.update(real);
    this.defenseScreen.update(real);
    this.weather.setPillVisible(this.phase === 'pre' || (this.phase === 'live' && this.live?.phase === 'pocket'));
    this.weather.pill?.setY(this.phase === 'pre' ? 166 : 108);
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
    const rp = RUN_PLAYS[this.runIdx];
    const side = gap < rb.x ? 1 : -1;
    const path: [number, number][] = rp.wide
      ? [[rb.x, rb.y], [rb.x + (gap - rb.x) * 0.6, rb.y + 1.2], [gap, los - 0.5], [gap + (gap > 27 ? 2 : -2), los + 8]]
      : rp.jab
        ? [[rb.x, rb.y], [rb.x + side * rp.jab, rb.y - 0.4], [qb.x - 0.6, qb.y + 0.6], [gap, los - 1], [gap, los + 7]]
        : [[rb.x, rb.y], [qb.x - 0.6, qb.y + 0.6], [gap, los - 1], [gap, los + 7]];
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
    this.ball.lights = shadowLights(this.world.tod);
    this.liveUi = new LiveUi(this, {
      onRun: () => this.scramble(),
      onThrowAway: () => this.throwAway(),
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
      this.replayPill = this.add.container(GAME_W / 2, 128, [bg, t, dot]).setDepth(141).setVisible(false);
    }

    // Passe estilingue: toque no campo, arraste para trás e solte
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (this.phase === 'defense') return this.defenseScreen.tap();
      if (this.phase === 'post') return this.finishPost();
      if (this.phase === 'replay') return this.endReplay();
      if (this.phase !== 'live' || this.live?.phase !== 'pocket') return;
      if (p.worldY < 110 || p.worldY > GAME_H - 110) return;
      this.aim = { active: true, sx: p.worldX, sy: p.worldY, cx: p.worldX, cy: p.worldY, mx: 0, my: 0, used: true };
      this.liveUi.showDragHint(false);
      this.qb.pose = 'throw';
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.aim.active) return;
      this.aim.cx = p.worldX;
      this.aim.cy = p.worldY;
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
    this.live.slippery = this.weather.slippery;
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
      this.time.delayedCall(RUN_PLAYS[this.runIdx].delay * 1000, () => this.handoff());
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
    this.startCarry(rb, 'ARRASTE PARA CONDUZIR O RB', RUN_PLAYS[this.runIdx]);
  }

  private startCarry(p: Player, hint: string, run?: (typeof RUN_PLAYS)[number]) {
    this.ball.give(p);
    p.pose = 'carry';
    if (run) this.live!.startRun(p, run.gapX, run.hold, run.fool);
    else this.live!.startCarry(p);
    this.lane = null;
    this.lanePts = null;
    this.laneT = 0;
    this.ctl = new CarrierControl(p);
    this.ctl.slipChance = this.weather.slipChance;
    this.ctl.rand = () => this.rng.next();
    this.ctl.onLand = () => {
      this.puff(p.x, p.y + 0.5);
      this.feedback.shake(0.004, 90);
      vibrate(VIBE.tap);
    };
    this.ctl.onSlip = () => {
      this.ui.pop('ESCORREGOU!', '#C9CEE0', 14, 230, 500);
      vibrate(VIBE.tap);
    };
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
    sfx.play('throw', { x: this.qb.x, vol: away ? 0.7 : 1 });
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
      this.read = this.thr ? readThrow(this.thr, this.receivers, this.defense, this.weather.accuracyPenalty) : null;
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
      const left = this.practice === 'qb' ? 3.3 : live.pocketLeft; // treino de QB: sem pressão
      this.hud.setPocket(left, Math.min(1, left / 3.3));
      if (!this.aim.used) {
        const q = this.world.proj.project(this.qb.x, this.qb.y, 0);
        this.liveUi.showDragHint(true, q.x, Math.min(GAME_H - 150, q.y + 46));
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
    if (this.practice === 'qb' && !this.ballAway) return this.practiceLand(t);
    if (this.ballAway) return this.incomplete('BOLA FORA', 'JOGOU FORA · SEM RISCO');
    // Caiu fora das 4 linhas: incompleto
    if (t.tx < 0 || t.tx > FIELD.width || t.ty > 110 || t.ty < -10) return this.incomplete('BOLA FORA', 'O PASSE SAIU DO CAMPO');
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
      pInt = Math.max(0.08, Math.min(0.9, pInt * difficulty.d.intMul));
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
      chance = Math.min(0.98, chance) - this.weather.dropPenalty + difficulty.d.catch;
      if (this.rng.next() < chance) return this.reception(r, dOk ? 'NO TRÁFEGO' : 'LIVRE');
      r.pose = 'catch';
      this.time.delayedCall(300, () => (r.pose = null));
      return this.incomplete('ESCAPOU!', `${r.key} #${r.slot.num} DEIXOU ESCAPAR`);
    }
    return this.incomplete('INCOMPLETO', 'NINGUÉM NO LUGAR');
  }

  /**
   * Jogo fora de casa (estádio do adversário): a torcida é contra o nosso ataque. A final nunca é hostil
   * (mesmo num estádio escolhido do adversário): explosão e reações iguais às de casa.
   */
  private get hostile() {
    return !this.practice && !finalGame.on && hostTeam() === TEAMS.away;
  }

  /**
   * Torcida num lance BOM do nosso ataque. Em casa: a arquibancada pula (`stand`) e vibra (`name`).
   * Fora: a casa não comemora — `sev` 0 = fica quieta, 1 = lamenta, 2 = lamenta alto e só a pequena
   * torcida visitante comemora, abafada, lá no canto.
   */
  private fansGood(stand: number, sev: 0 | 1 | 2, name: Sfx, rank: number, o: { vol?: number; delay?: number } = {}) {
    if (!this.hostile) {
      if (stand > 0) this.world.stand.cheer(stand);
      sfx.crowd(name, rank, o);
      return;
    }
    if (sev === 2) {
      sfx.crowd('aww', rank, { vol: 0.8, delay: o.delay });
      sfx.play('cheerMed', { vol: 0.2, delay: (o.delay ?? 0) + 0.1 });
    } else if (sev === 1) sfx.crowd('aww', rank, { vol: 0.45, delay: o.delay });
  }

  /**
   * Torcida num lance RUIM do nosso ataque. Em casa: `home` (lamento). Fora: a casa vibra e a arquibancada
   * pula — `lvl` 0–1 (0,4 incompleto · 0,7 sack/FG errado · 1 interceptação, perder a bola, safety).
   */
  private fansBad(lvl: number, home: () => void) {
    if (!this.hostile) return home();
    this.world.stand.cheer(lvl);
    if (lvl >= 0.9) sfx.crowd('cheerBig', 4, { delay: 0.08 });
    else if (lvl >= 0.6) sfx.crowd('cheerSwell', 3, { delay: 0.08 });
    else sfx.crowd('cheerMed', 2, { vol: 0.75, delay: 0.08 });
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
    sfx.play('catch', { x: r.x });
    if (long) this.fansGood(1, 1, 'cheerSwell', 2, { delay: 0.08 });
    else this.fansGood(0.5, 0, 'cheerMed', 1, { vol: 0.6, delay: 0.1 });
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
    sfx.play('catch', { x: d.x, vol: 0.8 });
    this.fansBad(1, () => {
      sfx.crowd('aww', 3, { delay: 0.1 });
      sfx.play('boo', { vol: 0.7, delay: 1.1 });
    });
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
    if (!this.ballAway) this.combo = 0;
    this.ui.pop(big, '#FFFFFF', 20, 200, 700);
    this.ui.caption(small, 244, 900);
    this.ball.state = 'loose';
    // bola no chão; a torcida lamenta (quase: "ohh"; longe: "aww" baixo; jogou fora: nada)
    sfx.play('bounce', { x: this.ball.x, delay: 0.05 });
    if (!this.ballAway)
      this.fansBad(0.4, () => {
        if (big === 'ESCAPOU!' || big === 'DESVIADO!') sfx.crowd('ooh', 2, { delay: 0.05 });
        else sfx.crowd('aww', 1, { vol: 0.55, delay: 0.08 });
      });
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
    sfx.play('pads', { x: qb.x });
    sfx.play('fall', { x: qb.x, delay: 0.12 });
    sfx.play('oof', { delay: 0.06 });
    this.fansBad(0.7, () => sfx.crowd('crowdOof', 2, { delay: 0.1 }));
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
    sfx.play('pads', { x: c.x, vol: big ? 1 : 0.7 });
    sfx.play('fall', { x: c.x, vol: big ? 0.9 : 0.6, delay: 0.1 });
    if (Math.random() < (big ? 0.85 : 0.35)) sfx.play('oof', { delay: 0.07 });
    if (big) sfx.crowd('crowdOof', 2, { delay: 0.08 });
    if (big) this.ui.pop('PANCADA!', '#FFFFFF', 16, 200, 500);
    this.endPlay('tackle');
  }

  private onBroken(_d: Player, how: 'juke' | 'spin' | 'stiff') {
    this.ui.pop(how === 'juke' ? 'JUKE!' : how === 'spin' ? 'SPIN!' : 'ESCAPOU!', UI.yellow, 16, 230, 420);
    vibrate(VIBE.block);
    const bc = this.live?.carrier;
    if (how === 'stiff') sfx.play('pads', { x: bc?.x, vol: 0.55 });
    else sfx.play('throw', { x: bc?.x, vol: 0.8 });
    if (Math.random() < 0.6) sfx.play('effort', { vol: 0.8 });
    this.fansGood(0.4, 0, 'cheerMed', 1, { vol: 0.45 });
    this.gainXp(how === 'stiff' ? 3 : 8, this.live?.carrier ?? undefined);
  }

  /** Começa a entrada na end zone + comemoração. `run` = ainda vem correndo (senão só comemora onde está). */
  private startTdRun(p: Player, dir: 1 | -1, run = true) {
    const goal = !run ? p.y : dir > 0 ? Phaser.Math.Clamp(p.y + 4, 104, 107) : Phaser.Math.Clamp(p.y - 4, -7, -4);
    this.tdRun = { p, dir, goal, t: 0, cel: -1 };
    p.angle = 0;
    p.sx = p.sy = 1;
    p.hop = 0;
    p.pose = run ? 'carry' : 'catch';
    if (!run) p.vx = p.vy = 0;
  }

  private stepTdRun(dt: number) {
    const r = this.tdRun;
    if (!r) return;
    const p = r.p;
    r.t += dt;
    const left = (r.goal - p.y) * r.dir;
    if (r.cel < 0 && left > 0.15 && r.t < 1.4) {
      // Desacelera até parar dentro da end zone
      const sp = Phaser.Math.Clamp(left * 3, 2.5, Math.max(4, Math.abs(p.vy)));
      p.vy = r.dir * sp;
      p.vx *= Math.exp(-4 * dt);
      p.x = Phaser.Math.Clamp(p.x + p.vx * dt, 0.5, FIELD.width - 0.5);
      p.y += p.vy * dt;
    } else {
      // Comemoração rápida: três pulinhos com a bola para cima, balançando o corpo
      if (r.cel < 0) {
        r.cel = 0;
        p.vx = p.vy = 0;
        p.pose = 'catch';
        if (!this.hostile) this.world.stand.cheer(0.8);
      }
      r.cel += dt;
      const T = 1.05;
      if (r.cel < T) {
        p.hop = Math.abs(Math.sin((r.cel / T) * Math.PI * 3)) * 0.6;
        p.angle = Math.sin(r.cel * 18) * 9;
      } else {
        p.hop = 0;
        p.angle = 0;
        this.tdRun = null;
      }
    }
    this.world.targetY = Phaser.Math.Clamp(p.y - (r.dir > 0 ? 3 : 4), CAMERA.minY, CAMERA.maxY);
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
    n = Math.round(n * difficulty.d.xp);
    this.state.xp += n;
    this.playXp += n;
    const p = at ? this.world.proj.project(at.x, at.y, 4.2) : { x: GAME_W / 2, y: 330 };
    this.ui.xp(p.x, p.y, `+${n} XP`);
  }

  // ------------------------------------------------------------ treino livre

  /** Treino de QB: a bola caiu. Nota pelo alvo do recebedor mais próximo (como no Combine). */
  private practiceLand(t: Throw) {
    const ps = this.practiceStats;
    const n = nearest(
      this.receivers.map((r) => r.p),
      t.tx,
      t.ty,
    );
    const R = TARGET_R;
    const out = this.thrOut;
    const sc = out ? 0 : n.d <= R * 0.33 ? 100 : n.d <= R * 0.66 ? 75 : n.d <= R ? 50 : n.d <= R * 1.4 ? 25 : 0;
    ps.plays++;
    ps.sum += sc;
    const good = sc >= 50;
    if (good) {
      ps.hits++;
      ps.combo++;
    } else ps.combo = 0;
    const word = out ? 'BOLA FORA' : sc >= 100 ? 'PERFEITO!' : sc >= 75 ? 'ÓTIMO!' : sc >= 50 ? 'BOM' : sc >= 25 ? 'NA BORDA' : 'FALHOU';
    this.ui.pop(`${word}${ps.combo > 2 ? ' x' + ps.combo : ''}`, good ? '#3CCB5A' : '#FF5A5F', 22, 200, 900);
    this.ui.caption(`ACERTOS ${ps.hits}/${ps.plays} · MÉDIA ${Math.round(ps.sum / ps.plays)}`, 244, 1300);
    this.puff(t.tx, t.ty);
    vibrate(good ? VIBE.catch : VIBE.tap);
    if (good && n.p) {
      n.p.pose = 'catch';
      this.ball.give(n.p);
    } else this.ball.state = 'loose';
    this.practiceEnd('inc', false, `PASSE NO ALVO · ${word}`, `${sc}`, good ? 0x3ccb5a : 0xe5484d);
  }

  /** Treino: fim do lance sem placar, relógio nem descidas; depois volta para a mesma linha. */
  private practiceEnd(kind: 'td' | 'out' | 'dive' | 'tackle' | 'sack' | 'inc' | 'int', ranIn: boolean, text?: string, yards?: string, color?: number) {
    const s = this.state;
    const live = this.live!;
    const c = live.carrier;
    live.phase = 'dead';
    this.phase = 'post';
    this.postTimer = 1.6;
    this.afterPost = null;
    this.liveUi.show('none');
    for (const t of [this.pressureTag, this.holeTag, this.dangerTag, this.meTag, this.aimTag]) t.setVisible(false);
    this.statusTags.forEach((t) => t.setVisible(false));
    this.ctl = null;

    if (text === undefined) {
      const ps = this.practiceStats;
      const gained = kind === 'td' ? 100 - s.los : kind === 'sack' ? Math.round(this.qb.y - s.los) : kind === 'inc' || kind === 'int' ? 0 : Math.round((c?.y ?? s.los) - s.los);
      if (kind === 'td') {
        this.ui.pop('TOUCHDOWN!', UI.yellow, 26, 200, 1300);
        this.ui.burst(80);
        this.world.stand.erupt(TEAMS.home.color);
        this.feedback.shake(0.012, 400);
        vibrate(VIBE.td);
        if (c) this.startTdRun(c, 1, ranIn);
        this.postTimer = 2.2;
      } else if (kind === 'out') this.ui.caption('FORA DE CAMPO', 250, 800);
      else if (kind === 'dive') this.ui.caption('MERGULHOU!', 250, 800);
      if (this.practice === 'rb' && kind !== 'inc' && kind !== 'int') {
        ps.plays++;
        ps.yards += gained;
        ps.best = Math.max(ps.best, gained);
        this.time.delayedCall(kind === 'td' ? 900 : 300, () => this.ui.caption(`CORRIDAS ${ps.plays} · MÉDIA ${(ps.yards / ps.plays).toFixed(1)} JDS · MAIOR ${ps.best}`, 290, 1300));
      }
      text = kind === 'td' ? `TD DE ${gained} JDS` : kind === 'inc' ? 'INCOMPLETO' : kind === 'sack' ? 'SACK' : `${this.playText} · ${gained} JDS`;
      yards = kind === 'inc' ? '' : `${gained >= 0 ? '+' : ''}${gained}`;
      color = gained >= 0 ? 0x3ccb5a : 0xe5484d;
    }
    this.hud.setResult(text, yards ?? '', color ?? 0x3ccb5a, ['TREINO', 0xffd23f, '#0D0D12']);
    this.hud.setBar('result');
  }

  /** Fim do lance: atualiza descida/distância, placar e estatísticas; mostra o resultado. */
  private endPlay(kind: 'td' | 'out' | 'dive' | 'tackle' | 'sack' | 'inc' | 'int', by?: Player) {
    if (this.phase !== 'live') return;
    // apito do juiz encerrando o lance
    sfx.play('whistle', { delay: kind === 'inc' ? 0.35 : 0.45 });
    if (kind === 'dive') sfx.play('fall', { x: this.live?.carrier?.x, vol: 0.6 });
    const s = this.state;
    const live = this.live!;
    // Quem está com a bola na end zone (ou cruzou a linha de gol) fez touchdown, qualquer que seja o jeito de o lance acabar
    const holder = live.carrier;
    const ranIn = kind === 'td';
    if (holder && holder.y >= 100 && (kind === 'tackle' || kind === 'dive' || kind === 'out')) kind = 'td';
    if (this.practice) return this.practiceEnd(kind, ranIn);
    if (kind === 'sack') s.stats.sacks++;
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
    this.tickClock(Math.round((live.t + (kind === 'inc' || kind === 'out' ? 1 : 6)) * CLOCK_RATE));

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
        if (c) this.startTdRun(c, 1, ranIn);
        this.ui.pop('CONVERTEU! +2', UI.yellow, 20, 200, 1300);
        this.fansGood(0.8, 2, 'cheerBig', 4);
        if (!this.hostile) this.ui.burst(50); // fora de casa: sem brilhos
        vibrate(VIBE.td);
        this.gainXp(30);
      } else {
        this.ui.pop('NÃO CONVERTEU', '#FFFFFF', 16, 200, 1100);
        this.fansBad(0.8, () => sfx.crowd('aww', 3));
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
      // fora de casa: sem fogos nem brilhos; a casa lamenta e só os visitantes comemoram
      if (!this.hostile) {
        this.ui.burst(80);
        this.world.stand.erupt(TEAMS.home.color);
      }
      this.fansGood(1, 2, 'cheerBig', 4);
      this.feedback.shake(0.012, 400);
      vibrate(VIBE.td);
      if (c) this.startTdRun(c, 1, ranIn);
      this.gainXp(60);
      text = passComplete ? `PASSE DE ${gained} JDS · TD` : `CORRIDA DE ${gained} JDS · TD`;
      yardsText = `+${gained}`;
      chip = ['TD', TEAMS.home.color, TEAMS.home.fg];
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
      text = this.ballAway ? 'JOGOU FORA' : this.thrOut ? 'BOLA FORA' : 'PASSE INCOMPLETO';
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
        this.fansBad(1, () => sfx.crowd('boo', 3, { delay: 0.08 }));
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
      this.fansGood(0, 0, 'cheerMed', 1, { vol: 0.55, delay: 0.08 });
    } else {
      s.distance -= gained;
      s.down++;
      if (s.down > 4) {
        // 4ª descida falhou: a bola vira para eles ali mesmo
        this.time.delayedCall(350, () => this.ui.caption('PERDEU NAS DESCIDAS', 300, 1200, '#FFFFFF', 0x5a1418));
        this.fansBad(1, () => sfx.crowd('aww', 3, { delay: 0.08 }));
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
      s.clock = QUARTER_SECONDS;
      this.time.delayedCall(900, () => this.ui.caption(q === 2 ? 'INTERVALO · FIM DO 2º QUARTO' : `FIM DO ${q}º QUARTO`, 330, 1300, '#0D0D12', 0xffd23f));
      sfx.play('whistleLong', { delay: 0.9 });
    } else {
      s.clock = 0;
      this.gameOver = true;
      sfx.play('whistleLong', { delay: 0.9 });
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
    return { kind: 'xp' as const, label: 'PROGRESSO DO QB', gain: this.playXp, base: ((xp - this.playXp) % 1000) / 1000 };
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
      chipFg: TEAMS.home.fg,
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
      chipFg: TEAMS.away.fg,
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
    // Prorrogação: TD encerra o jogo, sem ponto extra
    if (this.ot) {
      this.card.hide();
      this.hud.refresh();
      return this.showFinal();
    }
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
      next: () => this.startKick('pat'),
      nextLabel: 'CHUTAR +1',
    });
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

  // ------------------------------------------------------------ times especiais

  /** Distância de um chute a partir da linha de scrimmage (snap de 7 + end zone de 10). */
  private kickDist() {
    return Math.round(100 - this.state.los + 17);
  }

  private fgChance(dist: number) {
    const w = this.state.wind.mph;
    return Phaser.Math.Clamp(1.04 - Math.max(0, dist - 20) * 0.0125 - this.weather.kickPenalty - w * 0.004 + difficulty.d.kick + (TEAMS.home.rating.esp - 75) * 0.003, 0.05, 0.97);
  }

  /** Chute: PAT (ponto extra), FG (field goal) ou PUNT, com a barra de agulha. */
  private startKick(kind: 'pat' | 'fg' | 'punt') {
    const s = this.state;
    this.card.hide();
    this.menuHide();
    if (kind === 'pat') {
      s.los = 85;
      s.down = 1;
      s.distance = 10;
    }
    this.phase = 'kick';
    this.kick = { kind, t: 0, clock: 0, stage: 'aim', off: 0, good: false, from: [0, 0, 0], to: [0, 0, 0], apex: 0, T: 1, land: 0 };
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.windowTag.setVisible(false);
    this.liveUi.show('none');
    this.applyLos();
    this.weather.setPillVisible(false);

    // Formação de chute: o RB vira o chutador, o QB segura a bola
    const MID = FIELD.width / 2;
    const k = this.recv('E');
    const holder = this.qb;
    const ballY = kind === 'punt' ? s.los - 13 : s.los - 7;
    if (kind === 'punt') {
      k.x = MID;
      k.y = ballY - 0.4;
      holder.x = MID + 2.5;
      holder.y = s.los - 6;
    } else {
      holder.x = MID + 0.7;
      holder.y = ballY;
      k.x = MID - 1.3;
      k.y = ballY - 2.4;
    }
    // field goal / ponto extra: o segurador fica ajoelhado com a bola em pé no chão
    holder.pose = kind === 'punt' ? null : 'hold';
    k.pose = null;
    this.ball.upright = kind !== 'punt';
    this.ball.state = 'loose';
    this.ball.holder = null;
    this.ball.x = MID;
    this.ball.y = ballY;
    this.ball.h = kind === 'punt' ? 1.1 : 0.25;
    this.ball.spinMode = 'tumble'; // todo chute (field goal, ponto extra, punt) gira de ponta a ponta, meio torto
    this.world.targetY = Phaser.Math.Clamp(s.los - 1, CAMERA.minY, CAMERA.maxY);

    const spot = spotName(s.los, TEAMS.home.abbr, TEAMS.away.abbr);
    const wind = s.wind;
    if (kind === 'punt') {
      this.hud.setResult(`PUNT · DA ${spot}`, '', 0, [s.downText, 0xffd23f, '#0D0D12']);
      this.kickUi.open({ windKmh: wind.mph, windDir: wind.dir, dist: 45, chance: 1, window: 0.3, color: TEAMS.home.color, info: 'PARE NO MEIO', label: 'PUNT' });
    } else {
      const dist = this.kickDist();
      let ch = this.fgChance(dist);
      let win = Math.sin((ch * Math.PI) / 2);
      if (kind === 'fg') {
        // Quanto mais longo, menor a faixa verde (o chute fica mais exigente)
        win *= Phaser.Math.Clamp(1 - Math.max(0, dist - 25) * 0.0065, 0.5, 1);
        ch = (2 / Math.PI) * Math.asin(win); // a chance mostrada acompanha a faixa real
      }
      this.kick.chance = ch;
      this.kick.window = win;
      if (kind === 'pat') this.hud.setResult(`CHUTE DA ${spot}`, '', 0, ['PONTO EXTRA', 0xffd23f, '#0D0D12']);
      else this.hud.setResult(`${spot} · FIELD GOAL DE ${dist} JDS`, '', 0, [s.downText, 0xffd23f, '#0D0D12']);
      this.kickUi.open({ windKmh: wind.mph, windDir: wind.dir, dist, chance: ch, window: win, color: TEAMS.home.color });
    }
    this.hud.setBar('result');
    this.kickUi.onKick = (off) => this.kickBall(off);
    // Field goal: a defesa vem em cima do chutador. Você tem 2 s para chutar
    if (kind === 'fg') {
      const kicker = this.recv('E');
      const rs = this.defense.filter((p) => p.role === 'DL' || p.role === 'LB' || p.role === 'NB');
      this.kick.rush = true;
      this.kick.rushers = rs.map((p, i) => ({
        p,
        sx: p.x,
        sy: p.y,
        tx: kicker.x + (i - (rs.length - 1) / 2) * 0.9,
        ty: kicker.y + 1.0,
      }));
      this.kickUi.setTimer(2);
    } else this.kickUi.setTimer(null);
  }

  private kickBall(off: number) {
    const kk = this.kick!;
    const s = this.state;
    kk.off = off;
    kk.stage = 'approach';
    kk.t = 0;
    const MID = FIELD.width / 2;
    const from: [number, number, number] = [this.ball.x, this.ball.y, this.ball.h];
    kk.from = from;
    if (kk.kind === 'punt') {
      const q = 1 - Math.abs(off);
      const dist = Math.round(30 + q * 24 + this.rng.range(-3, 3) - this.weather.kickPenalty * 25);
      kk.land = s.los + dist;
      kk.to = [Phaser.Math.Clamp(MID + off * 12 + s.wind.dir * s.wind.mph * 0.12, 3, FIELD.width - 3), Math.min(kk.land, 109), 0.2];
      kk.apex = 9 + q * 6;
      kk.T = 3.2 + q * 0.9;
      kk.good = q > 0.7;
    } else {
      const win = kk.window ?? 0.5;
      kk.good = Math.abs(off) < win;
      // Lado em que passa: |gx − MID| < 3,1 = entre as traves
      const gx = MID + (off / win) * 2.9 + s.wind.dir * s.wind.mph * 0.02;
      // Chutes longos que erram perdem força e podem cair curtos
      const dFg = this.kickDist();
      kk.short = !kk.good && kk.kind === 'fg' && dFg > 42 && this.rng.chance(Math.min(0.75, (dFg - 42) * 0.05 + 0.3));
      kk.to = kk.short ? [gx, 100 - this.rng.range(1, 6), 0.3] : [gx, 114, 4];
      kk.apex = 7 + this.kickDist() * 0.14;
      kk.T = 1.3 + this.kickDist() * 0.012;
      kk.post = Math.abs(off / win) > 0.95 && Math.abs(off / win) < 1.12;
    }
    vibrate(VIBE.tap);
  }

  private updateKick(dt: number) {
    const kk = this.kick;
    if (!kk) return;
    const k = this.recv('E');
    if (kk.rush) {
      kk.clock += dt;
      this.rushStep(dt);
    }
    if (kk.stage === 'aim') {
      if (kk.rush) {
        this.kickUi.setTimer(Math.max(0, 2 - kk.clock));
        if (kk.clock >= 2) this.blockKick();
      }
      return;
    }
    if (kk.stage === 'blocked') {
      if (kk.clock >= RUSH_ARRIVE) this.blockedResult();
      return;
    }
    kk.t += dt;
    if (kk.stage === 'approach') {
      // Corrida curta até a bola
      const tx = this.ball.x - 0.5;
      const ty = this.ball.y - 0.6;
      k.vx = (tx - k.x) * 6;
      k.vy = (ty - k.y) * 6;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      if (kk.t > 0.38) {
        kk.stage = 'flight';
        kk.t = 0;
        k.pose = 'throw';
        sfx.play('kick', { x: this.ball.x });
        // o segurador continua abaixado um instante e depois levanta
        if (kk.kind === 'punt') this.qb.pose = null;
        else this.time.delayedCall(550, () => this.qb.pose === 'hold' && (this.qb.pose = null));
        this.feedback.shake(0.004, 90);
        this.time.delayedCall(300, () => (k.pose = null));
      }
      return;
    }
    if (kk.stage === 'flight') {
      const u = Math.min(1, kk.t / kk.T);
      const [x0, y0, h0] = kk.from;
      const [x1, y1, h1] = kk.to;
      this.ball.x = x0 + (x1 - x0) * u;
      this.ball.y = y0 + (y1 - y0) * u;
      this.ball.h = h0 + (h1 - h0) * u + kk.apex * 4 * u * (1 - u);
      this.ball.state = 'loose';
      this.world.targetY = Phaser.Math.Clamp(this.ball.y - 9, CAMERA.minY, CAMERA.maxY);
      // Todo mundo vira para acompanhar a bola
      for (const p of this.defense) {
        p.vx *= 0.9;
        p.vy *= 0.9;
      }
      if (u >= 1) this.kickResult();
    }
  }

  /** Defensores correm até o chutador: chegam em RUSH_ARRIVE s (o chute precisa sair antes). */
  private rushStep(dt: number) {
    const kk = this.kick!;
    const u = Math.min(1, kk.clock / RUSH_ARRIVE);
    const e = Math.pow(u, 1.35);
    for (const r of kk.rushers ?? []) {
      const nx = r.sx + (r.tx - r.sx) * e;
      const ny = r.sy + (r.ty - r.sy) * e;
      r.p.vx = (nx - r.p.x) / Math.max(dt, 0.001);
      r.p.vy = (ny - r.p.y) / Math.max(dt, 0.001);
      r.p.x = nx;
      r.p.y = ny;
      if (u >= 1) r.p.vx = r.p.vy = 0;
    }
  }

  /** O timer de 2 s acabou: a defesa chega e bloqueia. */
  private blockKick() {
    const kk = this.kick!;
    kk.stage = 'blocked';
    this.kickUi.cancel();
    this.kickUi.setTimer(0);
    vibrate(VIBE.sack);
    this.ui.pop('PRESSÃO!', '#E5484D', 18, 200, 450);
  }

  private blockedResult() {
    const kk = this.kick!;
    const s = this.state;
    kk.stage = 'done';
    this.kickUi.show(false);
    this.phase = 'post';
    this.postTimer = 2.2;
    this.ui.pop('BLOQUEADO!', '#E5484D', 26, 200, 1300);
    sfx.play('pads');
    this.fansBad(1, () => sfx.crowd('crowdOof', 3));
    this.ui.edgeFlash(0xe5484d, 0.7);
    this.feedback.shake(0.012, 300);
    vibrate(VIBE.turnover);
    const k = this.recv('E');
    k.angle = 70;
    k.hop = 0;
    this.ball.state = 'loose';
    this.ball.y -= 3;
    this.ball.h = 0.4;
    for (const r of kk.rushers ?? []) r.p.pose = 'catch';
    this.hud.setResult('FIELD GOAL BLOQUEADO', 'X', 0xe5484d, ['FG', 0xffd23f, '#0D0D12']);
    const at = Math.max(20, s.los - 7);
    this.afterPost = () => this.opponentDrive(at, false);
    this.hud.refresh();
  }

  private kickResult() {
    const kk = this.kick!;
    const s = this.state;
    kk.stage = 'done';
    this.kickUi.show(false);
    this.phase = 'post';
    this.postTimer = 2;
    if (kk.kind === 'punt') {
      const land = kk.land;
      const dist = Math.round(land - s.los);
      let start: number;
      sfx.play('bounce', { x: this.ball.x });
      if (land >= 100) {
        start = 80;
        this.ui.pop('TOUCHBACK', '#FFFFFF', 18, 200, 1000);
      } else {
        const ret = this.rng.int(0, kk.good ? 6 : 12);
        start = Math.max(1, Math.round(land - ret));
        this.ui.pop(`PUNT DE ${dist} JDS`, kk.good ? '#3CCB5A' : '#FFFFFF', 16, 200, 1100);
        if (ret > 0) this.time.delayedCall(500, () => this.ui.caption(`RETORNO DE ${ret} JDS`, 250, 900));
      }
      this.hud.setResult(`PUNT DE ${dist} JDS`, '', 0, ['PUNT', 0xffd23f, '#0D0D12']);
      this.afterPost = () => this.opponentDrive(start, false);
      this.hud.refresh();
      return;
    }
    const good = kk.good;
    if (good) {
      const pts = kk.kind === 'pat' ? 1 : 3;
      s.score.home += pts;
      this.ui.pop('É BOA!', '#3CCB5A', 28, 200, 1100);
      this.fansGood(kk.kind === 'fg' ? 1 : 0.6, kk.kind === 'fg' ? 1 : 0, kk.kind === 'fg' ? 'cheerBig' : 'cheerMed', 3);
      this.ui.edgeFlash(0x3ccb5a, 0.5);
      vibrate(VIBE.td);
      this.gainXp(kk.kind === 'fg' ? 30 : 10);
      this.hud.setResult(kk.kind === 'pat' ? 'PONTO EXTRA' : `FIELD GOAL DE ${this.kickDist()} JDS`, `+${pts}`, 0x3ccb5a, kk.kind === 'pat' ? ['PONTO EXTRA', 0xffd23f, '#0D0D12'] : ['FG', 0xffd23f, '#0D0D12']);
      this.afterPost = () => this.opponentDrive(25, true);
    } else {
      this.ui.pop(kk.short ? 'CURTO!' : kk.post ? 'NA TRAVE!' : 'PRA FORA!', '#E5484D', 24, 200, 1100);
      this.fansBad(0.7, () => sfx.crowd(kk.post ? 'ooh' : 'aww', 3));
      vibrate(VIBE.turnover);
      this.hud.setResult(kk.kind === 'pat' ? 'PONTO EXTRA PERDIDO' : 'FIELD GOAL ERRADO', 'X', 0xe5484d, kk.kind === 'pat' ? ['PONTO EXTRA', 0xffd23f, '#0D0D12'] : ['FG', 0xffd23f, '#0D0D12']);
      const at = Math.max(20, s.los - 7);
      this.afterPost = kk.kind === 'pat' ? () => this.opponentDrive(25, true) : () => this.opponentDrive(at, false);
    }
    this.hud.refresh();
  }

  // ------------------------------------------------------------ 4ª descida

  private fourthDown() {
    const s = this.state;
    const dist = this.kickDist();
    const ch = this.fgChance(dist);
    const fgOk = dist <= 62;
    this.phase = 'card';
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.menu.show({
      big: '4ª DESCIDA',
      chip: `${s.downText} · ${spotName(s.los, TEAMS.home.abbr, TEAMS.away.abbr)}`,
      sub: fgOk ? `FIELD GOAL DE ${dist} JDS · CHANCE ${Math.round(ch * 100)}%` : 'FORA DO ALCANCE DO FIELD GOAL',
      buttons: [
        { label: 'TENTAR', onTap: () => this.goForIt() },
        // Dentro do alcance do field goal não há punt; fora dele, não há field goal
        ...(fgOk ? [] : [{ label: 'PUNT', primary: true, onTap: () => this.startKick('punt') }]),
        ...(fgOk ? [{ label: 'FIELD GOAL', primary: true, onTap: () => this.startKick('fg') }] : []),
      ],
    });
  }

  private goForIt() {
    this.menuHide();
    this.phase = 'pre';
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(true));
    this.refreshPlayUi();
    this.ui.caption('VAI PRA CIMA!', 300, 900, '#0D0D12', 0xffd23f);
  }

  private menuHide() {
    this.menu.hide();
  }

  /**
   * Campanha deles: a tela fica borrada e o feed mostra jogada a jogada.
   * `at` = onde eles pegam a bola (nossas jardas). `kick` = depois de um placar nosso (começam na 25 deles).
   */
  /**
   * Força da campanha da CPU: base +0,5 (a CPU marca de verdade), ataque deles contra a sua defesa e o
   * OVR do time (times fortes marcam bem mais), mais a dificuldade. ~2,5 pts/posse (time fraco) a ~5,5 (elite).
   */
  private oppEdge() {
    const a = TEAMS.away.rating;
    const h = TEAMS.home.rating;
    return Phaser.Math.Clamp(0.5 + difficulty.d.oppEdge + (a.atk - h.def) / 20 + (a.ovr - 80) / 20, -1.2, 2.2);
  }

  private opponentDrive(at: number, kick: boolean) {
    const s = this.state;
    // Tempo esgotado (ex.: TD no último lance): o jogo acaba aqui, sem campanha extra deles
    if (this.gameOver) {
      this.phase = 'post';
      return this.backToPreSnap();
    }
    if (this.ot?.onUs) {
      // Prorrogação: sua posse acabou sem TD (TD já encerra o jogo na hora)
      this.ot.poss++;
      this.ot.onUs = false;
      if (this.otDecided()) {
        this.phase = 'post';
        this.hud.refresh();
        return this.showFinal();
      }
    }
    this.card.hide();
    this.menuHide();
    this.kickUi.show(false);
    this.weather.setPillVisible(false);
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.liveUi.show('none');
    const drive = simulateDrive(kick ? 75 : at, this.rng, TEAMS.home.abbr, TEAMS.away.abbr, TEAMS.away.name, this.oppEdge());
    const los = Phaser.Math.Clamp(drive.ourLos, 1, 99);
    const where = los < 50 ? `NA SUA ${los}` : los === 50 ? 'NO MEIO' : `NA ${TEAMS.away.abbr} ${100 - los}`;
    this.phase = 'defense';
    this.hud.setBar('none');
    // posse do adversário durante a campanha simulada (o placar mostra a bola do lado dele)
    s.possession = 'away';
    this.hud.refresh();
    this.defenseScreen.open({
      drive,
      teamColor: TEAMS.home.color,
      oppColor: TEAMS.away.color,
      homeAbbr: TEAMS.home.abbr,
      awayAbbr: TEAMS.away.abbr,
      awayName: TEAMS.away.name,
      clockText: s.clockText,
      head: `${TEAMS.home.name} ${where} · 1ª & ${Math.min(10, 100 - los)}`,
      onFinish: () => {
        s.score.away += drive.points;
        if (this.hostile) {
          // fora de casa: o time da casa pontuou → festa (TD com fogos nas cores deles); a defesa segurou → lamento
          if (drive.points) {
            this.world.stand.cheer(1);
            if (drive.points >= 6) this.world.stand.erupt(TEAMS.away.color);
            sfx.crowd(drive.points >= 6 ? 'cheerBig' : 'cheerMed', 3);
          } else sfx.crowd('aww', 3, { vol: 0.7 });
        } else {
          if (drive.points) this.world.stand.cheer(0.3);
          // eles pontuaram: vaia; a defesa segurou: aplauso
          if (drive.points) sfx.crowd('boo', 3, { vol: drive.points >= 6 ? 1 : 0.7 });
          else sfx.crowd('cheerMed', 2, { vol: 0.8 });
        }
        this.tickClock(drive.seconds);
        if (this.ot) {
          this.ot.poss++;
          this.ot.onUs = true;
        }
        s.los = los;
        s.down = 1;
        s.distance = Math.min(10, 100 - los);
        s.possession = 'home';
        this.hud.refresh();
      },
      onEnter: () => {
        this.phase = 'post';
        if (this.otDecided(drive.points >= 7)) {
          this.hud.refresh();
          return this.showFinal();
        }
        this.backToPreSnap();
      },
    });
  }

  // ------------------------------------------------------------ prorrogação

  /** Mata-mata (playoffs da carreira e a Grande Final) não aceita empate. */
  private knockout() {
    const cm = this.career ? careerMatch() : null;
    return finalGame.on || !!(cm && (cm.round || cm.final));
  }

  /** Empate quando o relógio zera: toda partida tem 1 prorrogação; no mata-mata, quantas precisar. */
  private overtimeNeeded() {
    const s = this.state;
    if (this.practice || s.score.home !== s.score.away) return false;
    return !this.ot || this.knockout();
  }

  /**
   * Regra da NFL: TD na 1ª posse vence na hora; depois que os dois times tiveram a bola, quem
   * estiver à frente vence (morte súbita). `td` = o time que acabou de jogar fez touchdown.
   */
  private otDecided(td = false) {
    const ot = this.ot;
    const s = this.state;
    if (!ot || s.score.home === s.score.away) return false;
    return td || ot.poss >= 2;
  }

  /** Nova prorrogação: cara ou coroa e kickoff. A partir da 2ª, morte súbita. */
  private startOvertime() {
    const s = this.state;
    s.quarter++;
    s.clock = QUARTER_SECONDS;
    this.gameOver = false;
    this.ot = { poss: this.ot ? 2 : 0, onUs: false };
    this.phase = 'intro';
    this.card.hide();
    this.menu.hide();
    this.kickUi.show(false);
    this.defenseScreen.close();
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.windowTag.setVisible(false);
    this.liveUi.show('none');
    this.hud.setBar('none');
    this.hud.refresh();
    this.world.targetY = 50;
    const receive = this.rng.range(0, 1) < 0.5;
    const nth = s.quarter - 4;
    this.ui.caption(nth === 1 ? 'EMPATE · PRORROGAÇÃO!' : `AINDA EMPATADO · ${nth}ª PRORROGAÇÃO`, 300, 1500, '#0D0D12', 0xffd23f);
    this.time.delayedCall(900, () => this.ui.caption(receive ? 'MOEDA: VOCÊ RECEBE' : `MOEDA: ${TEAMS.away.name} RECEBEM`, 340, 1200, '#FFFFFF', 0x2a2f4a));
    this.time.delayedCall(2400, () => this.startKickoff(receive));
  }

  // ------------------------------------------------------------ abertura e kickoff

  /** Abertura: apresentação dos times e cara ou coroa; depois o kickoff. */
  private startIntro() {
    this.phase = 'intro';
    this.card.hide();
    this.menu.hide();
    this.kickUi.show(false);
    this.defenseScreen.close();
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.windowTag.setVisible(false);
    this.liveUi.show('none');
    this.hud.setBar('none');
    this.hud.refresh();
    this.world.targetY = 50;
    this.intro.show((receive) => {
      this.intro.hide();
      this.startKickoff(receive);
    });
  }

  /**
   * Kickoff animado. receive = true: os TOUROS chutam e os LOBOS recebem (você corre o retorno).
   * receive = false: os LOBOS chutam e os TOUROS recebem (depois vem a campanha deles).
   * Coordenadas: y de 0 (nossa linha de gol) a 100; os LOBOS atacam rumo ao y = 100.
   */
  private startKickoff(receive: boolean) {
    const MID = FIELD.width / 2;
    const kickTeam = receive ? this.defense : this.offense;
    const recvTeam = receive ? this.offense : this.defense;
    const dir = receive ? -1 : 1; // sentido do chute
    const yK = receive ? 65 : 35;
    const landing = receive ? 14 : 86;
    const kicker = receive ? this.defense[this.defense.length - 1] : this.recv('E');
    const returner = receive ? this.recv('B') : this.defense[this.defense.length - 3];
    const rng = this.rng;
    for (const p of [...this.offense, ...this.defense]) {
      p.vx = p.vy = p.angle = p.hop = 0;
      p.sx = p.sy = 1;
      p.pose = null;
      p.state = 'idle';
      p.wait = 0;
    }
    // Time que chuta: kicker atrás da bola, os outros em linha
    const line = kickTeam.filter((p) => p !== kicker);
    line.forEach((p, i) => {
      p.x = 5 + (i * 43.3) / Math.max(1, line.length - 1);
      p.y = yK - dir * 1.2 + rng.range(-0.25, 0.25);
    });
    kicker.x = MID;
    kicker.y = yK - dir * 5.5;
    // Time que recebe: muro, linha do meio e o retornador no fundo
    const others = recvTeam.filter((p) => p !== returner);
    others.forEach((p, i) => {
      const row = i < 5 ? 0 : 1;
      const n = row === 0 ? 5 : others.length - 5;
      const k = row === 0 ? i : i - 5;
      p.x = 8 + (k * 37) / Math.max(1, n - 1);
      p.y = row === 0 ? yK + dir * 14 : yK + dir * (Math.abs(landing - yK) * 0.62);
    });
    returner.x = MID;
    returner.y = landing - dir * 4;
    for (const p of [...this.offense, ...this.defense]) p.sync();

    this.ball.state = 'loose';
    this.ball.holder = null;
    this.ball.x = MID;
    this.ball.y = yK;
    this.ball.h = 0.25;
    this.ball.spinMode = 'tumble';
    // bola em pé no tee (todo recomeço)
    this.ball.upright = true;
    this.ball.tee = { x: MID, y: yK };
    this.world.targetY = Phaser.Math.Clamp(yK - 3, CAMERA.minY, CAMERA.maxY);
    this.world.field.scrimmageY = -50;
    this.world.field.firstDownY = -50;
    this.hud.setResult(receive ? `${TEAMS.away.name} CHUTAM · VOCÊ RECEBE` : `${TEAMS.home.name} CHUTAM`, '', 0, ['KICKOFF', 0xffd23f, '#0D0D12']);
    this.hud.setBar('result');
    this.hud.refresh();
    this.phase = 'kickoff';
    this.ko = { stage: 'setup', t: 0, kickers: line, recvs: others, kicker, returner, dir, yK, land: landing, to: [MID + rng.range(-7, 7), landing], receive, fell: false, tackler: null, stumble: 0 };
    this.ui.pop('KICKOFF', '#FFFFFF', 26, 210, 1000);
  }

  private moveTo(p: Player, tx: number, ty: number, speed: number, dt: number) {
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    const k = Math.min(1, dt * 7);
    if (d < 0.2) {
      p.vx += (0 - p.vx) * k;
      p.vy += (0 - p.vy) * k;
    } else {
      p.vx += ((dx / d) * speed - p.vx) * k;
      p.vy += ((dy / d) * speed - p.vy) * k;
    }
    p.x = Phaser.Math.Clamp(p.x + p.vx * dt, 0.5, FIELD.width - 0.5);
    p.y = Phaser.Math.Clamp(p.y + p.vy * dt, -9, 109);
  }

  private updateKickoff(dt: number) {
    const ko = this.ko;
    if (!ko) return;
    ko.t += dt;
    const MID = FIELD.width / 2;
    const { kicker, returner, dir } = ko;
    const proj = this.world;
    switch (ko.stage) {
      case 'setup': {
        if (ko.t > 1.3) {
          ko.stage = 'run';
          ko.t = 0;
        }
        break;
      }
      case 'run': {
        // O chutador corre até a bola e todos arrancam
        this.moveTo(kicker, MID, ko.yK - dir * 0.9, 7, dt);
        for (const p of ko.kickers) this.moveTo(p, p.x, p.y + dir * 40, 3 + ko.t * 6, dt);
        if (ko.t > 0.55) {
          ko.stage = 'fly';
          ko.t = 0;
          kicker.pose = 'throw';
          sfx.play('kick', { x: MID });
          this.time.delayedCall(320, () => (kicker.pose = null));
          this.feedback.shake(0.004, 100);
          vibrate(VIBE.tap);
        }
        break;
      }
      case 'fly': {
        const T = 3.1;
        const u = Math.min(1, ko.t / T);
        this.ball.x = MID + (ko.to[0] - MID) * u;
        this.ball.y = ko.yK + (ko.to[1] - ko.yK) * u;
        this.ball.h = 0.25 + 18 * 4 * u * (1 - u);
        proj.targetY = Phaser.Math.Clamp(this.ball.y - 8 * dir * -1 - 8, CAMERA.minY, CAMERA.maxY);
        for (const p of ko.kickers) this.moveTo(p, p.x + (ko.to[0] - p.x) * 0.25, ko.to[1] - dir * 8, 6.2, dt);
        this.moveTo(kicker, MID, ko.yK + dir * 14, 5, dt);
        this.moveTo(returner, ko.to[0], ko.to[1], returner.maxSpeed, dt);
        ko.recvs.forEach((p) => this.moveTo(p, p.x, p.y - dir * 8, 2.6, dt));
        if (u >= 1) {
          ko.stage = 'catch';
          ko.t = 0;
          this.ball.give(returner);
          sfx.play('catch', { x: returner.x, vol: 0.8 });
          returner.pose = 'catch';
          vibrate(VIBE.tap);
        }
        break;
      }
      case 'catch': {
        this.moveTo(returner, returner.x, returner.y, 0, dt);
        for (const p of ko.kickers) this.moveTo(p, ko.to[0], ko.to[1], 6.2, dt);
        if (ko.t > 0.4) {
          ko.stage = 'return';
          ko.t = 0;
          returner.pose = 'carry';
          this.ui.caption('RETORNO!', 250, 800);
        }
        break;
      }
      case 'return': {
        const dirR = -dir;
        // Retornador: corre para frente, desviando de quem vem de frente
        let avoid = 0;
        for (const p of ko.kickers) {
          const ahead = (p.y - returner.y) * dirR;
          if (ahead > 0 && ahead < 8 && Math.abs(p.x - returner.x) < 4.5) avoid += Math.sign(returner.x - p.x || 1) * (1 - ahead / 8);
        }
        const vx = Phaser.Math.Clamp(avoid * 4.5 + Math.sin(ko.t * 3.1) * 0.8 + (MID - returner.x) * 0.05, -5, 5);
        const sp = returner.maxSpeed * 1.02;
        returner.vx += (vx - returner.vx) * Math.min(1, dt * 6);
        returner.vy += (dirR * sp - returner.vy) * Math.min(1, dt * 6);
        returner.x = Phaser.Math.Clamp(returner.x + returner.vx * dt, 0.5, FIELD.width - 0.5);
        returner.y += returner.vy * dt;
        // Muro bloqueia: quem encosta num defensor o segura por um instante
        for (const b of ko.recvs) {
          let target = ko.kickers[0];
          let best = Infinity;
          for (const k of ko.kickers) {
            const d = Math.hypot(k.x - b.x, k.y - b.y);
            if (d < best) {
              best = d;
              target = k;
            }
          }
          this.moveTo(b, (target.x + returner.x) / 2, target.y + dirR * 0.4, b.maxSpeed, dt);
          if (best < 1.2 && target.wait <= 0 && this.rng.chance(dt * 2.2)) target.wait = this.rng.range(0.5, 1.1);
        }
        // Time que chutou: persegue e tenta o tackle
        for (const k of ko.kickers) {
          if (this.koFree) k.wait = 1; // depuração (?kofree): ninguém tackleia, para testar o retorno de TD
          if (k.wait > 0) {
            k.wait -= dt;
            this.moveTo(k, k.x, k.y, 0, dt);
            continue;
          }
          this.moveTo(k, returner.x + returner.vx * 0.3, returner.y + returner.vy * 0.3, k.maxSpeed * 1.04, dt);
          if (Math.hypot(k.x - returner.x, k.y - returner.y) < 0.95) {
            if (this.rng.chance(0.6)) {
              ko.stage = 'end';
              ko.t = 0;
              ko.tackler = k;
              sfx.play('pads', { x: returner.x });
              sfx.play('fall', { x: returner.x, delay: 0.1 });
              sfx.play('whistle', { delay: 0.5 });
              break;
            }
            k.wait = 0.5;
          }
        }
        proj.targetY = Phaser.Math.Clamp(returner.y - 4 + (dirR < 0 ? 0 : 0), CAMERA.minY, CAMERA.maxY);
        // Passou por todo mundo e chegou na end zone: touchdown! (só é derrubado se alguém o alcançar)
        if (ko.stage === 'return' && (dirR > 0 ? returner.y >= 100 : returner.y <= 0)) {
          ko.stage = 'end';
          ko.td = true;
          ko.t = 0;
        }
        // Segurança: se a corrida durar demais sem ninguém alcançar, termina onde está
        if (ko.stage === 'return' && ko.t > 25) {
          ko.stage = 'end';
          ko.t = 0;
        }
        // Ninguém atravessa ninguém (quem derrubou o retornador pode encostar nele)
        if (ko.stage === 'return') separatePlayers([...new Set([...ko.kickers, ko.kicker, ...ko.recvs, returner])], returner);
        for (const p of ko.kickers) if (p.wait > 0 && ko.stage === 'end') p.wait = 0;
        if (ko.stage === 'end' && ko.td) {
          this.startTdRun(returner, dirR > 0 ? 1 : -1);
          this.ui.pop('TOUCHDOWN!', UI.yellow, 26, 200, 1300);
          this.feedback.shake(0.012, 400);
          vibrate(VIBE.td);
          if (ko.receive) {
            // nosso TD: fora de casa sem fogos/brilhos e a casa lamenta
            if (!this.hostile) {
              this.ui.burst(80);
              this.world.stand.erupt(TEAMS.home.color);
            }
            this.fansGood(0, 2, 'cheerBig', 4);
          } else if (this.hostile) {
            // TD do time da casa
            this.world.stand.erupt(TEAMS.away.color);
            this.world.stand.cheer(1);
            sfx.crowd('cheerBig', 4);
          } else {
            this.ui.burst(80);
            this.world.stand.cheer(0.4);
            sfx.crowd('boo', 3);
          }
        } else if (ko.stage === 'end') {
          returner.vx = returner.vy = 0;
          this.feedback.shake(0.01, 200);
          vibrate(VIBE.tap);
          returner.pose = null;
          returner.angle = -75;
          this.ui.pop('PANCADA!', '#FFFFFF', 18, 230, 500);
          for (let i = 0; i < 12; i++) this.dust.push({ x: returner.x, y: returner.y, life: 0.7, vx: this.rng.range(-3, 3), vy: this.rng.range(-3, 3) });
        }
        break;
      }
      case 'end': {
        for (const p of [...ko.kickers, ...ko.recvs]) this.moveTo(p, p.x, p.y, 0, dt);
        if (ko.t > (ko.td ? 2.1 : 1.3)) this.endKickoff();
        break;
      }
    }
  }

  private endKickoff() {
    const ko = this.ko!;
    const s = this.state;
    this.ko = null;
    const y = Phaser.Math.Clamp(Math.round(ko.returner.y), 1, 99);
    if (ko.td) {
      this.phase = 'post';
      this.postTimer = 1.2;
      if (ko.receive) {
        // Retorno de touchdown seu: +6, depois o ponto extra
        s.score.home += 6;
        s.confidence = Math.min(5, s.confidence + 1);
        this.gainXp(60);
        this.hud.setResult(`RETORNO DE ${100 - ko.land} JDS · TD`, '+6', 0x3ccb5a, ['TD', TEAMS.home.color, TEAMS.home.fg]);
        this.hud.refresh();
        const card = { ...this.tdCard(100 - ko.land, false, ko.returner), sub: `RETORNO DE KICKOFF PARA TOUCHDOWN`, head: `RETORNO DE ${100 - ko.land} JDS`, replay: undefined };
        this.afterPost = () => this.showCard(card);
      } else {
        // Retorno de touchdown deles: +7 e a bola volta para você na 25
        s.score.away += 7;
        this.ui.pop(`TOUCHDOWN ${TEAMS.away.name}`, '#FFFFFF', 18, 200, 1400);
        this.hud.setResult(`RETORNO DE TD · ${TEAMS.away.name}`, '', 0, ['TD', TEAMS.away.color, TEAMS.away.fg]);
        this.hud.refresh();
        this.afterPost = () => {
          if (this.ot) {
            // Prorrogação: o TD deles encerra o jogo
            this.hud.refresh();
            return this.showFinal();
          }
          s.los = 25;
          s.down = 1;
          s.distance = 10;
          this.phase = 'post';
          this.backToPreSnap();
        };
      }
      return;
    }
    if (ko.receive) {
      // Você recebeu: a bola começa onde o retorno parou (entre a 12 e a 45)
      s.los = Phaser.Math.Clamp(y, 12, 45);
      s.down = 1;
      s.distance = 10;
      if (this.ot) this.ot.onUs = true;
      this.phase = 'post';
      this.backToPreSnap();
      this.time.delayedCall(250, () => this.ui.caption(`SUA BOLA ${s.spotText}`, 250, 1500, '#0D0D12', 0xffd23f));
    } else {
      // Os TOUROS receberam: a campanha deles começa onde o retorno parou
      this.phase = 'post';
      this.opponentDrive(Phaser.Math.Clamp(y, 55, 95), false);
    }
  }

  // ------------------------------------------------------------ campeão do QFL Bowl

  private champ: { team: 'home' | 'away'; t: number; players: Player[]; holder: Player; banner: Phaser.GameObjects.Container | null; confetti: Phaser.GameObjects.Particles.ParticleEmitter | null; done: () => void } | null = null;
  private champShown = false;
  private trophyG: Phaser.GameObjects.Graphics | null = null;

  /**
   * Final: o time campeão se reúne no meio do campo, o capitão levanta a taça, todos pulam, caem
   * confetes nas cores do time e depois aparece o banner do campeão. Tocar na tela pula.
   */
  private championCelebration(team: 'home' | 'away', done: () => void) {
    this.phase = 'celebrate';
    this.card.hide();
    this.menu.hide();
    this.kickUi.show(false);
    this.liveUi.show('none');
    this.hud.setBar('none');
    this.weather.setPillVisible(false);
    this.preUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.hint.setVisible(false);
    for (const t of [this.pressureTag, this.holeTag, this.dangerTag, this.meTag, this.aimTag, this.qbTag, this.windowTag]) t.setVisible(false);
    this.tags.forEach((t) => t.setVisible(false));
    this.statusTags.forEach((t) => t.setVisible(false));
    this.ball.hide();
    this.live = null;
    this.ctl = null;
    // Linhas de scrimmage/first down fora da vista
    this.world.field.scrimmageY = -60;
    this.world.field.firstDownY = -60;
    const winners = team === 'home' ? this.offense : this.defense;
    const losers = team === 'home' ? this.defense : this.offense;
    // Perdedores saem de cena; campeões em roda no meio-campo, o capitão no centro
    for (const p of losers) {
      p.x = -30;
      p.y = -40;
      p.sync();
    }
    const holder = team === 'home' ? this.qb : winners[0];
    const cx = FIELD.width / 2;
    const cy = 50;
    const ring = winners.filter((p) => p !== holder);
    ring.forEach((p, i) => {
      // roda atrás do capitão (meia-lua), mais espaçada
      const ang = Math.PI * (0.05 + 0.9 * (i / Math.max(1, ring.length - 1)));
      p.x = cx + Math.cos(ang) * 6;
      p.y = cy + 0.5 + Math.sin(ang) * 3.4 + (i % 2) * 1.2;
      p.vx = p.vy = 0;
      p.pose = i % 3 === 0 ? 'catch' : null;
      p.state = 'idle';
    });
    // Todos de frente para a câmera (o ataque é desenhado de costas no jogo)
    for (const p of winners) p.faceFront(this, true);
    holder.x = cx;
    holder.y = cy - 2.6; // capitão à frente, com a taça
    holder.vx = holder.vy = 0;
    holder.pose = 'catch';
    this.world.targetY = Phaser.Math.Clamp(cy + 14, CAMERA.minY, CAMERA.maxY); // grupo grande, perto do centro da tela
    this.world.stand.cheer(1);
    sfx.crowd('cheerBig', 5);
    this.ui.burst(120);
    this.hud.refresh();
    this.trophyG = this.add.graphics().setDepth(58);
    // Confete nas cores do time campeão
    const T = TEAMS[team];
    if (!this.textures.exists('confetti')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 8, 4);
      g.generateTexture('confetti', 8, 4);
      g.destroy();
    }
    const cols = [T.color, parseInt(T.uniform.trim.slice(1), 16), 0xffffff, parseInt(T.uniform.jersey.slice(1), 16), 0xffd23f];
    const confetti = this.add.particles(0, -20, 'confetti', {
      x: { min: 0, max: GAME_W },
      speedY: { min: 90, max: 200 },
      speedX: { min: -50, max: 50 },
      gravityY: 40,
      rotate: { start: 0, end: 720 },
      scaleX: { min: 0.6, max: 1.3 },
      scaleY: { min: 0.6, max: 1.2 },
      lifespan: 5200,
      quantity: 4,
      frequency: 40,
      tint: cols,
    });
    confetti.setDepth(140);
    this.champ = { team, t: 0, players: winners, holder, banner: null, confetti, done };
    // Tocar pula (depois de um instante)
    this.time.delayedCall(900, () => this.input.once('pointerdown', () => this.endChampion()));
  }

  private updateCelebrate(dt: number) {
    const c = this.champ;
    if (!c) return;
    c.t += dt;
    c.players.forEach((p, i) => {
      p.sx = p.sy = 1.3; // um pouco maiores na festa
      if (p === c.holder) {
        p.hop = Math.abs(Math.sin(c.t * 4)) * 0.35;
        p.angle = Math.sin(c.t * 5) * 4;
        return;
      }
      p.hop = Math.abs(Math.sin(c.t * 7 + i * 0.9)) * 0.7;
      p.angle = Math.sin(c.t * 9 + i) * 10;
    });
    if (c.t > 3.6 && !c.banner) this.championBanner();
    if (c.t > 7.8) this.endChampion();
  }

  /** Taça erguida pelo capitão (desenhada no mundo, acompanha a câmera e o pulo). */
  private drawTrophy() {
    const c = this.champ;
    if (!c) return;
    // Taça do tamanho de uma taça de verdade em relação ao corpo: ~40% da altura do capitão (o corpo
    // tem ~4,3u com a escala da festa), erguida acima da cabeça, nas mãos
    const lift = Math.abs(Math.sin(c.t * 2.2)) * 0.25 + c.holder.hop;
    const p = this.world.proj.project(c.holder.x, c.holder.y, 3.7 + lift);
    const u = p.s * 10 * 0.32;
    const g = this.trophyG;
    if (!g) return;
    g.clear();
    const x = p.x;
    const y = p.y;
    // brilho
    g.fillStyle(0xffe27a, 0.18 + 0.1 * Math.sin(c.t * 6));
    g.fillCircle(x, y - 2.2 * u, 3.2 * u);
    // base
    g.fillStyle(0x0d0d12, 1);
    g.fillRect(x - 1.5 * u - 1, y - 0.1 * u - 1, 3 * u + 2, 0.9 * u + 2);
    g.fillStyle(0x8a6a1f, 1);
    g.fillRect(x - 1.5 * u, y - 0.1 * u, 3 * u, 0.9 * u);
    g.fillStyle(0xf4f1e8, 1);
    g.fillRect(x - 0.8 * u, y + 0.15 * u, 1.6 * u, 0.35 * u);
    // haste
    g.fillStyle(0xd9b13b, 1);
    g.fillRect(x - 0.3 * u, y - 1.6 * u, 0.6 * u, 1.6 * u);
    g.fillStyle(0xfff0a8, 1);
    g.fillRect(x - 0.3 * u, y - 1.6 * u, 0.2 * u, 1.6 * u);
    // braços em Y
    g.lineStyle(0.55 * u, 0xd9b13b, 1);
    g.beginPath();
    g.moveTo(x - 1.6 * u, y - 3.3 * u);
    g.lineTo(x - 1.6 * u, y - 2.3 * u);
    g.lineTo(x, y - 1.6 * u);
    g.lineTo(x + 1.6 * u, y - 2.3 * u);
    g.lineTo(x + 1.6 * u, y - 3.3 * u);
    g.strokePath();
    // bola em cima
    g.fillStyle(0x0d0d12, 1);
    g.fillEllipse(x, y - 3.4 * u, 1.5 * u + 2, 2.3 * u + 2);
    g.fillStyle(0xb8742f, 1);
    g.fillEllipse(x, y - 3.4 * u, 1.5 * u, 2.3 * u);
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 0.08 * u, y - 4.1 * u, 0.16 * u, 1.4 * u);
    for (let k = 0; k < 3; k++) g.fillRect(x - 0.3 * u, y - 3.9 * u + k * 0.45 * u, 0.6 * u, 0.12 * u);
    // brilhinhos
    g.fillStyle(0xffffff, 0.9);
    const tw = (Math.sin(c.t * 8) + 1) / 2;
    g.fillRect(x + 2.2 * u, y - 3.8 * u, 0.25 * u * tw + 1, 0.9 * u * tw + 1);
    g.fillRect(x + 1.85 * u, y - 3.45 * u, 0.9 * u * tw + 1, 0.25 * u * tw + 1);
  }

  /** Banner do campeão no meio da tela. */
  private championBanner() {
    const c = this.champ!;
    const T = TEAMS[c.team];
    const W = GAME_W;
    const box = this.add.container(W / 2, 400).setDepth(160).setScale(0.3).setAlpha(0);
    const bw = W - 40;
    const bh = 300;
    box.add(gradCard(this, -bw / 2, -bh / 2, bw, bh, { from: T.color, fromAlpha: 1, mid: 0x161a33, midAlpha: 0.95, to: T.color, toAlpha: 0.9, radius: 22, glow: true, stroke: 0xffd23f, strokeAlpha: 1, strokeWidth: 3, sheen: 0.2 }));
    // fitas laterais
    const rib = this.add.graphics();
    rib.fillStyle(0xffd23f, 1);
    rib.fillRect(-bw / 2, -bh / 2 + 54, bw, 4);
    rib.fillRect(-bw / 2, bh / 2 - 58, bw, 4);
    box.add(rib);
    box.add(this.add.image(-bw / 2 + 52, -bh / 2 + 30, 'logoQflBowlS').setDisplaySize(44, 44));
    box.add(this.add.image(bw / 2 - 52, -bh / 2 + 30, 'logoQflBowlS').setDisplaySize(44, 44));
    box.add(title(this, 0, -bh / 2 + 30, 'QFL BOWL', 12, '#FFD23F').setOrigin(0.5));
    box.add(this.add.image(0, -14, logoKey(T.id, 'l')).setDisplaySize(124, 124));
    box.add(
      this.add
        .text(0, 74, 'CAMPEÕES!', { fontFamily: FONT_TITLE, fontSize: '24px', color: '#FFD23F', stroke: '#0D0D12', strokeThickness: 7, shadow: { offsetX: 3, offsetY: 4, color: '#0D0D12', fill: true, stroke: true } })
        .setOrigin(0.5),
    );
    const nm = title(this, 0, bh / 2 - 30, T.name, 12, '#FFFFFF').setOrigin(0.5);
    if (nm.width > bw - 40) nm.setScale((bw - 40) / nm.width);
    box.add(nm);
    const s = this.state;
    box.add(label(this, 0, bh / 2 - 12, `${TEAMS.home.abbr} ${s.score.home} x ${s.score.away} ${TEAMS.away.abbr}`, 8, '#E8EAF2').setOrigin(0.5));
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 520, ease: 'Back.Out' });
    this.tweens.add({ targets: box, angle: { from: -1.5, to: 1.5 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 520 });
    this.ui.burst(80);
    this.world.stand.cheer(1);
    c.banner = box;
  }

  private endChampion() {
    const c = this.champ;
    if (!c) return;
    this.champ = null;
    c.banner?.destroy();
    this.trophyG?.destroy();
    this.trophyG = null;
    c.confetti?.stop();
    if (c.confetti) this.time.delayedCall(5500, () => c.confetti?.destroy());
    for (const p of c.players) {
      p.hop = 0;
      p.angle = 0;
      p.sx = p.sy = 1;
      p.faceFront(this, false);
    }
    this.phase = 'post';
    c.done();
  }

  /** Fim de jogo: placar final, estatísticas e novo jogo. */
  private showFinal() {
    const s = this.state;
    const h = s.score.home;
    const a = s.score.away;
    const win = h > a;
    if (win) {
      this.ui.burst(90);
      this.fansGood(1, 2, 'cheerBig', 5);
    } else if (h < a && this.hostile) {
      // perdemos fora de casa: a casa comemora
      this.world.stand.cheer(1);
      sfx.crowd('cheerBig', 5);
    }
    this.playXp = 0;
    this.gainXp(win ? 150 : 50);
    const st = s.stats;
    if (this.career) finishCareerMatch({ us: h, them: a, stats: { ...st }, xp: s.xp, confidence: s.confidence });
    if (finalGame.on && h !== a && !this.champShown) {
      this.champShown = true;
      return this.championCelebration(h > a ? 'home' : 'away', () => this.showFinal());
    }
    this.hud.setBar('result');
    this.hud.refresh();
    this.showCard({
      big: win ? 'VITÓRIA!' : h < a ? 'DERROTA' : 'EMPATE',
      bigColor: win ? UI.yellow : '#FFFFFF',
      bigShadow: win ? '#0D0D12' : '#B3262B',
      bigSize: 28,
      chip: `${TEAMS.home.abbr} ${h} x ${a} ${TEAMS.away.abbr}`,
      chipBg: win ? TEAMS.home.color : TEAMS.away.color,
      chipFg: win ? TEAMS.home.fg : TEAMS.away.fg,
      header: this.career ? 'FIM DE JOGO · PROGRESSO SALVO ✓' : 'FIM DE JOGO',
      head: `${st.comp}/${st.att} · ${st.yards} JDS`,
      sub: `${st.td} TD · ${st.int} INT`,
      stats: this.statsRow(),
      bar: this.xpBar(),
      teamColor: TEAMS.home.color,
      ...(this.career
        ? { next: () => this.toMenu(), nextLabel: 'CONTINUAR' }
        : { replay: () => this.toMenu(), replayLabel: 'MENU', next: () => this.newGame(), nextLabel: 'NOVO JOGO' }),
    });
  }

  private newGame() {
    const s = this.state;
    const xp = s.xp;
    Object.assign(s, new GameState());
    s.xp = xp;
    s.score = { home: 0, away: 0 };
    s.quarter = 1;
    s.clock = QUARTER_SECONDS;
    s.down = 1;
    s.distance = 10;
    s.los = 25;
    this.gameOver = false;
    this.ot = null;
    this.champShown = false;
    this.card.hide();
    this.defenseScreen.close();
    if (this.practice) {
      // Treino: zera as estatísticas e volta para a linha
      s.los = PRACTICE_LOS;
      this.practiceStats = { plays: 0, hits: 0, sum: 0, combo: 0, yards: 0, best: 0 };
      this.live = null;
      this.ctl = null;
      this.liveUi.show('none');
      this.backToPreSnap();
      return;
    }
    this.startIntro();
  }

  /** Toque na tela durante o resultado: pula a espera. */
  private finishPost() {
    if (this.phase === 'post' && this.postTimer < 1.2) this.postTimer = 0;
  }

  private backToPreSnap() {
    if (this.gameOver) {
      this.hud.refresh();
      return this.overtimeNeeded() ? this.startOvertime() : this.showFinal();
    }
    this.card.hide();
    this.menu.hide();
    this.kickUi.show(false);
    this.kick = null;
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
    if (this.state.down === 4 && !this.twoPt) this.fourthDown();
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
    if (this.phase === 'kickoff') {
      const dt = this.game.loop.delta / 1000;
      for (const d of this.dust) {
        d.life -= dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const q = proj.project(d.x, d.y, 0.2 + (0.7 - d.life) * 0.6);
        g.fillStyle(0xd8c9a0, Math.max(0, Math.min(1, d.life * 1.6)));
        g.fillRect(q.x - 2, q.y - 2, 3 + q.s * 3, 3 + q.s * 3);
      }
      this.dust = this.dust.filter((d) => d.life > 0);
      return;
    }
    if (this.phase !== 'live' && this.phase !== 'post') return;
    if (this.kick && this.phase === 'post') return;
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

    // Treino de QB: alvo no gramado em volta de cada recebedor (borda branca, anel amarelo, centro vermelho)
    if (this.practice === 'qb' && live.phase !== 'carry') {
      for (const r of this.receivers) {
        groundRing(g, proj, r.p.x, r.p.y, TARGET_R, 0.22, 0xffffff, 0.95);
        groundRing(g, proj, r.p.x, r.p.y, TARGET_R * 0.66, 0.22, 0xffd23f, 0.95);
        groundRing(g, proj, r.p.x, r.p.y, TARGET_R * 0.33, 0.22, 0xff3b3b, 0.95);
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
