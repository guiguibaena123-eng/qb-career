import Phaser from 'phaser';
import { careerTeam, coachOf, ensureSeason, mi, newsFeed, nextGame, passLeaders, roster, schedule, SEASON_YEAR, standings, type Game } from '../career/season';
import { Pane } from '../career/pane';
import { GAME_H, GAME_W } from '../config';
import type { CareerTeam } from '../data/TeamRepository';
import { fgOn } from '../data/teams';
import { KIT_IDS, kitAccents, kitInfo } from '../career/kits';
import { PlayerBody } from '../player/PlayerBody';
import { BEARD_COUNT, HAIR_COLORS, SKINS } from '../player/PlayerFace';
import { DEFAULT_LOOK, getSave, updateSave, type LookOptions } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title } from '../ui/widgets';

/*
 * CarreiraMenu — hub da carreira (como no design): cabeçalho com o jogador, time, OVR e retrospecto;
 * próximos jogos (cartões que rolam para o lado); abas CLUBE · PERSONALIZAR · ELENCO · STATS · TABELA ·
 * NOTÍCIAS · CONTRATOS · JOGOS; conteúdo rolável; e o botão JOGAR SEMANA N embaixo.
 * Os dados vêm do save e de career/season.ts (registro de times, sem nada escrito à mão).
 */

const OR = 0xf26b1d;
const GR = 0x3ccb5a;
const YE = 0xffd23f;
const RD = 0xff7b80;
const CARD = 0x22284a;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const ovc = (v: number) => (v >= 85 ? GR : v >= 75 ? YE : v >= 65 ? OR : RD);

/** Opções do PERSONALIZAR (valor + nome mostrado), como no design. */
type Opt<T> = [T, string][];
const OPT = {
  helmet: [['classic', 'CLÁSSICO'], ['speed', 'SPEED'], ['compact', 'COMPACTO']],
  gloss: [[true, 'BRILHANTE'], [false, 'FOSCO']],
  mask: [['qb', 'QB ABERTA'], ['rb', 'RB FECHADA'], ['wr', 'WR LEVE'], ['ol', 'LINHA GRADE']],
  visor: [['none', 'SEM VISEIRA'], ['clear', 'TRANSPARENTE'], ['smoke', 'FUMÊ'], ['mirror', 'ESPELHADA'], ['amber', 'ÂMBAR'], ['blue', 'AZUL']],
  chin: [['two', '2 PONTOS'], ['four', '4 PONTOS']],
  jerseyLen: [['short', 'POR DENTRO'], ['mid', 'POR FORA']],
  under: [['none', 'NENHUMA'], ['short', 'CURTA'], ['long', 'LONGA']],
  asl: [['none', 'SEM MANGA'], ['fL', 'ANTEBRAÇO ESQ.'], ['fR', 'ANTEBRAÇO DIR.'], ['fB', 'ANTEBRAÇOS'], ['lL', 'CURTA ESQ.'], ['lR', 'CURTA DIR.'], ['lB', 'CURTAS']],
  pants: [['short', 'CURTA'], ['reg', 'REGULAR'], ['long', 'LONGA']],
  knee: [['none', 'SEM JOELHEIRA'], ['sleeve', 'JOELHEIRA']],
  sock: [['high', 'CANO ALTO'], ['mid', 'CANO MÉDIO'], ['low', 'CANO BAIXO']],
  sstripe: [['none', 'SEM LISTRAS'], ['band', 'FAIXA'], ['hoops', 'ARCOS'], ['wide', 'LARGA']],
  cleats: [['low', 'CANO BAIXO'], ['mid', 'CANO MÉDIO'], ['high', 'CANO ALTO']],
  cacc: [['none', 'SEM DETALHE'], ['swoosh', 'RISCO'], ['stripes', 'LISTRAS'], ['toe', 'BICO']],
  gloves: [['none', 'SEM LUVAS'], ['short', 'CURTAS'], ['full', 'COMPLETAS'], ['lineman', 'ACOLCHOADAS']],
  wrist: [['none', 'NENHUMA'], ['L', 'ESQUERDA'], ['R', 'DIREITA'], ['B', 'AMBAS'], ['P', 'PLAYBOOK']],
  towel: [['none', 'SEM TOALHA'], ['L', 'ESQUERDA'], ['R', 'DIREITA'], ['F', 'FRENTE']],
  nroll: [['none', 'NENHUM'], ['roll', 'COLAR'], ['horse', 'FERRADURA']],
  mouth: [['none', 'NENHUM'], ['hang', 'PENDURADO'], ['bite', 'NA BOCA']],
  eyeblack: [['none', 'NENHUM'], ['stripe', 'LISTRA'], ['double', 'DUPLO'], ['solid', 'BLOCO']],
  hairOut: [['none', 'SEM CABELO'], ['short', 'CURTO'], ['curls', 'CACHOS'], ['dreads', 'DREADS']],
  celebration: [[0, 'ARREMESSAR A BOLA'], [1, 'APONTAR PARA O CÉU'], [2, 'DANÇA DO QB'], [3, 'SALTO NA TORCIDA']],
} satisfies { [K in keyof LookOptions]?: Opt<LookOptions[K]> };
const PAL = [0xf26b1d, 0xb94a0f, 0xffd23f, 0xf4f1e8, 0x8a91a8, 0x0d0d12, 0x22406b, 0x0a2a66, 0x1fa2b8, 0x2e7d4f, 0x0f5a2e, 0xb3262b, 0x6b3fa0, 0xc9a93a, 0xe8793a, 0xff7bac];
const METAL = [0xc9ceda, 0xf4f1e8, 0x0d0d12, 0xf26b1d, 0x22406b, 0xc9a93a, 0xb3262b, 0x2e7d4f];
const COLOR_KEYS = ['maskC', 'chinC', 'underC', 'aslC', 'kneeC', 'sockC', 'sstripeC', 'cleatC', 'caccC', 'gloveC', 'wristC', 'towelC', 'nrollC', 'mouthC'] as const;
const BEARDS: Opt<number> = [[-1, 'SEM BARBA'], ...Array.from({ length: BEARD_COUNT }, (_, i): [number, string] => [i, `ESTILO ${i + 1}`])];
type Cat = 'unif' | 'rosto' | 'capacete' | 'corpo' | 'pes' | 'maos' | 'extras';
const CATS: [Cat, string][] = [
  ['unif', 'UNIFORME'],
  ['rosto', 'ROSTO'],
  ['capacete', 'CAPACETE'],
  ['corpo', 'CORPO'],
  ['pes', 'PÉS'],
  ['maos', 'MÃOS'],
  ['extras', 'EXTRAS'],
];
/** Prévia fixa do PERSONALIZAR (à esquerda) e área rolável dos controles (à direita). */
const PV = { x: 16, y: 122, w: 168, h: 330 };
const PX = PV.x + PV.w + 10;

type Tab = 'clube' | 'pers' | 'elenco' | 'stats' | 'tabela' | 'noticias' | 'contratos' | 'jogos';
const TABS: [Tab, string, number][] = [
  ['clube', 'CLUBE', 0],
  ['pers', 'PERSONALIZAR', 0],
  ['elenco', 'ELENCO', 0],
  ['stats', 'STATS', 0],
  ['tabela', 'TABELA', 0],
  ['noticias', 'NOTÍCIAS', 3],
  ['contratos', 'CONTRATOS', 0],
  ['jogos', 'JOGOS', 0],
];

let lastTab: Tab = 'clube';

export class CarreiraMenu extends Phaser.Scene {
  private tab: Tab = 'clube';
  private team!: CareerTeam;
  private top!: Phaser.GameObjects.Container;
  private tabsPane!: Pane;
  private body!: Pane;
  private cards!: Pane;
  private seen = new Set<Tab>();
  // Estado das abas
  private pos = 'TODOS';
  private open = -1;
  private st = 0;
  private div = 0;
  private nf = 0;
  private nopen = -1;
  private objDone = [false, false, false, false];
  private pc: Cat = 'unif';
  private persPane!: Pane;
  private persFixed!: Phaser.GameObjects.Container;
  private persButtons: GlassButton[] = [];
  private preview!: PlayerBody;
  private kitTag!: Phaser.GameObjects.Text;
  private kitTagBg!: Phaser.GameObjects.Graphics;

  constructor() {
    super('CarreiraMenu');
  }

  create() {
    setupHiRes(this);
    ensureSeason();
    this.team = careerTeam();
    const q = new URLSearchParams(location.search).get('aba') as Tab | null;
    this.tab = q && TABS.some((t) => t[0] === q) ? q : lastTab;
    this.drawBackground();
    this.drawHeader();
    this.top = this.add.container(0, 0);
    this.cards = new Pane(this, 0, 96, GAME_W, 104, 'x', 10);
    this.drawNextGames();
    this.tabsPane = new Pane(this, 0, 208, GAME_W, 44, 'x', 11);
    this.body = new Pane(this, 0, 258, GAME_W, GAME_H - 100 - 258, 'y', 5);
    this.persPane = new Pane(this, PX, PV.y, GAME_W - PX - 16, GAME_H - 100 - PV.y, 'y', 5);
    this.buildPersFixed();
    this.drawCta();
    this.show(this.tab);
  }

  // ------------------------------------------------------------ moldura

  private drawBackground() {
    const W = GAME_W;
    const H = GAME_H;
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x0a0c1a, 1);
    g.fillRect(0, 0, W, H);
    // Brilho laranja vindo do topo
    for (let i = 14; i > 0; i--) {
      g.fillStyle(OR, 0.022);
      g.fillEllipse(W / 2, 0, (360 * i) / 14 * 2, (260 * i) / 14 * 2);
    }
    // Grade fina
    g.fillStyle(0xffffff, 0.025);
    for (let x = 0; x < W; x += 24) g.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 24) g.fillRect(0, y, W, 1);
  }

  private drawHeader() {
    const s = getSave();
    const t = this.team;
    // Camisa (silhueta de jersey) na cor do time com o 12
    const g = this.add.graphics().setDepth(20);
    const jersey = (ox: number, oy: number, w: number, h: number, c: number) => {
      const P = [[17, 0], [39, 0], [44, 5], [56, 5], [61, 0], [83, 0], [100, 17], [91, 36], [81, 31], [81, 100], [19, 100], [19, 31], [9, 36], [0, 17]];
      g.fillStyle(c, 1);
      g.fillPoints(P.map(([px, py]) => new Phaser.Math.Vector2(ox + (px / 100) * w, oy + (py / 100) * h)), true);
    };
    jersey(16, 21, 36, 40, 0x0d0d12);
    jersey(18, 23, 32, 36, t.colors.primary);
    title(this, 34, 44, '12', 9, fgOn(t.colors.primary)).setOrigin(0.5).setDepth(21);
    // Tocar na camisa volta para a aba CARREIRA do menu principal (o design não tem botão de voltar)
    this.add
      .zone(34, 41, 48, 48)
      .setDepth(22)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('CareerHub'));
    title(this, 62, 32, `${s.name} · QB`, 10, '#FFFFFF').setDepth(21);
    label(this, 62, 48, `${t.name} · TEMP. ${s.career.season} · SEM. ${Math.max(1, s.career.week)}`, 10, '#9AA3C0').setDepth(21);
    // Pílulas: OVR e retrospecto
    const pill = (right: number, parts: (Phaser.GameObjects.Text | Phaser.GameObjects.Arc)[]) => {
      let w = 18;
      parts.forEach((p) => (w += (p instanceof Phaser.GameObjects.Text ? p.width : 8) + 6));
      w -= 6;
      const pg = this.add.graphics().setDepth(20);
      pg.fillStyle(0x2a3156, 0.7);
      pg.fillRoundedRect(right - w, 25, w, 30, 12);
      pg.lineStyle(1, 0xffffff, 0.16);
      pg.strokeRoundedRect(right - w, 25, w, 30, 12);
      let x = right - w + 9;
      for (const p of parts) {
        const pw = p instanceof Phaser.GameObjects.Text ? p.width : 8;
        p.setPosition(x + (p instanceof Phaser.GameObjects.Text ? 0 : 4), 40).setDepth(21);
        if (p instanceof Phaser.GameObjects.Text) p.setOrigin(0, 0.5);
        x += pw + 6;
      }
      return right - w;
    };
    const rec = `${s.career.record.w}-${s.career.record.l}`;
    const left = pill(GAME_W - 16, [this.add.circle(0, 0, 4, GR), title(this, 0, 0, rec, 9, '#FFFFFF')]);
    pill(left - 8, [label(this, 0, 0, 'OVR', 9, '#9AA3C0'), title(this, 0, 0, String(s.ovr), 11, hex(YE))]);
  }

  /** Cartões dos próximos jogos (rolam para o lado); tocar abre a aba JOGOS. */
  private drawNextGames() {
    const head = title(this, 16, 80, 'PRÓXIMOS JOGOS', 9, '#C9CEE0');
    const all = label(this, GAME_W - 16, 82, 'VER TODOS ›', 10, hex(YE)).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    all.on('pointerdown', () => this.show('jogos'));
    this.top.add([head, all]);
    const p = this.cards;
    const next = nextGame();
    const games = schedule().filter((g) => !g.bye && !g.result).slice(0, 5);
    games.forEach((g, i) => {
      const x = 16 + i * 174;
      const first = !!next && g.week === next.week;
      const c = this.add.graphics();
      if (first) {
        c.fillStyle(OR, 0.12);
        c.fillRoundedRect(x - 4, -2, 172, 106, 16);
      }
      c.fillStyle(0x000000, 0.3);
      c.fillRoundedRect(x, 6, 164, 98, 14);
      c.fillStyle(first ? OR : CARD, first ? 0.22 : 0.72);
      c.fillRoundedRect(x, 2, 164, 96, 14);
      c.lineStyle(2, first ? OR : 0xffffff, first ? 1 : 0.14);
      c.strokeRoundedRect(x, 2, 164, 96, 14);
      p.add(c);
      p.add(label(this, x + 12, 18, `SEM. ${g.week}`, 9, '#9AA3C0').setOrigin(0, 0.5));
      this.tag(p, x + 152, 18, first ? 'PRÓXIMO' : g.home ? 'CASA' : 'FORA', first ? OR : g.home ? GR : 0x9aa3c0, true);
      p.add(this.add.image(x + 25, 50, g.opp!.logo.small).setDisplaySize(30, 30));
      p.add(title(this, x + 46, 44, g.opp!.name, g.opp!.name.length > 10 ? 7 : 9, '#FFFFFF').setOrigin(0, 0.5));
      p.add(label(this, x + 46, 60, g.home ? 'EM CASA' : 'FORA', 9, '#9AA3C0').setOrigin(0, 0.5));
      p.add(label(this, x + 12, 84, g.when, 9, '#C9CEE0').setOrigin(0, 0.5));
      p.hit(x, 2, 164, 96, () => this.show('jogos'));
    });
    p.setExtent(16 + games.length * 174 + 6);
  }

  /** Etiqueta colorida (CASA, FORA, PRÓXIMO, TROCA...). `right` = ancorada pela direita. */
  private tag(p: Pane | null, x: number, y: number, text: string, color: number, right = false) {
    const t = label(this, 0, y, text, 9, '#0D0D12').setOrigin(0, 0.5);
    const w = t.width + 10;
    const x0 = right ? x - w : x;
    t.setX(x0 + 5);
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(x0, y - 8, w, 16, 5);
    if (p) {
      p.add(g);
      p.add(t);
    }
    return { g, t, w };
  }

  private drawTabs() {
    const p = this.tabsPane;
    p.clear();
    let x = 16;
    let sel: [number, number] | null = null;
    for (const [id, name, badge] of TABS) {
      const on = this.tab === id;
      const t = label(this, 0, 22, name, 10, on ? '#0D0D12' : '#FFFFFF').setOrigin(0, 0.5);
      const showBadge = badge > 0 && !on && !this.seen.has(id);
      const w = t.width + 24 + (showBadge ? 20 : 0);
      const g = this.add.graphics();
      if (on) {
        g.fillStyle(OR, 0.25);
        g.fillRoundedRect(x - 3, 1, w + 6, 42, 12);
      }
      g.fillStyle(on ? OR : CARD, on ? 1 : 0.7);
      g.fillRoundedRect(x, 4, w, 36, 10);
      g.lineStyle(1, 0xffffff, on ? 0.33 : 0.14);
      g.strokeRoundedRect(x, 4, w, 36, 10);
      t.setX(x + 12);
      p.add(g);
      p.add(t);
      if (showBadge) {
        const bx = x + 12 + t.width + 6;
        const bg = this.add.graphics();
        bg.fillStyle(0xff4d5a, 1);
        bg.fillRoundedRect(bx, 15, 14, 14, 7);
        p.add(bg);
        p.add(label(this, bx + 7, 22, String(badge), 8, '#FFFFFF').setOrigin(0.5));
      }
      p.hit(x, 4, w, 36, () => this.show(id));
      if (on) sel = [x, w];
      x += w + 6;
    }
    p.setExtent(x + 10);
    // Rola a fileira até a aba escolhida
    if (sel) p.reveal(sel[0], sel[1]);
  }

  private drawCta() {
    const g = this.add.graphics().setDepth(30);
    for (let i = 0; i < 40; i++) {
      g.fillStyle(0x0a0c1a, Math.min(1, (i / 40) * 1.66));
      g.fillRect(0, GAME_H - 120 + i * 3, GAME_W, 3);
    }
    const n = nextGame();
    const text = n ? `JOGAR SEMANA ${n.week}` : 'TEMPORADA ENCERRADA';
    const b = new GlassButton(this, GAME_W / 2, GAME_H - 26 - 29, { w: GAME_W - 32, h: 58, radius: 18, fill: OR, fillAlpha: 1, borderAlpha: 0.35, primary: true }).setDepth(31);
    const t = title(this, -8, 0, text, 12, '#0D0D12').setOrigin(0.5);
    const a = this.add.graphics();
    a.lineStyle(2.5, 0x0d0d12, 1);
    a.beginPath();
    a.moveTo(t.width / 2 + 2, -5);
    a.lineTo(t.width / 2 + 7, 0);
    a.lineTo(t.width / 2 + 2, 5);
    a.strokePath();
    b.add([t, a]);
    // A partida da carreira (MatchBridge) é a Etapa 8: por enquanto avisa
    b.onTap = () => this.toast('A PARTIDA DA CARREIRA ENTRA NA ETAPA 8');
    this.add.existing(b);
  }

  private toast(text: string) {
    const t = title(this, GAME_W / 2, GAME_H - 140, text, 8, '#0D0D12').setOrigin(0.5).setDepth(41);
    const g = this.add.graphics().setDepth(40);
    g.fillStyle(YE, 1);
    g.fillRoundedRect(GAME_W / 2 - t.width / 2 - 12, GAME_H - 154, t.width + 24, 28, 10);
    this.tweens.add({ targets: [t, g], alpha: 0, delay: 1600, duration: 300, onComplete: () => (t.destroy(), g.destroy()) });
  }

  // ------------------------------------------------------------ abas

  private show(tab: Tab) {
    this.tab = tab;
    lastTab = tab;
    this.seen.add(tab);
    // Em PERSONALIZAR o topo some e as abas sobem (como no design)
    const pers = tab === 'pers';
    this.top.setVisible(!pers);
    this.cards.setVisible(!pers);
    this.tabsPane.moveTo(pers ? 74 : 208);
    this.drawTabs();
    this.body.setVisible(!pers);
    this.persPane.setVisible(pers);
    this.persFixed.setVisible(pers);
    this.persButtons.forEach((b) => {
      b.setVisible(pers);
      if (b.input) b.input.enabled = pers;
    });
    this.body.clear();
    const draw: Record<Tab, () => number> = {
      clube: () => this.clube(),
      pers: () => this.pers(),
      elenco: () => this.elenco(),
      stats: () => this.stats(),
      tabela: () => this.tabela(),
      noticias: () => this.noticias(),
      contratos: () => this.contratos(),
      jogos: () => this.jogos(),
    };
    this.body.setExtent(draw[tab]() + 28);
  }

  /** Cartão de vidro no conteúdo. */
  private card(x: number, y: number, w: number, h: number, fill = CARD, alpha = 0.72, stroke = 0xffffff, sa = 0.14, r = 16) {
    const g = this.add.graphics();
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(x, y, w, h, r);
    g.lineStyle(stroke === 0xffffff ? 1 : 2, stroke, sa);
    g.strokeRoundedRect(x, y, w, h, r);
    return this.body.add(g);
  }

  private T(x: number, y: number, text: string, size: number, color = '#FFFFFF', font: 'title' | 'label' = 'label') {
    return this.body.add((font === 'title' ? title : label)(this, x, y, text, size, color));
  }

  /** Barra de progresso arredondada. */
  private bar(x: number, y: number, w: number, h: number, frac: number, color: number) {
    const g = this.add.graphics();
    g.fillStyle(0x0f1224, 1);
    g.fillRoundedRect(x, y, w, h, h / 2);
    if (frac > 0) {
      g.fillStyle(color, 1);
      g.fillRoundedRect(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
      g.fillStyle(0x000000, 0.22);
      g.fillRect(x + h / 2, y + h - 3, Math.max(0, w * Math.min(1, frac) - h), 3);
    }
    return this.body.add(g);
  }

  /** Fileira de filtros (chips); devolve a altura usada. */
  private chips(y: number, names: string[], current: number, pick: (i: number) => void, flex = false) {
    let x = 16;
    const W = GAME_W - 32;
    names.forEach((n, i) => {
      const t = label(this, 0, y + 15, n, 10, i === current ? '#0D0D12' : '#FFFFFF').setOrigin(0.5);
      const w = flex ? (W - 6 * (names.length - 1)) / names.length : t.width + 24;
      const g = this.add.graphics();
      g.fillStyle(i === current ? OR : CARD, i === current ? 1 : 0.7);
      g.fillRoundedRect(x, y, w, 30, 8);
      g.lineStyle(1, 0xffffff, 0.14);
      g.strokeRoundedRect(x, y, w, 30, 8);
      t.setX(x + w / 2);
      this.body.add(g);
      this.body.add(t);
      this.body.hit(x, y, w, 30, () => pick(i));
      x += w + 6;
    });
    return 30;
  }

  // ---- CLUBE
  private clube() {
    const t = this.team;
    const W = GAME_W - 32;
    let y = 4;
    // Estádio real da cidade (foto pixelada) com nome fictício e capacidade
    this.card(16, y, W, 200, 0x262a36, 1);
    if (t.stadium.image && this.textures.exists(t.stadium.image)) {
      this.body.add(this.add.image(16, y, t.stadium.image).setOrigin(0).setDisplaySize(W, 200));
    } else {
      // Sem foto: arquibancada simples na cor do time
      const g = this.add.graphics();
      g.fillStyle(0x1b2350, 1);
      g.fillRect(16, y, W, 200);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i % 2 ? t.colors.primary : 0x2a3156, 0.8);
        g.fillRect(16, y + 30 + i * 18, W, 14);
      }
      g.fillStyle(0x2e7d4f, 1);
      g.fillRect(16, y + 150, W, 50);
      this.body.add(g);
    }
    const cap = t.stadium.capacity.toLocaleString('pt-BR');
    const sl = label(this, 0, y + 186, `${t.stadium.name} · ${cap}`, 9, '#FFFFFF').setOrigin(0, 0.5);
    const sg = this.add.graphics();
    sg.fillStyle(0x0a0c1a, 0.8);
    sg.fillRoundedRect(26, y + 176, sl.width + 16, 20, 8);
    sl.setX(34);
    this.body.add(sg);
    this.body.add(sl);
    const mb = label(this, 0, y + 186, 'MELHORAR', 9, '#0D0D12').setOrigin(0, 0.5);
    const mg = this.add.graphics();
    mg.fillStyle(YE, 1);
    const mx = 16 + W - 10 - mb.width - 16;
    mg.fillRoundedRect(mx, y + 176, mb.width + 16, 20, 8);
    mb.setX(mx + 8);
    this.body.add(mg);
    this.body.add(mb);
    this.body.hit(mx, y + 176, mb.width + 16, 20, () => this.toast('MELHORIAS DO ESTÁDIO EM BREVE'));
    y += 212;

    // Relações: torcida, equipe e técnico (+ o técnico e o que ele espera)
    const s = getSave();
    const fans = Math.round(40 + (s.draft ? Math.max(0, 33 - s.draft.pick) / 2 : 10) + (s.combine?.score ?? 50) / 10);
    const meters: [string, number, string, number][] = [
      ['CARINHO DOS FÃS', fans, fans >= 70 ? 'EMPOLGADOS' : fans >= 50 ? 'ESPERANÇOSOS' : 'DESCONFIADOS', OR],
      ['QUÍMICA COM A EQUIPE', 41, 'NOVATO', YE],
      ['QUÍMICA COM O TÉCNICO', Math.min(90, 50 + Math.round((s.ovr - 55) * 0.8)), 'CONFIANTE', GR],
    ];
    const rh = 14 + 16 + meters.length * 34 + 54;
    this.card(16, y, W, rh);
    this.T(30, y + 16, 'RELAÇÕES', 9, '#C9CEE0', 'title');
    meters.forEach(([n, v, lab, c], i) => {
      const yy = y + 38 + i * 34;
      this.T(30, yy, n, 10, '#C9CEE0');
      this.T(16 + W - 14, yy, `${lab} · ${v}`, 10, hex(c)).setOrigin(1, 0);
      this.bar(30, yy + 16, W - 28, 10, v / 100, c);
    });
    const ty = y + 38 + meters.length * 34 + 6;
    const lg = this.add.graphics();
    lg.fillStyle(0xffffff, 0.08);
    lg.fillRect(30, ty, W - 28, 1);
    lg.fillStyle(0x2a3156, 1);
    lg.fillRoundedRect(30, ty + 8, 34, 34, 10);
    this.body.add(lg);
    const coach = coachOf(t);
    this.T(47, ty + 25, coach.name.slice(0, 1) + coach.name.slice(-1), 11, '#FFFFFF', 'title').setOrigin(0.5);
    this.T(74, ty + 12, `TÉC. ${coach.name} · ${coach.scheme}`, 10);
    this.T(74, ty + 28, 'ESPERA 4.000 JD DE PASSE NA TEMPORADA', 9, '#9AA3C0');
    y += rh + 12;

    // Objetivos da temporada (tocar marca como concluído)
    const g1 = schedule().find((g) => !g.bye);
    const OBJ: [string, string, string][] = [
      ['GANHAR 10 JOGOS NA TEMPORADA', '$ 2M', `${s.career.record.w} / 10 VITÓRIAS`],
      ['4.000 JARDAS DE PASSE', 'FÃS +10', '0 / 4.000 JD'],
      ['CLASSIFICAR PARA OS PLAYOFFS', 'QUÍMICA +15', 'TEMP. NÃO INICIADA'],
      [`VENCER O CLÁSSICO CONTRA ${g1?.opp?.name ?? 'O RIVAL'}`, 'FÃS +8', `SEMANA ${g1?.week ?? 1} · ${g1?.home ? 'EM CASA' : 'FORA'}`],
    ];
    const oh = 40 + OBJ.length * 72;
    this.card(16, y, W, oh);
    this.T(30, y + 16, 'OBJETIVOS', 9, '#C9CEE0', 'title');
    this.T(16 + W - 14, y + 16, `${this.objDone.filter(Boolean).length}/${OBJ.length} CONCLUÍDOS`, 10, hex(YE)).setOrigin(1, 0);
    OBJ.forEach(([text, rw, prog], i) => {
      const d = this.objDone[i];
      const yy = y + 38 + i * 72;
      const g = this.add.graphics();
      g.fillStyle(d ? GR : 0x0f1224, d ? 0.12 : 0.6);
      g.fillRoundedRect(28, yy, W - 24, 64, 12);
      g.lineStyle(1, d ? GR : 0xffffff, d ? 1 : 0.1);
      g.strokeRoundedRect(28, yy, W - 24, 64, 12);
      g.fillStyle(0x0d0d12, 1);
      g.fillRoundedRect(36, yy + 8, 22, 22, 6);
      g.fillStyle(d ? GR : 0x2a3156, 1);
      g.fillRoundedRect(38, yy + 10, 18, 18, 5);
      this.body.add(g);
      if (d) this.T(47, yy + 19, '✓', 11, '#0D0D12').setOrigin(0.5);
      this.T(66, yy + 12, text, 10).setWordWrapWidth(W - 130);
      this.T(16 + W - 22, yy + 12, rw, 9, hex(YE)).setOrigin(1, 0);
      this.bar(38, yy + 38, W - 44, 6, d ? 1 : 0.04, OR);
      this.T(38, yy + 48, d ? 'META MARCADA COMO CONCLUÍDA' : prog, 9, '#9AA3C0');
      this.body.hit(28, yy, W - 24, 64, () => {
        this.objDone[i] = !this.objDone[i];
        this.show('clube');
      });
    });
    return y + oh;
  }

  // ---- PERSONALIZAR
  /** Prévia do jogador (fixa, fora da rolagem) e os botões ALEATÓRIO / RESTAURAR / PRONTO. */
  private buildPersFixed() {
    const c = (this.persFixed = this.add.container(0, 0).setDepth(6));
    const g = this.add.graphics();
    g.fillStyle(0x141833, 1);
    g.fillRoundedRect(PV.x, PV.y, PV.w, PV.h, 14);
    // Brilho laranja atrás do jogador e grade fina vertical
    for (let i = 12; i > 0; i--) {
      g.fillStyle(OR, 0.03);
      g.fillEllipse(PV.x + PV.w / 2, PV.y + PV.h * 0.45, (PV.w - 6) * (i / 12), PV.h * 0.82 * (i / 12));
    }
    g.fillStyle(0xffffff, 0.03);
    for (let x = PV.x + 8; x < PV.x + PV.w; x += 8) g.fillRect(x, PV.y + 1, 1, PV.h - 2);
    g.lineStyle(1, 0xffffff, 0.14);
    g.strokeRoundedRect(PV.x, PV.y, PV.w, PV.h, 14);
    c.add(g);
    this.preview = new PlayerBody(this, PV.x + 9 + 75, PV.y + 12 + 300, this.bodyCfg(getSave().look));
    c.add(this.preview);
    this.kitTagBg = this.add.graphics();
    this.kitTag = label(this, PV.x + 12, PV.y + 14, '', 8, hex(YE)).setOrigin(0, 0.5);
    c.add([this.kitTagBg, this.kitTag]);
    // Botões abaixo da prévia
    const btn = (y: number, h: number, text: string, fill: number, color: string, fn: () => void, big = false) => {
      const b = new GlassButton(this, PV.x + PV.w / 2, y + h / 2, { w: PV.w, h, radius: big ? 10 : 9, fill, fillAlpha: big ? 1 : 0.9, borderAlpha: big ? 0.35 : 0.2, primary: big }).setDepth(6);
      b.add((big ? title : label)(this, 0, 0, text, big ? 8 : 10, color).setOrigin(0.5));
      b.onTap = fn;
      this.add.existing(b);
      this.persButtons.push(b);
    };
    let y = PV.y + PV.h + 8;
    btn(y, 30, 'ALEATÓRIO', 0x2a3156, '#FFFFFF', () => this.randomLook());
    y += 38;
    btn(y, 30, 'RESTAURAR', 0x2a3156, '#C9CEE0', () => {
      const k = getSave().look.kit;
      this.setLook({ ...DEFAULT_LOOK, kit: k, ...kitAccents(k, this.team.kits[k]) });
    });
    y += 38;
    btn(y, 34, 'PRONTO ✓', GR, '#0D0D12', () => this.show('clube'), true);
    this.updateKitTag();
  }

  private bodyCfg(look: LookOptions) {
    const s = getSave();
    return { look, kit: this.team.kits[look.kit], face: { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard }, number: s.number };
  }

  private updateKitTag() {
    const t = this.kitTag.setText(kitInfo(this.team, getSave().look.kit).name);
    this.kitTagBg.clear();
    this.kitTagBg.fillStyle(0x0a0c1a, 0.8);
    this.kitTagBg.fillRoundedRect(PV.x + 6, PV.y + 6, t.width + 12, 16, 6);
  }

  /** Grava a mudança no save (cada alteração já fica salva) e atualiza a prévia e os controles. */
  private setLook(look: Partial<LookOptions>, face?: { skin?: number; hairColor?: number; beard?: number }) {
    updateSave({ ...(face ?? {}), look: { ...getSave().look, ...look } });
    this.preview.setLook(this.bodyCfg(getSave().look));
    this.updateKitTag();
    this.drawPers(true);
  }

  private randomLook() {
    const rnd = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
    const p: Record<string, unknown> = {};
    for (const [k, opts] of Object.entries(OPT)) p[k] = rnd(opts as [unknown, string][])[0];
    for (const k of COLOR_KEYS) p[k] = rnd(PAL);
    p.maskC = rnd(METAL);
    this.setLook(p as Partial<LookOptions>, { skin: Math.floor(Math.random() * SKINS.length), hairColor: Math.floor(Math.random() * HAIR_COLORS.length), beard: rnd(BEARDS)[0] });
  }

  private pers() {
    this.drawPers(false);
    return 0;
  }

  /** Categorias e controles à direita (rolam; a prévia fica parada). */
  private drawPers(keepScroll: boolean) {
    const p = this.persPane;
    p.clear(keepScroll);
    const W = p.w;
    const s = getSave();
    const L = s.look;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => p.add(o);
    // Categorias (quebram linha)
    let x = 0;
    let y = 0;
    for (const [id, name] of CATS) {
      const on = this.pc === id;
      const t = label(this, 0, 0, name, 10, on ? '#0D0D12' : '#FFFFFF').setOrigin(0.5);
      const w = t.width + 18;
      if (x + w > W) {
        x = 0;
        y += 33;
      }
      const g = this.add.graphics();
      g.fillStyle(on ? OR : CARD, on ? 1 : 0.7);
      g.fillRoundedRect(x, y, w, 28, 8);
      g.lineStyle(1, 0xffffff, 0.14);
      g.strokeRoundedRect(x, y, w, 28, 8);
      t.setPosition(x + w / 2, y + 14);
      add(g);
      add(t);
      p.hit(x, y, w, 28, () => ((this.pc = id), this.drawPers(false)));
      x += w + 5;
    }
    y += 28 + 10;

    if (this.pc === 'unif') {
      // Aviso: o uniforme é do time (cores, número e fonte travados)
      const msg = label(this, 10, y + 9, '🔒 O uniforme é do time que escolheu você: cores da camisa, número e fonte não podem ser editados.', 10, '#FFE08A')
        .setWordWrapWidth(W - 20)
        .setLineSpacing(4);
      const mh = msg.height + 18;
      const g = this.add.graphics();
      g.fillStyle(YE, 0.1);
      g.fillRoundedRect(0, y, W, mh, 12);
      g.lineStyle(1, YE, 0.4);
      g.strokeRoundedRect(0, y, W, mh, 12);
      add(g);
      add(msg);
      y += mh + 8;
      const head = add(label(this, 0, y, `UNIFORMES OFICIAIS · ${this.team.name}`, 10, '#C9CEE0').setWordWrapWidth(W));
      y += head.height + 8;
      for (const id of KIT_IDS) {
        const { name, desc, kit } = kitInfo(this.team, id);
        const on = L.kit === id;
        const nm = title(this, 10, y + 36, name, 8, '#FFFFFF').setWordWrapWidth(W - 20).setLineSpacing(4);
        const ds = label(this, 10, 0, desc, 9, '#9AA3C0').setWordWrapWidth(W - 20);
        ds.setY(nm.y + nm.height + 7);
        const h = ds.y + ds.height + 9 - y;
        const g2 = this.add.graphics();
        g2.fillStyle(on ? OR : CARD, on ? 0.22 : 0.72);
        g2.fillRoundedRect(0, y, W, h, 12);
        g2.lineStyle(1, on ? OR : 0xffffff, on ? 1 : 0.14);
        g2.strokeRoundedRect(0, y, W, h, 12);
        // Amostras: capacete, camisa e calça
        [kit.helmet, kit.jersey, kit.pants].forEach((col, i) => {
          g2.fillStyle(0x0d0d12, 1);
          g2.fillRoundedRect(9 + i * 21, y + 8, 20, 22, 5);
          g2.fillStyle(col, 1);
          g2.fillRoundedRect(10 + i * 21, y + 9, 18, 20, 4);
        });
        add(g2);
        add(nm);
        add(ds);
        p.hit(0, y, W, h, () => this.setLook({ kit: id, ...kitAccents(id, kit) }));
        y += h + 8;
      }
      p.setExtent(y + 20);
      return;
    }

    // Controles da categoria num cartão
    type Ctrl = { n: string; cur?: string; step?: { v: string; prev: () => void; next: () => void }; colors?: { pal: number[]; sel: number; pick: (i: number) => void } };
    const step = <K extends keyof typeof OPT>(k: K, n: string): Ctrl => {
      const opts = OPT[k] as [unknown, string][];
      const i = Math.max(0, opts.findIndex(([v]) => v === L[k]));
      const go = (d: number) => this.setLook({ [k]: opts[(i + d + opts.length) % opts.length][0] } as Partial<LookOptions>);
      return { n, cur: `${i + 1}/${opts.length}`, step: { v: opts[i][1], prev: () => go(-1), next: () => go(1) } };
    };
    const color = (k: (typeof COLOR_KEYS)[number], n: string, pal = PAL): Ctrl => ({ n, colors: { pal, sel: pal.indexOf(L[k]), pick: (i) => this.setLook({ [k]: pal[i] } as Partial<LookOptions>) } });
    const beardIdx = Math.max(0, BEARDS.findIndex(([v]) => v === s.beard));
    const goBeard = (d: number) => this.setLook({}, { beard: BEARDS[(beardIdx + d + BEARDS.length) % BEARDS.length][0] });
    const CT: Record<Exclude<Cat, 'unif'>, () => Ctrl[]> = {
      rosto: () => [
        { n: 'TOM DE PELE', colors: { pal: SKINS, sel: s.skin, pick: (i) => this.setLook({}, { skin: i }) } },
        { n: 'BARBA', cur: `${beardIdx + 1}/${BEARDS.length}`, step: { v: BEARDS[beardIdx][1], prev: () => goBeard(-1), next: () => goBeard(1) } },
        step('eyeblack', 'EYE BLACK'),
        step('hairOut', 'CABELO PARA FORA DO CAPACETE'),
        { n: 'COR DO CABELO E DA BARBA', colors: { pal: HAIR_COLORS, sel: s.hairColor, pick: (i) => this.setLook({}, { hairColor: i }) } },
        step('mouth', 'PROTETOR BUCAL'),
        color('mouthC', 'COR DO PROTETOR'),
      ],
      capacete: () => [step('helmet', 'MODELO DA CASCA'), step('gloss', 'ACABAMENTO'), step('mask', 'MÁSCARA'), color('maskC', 'COR DA MÁSCARA', METAL), step('visor', 'VISEIRA'), step('chin', 'JUGULAR'), color('chinC', 'COR DA JUGULAR')],
      corpo: () => [
        step('jerseyLen', 'CAMISA'),
        step('under', 'CAMISA POR BAIXO'),
        color('underC', 'COR DA CAMISA POR BAIXO'),
        step('pants', 'COMPRIMENTO DA CALÇA'),
        step('knee', 'JOELHEIRA'),
        color('kneeC', 'COR DA JOELHEIRA'),
        step('nroll', 'PROTETOR DE PESCOÇO'),
        color('nrollC', 'COR DO PROTETOR'),
      ],
      pes: () => [step('sock', 'MEIÃO'), color('sockC', 'COR DO MEIÃO'), step('sstripe', 'LISTRAS DO MEIÃO'), color('sstripeC', 'COR DAS LISTRAS'), step('cleats', 'CHUTEIRA'), color('cleatC', 'COR DA CHUTEIRA'), step('cacc', 'DETALHE DA CHUTEIRA'), color('caccC', 'COR DO DETALHE')],
      maos: () => [step('gloves', 'LUVAS'), color('gloveC', 'COR DAS LUVAS'), step('wrist', 'MUNHEQUEIRA'), color('wristC', 'COR DA MUNHEQUEIRA'), step('asl', 'MANGA DE COMPRESSÃO'), color('aslC', 'COR DA MANGA')],
      extras: () => [step('towel', 'TOALHA'), color('towelC', 'COR DA TOALHA'), step('celebration', 'COMEMORAÇÃO DE TOUCHDOWN')],
    };
    const top = y;
    const bg = add(this.add.graphics());
    y += 10;
    const IW = W - 20;
    for (const c of CT[this.pc]()) {
      const n = add(label(this, 10, y, c.n, 9, '#C9CEE0').setWordWrapWidth(IW - 30));
      if (c.cur) add(label(this, 10 + IW, y, c.cur, 8, '#6E7593').setOrigin(1, 0));
      y += n.height + 6;
      const g = add(this.add.graphics());
      if (c.step) {
        const st = c.step;
        g.fillStyle(0x0f1224, 1);
        g.fillRoundedRect(45, y, IW - 70, 36, 9);
        g.lineStyle(2, 0xffffff, 0.12);
        g.strokeRoundedRect(45, y, IW - 70, 36, 9);
        for (const bx of [10, 10 + IW - 30]) {
          g.fillStyle(0x2a3156, 1);
          g.fillRoundedRect(bx, y, 30, 36, 9);
          g.lineStyle(1, 0xffffff, 0.16);
          g.strokeRoundedRect(bx, y, 30, 36, 9);
        }
        add(label(this, 25, y + 18, '‹', 14, '#FFFFFF').setOrigin(0.5));
        add(label(this, IW - 5, y + 18, '›', 14, '#FFFFFF').setOrigin(0.5));
        const v = add(label(this, 10 + IW / 2, y + 18, st.v, 10, '#FFFFFF').setOrigin(0.5).setAlign('center'));
        if (v.width > IW - 76) v.setFontSize(9).setWordWrapWidth(IW - 76);
        p.hit(10, y, 30, 36, st.prev);
        p.hit(10 + IW - 30, y, 30, 36, st.next);
        // Tocar no valor também avança
        p.hit(45, y, IW - 70, 36, st.next);
        y += 36;
      } else if (c.colors) {
        const { pal, sel, pick } = c.colors;
        const per = Math.max(1, Math.floor((IW + 5) / 27));
        pal.forEach((col, i) => {
          const cx = 10 + (i % per) * 27;
          const cy = y + Math.floor(i / per) * 27;
          const on = i === sel;
          if (on) {
            g.fillStyle(col, 0.35);
            g.fillRoundedRect(cx - 3, cy - 3, 28, 28, 9);
          }
          g.fillStyle(on ? 0xffffff : 0x0d0d12, on ? 1 : 0.7);
          g.fillRoundedRect(cx, cy, 22, 22, 7);
          g.fillStyle(col, 1);
          g.fillRoundedRect(cx + 2, cy + 2, 18, 18, 5);
          p.hit(cx - 2, cy - 2, 26, 26, () => pick(i));
        });
        y += Math.ceil(pal.length / per) * 27 - 5;
      }
      y += 14;
    }
    y -= 4;
    bg.fillStyle(CARD, 0.72);
    bg.fillRoundedRect(0, top, W, y - top, 14);
    bg.lineStyle(1, 0xffffff, 0.14);
    bg.strokeRoundedRect(0, top, W, y - top, 14);
    p.setExtent(y + 20);
  }

  // ---- ELENCO
  private elenco() {
    const W = GAME_W - 32;
    const filters = ['TODOS', 'QB', 'RB/WR/TE', 'OL', 'DEF/ST'];
    const group = (p: string) => (({ QB: 'QB', RB: 'RB/WR/TE', WR: 'RB/WR/TE', TE: 'RB/WR/TE', OL: 'OL' }) as Record<string, string>)[p] ?? 'DEF/ST';
    let y = 4;
    y += this.chips(y, filters, filters.indexOf(this.pos), (i) => ((this.pos = filters[i]), (this.open = -1), this.show('elenco'))) + 10;
    roster(this.team).forEach((p, i) => {
      if (this.pos !== 'TODOS' && group(p.pos) !== this.pos) return;
      const open = this.open === i;
      const h = open ? 50 + 2 * 36 + 8 : 52;
      this.card(16, y, W, h, p.me ? OR : CARD, p.me ? 0.16 : 0.72, p.me ? OR : 0xffffff, p.me ? 1 : open ? 0.33 : 0.12, 14);
      const g = this.add.graphics();
      g.fillStyle(this.team.colors.primary, 1);
      g.fillRoundedRect(28, y + 11, 30, 30, 8);
      g.fillStyle(ovc(p.ovr), 1);
      g.fillRoundedRect(16 + W - 50, y + 11, 38, 30, 8);
      this.body.add(g);
      this.T(43, y + 26, String(p.num), 10, fgOn(this.team.colors.primary), 'title').setOrigin(0.5);
      this.T(70, y + 12, p.name, 11);
      this.T(70, y + 30, `${p.pos} · ${p.age} ANOS · ${p.tag}`, 9, '#9AA3C0');
      this.T(16 + W - 31, y + 26, String(p.ovr), 11, '#0D0D12', 'title').setOrigin(0.5);
      if (open) {
        p.attrs.forEach(([n, v], k) => {
          const cx = 28 + (k % 2) * ((W - 24) / 2 + 7);
          const cy = y + 56 + Math.floor(k / 2) * 36;
          const cw = (W - 24) / 2 - 7;
          this.T(cx, cy, n, 9, '#C9CEE0');
          this.T(cx + cw, cy, String(v), 9, '#C9CEE0').setOrigin(1, 0);
          this.bar(cx, cy + 14, cw, 6, v / 100, ovc(v));
        });
      }
      this.body.hit(16, y, W, h, () => ((this.open = open ? -1 : i), this.show('elenco')));
      y += h + 10;
    });
    return y;
  }

  // ---- STATS
  private stats() {
    const W = GAME_W - 32;
    const s = getSave();
    let y = 4;
    const tabs = ['TEMPORADA', 'CARREIRA', 'ÚLTIMO JOGO'];
    y += this.chips(y, tabs, this.st, (i) => ((this.st = i), this.show('stats')), true) + 12;
    const played = s.career.schedule.some((g) => g.result);
    const dash = this.st === 2 && !played;
    const cards: [string, string, number][] = [
      [dash ? '–' : '0', 'JARDAS', 0xffffff],
      [dash ? '–' : '0', 'TDS', GR],
      [dash ? '–' : '0', 'INTS', RD],
      [dash ? '–' : '0%', 'COMPLETOS', 0xffffff],
      [dash ? '–' : '0', 'RATING', YE],
      this.st === 1 ? [String(s.combine?.score ?? '–'), 'NOTA COMBINE', OR] : [dash ? '–' : '0', 'SACKS SOFR.', 0xffffff],
    ];
    const cw = (W - 16) / 3;
    cards.forEach(([v, n, c], i) => {
      const x = 16 + (i % 3) * (cw + 8);
      const yy = y + Math.floor(i / 3) * 70;
      this.card(x, yy, cw, 62, CARD, 0.72, 0xffffff, 0.14, 12);
      this.T(x + cw / 2, yy + 22, v, 13, hex(c), 'title').setOrigin(0.5);
      this.T(x + cw / 2, yy + 44, n, 9, '#9AA3C0').setOrigin(0.5);
    });
    y += 148;
    // Gráfico de jardas por jogo (vazio antes da semana 1)
    this.card(16, y, W, 170);
    this.T(30, y + 16, `JARDAS POR JOGO · ${tabs[this.st]}`, 9, '#C9CEE0', 'title');
    const bw = (W - 28 - 7 * 8) / 8;
    for (let i = 0; i < 8; i++) {
      const x = 30 + i * (bw + 8);
      const g = this.add.graphics();
      g.fillStyle(i === 0 ? OR : 0x2a3156, 1);
      g.fillRoundedRect(x, y + 138 - 3, bw, 3, { tl: 3, tr: 3, bl: 0, br: 0 });
      this.body.add(g);
      this.T(x + bw / 2, y + 128, '–', 8, '#C9CEE0').setOrigin(0.5);
      this.T(x + bw / 2, y + 152, `S${i + 1}`, 8, '#6E7593').setOrigin(0.5);
    }
    y += 182;
    // Líderes da liga em passe (e você, novato)
    const leaders = passLeaders();
    this.card(16, y, W, 40 + 4 * 32);
    this.T(30, y + 16, 'LÍDERES DA LIGA · PASSE', 9, '#C9CEE0', 'title');
    [...leaders, { rank: '—', name: `${s.name} (${this.team.name})`, color: this.team.colors.primary, value: 'NOVATO' }].forEach((l, i) => {
      const yy = y + 38 + i * 32;
      if (i === 3) {
        const hg = this.add.graphics();
        hg.fillStyle(OR, 0.16);
        hg.fillRoundedRect(24, yy - 2, W - 16, 28, 10);
        this.body.add(hg);
      }
      this.T(32, yy + 12, l.rank, 10, '#9AA3C0').setOrigin(0, 0.5);
      this.body.add(this.add.circle(58, yy + 12, 4, l.color));
      this.T(70, yy + 12, l.name, 10).setOrigin(0, 0.5);
      this.T(16 + W - 14, yy + 12, l.value, 10, hex(YE)).setOrigin(1, 0.5);
    });
    return y + 40 + 4 * 32;
  }

  // ---- TABELA
  private tabela() {
    const W = GAME_W - 32;
    let y = 4;
    y += this.chips(y, ['GERAL', 'CONF. NORTE', 'CONF. SUL'], this.div, (i) => ((this.div = i), this.show('tabela')), true) + 10;
    const rows = standings().filter((r) => this.div === 0 || r.conf === this.div - 1);
    const h = 34 + rows.length * 42;
    this.card(16, y, W, h);
    const head = y + 17;
    const cols = { r: 28, team: 50, v: 16 + W - 128, d: 16 + W - 100, pd: 16 + W - 64, pj: 16 + W - 24 };
    this.T(cols.r, head, '#', 9, '#6E7593').setOrigin(0, 0.5);
    this.T(cols.team, head, 'TIME', 9, '#6E7593').setOrigin(0, 0.5);
    this.T(cols.v, head, 'V', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.d, head, 'D', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.pd, head, 'PF-PS', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.pj, head, 'PROJ', 9, '#6E7593').setOrigin(0.5);
    const line = this.add.graphics();
    line.fillStyle(0xffffff, 0.08);
    line.fillRect(16, y + 33, W, 1);
    this.body.add(line);
    rows.forEach((r, i) => {
      const yy = y + 34 + i * 42;
      const me = r.team.id === this.team.id;
      const g = this.add.graphics();
      if (me) {
        g.fillStyle(OR, 0.2);
        g.fillRect(17, yy, W - 2, 42);
      }
      if (me || i < 4) {
        g.fillStyle(me ? OR : GR, 1);
        g.fillRect(17, yy, 4, 42);
      }
      this.body.add(g);
      this.T(cols.r, yy + 21, String(i + 1), 10, '#9AA3C0').setOrigin(0, 0.5);
      this.body.add(this.add.image(cols.team + 11, yy + 21, r.team.logo.small).setDisplaySize(24, 24));
      const nm = this.T(cols.team + 28, yy + 21, r.team.name, 8, '#FFFFFF', 'title').setOrigin(0, 0.5);
      if (nm.width > cols.v - cols.team - 44) nm.setFontSize(7);
      this.T(cols.v, yy + 21, String(r.w), 10).setOrigin(0.5);
      this.T(cols.d, yy + 21, String(r.l), 10).setOrigin(0.5);
      const pd = r.pf - r.pa;
      this.T(cols.pd, yy + 21, `${pd > 0 ? '+' : ''}${pd}`, 10, '#9AA3C0').setOrigin(0.5);
      this.T(cols.pj, yy + 21, String(r.proj), 10, hex(ovc(r.proj + 8))).setOrigin(0.5);
    });
    y += h + 12;
    this.T(GAME_W / 2, y + 6, '4 MELHORES DE CADA CONFERÊNCIA VÃO AOS PLAYOFFS', 9, '#6E7593').setOrigin(0.5);
    return y + 16;
  }

  // ---- NOTÍCIAS
  private noticias() {
    const W = GAME_W - 32;
    const filters = ['TUDO', 'TROCAS', 'LESÕES', 'RUMORES'];
    const keep = ['', 'TROCA', 'LESÃO', 'RUMOR'][this.nf];
    const tagColor: Record<string, number> = { TROCA: GR, RUMOR: YE, LESÃO: RD, DRAFT: OR };
    let y = 4;
    y += this.chips(y, filters, this.nf, (i) => ((this.nf = i), (this.nopen = -1), this.show('noticias'))) + 10;
    newsFeed().forEach((n, i) => {
      if (keep && n.tag !== keep) return;
      const open = this.nopen === i;
      // Mede o texto para a altura do cartão
      const head = label(this, 28, y + 36, n.head, 11, '#FFFFFF').setWordWrapWidth(W - 24).setLineSpacing(5);
      const body = open ? label(this, 28, 0, n.body, 10, '#C9CEE0').setWordWrapWidth(W - 24).setLineSpacing(6) : null;
      let h = 36 + head.height + 14;
      if (body) {
        body.setY(y + h - 4);
        h += body.height + 10;
      }
      const imp = open ? label(this, 28, y + h - 6, `IMPACTO: ${n.impact}`, 9, hex(YE)) : null;
      if (imp) h += 18;
      this.card(16, y, W, h, CARD, 0.72, 0xffffff, open ? 0.4 : 0.12, 14);
      this.tag(this.body, 28, y + 18, n.tag, tagColor[n.tag]);
      this.T(16 + W - 12, y + 18, n.when, 9, '#6E7593').setOrigin(1, 0.5);
      this.body.add(head);
      if (body) this.body.add(body);
      if (imp) this.body.add(imp);
      this.body.hit(16, y, W, h, () => ((this.nopen = open ? -1 : i), this.show('noticias')));
      y += h + 10;
    });
    return y;
  }

  // ---- CONTRATOS
  private contratos() {
    const W = GAME_W - 32;
    const s = getSave();
    const c = s.draft?.contract ?? { years: 4, value: 4 };
    const until = SEASON_YEAR + c.years - 1;
    let y = 4;
    // Seu contrato (degradê na cor da liga)
    const g = this.add.graphics();
    g.fillGradientStyle(OR, CARD, OR, CARD, 0.28, 0.8, 0.28, 0.8);
    g.fillRoundedRect(16, y, W, 176, 16);
    g.lineStyle(1, OR, 0.5);
    g.strokeRoundedRect(16, y, W, 176, 16);
    this.body.add(g);
    this.T(30, y + 16, 'SEU CONTRATO', 9, hex(YE), 'title');
    const v = this.T(30, y + 44, mi(c.value), 15, '#FFFFFF', 'title');
    this.T(30 + v.width + 6, y + 50, '/ANO', 9, '#9AA3C0');
    this.T(16 + W - 14, y + 50, `${c.years} ANOS · ATÉ ${until}`, 10, '#C9CEE0').setOrigin(1, 0);
    const yw = (W - 28 - 6 * (c.years - 1)) / c.years;
    for (let i = 0; i < c.years; i++) {
      const b = this.add.graphics();
      b.fillStyle(i === 0 ? OR : 0x2a3156, 1);
      b.fillRoundedRect(30 + i * (yw + 6), y + 74, yw, 8, 4);
      this.body.add(b);
    }
    const half = (W - 28 - 8) / 2;
    for (const [k, [n, val, col]] of ([['BÔNUS DE ASSINATURA', mi(c.value * 1.4), '#3CCB5A'], ['CLÁUSULA', `OPÇÃO DO TIME ${c.years}º ANO`, '#FFFFFF']] as [string, string, string][]).entries()) {
      const x = 30 + k * (half + 8);
      const bg = this.add.graphics();
      bg.fillStyle(0x0a0c1a, 0.5);
      bg.fillRoundedRect(x, y + 92, half, 44, 10);
      this.body.add(bg);
      this.T(x + 8, y + 100, n, 9, '#9AA3C0');
      this.T(x + 8, y + 116, val, 11, col);
    }
    this.T(30, y + 150, 'BÔNUS POR METAS: 4.000 JD · 30 TDS · PLAYOFFS', 9, '#9AA3C0');
    y += 188;
    // Teto salarial do time
    const team = roster(this.team);
    const used = Math.min(196, 60 + team.reduce((a, p) => a + p.contract.value, 0)); // titulares + resto do elenco
    this.card(16, y, W, 72);
    this.T(30, y + 14, 'TETO SALARIAL DO TIME', 10, '#C9CEE0');
    this.T(16 + W - 14, y + 14, `${mi(200 - used)} LIVRES`, 10, hex(YE)).setOrigin(1, 0);
    const bw = W - 28;
    const cg = this.add.graphics();
    cg.fillStyle(0x0f1224, 1);
    cg.fillRoundedRect(30, y + 34, bw, 12, 6);
    cg.fillStyle(OR, 1);
    cg.fillRoundedRect(30, y + 34, bw * ((used - c.value) / 200), 12, { tl: 6, bl: 6, tr: 0, br: 0 });
    cg.fillStyle(YE, 1);
    cg.fillRect(30 + bw * ((used - c.value) / 200), y + 34, bw * (c.value / 200), 12);
    this.body.add(cg);
    this.T(30, y + 54, `${mi(used)} USADOS DE $ 200M`, 9, '#6E7593');
    y += 84;
    // Maiores contratos do time
    this.T(16, y + 6, 'MAIORES CONTRATOS DO TIME', 9, '#C9CEE0', 'title');
    y += 24;
    [...team].sort((a, b) => b.contract.value - a.contract.value).slice(0, 5).forEach((p) => {
      this.card(16, y, W, 40, CARD, 0.72, 0xffffff, 0.12, 12);
      this.T(28, y + 20, p.pos, 10, '#9AA3C0').setOrigin(0, 0.5);
      this.T(62, y + 20, p.name, 10, p.me ? hex(YE) : '#FFFFFF').setOrigin(0, 0.5);
      this.T(16 + W - 74, y + 20, `ATÉ ${p.contract.until}`, 9, '#9AA3C0').setOrigin(1, 0.5);
      this.T(16 + W - 12, y + 20, mi(p.contract.value), 10, hex(YE)).setOrigin(1, 0.5);
      y += 46;
    });
    return y;
  }

  // ---- JOGOS
  private jogos() {
    const W = GAME_W - 32;
    const next = nextGame();
    let y = 4;
    schedule().forEach((g: Game) => {
      const first = g === next || (next && g.week === next.week);
      this.card(16, y, W, 50, first ? OR : CARD, first ? 0.2 : 0.6, first ? OR : 0xffffff, first ? 1 : 0.1, 12);
      this.T(28, y + 25, `S${g.week}`, 9, '#9AA3C0').setOrigin(0, 0.5);
      if (g.opp) this.body.add(this.add.image(70, y + 25, g.opp.logo.small).setDisplaySize(28, 28));
      else {
        const bg = this.add.graphics();
        bg.fillStyle(0x3a4060, 1);
        bg.fillCircle(70, y + 25, 12);
        this.body.add(bg);
        this.T(70, y + 25, '–', 9, '#FFFFFF', 'title').setOrigin(0.5);
      }
      const name = g.opp ? `${g.home ? 'vs' : '@'} ${g.opp.name}` : 'FOLGA';
      const nm = this.T(92, y + 18, name, 9, '#FFFFFF', 'title').setOrigin(0, 0.5);
      if (nm.width > W - 160) nm.setFontSize(7);
      this.T(92, y + 34, g.opp ? `${g.when} · ${g.where}` : 'SEMANA DE DESCANSO', 9, '#9AA3C0').setOrigin(0, 0.5);
      const res = g.result ? `${g.result.us}-${g.result.them}` : null;
      this.tag(this.body, 16 + W - 12, y + 25, res ?? (first ? 'PRÓXIMO' : g.bye ? 'FOLGA' : g.home ? 'CASA' : 'FORA'), res ? (g.result!.us > g.result!.them ? GR : RD) : first ? OR : g.bye ? 0x6e7593 : g.home ? GR : 0x9aa3c0, true);
      y += 58;
    });
    return y;
  }
}

