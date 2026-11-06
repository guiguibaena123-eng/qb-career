import Phaser from 'phaser';
import { isDome, STAND_NAMES, stadiumOf } from '../data/stadiums';
import { stadiumPhoto, stadiumSlot } from '../ui/stadiumPhoto';
import { type SkyWeather, type TimeChoice, type TimeOfDay } from '../systems/daytime';
import { GAME_H, GAME_W, applyMatchup, broadcast, finalGame, getFavorite, logoKey, matchRecords, setFavorite, playoffLogo, matchConfig, saveMatchConfig, venue, type PrimeKey, type WeatherChoice } from '../config';
import { PRIME } from '../career/season';
import { ROUND_INFO } from '../career/playoffs';
import { TeamRepository, type KitDef } from '../data/TeamRepository';
import { PlayerBody } from '../player/PlayerBody';
import { DEFAULT_LOOK, peekSlot, SLOT_COUNT } from '../player/PlayerSave';
import { TEAM_LIST, autoUniform, teamById, uiColor, uniformsOf, type TeamDef, type Uniform } from '../data/teams';
import { difficulty, LEVELS, type Level } from '../systems/difficulty';
import { setupHiRes } from '../systems/hires';
import { arrowAfter, C, feed, FONT_TV, inkOn, onInk, underline, plate, plateShadow, scoreBug, sectionHead, slideIn, ticker, TV, tvEnter, TvButton, tvText, wipe, wipeTo } from '../ui/tv';
import { fontWarmJobs } from '../systems/perf';
import { music } from '../systems/music';
import { sfx } from '../systems/sfx';
import { MatchScene } from './MatchScene';

/*
 * Menu principal e Partida Rápida, no pacote gráfico de TRANSMISSÃO (ui/tv.ts):
 *   ABERTURA  → chamada do programa sobre o estádio do seu time; tarjas PARTIDA RÁPIDA · CARREIRA · TREINO
 *   CONFRONTO → "tale of the tape" dos dois times, local da partida e uniformes
 *   DETALHES  → estádio (imagem ao vivo), clima, horário e dificuldade
 *   ESCOLHER  → grade com os 32 times
 * Toda troca de tela passa pela vinheta. Ao jogar, aplica as escolhas e cria uma partida nova.
 */

let matchCounter = 0;
/** Parâmetros de depuração só valem na primeira abertura (depois o menu aparece normal). */
let booted = false;

const hexOf = (css: string) => parseInt(css.slice(1), 16);
type View = 'home' | 'setup' | 'details' | 'pickHome' | 'pickAway' | 'pickStand' | 'practice' | 'favorite' | 'settings';

export class MainMenu extends Phaser.Scene {
  private view: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Container | null = null;
  private bgTeam = '';
  private level: Level = 'normal';
  private current: View = 'home';

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
    this.bg = null;
    this.bgTeam = '';
    // ?tela=partida|detalhes|times|treino abre direto numa tela (para testes)
    // Primeira abertura: escolher o time do coração antes da página inicial
    const start = ({ partida: 'setup', detalhes: 'details', times: 'pickHome', treino: 'practice', favorito: 'favorite', config: 'settings' } as Record<string, View>)[q.get('tela') ?? ''] ?? (getFavorite() ? 'home' : 'favorite');
    this.render(start);
    tvEnter(this);
  }

  // ------------------------------------------------------------ navegação

  private homeColor() {
    return uiColor(teamById(matchConfig.home));
  }

  /** Vai para outra tela passando pela vinheta. */
  private go(v: View) {
    wipe(this, () => this.render(v), this.homeColor());
  }

  private render(v: View) {
    this.current = v;
    this.view?.destroy();
    this.view = this.add.container(0, 0);
    // Imagem ao vivo: o estádio onde a partida vai acontecer
    const bgTeam = v === 'details' || v === 'pickStand' ? this.hostId() : matchConfig.home;
    if (bgTeam !== this.bgTeam) {
      this.bg?.destroy();
      this.bg = feed(this, bgTeam, v === 'home' ? 0.42 : 0.72);
      this.bgTeam = bgTeam;
    }
    const draw: Record<View, () => void> = {
      home: () => this.home(),
      setup: () => this.setup(),
      details: () => this.details(),
      pickHome: () => this.picker('home'),
      pickAway: () => this.picker('away'),
      pickStand: () => this.picker('stand'),
      practice: () => this.practiceMenu(),
      favorite: () => this.picker('fav'),
      settings: () => this.settings(),
    };
    draw[v]();
  }

  private teams(): [TeamDef, TeamDef] {
    return [teamById(matchConfig.home), teamById(matchConfig.away)];
  }

  // ------------------------------------------------------------ abertura

  private home() {
    const W = GAME_W;
    const H = GAME_H;
    const v = this.view!;
    const [h, a] = this.teams();
    const hc = uiColor(h);
    v.add(scoreBug(this, { title: 'QB CAREER', step: 'QFL', team: { abbr: h.abbr, color: hc } }));

    // Chamada do programa: QB numa placa amarela, CAREER enorme numa placa de tinta
    const lock = this.add.container(0, 0);
    const g = this.add.graphics();
    plateShadow(g, 20, 104, 138, 92);
    plate(g, 20, 104, 138, 92, TV.yellow, 1, false, true);
    plateShadow(g, 20, 190, 306, 84);
    plate(g, 20, 190, 306, 84, TV.ink, 0.92, false, true);
    g.fillStyle(hc, 1);
    g.fillRect(20, 274, 254, 6);
    lock.add(g);
    lock.add(tvText(this, 30, 153, 'QB', 98, C.ink, 800, -2).setOrigin(0, 0.5));
    const career = tvText(this, 32, 233, 'CAREER', 88, C.white, 800, 1).setOrigin(0, 0.5);
    if (career.width > 282) career.setScale(282 / career.width);
    lock.add(career);
    lock.add(tvText(this, 22, 300, 'DO COMBINE AO QFL BOWL', 16, C.white, 700, 2.4).setOrigin(0, 0.5));
    v.add(lock);
    slideIn(this, [lock], 0, 60);

    // Time do coração: tocar troca (ele vem pronto na Partida Rápida)
    const fv = teamById(getFavorite() ?? matchConfig.home);
    const fc = uiColor(fv);
    const favB = new TvButton(this, 20 + 116, 352, { w: 232, h: 48, fill: TV.ink, fillAlpha: 0.92 });
    const fb = this.add.graphics();
    plate(fb, -116, -24, 48, 48, fc, 1, true, true);
    favB.add(fb);
    favB.add(this.add.image(-92, 0, logoKey(fv.id, 's')).setDisplaySize(30, 30));
    favB.add(tvText(this, -56, -10, 'SEU TIME', 11, C.muted, 700, 1.6).setOrigin(0, 0.5));
    const fn = tvText(this, -56, 9, fv.name, 18, C.white, 800, 0.6).setOrigin(0, 0.5);
    if (fn.width > 140) fn.setScale(140 / fn.width, 1);
    favB.add(fn);
    const fa = this.add.graphics();
    fa.lineStyle(2.5, TV.yellow, 1);
    fa.beginPath();
    fa.moveTo(96, -7);
    fa.lineTo(103, 0);
    fa.lineTo(96, 7);
    fa.strokePath();
    favB.add(fa);
    favB.onTap = () => this.go('favorite');
    v.add(favB);
    slideIn(this, [favB], 0, 120);

    // O astro da transmissão: o QB com o uniforme do seu time
    const u = uniformsOf(h)[matchConfig.homeUni];
    const star = new PlayerBody(this, W - 62, 418, this.bodyCfg(u, 12), 0.62);
    v.add(star);
    slideIn(this, [star], 0, 180);

    // Tarjas
    const bw = W - 32;
    const quick = this.tarja(16 + bw / 2, 478, bw, 92, {
      color: hc,
      title: 'PARTIDA RÁPIDA',
      sub: 'TIMES, LOCAL E CLIMA',
      logo: logoKey(h.id, 'm'),
      vs: logoKey(a.id, 'm'),
      primary: true,
    });
    quick.onTap = () => this.go('setup');

    const saves = Array.from({ length: SLOT_COUNT }, (_, i) => peekSlot(i + 1)).filter((s) => !!s);
    const last = saves.sort((x, y) => (y!.updated ?? 0) - (x!.updated ?? 0))[0];
    const lastTeam = last?.draft ? TeamRepository.get(last.career.teamId ?? last.draft.teamId) : null;
    const car = this.tarja(16 + bw / 2, 574, bw, 74, {
      color: TV.yellow,
      title: 'CARREIRA',
      sub: last ? `CONTINUAR · ${last.name}${lastTeam ? ` · ${lastTeam.name}` : ''}` : 'CRIE SEU QB E LEVE ATÉ O TÍTULO',
      logo: 'logoQflBowlS',
    });
    car.onTap = () => wipeTo(this, 'CareerSlots', hc);

    const pr = this.tarja(16 + bw / 2, 656, bw, 74, {
      color: TV.green,
      title: 'TREINO LIVRE',
      sub: 'PASSE NOS ALVOS · CORRIDA SEM DEFESA',
      icon: 'target',
    });
    pr.onTap = () => this.go('practice');
    v.add([quick, car, pr]);

    // Configurações: música e dificuldade
    const cfg = this.tarja(16 + bw / 2, 736, bw, 60, {
      color: 0x93a0b6,
      title: 'CONFIGURAÇÕES',
      sub: `MÚSICA ${music.on ? 'ON' : 'OFF'} · EFEITOS ${sfx.on ? 'ON' : 'OFF'} · ${LEVELS[this.level].label}`,
      icon: 'gear',
    });
    cfg.onTap = () => this.go('settings');
    v.add(cfg);
    slideIn(this, [quick, car, pr, cfg], 55, 140);

    v.add(
      ticker(this, H - 30, [
        `PARTIDA RÁPIDA: ${h.name} × ${a.name}`,
        'NA PARTIDA, PUXE E SOLTE PARA PASSAR',
        'CARREIRA: COMBINE, DRAFT E TEMPORADAS SEM FIM',
        'FUNCIONA SEM INTERNET',
        'ATÉ 3 CARREIRAS SALVAS',
      ]),
    );
    this.warmUniforms();
  }

  /**
   * Prepara, aos poucos e escondido, os bonecos dos uniformes da Partida Rápida (um a cada poucos
   * quadros, depois que a abertura terminou de entrar). Montar essas imagens pela primeira vez
   * travava a tela da Partida Rápida por ~0,5 s; com elas prontas, a tela abre lisa.
   */
  private warmUniforms() {
    const jobs: (() => void)[] = fontWarmJobs(FONT_TV, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30], [600, 700, 800]);
    for (const side of ['home', 'away'] as const) {
      const t = teamById(side === 'home' ? matchConfig.home : matchConfig.away);
      uniformsOf(t).forEach((u) => jobs.push(() => new PlayerBody(this, -500, -500, this.bodyCfg(u, side === 'home' ? 12 : 21), 0.27).destroy()));
    }
    const view = this.view;
    const next = () => {
      const job = jobs.shift();
      if (!job || this.view !== view || this.current !== 'home') return;
      job();
      this.time.delayedCall(90, next);
    };
    this.time.delayedCall(900, next);
  }

  // ------------------------------------------------------------ configurações

  private settings() {
    const v = this.view!;
    const [h] = this.teams();
    v.add(scoreBug(this, { title: 'CONFIGURAÇÕES', step: 'AJUSTES', onBack: () => this.go('home'), team: { abbr: h.abbr, color: uiColor(h) } }));

    // ---- som
    let y = 104;
    v.add(sectionHead(this, 16, y, 'SOM'));
    v.add(this.segments(y + 46, 'MÚSICA', ['LIGADA', 'DESLIGADA'], music.on ? 0 : 1, (i) => music.setEnabled(i === 0)));
    v.add(this.segments(y + 100, 'EFEITOS', ['LIGADOS', 'DESLIGADOS'], sfx.on ? 0 : 1, (i) => sfx.setEnabled(i === 0)));
    v.add(tvText(this, 18, y + 140, 'EFEITOS: TORCIDA, JOGADORES, BOLA E APITO DURANTE A PARTIDA', 13, C.muted, 600, 0.8).setOrigin(0, 0.5));

    // ---- jogo
    y = 290;
    v.add(sectionHead(this, 16, y, 'JOGO', 'PARTIDA RÁPIDA E CARREIRA'));
    const ORDER: Level[] = ['easy', 'normal', 'hard'];
    const DESC: Record<Level, string> = {
      easy: 'DEFESA MAIS LENTA · MAIS TEMPO NO POCKET · −20% DE XP',
      normal: 'O JOGO COMO FOI PENSADO',
      hard: 'DEFESA MAIS RÁPIDA · MENOS TEMPO NO POCKET · +40% DE XP',
    };
    const desc = tvText(this, 18, y + 86, DESC[this.level], 13, C.muted, 600, 0.8).setOrigin(0, 0.5);
    v.add(
      this.segments(y + 46, 'DIFICULDADE', ORDER.map((l) => LEVELS[l].label), ORDER.indexOf(this.level), (i) => {
        this.level = ORDER[i];
        difficulty.set(this.level);
        desc.setText(DESC[this.level]);
      }),
    );
    v.add(desc);

    // ---- sobre
    y = 434;
    v.add(sectionHead(this, 16, y, 'SOBRE'));
    const facts: [string, string][] = [
      ['SAVES', 'ATÉ 3 CARREIRAS, GUARDADAS NESTE APARELHO'],
      ['OFFLINE', 'DEPOIS DA PRIMEIRA ABERTURA, JOGA SEM INTERNET'],
      ['TRILHA', '11 FAIXAS EMBARALHADAS COM TRANSIÇÃO SUAVE'],
      ['SONS', 'GRAVAÇÕES REAIS DE ESTÁDIO E DE CAMPO · CC0'],
    ];
    const g = this.add.graphics();
    facts.forEach(([k, t], i) => {
      const fy = y + 32 + i * 54;
      plate(g, 16, fy, GAME_W - 32, 46, TV.ink2, 0.92);
      plate(g, 16, fy, 96, 46, TV.ink3, 1);
      v.add(tvText(this, 64, fy + 23, k, 14, C.yellow, 800, 1.2).setOrigin(0.5));
      const ft = tvText(this, 124, fy + 23, t, 14, C.white, 700, 0.6).setOrigin(0, 0.5);
      if (ft.width > GAME_W - 32 - 120) ft.setScale((GAME_W - 32 - 120) / ft.width, 1);
      v.add(ft);
    });
    v.addAt(g, 0);
    v.add(ticker(this, GAME_H - 30, ['CONFIGURAÇÕES FICAM SALVAS NO APARELHO', 'A DIFICULDADE VALE PARA PARTIDA RÁPIDA E CARREIRA', 'NO IPHONE, A CHAVE DE SILENCIOSO TAMBÉM DESLIGA A MÚSICA']));
  }

  /** Tarja do menu: bloco de cor com logo/ícone, título e linha de apoio, seta à direita. */
  private tarja(x: number, y: number, w: number, h: number, o: { color: number; title: string; sub: string; logo?: string; icon?: 'target' | 'gear'; primary?: boolean; vs?: string }) {
    const b = new TvButton(this, x, y, { w, h, fill: o.primary ? o.color : TV.plate, fillAlpha: 1, primary: o.primary });
    const fg = o.primary ? inkOn(o.color) : C.ink;
    const bwid = h * 0.9;
    const x0 = -w / 2;
    if (!o.primary) {
      const blk = this.add.graphics();
      plate(blk, x0, -h / 2, bwid, h, o.color, 1, true, true);
      b.add(blk);
    }
    const cx = x0 + bwid / 2 + 2;
    if (o.logo && this.textures.exists(o.logo)) b.add(this.add.image(cx, 0, o.logo).setDisplaySize(h * 0.62, h * 0.62));
    if (o.icon === 'target') {
      const ic = this.add.graphics();
      ic.lineStyle(3, TV.ink, 1);
      ic.strokeCircle(cx, 0, 17);
      ic.strokeCircle(cx, 0, 9);
      ic.fillStyle(TV.ink, 1);
      ic.fillCircle(cx, 0, 3);
      b.add(ic);
    }
    if (o.icon === 'gear') {
      // engrenagem: 8 dentes em volta de um anel
      const ic = this.add.graphics();
      ic.fillStyle(TV.ink, 1);
      const r = h * 0.2;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const tw = r * 0.32;
        const r0 = r * 0.8;
        const r1 = r * 1.38;
        ic.fillPoints(
          [
            { x: cx + ca * r0 - sa * tw, y: sa * r0 + ca * tw },
            { x: cx + ca * r1 - sa * tw * 0.8, y: sa * r1 + ca * tw * 0.8 },
            { x: cx + ca * r1 + sa * tw * 0.8, y: sa * r1 - ca * tw * 0.8 },
            { x: cx + ca * r0 + sa * tw, y: sa * r0 - ca * tw },
          ] as Phaser.Math.Vector2[],
          true,
        );
      }
      ic.fillCircle(cx, 0, r);
      ic.fillStyle(o.color, 1);
      ic.fillCircle(cx, 0, r * 0.42);
      b.add(ic);
    }
    const tx = x0 + bwid + 16;
    const tt = tvText(this, tx, o.primary ? -14 : -11, o.title, o.primary ? 30 : 25, fg, 800, 0.8).setOrigin(0, 0.5);
    const troom = w / 2 - (o.vs ? 104 : 40) - tx;
    if (tt.width > troom) tt.setScale(troom / tt.width, 1);
    b.add(tt);
    const sub = tvText(this, tx, o.primary ? 18 : 16, o.sub, 14, o.primary ? fg : C.inkSoft, 600, 0.9).setOrigin(0, 0.5);
    const room = w / 2 - (o.vs ? 84 : 34) - tx;
    if (sub.width > room) sub.setScale(Math.max(0.72, room / sub.width), 1);
    if (o.primary) sub.setAlpha(0.82);
    b.add(sub);
    // seta
    const ar = this.add.graphics();
    if (o.vs && this.textures.exists(o.vs)) {
      // adversário: placa de tinta segurando o escudo, com o × na diagonal
      const vb = this.add.graphics();
      plate(vb, w / 2 - 98, -h / 2 + 12, 62, h - 24, TV.ink, 0.9);
      b.add(vb);
      b.add(this.add.image(w / 2 - 67, 0, o.vs).setDisplaySize(44, 44));
    }
    ar.lineStyle(3, hexOf(fg), 1);
    ar.beginPath();
    ar.moveTo(w / 2 - 30, -8);
    ar.lineTo(w / 2 - 22, 0);
    ar.lineTo(w / 2 - 30, 8);
    ar.strokePath();
    b.add(ar);
    return b;
  }

  /** Controle segmentado: rótulo + placas lado a lado; a escolhida fica amarela. */
  private segments(y: number, name: string, items: string[], sel: number, pick: (i: number) => void, h = 44) {
    const W = GAME_W;
    const c = this.add.container(0, 0);
    const lab = tvText(this, 18, y, name, 14, C.muted, 700, 1.4).setOrigin(0, 0.5);
    c.add(lab);
    const x0 = 18 + lab.width + 12;
    const sw = (W - 16 - x0 - (items.length - 1) * 4) / items.length;
    const btns: TvButton[] = [];
    const texts: Phaser.GameObjects.Text[] = [];
    let ring: Phaser.GameObjects.Graphics | null = null;
    const paint = (s: number) => {
      btns.forEach((b, i) => {
        b.setFill(i === s ? TV.ink3 : TV.ink2, 1);
        texts[i].setColor(i === s ? C.yellow : C.white);
      });
      ring?.destroy();
      ring = this.mark(c, x0 + sw / 2 + s * (sw + 4), y, sw, h);
    };
    items.forEach((it, i) => {
      const b = new TvButton(this, x0 + sw / 2 + i * (sw + 4), y, { w: sw, h, fill: TV.ink2, fillAlpha: 1 });
      const t = tvText(this, 0, 0, it, 16, C.white, 800, 1).setOrigin(0.5);
      b.add(t);
      texts.push(t);
      b.onTap = () => {
        paint(i);
        pick(i);
      };
      btns.push(b);
      c.add(b);
    });
    paint(sel);
    return c;
  }

  /** A marca da escolha: o telestrador circula a opção (dentro da placa dela). */
  private mark(into: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number) {
    const g = underline(this, x - 2, y + h / 2 - 3, w - 34);
    into.add(g);
    return g;
  }

  /** Grupo de opções (clima, horário, dificuldade, local): a escolhida fica circulada. */
  private choice(btns: TvButton[], texts: Phaser.GameObjects.Text[], pos: { x: number; y: number; w: number; h: number }[]) {
    let ring: Phaser.GameObjects.Graphics | null = null;
    return (sel: number) => {
      btns.forEach((b, i) => {
        b.setFill(i === sel ? TV.ink3 : TV.ink2, 1);
        texts[i].setColor(i === sel ? C.yellow : C.white);
      });
      ring?.destroy();
      ring = sel >= 0 ? this.mark(this.view!, pos[sel].x, pos[sel].y, pos[sel].w, pos[sel].h) : null;
    };
  }

  // ------------------------------------------------------------ partida rápida: confronto

  /** Kit e visual do corpo (PlayerBody) a partir de um uniforme da Partida Rápida. */
  private bodyCfg(u: Uniform, number: number) {
    const j = hexOf(u.jersey);
    const tr = hexOf(u.trim);
    const kit: KitDef = { helmet: hexOf(u.helmet), jersey: j, number: hexOf(u.num), pants: hexOf(u.pants), stripe: tr, pstripe: 'side2' };
    const look = { ...DEFAULT_LOOK, sockC: hexOf(u.sock), sstripeC: tr, underC: j, gloveC: tr, caccC: tr, mouthC: tr, maskC: 0xc9ceda };
    return { look, kit, face: { face: 6, skin: 4, hair: -1, hairColor: 0, beard: -1 }, number };
  }

  /** Estádio da partida: o do mandante (casa ou fora) ou o de outro time escolhido. */
  private hostId() {
    if (matchConfig.side === 'final') return matchConfig.standTeam ?? matchConfig.home;
    return matchConfig.standTeam ?? (matchConfig.side === 'away' ? matchConfig.away : matchConfig.home);
  }

  private setup() {
    const W = GAME_W;
    const v = this.view!;
    const [h, a] = this.teams();
    v.add(scoreBug(this, { title: 'PARTIDA RÁPIDA', step: '1 DE 2', onBack: () => this.go('home'), team: { abbr: h.abbr, color: uiColor(h) } }));

    // ---- tale of the tape: os dois times frente a frente
    const top = 66;
    const ph = 222;
    const mid = W / 2;
    const sk = 22;
    const panel = (side: 'home' | 'away') => {
      const t = side === 'home' ? h : a;
      const col = uiColor(t);
      const fg = inkOn(col);
      const pts = side === 'home'
        ? [[0, top], [mid + sk - 3, top], [mid - sk - 3, top + ph], [0, top + ph]]
        : [[mid + sk + 3, top], [W, top], [W, top + ph], [mid - sk + 3, top + ph]];
      const g = this.add.graphics();
      g.fillStyle(col, 1);
      g.fillPoints(pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
      // faixa diagonal mais escura
      g.fillStyle(0x000000, 0.14);
      const sx = side === 'home' ? 0 : mid + 20;
      g.fillPoints([[sx, top + ph * 0.72], [sx + W / 2 - 18, top + ph * 0.72], [sx + W / 2 - 18 - sk * 0.56, top + ph], [sx, top + ph]].map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
      v.add(g);
      const cx = side === 'home' ? W * 0.25 - 6 : W * 0.75 + 6;
      if (side === 'home') {
        const chip = this.add.graphics();
        plate(chip, 10, top + 10, 74, 22, TV.plate);
        v.add(chip);
        v.add(tvText(this, 46, top + 21, 'SEU TIME', 13, C.ink, 800, 1).setOrigin(0.5));
      }
      v.add(this.add.image(cx, top + 82, logoKey(t.id, 'l')).setDisplaySize(92, 92));
      const nm = tvText(this, cx, top + 146, t.name, 22, fg, 800, 0.6).setOrigin(0.5);
      if (nm.width > W / 2 - 46) nm.setScale((W / 2 - 46) / nm.width);
      v.add(nm);
      const ovr = tvText(this, cx + 2, top + 180, String(t.ovr), 36, fg, 800, 0).setOrigin(0, 0.5);
      v.add(tvText(this, cx - 2, top + 182, 'OVR', 14, fg, 700, 1.5).setOrigin(1, 0.5).setAlpha(0.8));
      v.add(ovr);
      const tr = tvText(this, cx, top + ph - 12, 'TROCAR', 13, fg, 700, 1.5).setOrigin(0.5).setAlpha(0.75);
      v.add([tr, arrowAfter(this, tr, fg)]);
      const z = this.add.zone(side === 'home' ? 0 : mid, top, W / 2, ph).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => navigator.vibrate?.(8));
      z.on('pointerup', () => this.go(side === 'home' ? 'pickHome' : 'pickAway'));
      v.add(z);
    };
    panel('home');
    panel('away');
    // selo do meio: VS, @ (fora) ou o QFL Bowl
    const vs = this.add.graphics();
    plateShadow(vs, mid - 26, top + 96, 52, 34);
    plate(vs, mid - 26, top + 96, 52, 34, TV.yellow);
    v.add(vs);
    v.add(tvText(this, mid, top + 113, matchConfig.side === 'away' ? '@' : matchConfig.side === 'final' ? 'FINAL' : 'VS', matchConfig.side === 'final' ? 15 : 22, C.ink, 800, 0.5).setOrigin(0.5));

    // ---- comparação (barras que saem do meio)
    const ty = top + ph + 12;
    const tg = this.add.graphics();
    tg.fillStyle(TV.ink, 0.9);
    tg.fillRect(0, ty, W, 76);
    v.add(tg);
    const rows: [string, number, number][] = [
      ['ATAQUE', h.atk, a.atk],
      ['DEFESA', h.def, a.def],
      ['ESPECIAIS', h.esp, a.esp],
    ];
    rows.forEach(([n, x1, x2], i) => {
      const y = ty + 14 + i * 24;
      const len = (val: number) => Math.max(4, ((val - 50) / 50) * (W / 2 - 96));
      const bars = this.add.graphics();
      bars.fillStyle(onInk(uiColor(h)), x1 >= x2 ? 1 : 0.5);
      bars.fillRect(mid - 46 - len(x1), y - 4, len(x1), 8);
      bars.fillStyle(onInk(uiColor(a)), x2 >= x1 ? 1 : 0.5);
      bars.fillRect(mid + 46, y - 4, len(x2), 8);
      v.add(bars);
      v.add(tvText(this, mid, y, n, 12, C.muted, 700, 1.4).setOrigin(0.5));
      v.add(tvText(this, 14, y, String(x1), 17, x1 >= x2 ? C.white : C.dim, 800).setOrigin(0, 0.5));
      v.add(tvText(this, W - 14, y, String(x2), 17, x2 >= x1 ? C.white : C.dim, 800).setOrigin(1, 0.5));
    });

    // ---- local da partida
    const ly = ty + 76 + 26;
    v.add(sectionHead(this, 16, ly, 'LOCAL'));
    const lw = (W - 32 - 8) / 3;
    (['home', 'away', 'final'] as const).forEach((sd, i) => {
      const on = matchConfig.side === sd;
      const host = teamById(sd === 'away' ? matchConfig.away : matchConfig.home);
      const bx = 16 + lw / 2 + i * (lw + 4);
      const b = new TvButton(this, bx, ly + 40, { w: lw, h: 50, fill: on ? TV.ink3 : TV.ink2, fillAlpha: 1 });
      const fg = on ? C.yellow : C.white;
      const hd = tvText(this, -lw / 2 + 16, -8, sd === 'home' ? 'CASA' : sd === 'away' ? 'FORA' : 'QFL BOWL', 18, fg, 800, 0.8).setOrigin(0, 0.5);
      const room = sd === 'final' ? lw - 58 : lw - 28;
      if (hd.width > room) hd.setScale(room / hd.width, 1);
      b.add(hd);
      const sn = sd === 'final' ? 'A GRANDE FINAL' : TeamRepository.get(host.id).stadium.name;
      const st = tvText(this, -lw / 2 + 16, 12, sn, 12, C.muted, 600, 0.4).setOrigin(0, 0.5);
      if (st.width > lw - 28) st.setScale((lw - 28) / st.width, 1);
      b.add(st);
      if (sd === 'final' && this.textures.exists('logoQflBowlS')) b.add(this.add.image(lw / 2 - 20, -12, 'logoQflBowlS').setDisplaySize(22, 22));
      b.onTap = () => {
        matchConfig.side = sd;
        matchConfig.standTeam = null;
        this.time.delayedCall(20, () => this.render('setup'));
      };
      v.add(b);
      if (on) this.mark(v, bx, ly + 40, lw, 50);
    });

    // ---- uniformes
    const uy = ly + 90;
    const auto = matchConfig.awayUni === null;
    v.add(sectionHead(this, 16, uy, 'UNIFORMES', auto ? 'ADVERSÁRIO NO AUTOMÁTICO' : 'TOQUE AQUI: AUTOMÁTICO'));
    if (!auto) {
      const z = this.add.zone(W - 200, uy - 16, 184, 32).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        matchConfig.awayUni = null;
        this.render('setup');
      });
      v.add(z);
    }
    this.uniformRow(v, 'home', uy + 16);
    this.uniformRow(v, 'away', uy + 16 + 118);

    // ---- próximo
    const next = new TvButton(this, W / 2, GAME_H - 44, { w: W - 32, h: 58, fill: TV.yellow, fillAlpha: 1, primary: true });
    next.add(tvText(this, -(W - 32) / 2 + 22, 0, 'PRÓXIMO', 26, C.ink, 800, 1).setOrigin(0, 0.5));
    const nx = tvText(this, (W - 32) / 2 - 30, 0, 'CLIMA E ESTÁDIO', 16, C.ink, 700, 1).setOrigin(1, 0.5);
    next.add(nx);
    next.add(arrowAfter(this, nx, C.ink));
    next.onTap = () => this.go('details');
    v.add(next);
  }

  /** Fileira com os 3 uniformes de um time, cada um vestido num corpo de jogador. */
  private uniformRow(v: Phaser.GameObjects.Container, side: 'home' | 'away', y: number) {
    const W = GAME_W;
    const t = teamById(side === 'home' ? matchConfig.home : matchConfig.away);
    const ups = uniformsOf(t);
    const homeJersey = hexOf(uniformsOf(teamById(matchConfig.home))[matchConfig.homeUni].jersey);
    const auto = side === 'away' && matchConfig.awayUni === null;
    const sel = side === 'home' ? matchConfig.homeUni : (matchConfig.awayUni ?? autoUniform(t, homeJersey));
    const bh = 110;
    // bloco do time (cor + logo) à esquerda
    const tg = this.add.graphics();
    plate(tg, 16, y, 40, bh, uiColor(t), 1, false, true);
    v.add(tg);
    v.add(this.add.image(33, y + bh / 2 - 12, logoKey(t.id, 's')).setDisplaySize(26, 26));
    v.add(tvText(this, 33, y + bh / 2 + 18, t.abbr, 13, inkOn(uiColor(t)), 800, 0.5).setOrigin(0.5));
    const x0 = 60;
    const bw = (W - 16 - x0 - 8) / 3;
    ups.forEach((u, i) => {
      const on = i === sel;
      const bx = x0 + bw / 2 + i * (bw + 4);
      const b = new TvButton(this, bx, y + bh / 2, { w: bw, h: bh, fill: on ? TV.ink3 : TV.ink2, fillAlpha: 1 });
      const fl = this.add.graphics();
      fl.fillStyle(0x000000, 0.4);
      fl.fillEllipse(0, bh / 2 - 24, bw * 0.5, 7);
      b.add(fl);
      b.add(new PlayerBody(this, 0, bh / 2 - 24, this.bodyCfg(u, side === 'home' ? 12 : 21), 0.27));
      const nm = on && auto ? `${u.name} · AUTO` : u.name;
      b.add(tvText(this, 0, bh / 2 - 11, nm, 12, on ? C.yellow : C.muted, 700, 1).setOrigin(0.5));
      b.onTap = () => {
        if (side === 'home') matchConfig.homeUni = i;
        else matchConfig.awayUni = i;
        this.time.delayedCall(20, () => this.render('setup'));
      };
      v.add(b);
      if (on) {
        b.setBorder(TV.yellow, 1);
        v.add(underline(this, bx, y + bh - 4, Math.min(bw - 24, 64)));
      }
    });
  }

  // ------------------------------------------------------------ partida rápida: detalhes

  private details() {
    const W = GAME_W;
    const v = this.view!;
    const [h] = this.teams();
    v.add(scoreBug(this, { title: 'PARTIDA RÁPIDA', step: '2 DE 2', onBack: () => this.go('setup'), team: { abbr: h.abbr, color: uiColor(h) } }));
    const host = teamById(this.hostId());
    const hostR = TeamRepository.get(host.id);
    const fin = matchConfig.side === 'final';
    const lockWx = isDome(host.id) || fin;
    const st = stadiumOf(host.id);

    // ---- estádio: imagem ao vivo com tarja embaixo
    const py = 66;
    const ph = 232;
    const fr = this.add.graphics();
    fr.fillStyle(TV.ink2, 1);
    fr.fillRect(0, py, W, ph);
    v.add(fr);
    const photo = hostR.stadium.image;
    if (photo) v.add(stadiumSlot(this, photo, (slot) => slot.add(this.add.image(W / 2, py + ph / 2, stadiumPhoto(this, photo, W, ph)).setDisplaySize(W, ph))));
    const mood = this.add.rectangle(W / 2, py + ph / 2, W, ph, 0x000000, 0);
    v.add(mood);
    const wShown = (): SkyWeather => (lockWx ? 'clear' : matchConfig.weather === 'rain' || matchConfig.weather === 'snow' ? matchConfig.weather : 'clear');
    const todShown = (): TimeOfDay => (matchConfig.time === 'random' ? 'dusk' : matchConfig.time);
    const paintMood = () => {
      const w = wShown();
      const t = todShown();
      const col = t === 'night' ? 0x0a1030 : t === 'dusk' ? 0xff7a30 : w === 'snow' ? 0xffffff : w === 'rain' ? 0x3a4560 : 0x000000;
      const al = t === 'night' ? 0.42 : t === 'dusk' ? 0.2 : w === 'snow' ? 0.25 : w === 'rain' ? 0.3 : 0;
      mood.setFillStyle(col, al);
    };
    paintMood();
    // tarja do estádio
    const lt = this.add.graphics();
    plateShadow(lt, 0, py + ph - 62, W - 70, 50, false, true);
    plate(lt, 0, py + ph - 62, W - 70, 50, TV.ink, 0.94, false, true);
    plate(lt, 0, py + ph - 62, 56, 50, uiColor(host), 1, false, true);
    v.add(lt);
    v.add(this.add.image(26, py + ph - 37, logoKey(host.id, 's')).setDisplaySize(32, 32));
    const sn = tvText(this, 66, py + ph - 47, fin ? 'QFL BOWL · ' + hostR.stadium.name : hostR.stadium.name, 19, C.white, 800, 0.6).setOrigin(0, 0.5);
    if (sn.width > W - 150) sn.setScale((W - 150) / sn.width, 1);
    v.add(sn);
    const who = fin ? 'A GRANDE FINAL · CAMPO NEUTRO' : matchConfig.standTeam ? 'CAMPO NEUTRO' : matchConfig.side === 'away' ? 'CASA DO ADVERSÁRIO' : 'SUA CASA';
    v.add(tvText(this, 66, py + ph - 25, `${who} · ${hostR.stadium.capacity.toLocaleString('pt-BR')} LUGARES · ${STAND_NAMES[st.model]}`, 12, C.muted, 600, 0.6).setOrigin(0, 0.5));
    if (isDome(host.id)) {
      const dg = this.add.graphics();
      plate(dg, W - 112, py + 12, 100, 26, TV.yellow);
      v.add(dg);
      v.add(tvText(this, W - 62, py + 25, 'COBERTO', 14, C.ink, 800, 1).setOrigin(0.5));
    }
    // trocar estádio
    const other = new TvButton(this, W - 34, py + ph - 37, { w: 58, h: 50, fill: TV.yellow, fillAlpha: 1 });
    const og = this.add.graphics();
    og.lineStyle(3, TV.ink, 1);
    og.beginPath();
    og.moveTo(-10, -7);
    og.lineTo(10, -7);
    og.lineTo(4, -13);
    og.moveTo(10, 7);
    og.lineTo(-10, 7);
    og.lineTo(-4, 13);
    og.strokePath();
    other.add(og);
    other.onTap = () => this.go('pickStand');
    v.add(other);
    if (matchConfig.standTeam) {
      const back = tvText(this, W - 16, py + ph + 16, 'VOLTAR AO ESTÁDIO DO MANDANTE', 13, C.yellow, 700, 1).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
      v.add(arrowAfter(this, back, C.yellow));
      back.on('pointerup', () => {
        matchConfig.standTeam = null;
        this.go('details');
      });
      v.add(back);
    }

    // ---- clima
    let y = py + ph + 38;
    v.add(sectionHead(this, 16, y, 'CLIMA', lockWx ? (fin ? 'FINAL: SEMPRE LIMPO' : 'COBERTO: SEMPRE LIMPO') : undefined));
    const opts: { key: WeatherChoice; name: string }[] = [
      { key: 'clear', name: 'LIMPO' },
      { key: 'rain', name: 'CHUVA' },
      { key: 'snow', name: 'NEVE' },
      { key: 'random', name: 'SORTEIO' },
    ];
    const wW = (W - 32 - 12) / 4;
    const wb: TvButton[] = [];
    const wt: Phaser.GameObjects.Text[] = [];
    const wy = y + 44;
    const pickW = this.choice(wb, wt, opts.map((_, i) => ({ x: 16 + wW / 2 + i * (wW + 4), y: wy, w: wW, h: 60 })));
    const paintW = () => pickW(opts.findIndex((o) => (lockWx ? o.key === 'clear' : o.key === matchConfig.weather)));
    opts.forEach((o, i) => {
      const b = new TvButton(this, 16 + wW / 2 + i * (wW + 4), wy, { w: wW, h: 60, fill: TV.ink2, fillAlpha: 1 });
      const ic = this.add.graphics();
      this.weatherIcon(ic, o.key);
      ic.setPosition(0, -9).setScale(0.56);
      b.add(ic);
      const t = tvText(this, 0, 16, o.name, 14, C.white, 800, 1).setOrigin(0.5);
      b.add(t);
      wt.push(t);
      b.onTap = () => {
        if (lockWx) return;
        matchConfig.weather = o.key;
        paintW();
        paintMood();
      };
      if (lockWx && o.key !== 'clear') b.setEnabled(false);
      wb.push(b);
      v.add(b);
    });
    paintW();

    // ---- horário
    y += 102;
    v.add(sectionHead(this, 16, y, 'HORÁRIO'));
    const topts: { key: TimeChoice; name: string }[] = [
      { key: 'day', name: 'DIA' },
      { key: 'dusk', name: 'TARDE' },
      { key: 'night', name: 'NOITE' },
      { key: 'random', name: 'SORTEIO' },
    ];
    const tb: TvButton[] = [];
    const tt: Phaser.GameObjects.Text[] = [];
    const pickT = this.choice(tb, tt, topts.map((_, i) => ({ x: 16 + wW / 2 + i * (wW + 4), y: y + 38, w: wW, h: 46 })));
    const paintT = () => pickT(topts.findIndex((o) => o.key === matchConfig.time));
    topts.forEach((o, i) => {
      const b = new TvButton(this, 16 + wW / 2 + i * (wW + 4), y + 38, { w: wW, h: 46, fill: TV.ink2, fillAlpha: 1 });
      const ic = this.add.graphics();
      this.timeIcon(ic, o.key);
      ic.setPosition(-wW / 2 + 20, 0).setScale(0.85);
      b.add(ic);
      const t = tvText(this, -wW / 2 + 34, 0, o.name, 14, C.white, 800, 0.6).setOrigin(0, 0.5);
      if (t.width > wW - 46) t.setScale((wW - 46) / t.width, 1);
      b.add(t);
      tt.push(t);
      b.onTap = () => {
        matchConfig.time = o.key;
        paintT();
        paintMood();
      };
      tb.push(b);
      v.add(b);
    });
    paintT();

    // ---- dificuldade
    y += 90;
    v.add(sectionHead(this, 16, y, 'DIFICULDADE'));
    const levels: Level[] = ['easy', 'normal', 'hard'];
    const lW = (W - 32 - 8) / 3;
    const lb: TvButton[] = [];
    const lt2: Phaser.GameObjects.Text[] = [];
    const pickL = this.choice(lb, lt2, levels.map((_, i) => ({ x: 16 + lW / 2 + i * (lW + 4), y: y + 36, w: lW, h: 44 })));
    const paintL = () => pickL(levels.indexOf(this.level));
    levels.forEach((l, i) => {
      const b = new TvButton(this, 16 + lW / 2 + i * (lW + 4), y + 36, { w: lW, h: 44, fill: TV.ink2, fillAlpha: 1 });
      const t = tvText(this, 0, 0, LEVELS[l].label, 17, C.white, 800, 1).setOrigin(0.5);
      b.add(t);
      lt2.push(t);
      b.onTap = () => {
        this.level = l;
        paintL();
      };
      lb.push(b);
      v.add(b);
    });
    paintL();

    // ---- transmissão: placar e abertura de horário nobre ou de playoffs
    y += 88;
    v.add(sectionHead(this, 16, y, 'TRANSMISSÃO', fin ? 'FINAL: SEMPRE QFL BOWL' : 'PLACAR E ABERTURA'));
    const popts: { key: PrimeKey | null; name: string; sub?: string }[] = [
      { key: null, name: 'NORMAL' },
      { key: 'TNF', name: 'QUINTA', sub: 'À NOITE' },
      { key: 'SNF', name: 'DOMINGO', sub: 'À NOITE' },
      { key: 'MNF', name: 'SEGUNDA', sub: 'À NOITE' },
      { key: 'WC', name: 'WILD CARD', sub: 'PLAYOFFS' },
      { key: 'DIV', name: 'DIVISIONAL', sub: 'PLAYOFFS' },
      { key: 'CONF', name: 'SEMI BOWL', sub: 'PLAYOFFS' },
      { key: 'QFL', name: 'QFL BOWL', sub: 'A FINAL' },
    ];
    const pW = (W - 32 - 12) / 4;
    const pH = 42;
    const pb: TvButton[] = [];
    const ptx: Phaser.GameObjects.Text[] = [];
    const ppos = popts.map((_, i) => ({ x: 16 + pW / 2 + (i % 4) * (pW + 4), y: y + 34 + Math.floor(i / 4) * (pH + 4), w: pW, h: pH }));
    const pickP = this.choice(pb, ptx, ppos);
    const curPrime = () => (fin ? 'QFL' : matchConfig.prime);
    const paintP = () => pickP(popts.findIndex((o) => o.key === curPrime()));
    popts.forEach((o, i) => {
      const p = ppos[i];
      const b = new TvButton(this, p.x, p.y, { w: pW, h: pH, fill: TV.ink2, fillAlpha: 1 });
      // faixa na cor do programa (a mesma do placar dele)
      const pr = o.key ? PRIME[o.key] : null;
      const s = Math.min(pH * 0.2126, 12);
      const bar = this.add.graphics();
      bar.fillStyle(pr ? pr.color : TV.rule, 1);
      bar.fillRect(-pW / 2 + s, -pH / 2, pW - s, 3);
      if (pr) {
        bar.fillStyle(pr.glow, 1);
        bar.fillRect(-pW / 2 + s, -pH / 2 + 3, pW - s, 1);
      }
      b.add(bar);
      const t = tvText(this, 0, o.sub ? -5 : 1, o.name, 14, C.white, 800, 0.8).setOrigin(0.5);
      if (t.width > pW - 14) t.setScale((pW - 14) / t.width, 1);
      b.add(t);
      if (o.sub) b.add(tvText(this, 0, 10, o.sub, 10, C.muted, 700, 1.2).setOrigin(0.5));
      ptx.push(t);
      b.onTap = () => {
        if (fin) return;
        matchConfig.prime = o.key;
        // programa da noite: o horário vai para NOITE (dá para trocar depois)
        if (o.key === 'TNF' || o.key === 'SNF' || o.key === 'MNF') {
          matchConfig.time = 'night';
          paintT();
          paintMood();
        }
        paintP();
      };
      if (fin && o.key !== 'QFL') b.setEnabled(false);
      pb.push(b);
      v.add(b);
    });
    paintP();

    // ---- jogar
    const hc = uiColor(h);
    const play = new TvButton(this, W / 2, GAME_H - 44, { w: W - 32, h: 62, fill: hc, fillAlpha: 1, primary: true });
    const fg = inkOn(hc);
    play.add(this.add.image(-(W - 32) / 2 + 36, 0, logoKey(h.id, 's')).setDisplaySize(34, 34));
    play.add(tvText(this, -(W - 32) / 2 + 64, 0, 'JOGAR', 30, fg, 800, 1.5).setOrigin(0, 0.5));
    const px = tvText(this, (W - 32) / 2 - 30, 0, `${h.abbr} × ${teamById(matchConfig.away).abbr}`, 18, fg, 700, 1).setOrigin(1, 0.5);
    play.add(px);
    play.add(arrowAfter(this, px, fg));
    play.onTap = () => {
      difficulty.set(this.level);
      applyMatchup();
      saveMatchConfig();
      this.time.delayedCall(30, () => this.launch());
    };
    v.add(play);
  }

  // ------------------------------------------------------------ escolher time (grade com os 32)

  private picker(side: 'home' | 'away' | 'stand' | 'fav') {
    const W = GAME_W;
    const v = this.view!;
    const fav = side === 'fav';
    const favNow = getFavorite();
    const other = side === 'home' ? matchConfig.away : side === 'away' ? matchConfig.home : '';
    const cur = fav ? (favNow ?? '') : side === 'home' ? matchConfig.home : side === 'away' ? matchConfig.away : this.hostId();
    const back: View = side === 'stand' ? 'details' : fav ? 'home' : 'setup';
    const ttl = fav ? 'SEU TIME DO CORAÇÃO' : side === 'home' ? 'SEU TIME' : side === 'away' ? 'ADVERSÁRIO' : 'ESTÁDIO DE QUAL TIME?';
    // Na primeira abertura não há para onde voltar: escolher é o primeiro passo
    v.add(scoreBug(this, { title: ttl, step: side === 'stand' ? '' : fav ? (favNow ? 'TROCAR' : 'BEM-VINDO') : 'NOTA GERAL (OVR)', onBack: fav && !favNow ? undefined : () => this.go(back) }));
    const cols = 4;
    const cw = (W - 24) / cols;
    const chh = fav ? 88 : 94;
    const y0 = fav ? 114 : 66;
    if (fav) {
      v.add(tvText(this, 16, 74, 'ESCOLHA O TIME QUE VOCÊ TORCE', 19, C.white, 800, 0.6).setOrigin(0, 0.5));
      v.add(tvText(this, 16, 96, 'ELE JÁ VEM PRONTO NA PARTIDA RÁPIDA · DÁ PARA TROCAR DEPOIS', 12, C.muted, 700, 0.8).setOrigin(0, 0.5));
    }
    TEAM_LIST.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 12 + cw / 2 + col * cw;
      const y = y0 + chh / 2 + row * chh;
      const c = uiColor(t);
      const on = t.id === cur;
      const b = new TvButton(this, x, y, { w: cw - 4, h: chh - 4, fill: on ? c : TV.ink2, fillAlpha: 1 });
      b.add(this.add.image(0, -13, logoKey(t.id, 'm')).setDisplaySize(48, 48));
      const fg = on ? inkOn(c) : C.white;
      b.add(tvText(this, -4, 30, t.abbr, 16, fg, 800, 0.6).setOrigin(1, 0.5));
      b.add(tvText(this, 2, 30, String(t.ovr), 16, on ? fg : t.ovr >= 88 ? C.green : t.ovr >= 80 ? C.yellow : C.muted, 800).setOrigin(0, 0.5));
      if (t.id === other) {
        b.setEnabled(false);
        b.setAlpha(0.22);
      }
      b.onTap = () => {
        b.setBorder(TV.yellow, 1);
        v.add(underline(this, x, y + chh / 2 - 6, 52));
        this.time.delayedCall(260, () => {
          if (fav) {
            setFavorite(t.id);
            matchConfig.home = t.id;
            matchConfig.homeUni = 0;
            matchConfig.awayUni = null;
            matchConfig.standTeam = null;
            if (matchConfig.away === t.id) matchConfig.away = TEAM_LIST.find((x) => x.id !== t.id)!.id;
            applyMatchup();
            saveMatchConfig();
            this.go('home');
            return;
          }
          if (side === 'stand') {
            // estádio de outro time = campo neutro (o mandante volta a ser o padrão escolhendo o próprio)
            const local = matchConfig.side === 'away' ? matchConfig.away : matchConfig.home;
            matchConfig.standTeam = t.id === local ? null : t.id;
            this.go('details');
            return;
          }
          if (side === 'home') matchConfig.home = t.id;
          else matchConfig.away = t.id;
          matchConfig.awayUni = null;
          matchConfig.standTeam = null;
          if (side === 'home') matchConfig.homeUni = 0;
          this.go('setup');
        });
      };
      v.add(b);
      if (on) {
        b.setBorder(TV.yellow, 1);
        v.add(underline(this, x, y + chh / 2 - 6, 52, 200));
      }
    });
    this.tweens.add({ targets: v, alpha: { from: 0.4, to: 1 }, duration: 260 });
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
      g.fillRect(-14, -14, 28, 28);
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
      g.fillStyle(TV.ink2, 1);
      g.fillCircle(4, -3, 7);
    } else {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-8, -8, 16, 16);
      g.fillStyle(0x0d0d12, 1);
      for (const [x, y] of [[-4, -4], [4, 4], [0, 0], [4, -4], [-4, 4]]) g.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  // ------------------------------------------------------------ treino livre

  /** Treino livre: escolhe a posição (QB passa nos alvos, RB recebe e corre contra a defesa). */
  private practiceMenu() {
    const W = GAME_W;
    const v = this.view!;
    const h = teamById(matchConfig.home);
    const hc = uiColor(h);
    v.add(scoreBug(this, { title: 'TREINO LIVRE', step: 'ESTÁDIO VAZIO · DE DIA', onBack: () => this.go('home'), team: { abbr: h.abbr, color: hc } }));
    const u = uniformsOf(h)[matchConfig.homeUni];
    const opt = (y: number, pos: 'qb' | 'rb', name: string, lines: string[], num: number) => {
      const bw = W - 32;
      const bh = 340;
      const b = new TvButton(this, W / 2, y, { w: bw, h: bh, fill: TV.ink2, fillAlpha: 1 });
      const g = this.add.graphics();
      plate(g, -bw / 2, -bh / 2, 150, bh, hc, 1, true, true);
      g.fillStyle(0x000000, 0.14);
      g.fillRect(-bw / 2 + 20, bh / 2 - 40, 130, 40);
      b.add(g);
      const fl = this.add.graphics();
      fl.fillStyle(0x000000, 0.35);
      fl.fillEllipse(-bw / 2 + 74, bh / 2 - 26, 96, 12);
      b.add(fl);
      b.add(new PlayerBody(this, -bw / 2 + 74, bh / 2 - 26, this.bodyCfg(u, num), 0.78));
      const tx = -bw / 2 + 172;
      b.add(tvText(this, tx, -bh / 2 + 62, name, 88, C.white, 800, -1).setOrigin(0, 0.5));
      lines.forEach((l, i) => b.add(tvText(this, tx, -bh / 2 + 130 + i * 30, l, 16, C.white, 600, 0.6).setOrigin(0, 0.5).setAlpha(i === 0 ? 1 : 0.72)));
      const go = this.add.graphics();
      plate(go, tx - 6, bh / 2 - 62, bw / 2 - tx - 6, 44, TV.yellow);
      b.add(go);
      const tn = tvText(this, tx + 10, bh / 2 - 40, 'TREINAR', 18, C.ink, 800, 1.5).setOrigin(0, 0.5);
      b.add(tn);
      b.add(arrowAfter(this, tn, C.ink));
      b.onTap = () => {
        applyMatchup();
        this.time.delayedCall(30, () => this.launch(pos));
      };
      v.add(b);
      return b;
    };
    const a = opt(248, 'qb', 'QB', ['PASSE NOS ALVOS', 'RECEBEDORES NAS ROTAS', 'TROQUE ROTAS E JOGADAS'], 12);
    const b = opt(600, 'rb', 'RB', ['RECEBA E CORRA', 'CAMPO LIVRE, SEM DEFESA', 'JUKE · SPIN · MERGULHO'], 28);
    slideIn(this, [a, b], 70, 120);
  }

  // ------------------------------------------------------------ iniciar

  private launch(practice: 'qb' | 'rb' | null = null) {
    // Estádio: o do mandante (fora = do adversário) ou o de outro time escolhido; treino = o seu
    venue.id = practice ? null : this.hostId() === matchConfig.home ? null : this.hostId();
    // Arquibancada: sempre a do estádio escolhido
    matchConfig.stand = 'auto';
    // QFL Bowl (a final): campo e estádio especiais e a apresentação da final
    const fin = !practice && matchConfig.side === 'final';
    finalGame.on = fin;
    // Transmissão: a final é sempre QFL BOWL; senão, a escolhida (playoffs pintam o logo da fase no campo)
    const pk = practice ? null : fin ? 'QFL' : matchConfig.prime;
    const rk = pk ? ({ WC: 'wc', DIV: 'div', CONF: 'conf', QFL: 'final' } as const)[pk as 'WC' | 'DIV' | 'CONF' | 'QFL'] : undefined;
    playoffLogo.key = rk ? ROUND_INFO[rk].logo : null;
    broadcast.prime = pk ? PRIME[pk] : null;
    // Partida Rápida não tem campanha (sem isto, ficava o "7-2" do último jogo da carreira)
    matchRecords.home = '';
    matchRecords.away = '';
    // Teste (só no desenvolvimento): ?prime=TNF|SNF|MNF|WC|DIV|CONF|QFL força o placar de uma transmissão
    const qp = import.meta.env.DEV ? (new URLSearchParams(location.search).get('prime') as keyof typeof PRIME | null) : null;
    if (qp && PRIME[qp]) {
      broadcast.prime = PRIME[qp];
      const rq = ({ WC: 'wc', DIV: 'div', CONF: 'conf', QFL: 'final' } as const)[qp as 'WC' | 'DIV' | 'CONF' | 'QFL'];
      playoffLogo.key = rq ? ROUND_INFO[rq].logo : null;
      matchRecords.home = '7-2';
      matchRecords.away = '6-3';
    }
    const key = `Match${++matchCounter}`;
    this.game.scene.add(key, new MatchScene(key, practice), false);
    this.scene.start(key);
  }
}
