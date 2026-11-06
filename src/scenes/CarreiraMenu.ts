import Phaser from 'phaser';
import { careerTeam, coachOf, contractOf, ensureSeason, finalInfo, mi, newsFeed, nextGame, passerRating, PRIME, passLeaders, roster, schedule, seasonOver, seasonResult, seasonStats, seasonYear, standings, startNextSeason, type Game } from '../career/season';
import { Pane } from '../career/pane';
import { devSimWeeks } from '../integration/MatchBridge';
import { awardsReady, finalMvp, seasonAwards, type AwardWinner } from '../career/awards';
import { teamTitles, trophyCase } from '../career/trophies';
import { GAME_H, GAME_W } from '../config';
import { TeamRepository, type CareerTeam } from '../data/TeamRepository';
import { fgOn } from '../data/teams';
import { KIT_IDS, kitAccents, kitInfo } from '../career/kits';
import { PlayerBody } from '../player/PlayerBody';
import { BEARD_COUNT, HAIR_COLORS, PlayerFace, SKINS, type FaceLook } from '../player/PlayerFace';
import { conferenceSeeds, CONFS, divisionOf, divisionTable, DIVS, league, pct, PLAYOFF_SPOTS, teamRank, type LeaguePlayer, type StatLine, type TeamSeason } from '../career/league';
import { teamById } from '../data/teams';
import { bracket, ROUND_INFO, ROUNDS, type PGame } from '../career/playoffs';
import { DEFAULT_LOOK, getSave, recordText, updateSave, type LookOptions } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { portrait as drawPortrait } from '../ui/portrait';
import { weatherIcon } from '../ui/weatherIcon';
import { arrowAfter, C, fillPlate, inkOn, label, lum, mix, plate, plateLine, platePts, plateShadow, sectionHead, star, strokePlate, trophy, title, TV, tvCard as gradCard, tvEnter, TvButton as GlassButton, tvText, wipeTo } from '../ui/tv';

/*
 * CarreiraMenu — hub da carreira (como no design): cabeçalho com o jogador, time, OVR e retrospecto;
 * próximos jogos (cartões que rolam para o lado); abas CLUBE · PERSONALIZAR · ELENCO · STATS · TABELA ·
 * NOTÍCIAS · CONTRATOS · JOGOS; conteúdo rolável; e o botão JOGAR SEMANA N embaixo.
 * Os dados vêm do save e de career/season.ts (registro de times, sem nada escrito à mão).
 */

/** Destaque (seleção, abas, próximo jogo): o amarelo de primeira descida da transmissão. */
const OR = TV.yellow;
const GR = TV.green;
const YE = TV.yellow;
const RD = 0xff5a6a;
/** Faixa laranja das notas (entre amarelo e vermelho). */
const ORG = 0xff8a2a;
const CARD = TV.ink2;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
/** Encolhe o texto na horizontal para caber na largura (nada salta para fora da placa). */
const fit = <T extends Phaser.GameObjects.Text>(t: T, w: number): T => {
  if (w > 0 && t.width > w) t.setScale((w / t.width) * t.scaleX, t.scaleY);
  return t;
};
/** Faixas de nota: verde ≥ 85, amarelo ≥ 75, laranja ≥ 65, abaixo disso cinza (vermelho é só derrota/apagar). */
const ovc = (v: number) => (v >= 85 ? GR : v >= 75 ? YE : v >= 65 ? ORG : 0x93a0b6);

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
/** Categorias na ordem do corpo (de cima para baixo), com o uniforme primeiro. */
const CATS: [Cat, string][] = [
  ['unif', 'UNIFORME'],
  ['capacete', 'CAPACETE'],
  ['rosto', 'ROSTO'],
  ['corpo', 'CORPO'],
  ['maos', 'MÃOS'],
  ['pes', 'PÉS'],
  ['extras', 'EXTRAS'],
];
/** Linha de opções do VISUAL: botões lado a lado, cores ou um botão de ação. */
type PersRow = { n: string; chips?: { opts: string[]; sel: number; pick: (i: number) => void }; colors?: { pal: number[]; sel: number; pick: (i: number) => void }; button?: { text: string; fn: () => void } };
/** Forma da lista (se não mudou, um toque só repinta a seleção, sem recriar textos). */
const rowSig = (r: PersRow) => `${r.n}:${r.chips ? r.chips.opts.join(',') : r.colors ? `c${r.colors.pal.length}` : 'b'}`;
/** VISUAL: palco do jogador, barra de categorias e a área rolável das opções embaixo. */
const STAGE = { x: 16, y: 168, w: GAME_W - 32, h: 282 };
const CAT_Y = STAGE.y + STAGE.h + 8;
const CAT_H = 42;
const PANE_Y = CAT_Y + CAT_H + 10;
/** Zoom do palco por categoria: escala do jogador e a altura da arte (0–200) que fica no centro. */
const ZOOM: Record<Cat, { s: number; ay: number }> = {
  unif: { s: 0.8, ay: 104 },
  extras: { s: 0.8, ay: 104 },
  capacete: { s: 2.0, ay: 24 },
  rosto: { s: 2.4, ay: 25 },
  corpo: { s: 1.25, ay: 92 },
  maos: { s: 1.75, ay: 96 },
  pes: { s: 1.9, ay: 166 },
};

type Tab = 'clube' | 'pers' | 'elenco' | 'stats' | 'jogadores' | 'times' | 'tabela' | 'premios' | 'titulos' | 'noticias' | 'contratos' | 'jogos';

/**
 * As 12 telas da carreira em 5 abas fixas (todas visíveis, sem rolar). Abas com mais de uma tela
 * mostram uma fileira de sub-abas logo abaixo.
 */
type Group = 'inicio' | 'qb' | 'elenco' | 'liga' | 'noticias';
const GROUPS: { id: Group; name: string; tabs: Tab[]; subs: string[] }[] = [
  { id: 'inicio', name: 'INÍCIO', tabs: ['clube'], subs: [] },
  { id: 'qb', name: 'MEU QB', tabs: ['stats', 'pers', 'contratos', 'titulos'], subs: ['STATS', 'VISUAL', 'CONTRATO', 'TÍTULOS'] },
  { id: 'elenco', name: 'ELENCO', tabs: ['elenco'], subs: [] },
  { id: 'liga', name: 'LIGA', tabs: ['tabela', 'jogos', 'times', 'jogadores', 'premios'], subs: ['TABELA', 'JOGOS', 'TIMES', 'JOGADORES', 'PRÊMIOS'] },
  { id: 'noticias', name: 'NOTÍCIAS', tabs: ['noticias'], subs: [] },
];
const groupOf = (t: Tab) => GROUPS.find((g) => g.tabs.includes(t))!;
/** Última sub-aba aberta em cada grupo (voltar ao grupo reabre onde a pessoa estava). */
const lastSub: Partial<Record<Group, Tab>> = {};

let lastTab: Tab = 'clube';

/** Grupo de estatística da posição. */
type Grp = 'QB' | 'RB' | 'WR' | 'TE' | 'DEF' | 'K' | 'OL';
const grpOf = (pos: string): Grp => (['DL', 'LB', 'CB', 'S'].includes(pos) ? 'DEF' : (pos as Grp));
const POS_TABS: Grp[] = ['QB', 'RB', 'WR', 'TE', 'DEF', 'K'];
const rate = (l: StatLine) => passerRating({ comp: l.cmp, att: l.att, yards: l.pyds, td: l.ptd, int: l.int, sacks: l.sk });
const f1 = (n: number) => n.toFixed(1).replace('.', ',');
const nf = (n: number) => Math.round(n).toLocaleString('pt-BR');
interface Col {
  k: string;
  name: string;
  v: (l: StatLine) => number;
  fmt?: (n: number) => string;
}
const RECV: Col[] = [
  { k: 'REC', name: 'RECEPÇÕES', v: (l) => l.rec },
  { k: 'JD', name: 'JARDAS', v: (l) => l.yds },
  { k: 'TD', name: 'TOUCHDOWNS', v: (l) => l.td },
  { k: 'LNG', name: 'MAIS LONGA', v: (l) => l.lng },
];
/** Colunas da tabela de jogadores (e do jogo a jogo) por grupo. */
const COLS: Record<Grp, Col[]> = {
  QB: [
    { k: 'JD', name: 'JARDAS', v: (l) => l.pyds },
    { k: 'TD', name: 'TOUCHDOWNS', v: (l) => l.ptd },
    { k: 'INT', name: 'INTERCEPTAÇÕES', v: (l) => l.int },
    { k: 'RAT', name: 'RATING', v: rate, fmt: f1 },
  ],
  RB: [
    { k: 'JD', name: 'JARDAS', v: (l) => l.ryds },
    { k: 'TD', name: 'TOUCHDOWNS', v: (l) => l.rtd },
    { k: 'MÉD', name: 'MÉDIA', v: (l) => (l.ratt ? l.ryds / l.ratt : 0), fmt: f1 },
    { k: 'TENT', name: 'CORRIDAS', v: (l) => l.ratt },
  ],
  WR: RECV,
  TE: RECV,
  DEF: [
    { k: 'TCK', name: 'TACKLES', v: (l) => l.tck },
    { k: 'SACK', name: 'SACKS', v: (l) => l.sacks },
    { k: 'INT', name: 'INTERCEPTAÇÕES', v: (l) => l.dint },
    { k: 'FF', name: 'FUMBLES FORÇ.', v: (l) => l.ff },
  ],
  K: [
    { k: 'FG', name: 'FIELD GOALS', v: (l) => l.fgm },
    { k: 'FG%', name: 'APROVEITAMENTO', v: (l) => (l.fga ? (l.fgm / l.fga) * 100 : 0), fmt: (n) => `${Math.round(n)}%` },
    { k: 'XP', name: 'PONTOS EXTRAS', v: (l) => l.xpm },
    { k: 'PTS', name: 'PONTOS', v: (l) => l.fgm * 3 + l.xpm },
  ],
  OL: [],
};

export class CarreiraMenu extends Phaser.Scene {
  private tab: Tab = 'clube';
  private team!: CareerTeam;
  private top!: Phaser.GameObjects.Container;
  private tabsPane!: Pane;
  /** Sub-abas do grupo atual (MEU QB e LIGA). */
  private subBar!: Phaser.GameObjects.Container;
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
  private catBar!: Phaser.GameObjects.Container;
  private persFront!: Phaser.GameObjects.Container;
  private persHint!: Phaser.GameObjects.Text;
  private undoBtn!: GlassButton;
  private persNow: PersRow[] = [];
  private persSig = '';
  private persPaint: ((r: PersRow) => void)[] = [];
  /** Mudanças do visual nesta visita (DESFAZER volta uma por vez). */
  private undoStack: { look: LookOptions; face: { skin: number; hairColor: number; beard: number } }[] = [];
  // Liga: ficha de jogador / página de time abertas, filtros da aba JOGADORES, TABELA e JOGOS
  private plSel: string | null = null;
  private teamSel: string | null = null;
  private plPos = 0;
  private plScope = 0;
  private plSort = 0;
  private plAsc = false;
  private plLimit = 40;
  private tconf = 0;
  private kitTag!: Phaser.GameObjects.Text;
  private kitTagBg!: Phaser.GameObjects.Graphics;

  constructor() {
    super('CarreiraMenu');
  }

  create() {
    setupHiRes(this);
    ensureSeason();
    // Teste (só no desenvolvimento): ?simsemanas=N joga N semanas automaticamente
    const sim = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('simsemanas') ?? 0) : 0;
    if (sim > 0) devSimWeeks(sim);
    // Campanha refeita a partir dos resultados (saves antigos não contavam empates)
    {
      const sv = getSave();
      const rs = sv.career.schedule.filter((g) => g.opp && g.result).map((g) => g.result!);
      const rec = { w: rs.filter((r) => r.us > r.them).length, l: rs.filter((r) => r.us < r.them).length, t: rs.filter((r) => r.us === r.them).length };
      const cur = sv.career.record;
      if (rs.length && (cur.w !== rec.w || cur.l !== rec.l || (cur.t ?? 0) !== rec.t)) updateSave({ career: { ...sv.career, record: rec } });
    }
    // Salvamento automático ao chegar no menu da carreira (inclusive na volta de cada partida)
    updateSave({});
    this.team = careerTeam();
    const q = new URLSearchParams(location.search).get('aba') as Tab | null;
    this.tab = q && GROUPS.some((g) => g.tabs.includes(q)) ? q : lastTab;
    this.drawBackground();
    this.drawHeader();
    this.top = this.add.container(0, 0);
    this.cards = new Pane(this, 0, 96, GAME_W, 104, 'x', 10);
    this.drawNextGames();
    this.tabsPane = new Pane(this, 0, 208, GAME_W, 44, 'x', 11);
    this.subBar = this.add.container(0, 0).setDepth(11);
    this.body = new Pane(this, 0, 258, GAME_W, GAME_H - 76 - 258, 'y', 5);
    this.persPane = new Pane(this, 16, PANE_Y, GAME_W - 32, GAME_H - 76 - PANE_Y, 'y', 5);
    this.buildPersFixed();
    this.drawCta();
    this.show(this.tab);
    this.savedBadge();
    tvEnter(this);
  }

  /** Selo "JOGO SALVO" que aparece e some acima do botão de jogar. */
  private savedBadge() {
    // Selo de status logo acima do botão de jogar (não cobre as abas nem o cabeçalho)
    const t = tvText(this, 9, 0, 'JOGO SALVO', 14, C.ink, 800, 1.6).setOrigin(0.5);
    const w = t.width + 48;
    const g = this.add.graphics();
    plateShadow(g, -w / 2, -13, w, 26);
    plate(g, -w / 2, -13, w, 26, GR);
    g.lineStyle(3, TV.ink, 1);
    g.beginPath();
    g.moveTo(-w / 2 + 14, 0);
    g.lineTo(-w / 2 + 19, 5);
    g.lineTo(-w / 2 + 28, -5);
    g.strokePath();
    const c = this.add.container(GAME_W / 2, GAME_H - 86, [g, t]).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, y: GAME_H - 96, duration: 260, delay: 260, ease: 'Expo.Out' });
    this.tweens.add({ targets: c, alpha: 0, duration: 400, delay: 1900, onComplete: () => c.destroy() });
  }

  // ------------------------------------------------------------ moldura

  private drawBackground() {
    // Fundo na cor do seu time (escurecida só quando é clara demais para o texto branco),
    // com o escudo grande em marca-d'água e a base mais escura onde ficam os botões
    const W = GAME_W;
    const H = GAME_H;
    const pc = this.team.colors.primary;
    const l = lum(pc);
    const base = l > 150 ? mix(pc, TV.ink, 0.5) : l > 100 ? mix(pc, TV.ink, 0.3) : pc;
    const g = this.add.graphics().setDepth(-12);
    g.fillStyle(base, 1);
    g.fillRect(0, 0, W, H);
    // faixas diagonais na cor secundária (textura de transmissão, bem discretas)
    g.fillStyle(this.team.colors.secondary, 0.07);
    for (let i = -2; i < 8; i++) {
      const x0 = i * 90;
      g.fillPoints([new Phaser.Math.Vector2(x0, 0), new Phaser.Math.Vector2(x0 + 34, 0), new Phaser.Math.Vector2(x0 + 34 - H * 0.25, H), new Phaser.Math.Vector2(x0 - H * 0.25, H)], true);
    }
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      g.fillStyle(TV.ink, 0.1 + t * t * 0.55);
      g.fillRect(0, H * 0.3 + t * H * 0.7, W, (H * 0.7) / steps + 1);
    }
    if (this.textures.exists(this.team.logo.large)) {
      const img = this.add.image(W - 40, H * 0.6, this.team.logo.large).setDepth(-11).setAlpha(0.08);
      img.setScale(300 / Math.max(img.width, img.height));
    }
  }

  private drawHeader() {
    const s = getSave();
    const t = this.team;
    const W = GAME_W;
    const y = 12;
    const h = 48;
    const c = this.add.container(0, 0).setDepth(20);
    const g = this.add.graphics();
    plateShadow(g, 12, y, W - 24, h, false, true);
    plate(g, 12, y, W - 24, h, TV.ink, 0.97, false, true);
    // voltar (saves)
    plate(g, 12, y, 40, h, TV.ink3, 1, false, true);
    g.lineStyle(2.5, TV.plate, 1);
    g.beginPath();
    g.moveTo(35, y + 16);
    g.lineTo(27, y + 24);
    g.lineTo(35, y + 32);
    g.strokePath();
    // bloco do time com o número
    plate(g, 54, y, 46, h, t.colors.primary, 1, true, true);
    c.add(g);
    c.add(tvText(this, 77, y + h / 2, String(s.number), 22, inkOn(t.colors.primary), 800).setOrigin(0.5));
    const nm = tvText(this, 108, y + 17, `${s.name} · QB`, 18, C.white, 800, 0.6).setOrigin(0, 0.5);
    const rec = recordText(s.career.record);
    const sub = tvText(this, 108, y + 35, `${t.name} · ${rec} · TEMP. ${s.career.season} · SEM. ${Math.max(1, s.career.week)}`, 12, C.muted, 600, 0.6).setOrigin(0, 0.5);
    // OVR (placa amarela) e casa
    const hx = W - 12 - 40;
    plate(g, hx, y, 40, h, TV.ink3, 1, true, false);
    g.fillStyle(TV.plate, 1);
    g.fillTriangle(hx + 12, y + 24, hx + 28, y + 24, hx + 20, y + 15);
    g.fillRect(hx + 14, y + 24, 12, 9);
    g.fillStyle(TV.ink3, 1);
    g.fillRect(hx + 18, y + 27, 4, 6);
    const ox = hx - 6 - 70;
    plate(g, ox, y + 6, 70, h - 12, TV.yellow);
    c.add(tvText(this, ox + 13, y + h / 2 + 1, 'OVR', 12, C.ink, 700, 0.8).setOrigin(0, 0.5));
    c.add(tvText(this, ox + 62, y + h / 2, String(s.ovr), 22, C.ink, 800).setOrigin(1, 0.5));
    const room = ox - 8 - 108;
    if (nm.width > room) nm.setScale(room / nm.width, 1);
    if (sub.width > room) sub.setScale(Math.max(0.6, room / sub.width), 1);
    c.add([nm, sub]);
    const zb = this.add.zone(12, y, 42, h).setOrigin(0).setDepth(22).setInteractive({ useHandCursor: true });
    zb.on('pointerup', () => wipeTo(this, 'CareerSlots', t.colors.primary));
    const zh = this.add.zone(hx, y, 40, h).setOrigin(0).setDepth(22).setInteractive({ useHandCursor: true });
    zh.on('pointerup', () => wipeTo(this, 'MainMenu', t.colors.primary));
  }

  /** Cartões dos próximos jogos (rolam para o lado); tocar abre a aba JOGOS. */
  private drawNextGames() {
    const head = sectionHead(this, 16, 80, 'PRÓXIMOS JOGOS', 'VER TODOS');
    const all = this.add.zone(GAME_W - 110, 66, 100, 28).setOrigin(0).setInteractive({ useHandCursor: true });
    all.on('pointerup', () => this.show('jogos'));
    this.top.add([head, all]);
    const p = this.cards;
    const next = nextGame();
    const games = schedule().filter((g) => !g.bye && !g.result).slice(0, 5);
    const cw = 168;
    games.forEach((g, i) => {
      const x = 16 + i * (cw + 8);
      const first = !!next && g.week === next.week;
      const pr = g.prime ? PRIME[g.prime] : null;
      const c = this.add.graphics();
      plateShadow(c, x, 4, cw, 94);
      plate(c, x, 4, cw, 94, TV.ink2, 0.97);
      // faixa de cima: próximo jogo em amarelo, horário nobre em placa branca
      plate(c, x, 4, cw, 22, first ? TV.yellow : pr ? TV.plate : TV.ink3, 1, true, true);
      if (first) plateLine(c, x, 4, cw, 94, TV.yellow, 1, 2);
      p.add(c);
      const bandFg = first || pr ? C.ink : C.muted;
      // faixa: o programa (ou a semana) à esquerda e o selo à direita, sem encostar
      const tag = tvText(this, x + cw - 14, 15, first ? 'PRÓXIMO' : g.home ? 'CASA' : 'FORA', 12, bandFg, 800, 1.2).setOrigin(1, 0.5);
      const bl = tvText(this, x + 14, 15, pr ? pr.pt : `SEMANA ${g.week}`, 12, bandFg, 800, 1).setOrigin(0, 0.5);
      fit(bl, cw - 28 - tag.width - 12);
      p.add(bl);
      p.add(tag);
      p.add(this.add.image(x + 30, 54, g.opp!.logo.small).setDisplaySize(34, 34));
      const on = tvText(this, x + 54, 48, g.opp!.name, 17, C.white, 800, 0.4).setOrigin(0, 0.5);
      if (on.width > cw - 64) on.setScale((cw - 64) / on.width, 1);
      p.add(on);
      p.add(tvText(this, x + 54, 66, g.home ? 'EM CASA' : 'FORA', 12, C.muted, 600, 1).setOrigin(0, 0.5));
      p.add(tvText(this, x + 14, 86, g.when, 12, C.white, 600, 0.6).setOrigin(0, 0.5));
      p.add(weatherIcon(this, x + cw - 22, 84, g.weather, 18, g.tod === 'night'));
      p.hit(x, 4, cw, 94, () => this.show('jogos'));
    });
    p.setExtent(16 + games.length * (cw + 8) + 8);
  }

  /** Etiqueta colorida (CASA, FORA, PRÓXIMO, TROCA...). `right` = ancorada pela direita. */
  private tag(p: Pane | null, x: number, y: number, text: string, color: number, right = false) {
    const t = tvText(this, 0, y, text, 12, inkOn(color), 800, 1).setOrigin(0, 0.5);
    const w = t.width + 14;
    const x0 = right ? x - w : x;
    t.setX(x0 + 7);
    const g = this.add.graphics();
    plate(g, x0, y - 9, w, 18, color);
    if (p) {
      p.add(g);
      p.add(t);
    }
    return { g, t, w };
  }

  private drawTabs() {
    const p = this.tabsPane;
    p.clear();
    const W = GAME_W;
    const gap = 4;
    const tw = (W - 32 - gap * (GROUPS.length - 1)) / GROUPS.length;
    const cur = groupOf(this.tab).id;
    GROUPS.forEach((g, i) => {
      const x = 16 + i * (tw + gap);
      const on = g.id === cur;
      // novidade: notícias não lidas e prêmios entregues
      const badge = g.id === 'noticias' ? (this.seen.has('noticias') ? 0 : 3) : g.id === 'liga' && awardsReady() && !this.seen.has('premios') ? 1 : 0;
      const pg = this.add.graphics();
      plate(pg, x, 4, tw, 38, on ? TV.yellow : TV.ink2, on ? 1 : 0.95);
      if (!on) plateLine(pg, x, 4, tw, 38, TV.rule, 1, 1);
      p.add(pg);
      const t = tvText(this, x + tw / 2, 23, g.name, 15, on ? C.ink : C.white, 800, 0.8).setOrigin(0.5);
      if (t.width > tw - 12) t.setScale((tw - 12) / t.width, 1);
      p.add(t);
      if (badge && !on) {
        const bg = this.add.graphics();
        plate(bg, x + tw - 20, -2, 20, 16, TV.red);
        p.add(bg);
        p.add(tvText(this, x + tw - 10, 6, String(badge), 11, C.white, 800, 0).setOrigin(0.5));
      }
      p.hit(x, 0, tw, 44, () => {
        this.plSel = null;
        this.teamSel = null;
        this.show(lastSub[g.id] ?? g.tabs[0]);
      });
    });
    p.setExtent(W);
  }

  /** Sub-abas do grupo (opção escolhida = placa elevada, texto amarelo e traço de caneta). */
  private drawSubs(grp: (typeof GROUPS)[number], tab: Tab) {
    const c = this.subBar;
    c.removeAll(true);
    if (grp.tabs.length < 2 || tab === 'clube') return;
    const W = GAME_W;
    const y = 122;
    const gap = 4;
    const n = grp.tabs.length;
    const sw = (W - 32 - gap * (n - 1)) / n;
    grp.tabs.forEach((t, i) => {
      const x = 16 + i * (sw + gap);
      const on = t === tab;
      const g = this.add.graphics();
      plate(g, x, y, sw, 34, on ? TV.ink3 : TV.ink, on ? 1 : 0.85);
      c.add(g);
      const tx = tvText(this, x + sw / 2, y + 16, grp.subs[i], 13, on ? C.yellow : C.muted, 800, 0.8).setOrigin(0.5);
      if (tx.width > sw - 10) tx.setScale((sw - 10) / tx.width, 1);
      c.add(tx);
      if (on) {
        const u = this.add.graphics();
        u.fillStyle(TV.yellow, 1);
        u.fillRect(x + sw / 2 - Math.min(tx.displayWidth, sw - 20) / 2, y + 28, Math.min(tx.displayWidth, sw - 20), 3);
        c.add(u);
      }
      const z = this.add.zone(x, y - 2, sw, 38).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        if (t === this.tab && !this.plSel && !this.teamSel) return;
        navigator.vibrate?.(8);
        this.plSel = null;
        this.teamSel = null;
        this.show(t);
      });
      c.add(z);
    });
  }

  private drawCta() {
    const g = this.add.graphics().setDepth(30);
    for (let i = 0; i < 30; i++) {
      g.fillStyle(TV.ink, Math.min(1, (i / 30) * 1.5));
      g.fillRect(0, GAME_H - 104 + i * 2, GAME_W, 2);
    }
    g.fillStyle(TV.ink, 1);
    g.fillRect(0, GAME_H - 44, GAME_W, 44);
    const n = nextGame();
    const over = !n && seasonOver();
    const done = !!getSave().career.seasonDone;
    const fi = finalInfo();
    const nextYear = seasonYear() + 1;
    // Sem jogo a jogar e temporada encerrada: eliminado ou fora dos playoffs, o botão simula o resto da
    // temporada (playoffs, campeão e prêmios); depois, avança para a próxima (sem limite de temporadas)
    const text = n
      ? n.round
        ? `JOGAR ${ROUND_INFO[n.round].name}`
        : `JOGAR SEMANA ${n.week}`
      : over
        ? done
          ? `PRÓXIMA TEMPORADA ${nextYear}`
          : fi.status === 'won' || fi.round === 'final'
            ? 'ENCERRAR TEMPORADA'
            : 'SIMULAR ATÉ O FIM'
        : 'TEMPORADA ENCERRADA';
    const hc = this.team.colors.primary;
    const fg = inkOn(hc);
    const bw = GAME_W - 32;
    const b = new GlassButton(this, GAME_W / 2, GAME_H - 46, { w: bw, h: 62, fill: hc, fillAlpha: 1, primary: true }).setDepth(31);
    const t = tvText(this, -bw / 2 + 64, 0, text, 25, fg, 800, 1.2).setOrigin(0, 0.5);
    if (t.width > bw - 110) t.setScale((bw - 110) / t.width, 1);
    const a = this.add.graphics();
    a.lineStyle(3, parseInt(fg.slice(1), 16), 1);
    a.beginPath();
    a.moveTo(bw / 2 - 34, -9);
    a.lineTo(bw / 2 - 25, 0);
    a.lineTo(bw / 2 - 34, 9);
    a.strokePath();
    b.add([this.add.image(-bw / 2 + 36, 0, this.team.logo.small).setDisplaySize(32, 32), t, a]);
    // Antes da partida: tela de pré-jogo (detalhes do confronto e escolha do uniforme)
    let armed = 0;
    b.onTap = () => {
      if (over) {
        if (!done) {
          // Simula o restante da temporada e abre os PRÊMIOS (playoffs, campeão e MVP da final)
          updateSave({ career: { ...getSave().career, seasonDone: true } });
          lastTab = 'premios';
          this.scene.restart();
          return;
        }
        // Dois toques: o primeiro mostra o resultado da temporada, o segundo avança
        if (this.time.now - armed < 4000) {
          startNextSeason();
          this.scene.restart();
          return;
        }
        armed = this.time.now;
        return this.toast(`${seasonResult()} · TOQUE DE NOVO PARA AVANÇAR`);
      }
      if (!n) return this.toast(text);
      this.time.delayedCall(30, () => wipeTo(this, 'PreJogo', this.team.colors.primary));
    };
    this.add.existing(b);
  }

  private toast(text: string) {
    const t = tvText(this, GAME_W / 2, GAME_H - 132, text, 15, C.ink, 800, 1).setOrigin(0.5).setDepth(41);
    const g = this.add.graphics().setDepth(40);
    plate(g, GAME_W / 2 - t.width / 2 - 16, GAME_H - 147, t.width + 32, 30, YE);
    this.tweens.add({ targets: [t, g], alpha: 0, delay: 1800, duration: 300, onComplete: () => (t.destroy(), g.destroy()) });
  }

  // ------------------------------------------------------------ abas

  private show(tab: Tab) {
    this.tab = tab;
    lastTab = tab;
    this.seen.add(tab);
    // Os próximos jogos só aparecem no CLUBE; nas outras abas o conteúdo sobe
    const pers = tab === 'pers';
    const games = tab === 'clube';
    this.top.setVisible(games);
    this.cards.setVisible(games);
    const grp = groupOf(tab);
    lastSub[grp.id] = tab;
    const subs = grp.tabs.length > 1;
    const by = games ? 258 : subs ? 164 : 124;
    this.tabsPane.moveTo(games ? 208 : 74);
    this.body.moveTo(by, GAME_H - 76 - by);
    this.drawTabs();
    this.drawSubs(grp, tab);
    this.body.setVisible(!pers);
    this.persPane.setVisible(pers);
    this.persFixed.setVisible(pers);
    this.persFront.setVisible(pers);
    this.preview.setVisible(pers);
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
      premios: () => this.premios(),
      titulos: () => this.titulos(),
      noticias: () => this.noticias(),
      contratos: () => this.contratos(),
      jogos: () => this.jogos(),
      jogadores: () => this.jogadores(),
      times: () => this.times(),
    };
    // Ficha de jogador / página de time abrem por cima da aba atual
    const h = this.plSel ? this.playerPage(this.plSel) : tab === 'times' && this.teamSel ? this.teamPage(this.teamSel) : draw[tab]();
    this.body.setExtent(h + 52);
    // a aba nova entra deslizando
    const bc = this.body.content;
    this.tweens.killTweensOf(bc);
    bc.setAlpha(0).setX(-28);
    this.tweens.add({ targets: bc, x: 0, alpha: 1, duration: 360, ease: 'Expo.Out' });
    if (pers) {
      const pc = this.persPane.content;
      const base = 16;
      this.tweens.killTweensOf([pc, this.persFixed, this.persFront]);
      pc.setAlpha(0).setX(base - 28);
      this.persFixed.setAlpha(0).setX(-28);
      this.persFront.setAlpha(0).setX(-28);
      this.preview.setAlpha(0);
      this.tweens.add({ targets: [this.persFixed, this.persFront], x: 0, alpha: 1, duration: 360, ease: 'Expo.Out' });
      this.tweens.add({ targets: this.preview, alpha: 1, duration: 360, ease: 'Quad.Out' });
      this.tweens.add({ targets: pc, x: base, alpha: 1, duration: 360, delay: 60, ease: 'Expo.Out' });
    }
  }

  /** Placa de conteúdo (as cores diferentes do padrão viram placa tingida com faixa no topo). */
  private card(x: number, y: number, w: number, h: number, fill = CARD, alpha = 0.72, stroke = 0xffffff, sa = 0.14, _r = 16) {
    if (fill !== CARD) return this.body.add(gradCard(this, x, y, w, h, { from: fill, fromAlpha: Math.min(0.85, alpha * 2.6), stroke, strokeAlpha: sa, strokeWidth: stroke === 0xffffff ? 1 : 2 }));
    const g = this.add.graphics();
    plate(g, x, y, w, h, TV.ink2, Math.max(0.9, alpha));
    plateLine(g, x, y, w, h, stroke === 0xffffff ? TV.rule : stroke === 0xf26b1d ? TV.yellow : stroke, stroke === 0xffffff ? 1 : sa, stroke === 0xffffff ? 1 : 2);
    return this.body.add(g);
  }

  private T(x: number, y: number, text: string, size: number, color = '#FFFFFF', font: 'title' | 'label' = 'label') {
    return this.body.add((font === 'title' ? title : label)(this, x, y, text, size, color));
  }

  /** Barra de progresso (reta, sem pontas arredondadas). */
  private bar(x: number, y: number, w: number, h: number, frac: number, color: number) {
    const g = this.add.graphics();
    g.fillStyle(TV.ink, 1);
    g.fillRect(x, y, w, h);
    if (frac > 0) {
      g.fillStyle(color, 1);
      g.fillRect(x, y, Math.max(2, w * Math.min(1, frac)), h);
    }
    return this.body.add(g);
  }

  /** Fileira de filtros; devolve a altura usada. */
  private chips(y: number, names: string[], current: number, pick: (i: number) => void, flex = false) {
    let x = 16;
    const W = GAME_W - 32;
    names.forEach((n, i) => {
      const on = i === current;
      const t = tvText(this, 0, y + 16, n, 14, on ? C.ink : C.white, 800, 0.8).setOrigin(0.5);
      const w = flex ? (W - 4 * (names.length - 1)) / names.length : t.width + 26;
      if (t.width > w - 10) t.setScale((w - 10) / t.width, 1);
      const g = this.add.graphics();
      plate(g, x, y, w, 32, on ? TV.yellow : TV.ink2, on ? 1 : 0.95);
      if (!on) plateLine(g, x, y, w, 32, TV.rule, 1, 1);
      t.setX(x + w / 2);
      this.body.add(g);
      this.body.add(t);
      this.body.hit(x, y, w, 32, () => pick(i));
      x += w + 4;
    });
    return 32;
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
        g.fillStyle(i % 2 ? t.colors.primary : TV.ink3, 0.8);
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
    fillPlate(sg, 26, y + 176, sl.width + 16, 20, 8);
    sl.setX(34);
    this.body.add(sg);
    this.body.add(sl);
    y += 212;

    // Relações: torcida, equipe e técnico (+ o técnico e o que ele espera)
    const s = getSave();
    const fans = Math.round(40 + (s.draft ? Math.max(0, 33 - s.draft.pick) / 2 : 10) + (s.combine?.score ?? 50) / 10);
    const meters: [string, number, string, number][] = [
      ['CARINHO DOS FÃS', fans, fans >= 70 ? 'EMPOLGADOS' : fans >= 50 ? 'ESPERANÇOSOS' : 'DESCONFIADOS', OR],
      ['QUÍMICA COM A EQUIPE', 41, 'NOVATO', YE],
      ['QUÍMICA COM O TÉCNICO', Math.min(90, 50 + Math.round((s.ovr - 55) * 0.8)), 'CONFIANTE', GR],
    ];
    const rh = 14 + 16 + meters.length * 40 + 74;
    this.card(16, y, W, rh);
    this.T(40, y + 16, 'RELAÇÕES', 9, C.white, 'title');
    meters.forEach(([n, v, lab, c], i) => {
      const yy = y + 38 + i * 40;
      this.T(40, yy, n, 10, C.muted);
      this.T(16 + W - 24, yy, `${lab} · ${v}`, 10, hex(c)).setOrigin(1, 0);
      this.bar(40, yy + 25, W - 56, 8, v / 100, c);
    });
    const ty = y + 38 + meters.length * 40 + 6;
    const lg = this.add.graphics();
    lg.fillStyle(0xffffff, 0.08);
    lg.fillRect(40, ty, W - 56, 1);
    lg.fillStyle(TV.ink3, 1);
    fillPlate(lg, 40, ty + 12, 38, 38, 10);
    this.body.add(lg);
    const coach = coachOf(t);
    this.T(59, ty + 31, coach.name.slice(0, 1) + coach.name.slice(-1), 11, '#FFFFFF', 'title').setOrigin(0.5);
    this.T(90, ty + 16, `TÉC. ${coach.name} · ${coach.scheme}`, 10);
    this.T(90, ty + 34, 'ESPERA 4.000 JD DE PASSE NA TEMPORADA', 9, C.muted);
    y += rh + 12;

    // Objetivos da temporada (tocar marca como concluído)
    const g1 = schedule().find((g) => !g.bye);
    const OBJ: [string, string, string][] = [
      ['GANHAR 10 JOGOS NA TEMPORADA', '$ 2M', `${s.career.record.w} / 10 VITÓRIAS`],
      ['4.000 JARDAS DE PASSE', 'FÃS +10', `${seasonStats().total.yards.toLocaleString('pt-BR')} / 4.000 JD`],
      ['CLASSIFICAR PARA OS PLAYOFFS', 'QUÍMICA +15', s.career.record.w + s.career.record.l + (s.career.record.t ?? 0) ? `${recordText(s.career.record)} NA TEMPORADA` : 'TEMP. NÃO INICIADA'],
      [`VENCER O CLÁSSICO CONTRA ${g1?.opp?.name ?? 'O RIVAL'}`, 'FÃS +8', `SEMANA ${g1?.week ?? 1} · ${g1?.home ? 'EM CASA' : 'FORA'}`],
    ];
    const oh = 40 + OBJ.length * 72;
    this.card(16, y, W, oh);
    this.T(40, y + 16, 'OBJETIVOS', 9, C.white, 'title');
    this.T(16 + W - 24, y + 16, `${this.objDone.filter(Boolean).length}/${OBJ.length} CONCLUÍDOS`, 10, hex(YE)).setOrigin(1, 0);
    OBJ.forEach(([text, rw, prog], i) => {
      const d = this.objDone[i];
      const yy = y + 38 + i * 72;
      const g = this.add.graphics();
      g.fillStyle(d ? mix(TV.ink, GR, 0.14) : TV.ink, 1);
      fillPlate(g, 30, yy, W - 30, 64, 12);
      g.fillStyle(0x0d0d12, 1);
      fillPlate(g, 36, yy + 8, 22, 22, 6);
      g.fillStyle(d ? GR : TV.ink3, 1);
      fillPlate(g, 38, yy + 10, 18, 18, 5);
      this.body.add(g);
      if (d) {
        const ck = this.add.graphics();
        ck.lineStyle(3, TV.ink, 1);
        ck.beginPath();
        ck.moveTo(41, yy + 19);
        ck.lineTo(45, yy + 23);
        ck.lineTo(53, yy + 14);
        ck.strokePath();
        this.body.add(ck);
      }
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

  // ---- VISUAL (personalizar o jogador)
  /**
   * Palco do jogador (grande, com zoom na parte do corpo que está sendo editada), botões DESFAZER e
   * ALEATÓRIO no palco e a barra de categorias. Tocar numa parte do jogador abre a categoria dela.
   */
  private buildPersFixed() {
    const c = (this.persFixed = this.add.container(0, 0).setDepth(6));
    const S = STAGE;
    const g = this.add.graphics();
    plateShadow(g, S.x, S.y, S.w, S.h);
    plate(g, S.x, S.y, S.w, S.h, TV.ink2, 1);
    // holofote: elipses claras sobrepostas atrás do jogador
    for (let i = 0; i < 7; i++) {
      g.fillStyle(0xffffff, 0.022);
      g.fillEllipse(S.x + S.w / 2, S.y + S.h * 0.42, 330 - i * 40, 300 - i * 34);
    }
    // piso: tudo dentro do quadrado cinza (antes era na cor do time e, num time azul, se misturava
    // com o fundo da tela — as pernas pareciam fora do quadrado). Só um filete fino na cor do time.
    g.fillStyle(0x000000, 0.18);
    g.fillRect(S.x + 10, S.y + S.h - 40, S.w - 20, 1);
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(S.x + S.w / 2, S.y + S.h - 22, 150, 22);
    g.fillStyle(this.team.colors.primary, 1);
    g.fillRect(S.x + 14, S.y + S.h - 5, S.w - 30, 2);
    c.add(g);
    c.add(tvText(this, S.x + S.w - 16, S.y + 64, `#${getSave().number}`, 64, C.white, 800, 0).setOrigin(1, 0.5));
    // jogador: fica FORA do container (o Phaser não aplica máscara em objeto dentro de container) e é
    // recortado no formato exato do palco, pontas inclinadas incluídas — no zoom não passa das bordas
    const z = ZOOM.unif;
    this.preview = new PlayerBody(this, S.x + S.w / 2, this.feetY(z), this.bodyCfg(getSave().look), z.s).setDepth(6.2);
    const mg = this.make.graphics({}, false);
    mg.fillStyle(0xffffff, 1);
    mg.fillPoints(platePts(S.x + 1, S.y + 1, S.w - 2, S.h - 2), true);
    this.preview.setMask(mg.createGeometryMask());
    // o que fica por cima do jogador (faixa do topo, selo, dica, toque, categorias)
    const f = (this.persFront = this.add.container(0, 0).setDepth(6.4));
    // faixa escura no alto: o jogador ampliado passa por baixo dos botões sem embolar
    const shade = this.add.graphics();
    shade.fillGradientStyle(TV.ink2, TV.ink2, TV.ink2, TV.ink2, 0.96, 0.96, 0, 0);
    shade.fillRect(S.x + 2, S.y + 2, S.w - 4, 58);
    f.add(shade);
    // nome do uniforme (selo no piso) e dica
    this.kitTagBg = this.add.graphics();
    this.kitTag = tvText(this, S.x + 22, S.y + S.h - 22, '', 13, C.ink, 800, 1.2).setOrigin(0, 0.5);
    f.add([this.kitTagBg, this.kitTag]);
    this.persHint = tvText(this, S.x + S.w - 14, S.y + S.h - 22, 'TOQUE NO JOGADOR', 11, C.muted, 700, 1).setOrigin(1, 0.5).setAlpha(0.75);
    f.add(this.persHint);
    // tocar no jogador: abre a categoria da parte tocada (fora dele, volta ao uniforme)
    const zone = this.add.zone(S.x, S.y + 44, S.w, S.h - 44).setOrigin(0).setInteractive();
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.getDistance() > 10) return;
      const cat = this.partAt(p.worldX, p.worldY);
      this.pickCat(cat ?? 'unif');
    });
    f.add(zone);
    // botões do palco
    const btn = (x: number, w: number, text: string, fn: () => void) => {
      const b = new GlassButton(this, x, S.y + 24, { w, h: 32, fill: TV.ink3, fillAlpha: 0.94 }).setDepth(7);
      b.add(tvText(this, 0, 0, text, 13, C.white, 800, 1.2).setOrigin(0.5));
      b.onTap = fn;
      this.add.existing(b);
      this.persButtons.push(b);
      return b;
    };
    this.undoBtn = btn(S.x + 12 + 52, 104, 'DESFAZER', () => this.undoLook());
    btn(S.x + S.w - 12 - 56, 112, 'ALEATÓRIO', () => this.randomLook());
    // barra de categorias (fixa)
    this.catBar = this.add.container(0, 0);
    f.add(this.catBar);
    this.drawCatBar();
    this.updateKitTag();
    this.updateUndo();
  }

  /** Altura dos pés do jogador no palco para um zoom (centraliza a parte `ay` da arte). */
  private feetY(z: { s: number; ay: number }) {
    return STAGE.y + STAGE.h * 0.5 + (200 - z.ay) * 1.5 * z.s;
  }

  /** Parte do jogador sob o toque (coordenadas da arte 100×200) → categoria. */
  private partAt(px: number, py: number): Cat | null {
    const b = this.preview;
    const s = b.scaleX;
    const ax = (px - b.x) / (1.5 * s) + 50;
    const ay = (py - b.y) / (1.5 * s) + 200;
    if (ax < 12 || ax > 88 || ay < 0 || ay > 198) return null;
    if (ay < 37) return ay > 14 && Math.abs(ax - 50) < 11 ? 'rosto' : 'capacete';
    if (ay > 62 && ay < 113 && (ax < 31 || ax > 69)) return 'maos';
    if (ay < 131) return Math.abs(ax - 50) < 36 ? 'corpo' : null;
    return Math.abs(ax - 50) < 24 ? 'pes' : null;
  }

  private pickCat(cat: Cat) {
    if (cat === this.pc) return;
    this.pc = cat;
    navigator.vibrate?.(8);
    this.persHint.setVisible(false);
    this.drawCatBar();
    this.zoomTo(cat);
    this.drawPers(false);
  }

  /** Câmera do palco: aproxima da parte do corpo da categoria. */
  private zoomTo(cat: Cat, instant = false) {
    const z = ZOOM[cat];
    const b = this.preview;
    this.tweens.killTweensOf(b);
    if (instant) {
      b.setScale(z.s).setY(this.feetY(z));
      return;
    }
    this.tweens.add({ targets: b, scale: z.s, y: this.feetY(z), duration: 420, ease: 'Cubic.InOut' });
  }

  /** Barra de categorias: uma régua única com divisões retas (sem a inclinação, o nome cabe inteiro). */
  private drawCatBar() {
    const bar = this.catBar;
    bar.removeAll(true);
    const n = CATS.length;
    const X = 16;
    const BW = GAME_W - 32;
    const w = BW / n;
    const g = this.add.graphics();
    plate(g, X, CAT_Y, BW, CAT_H, TV.ink2, 1);
    plateLine(g, X, CAT_Y, BW, CAT_H, TV.rule, 1, 1);
    bar.add(g);
    const sel = CATS.findIndex(([id]) => id === this.pc);
    // escolhida: bloco amarelo reto (as pontas inclinadas ficam só nas bordas da régua)
    g.fillStyle(TV.yellow, 1);
    g.fillRect(X + sel * w + (sel === 0 ? 12 : 0), CAT_Y + 3, w - (sel === 0 || sel === n - 1 ? 12 : 0), CAT_H - 6);
    g.fillStyle(TV.rule, 1);
    for (let i = 1; i < n; i++) if (i !== sel && i !== sel + 1) g.fillRect(X + i * w, CAT_Y + 10, 1, CAT_H - 20);
    CATS.forEach(([id, name], i) => {
      const x = X + i * w;
      const on = i === sel;
      // nas pontas a régua é inclinada: o nome vai um pouco para dentro e tem menos largura
      const edge = i === 0 || i === n - 1;
      bar.add(fit(tvText(this, x + w / 2 + (i === 0 ? 6 : i === n - 1 ? -6 : 0), CAT_Y + CAT_H / 2, name, 12, on ? C.ink : C.white, 800, 0.2).setOrigin(0.5), w - (edge ? 22 : 10)));
      const z = this.add.zone(x, CAT_Y, w, CAT_H).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.pickCat(id));
      bar.add(z);
    });
  }

  private bodyCfg(look: LookOptions) {
    const s = getSave();
    return { look, kit: this.team.kits[look.kit], face: { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard }, number: s.number };
  }

  private updateKitTag() {
    const S = STAGE;
    const t = this.kitTag.setText(kitInfo(this.team, getSave().look.kit).name).setScale(1);
    if (t.width > S.w * 0.55) t.setScale((S.w * 0.55) / t.width, 1);
    this.kitTagBg.clear();
    plate(this.kitTagBg, S.x + 10, S.y + S.h - 33, t.displayWidth + 24, 22, TV.plate);
  }

  private updateUndo() {
    const on = this.undoStack.length > 0;
    this.undoBtn.setAlpha(on ? 1 : 0.4);
  }

  /** Grava a mudança no save (cada alteração já fica salva), atualiza a prévia e os controles. */
  private setLook(look: Partial<LookOptions>, face?: { skin?: number; hairColor?: number; beard?: number }, record = true) {
    const s = getSave();
    if (record) {
      this.undoStack.push({ look: { ...s.look }, face: { skin: s.skin, hairColor: s.hairColor, beard: s.beard } });
      if (this.undoStack.length > 40) this.undoStack.shift();
    }
    updateSave({ ...(face ?? {}), look: { ...s.look, ...look } });
    this.preview.setLook(this.bodyCfg(getSave().look));
    this.updateKitTag();
    this.updateUndo();
    this.pulse();
    this.refreshPers();
  }

  private undoLook() {
    const u = this.undoStack.pop();
    if (!u) return;
    this.setLook(u.look, u.face, false);
  }

  /** Pulinho do jogador a cada troca (o olho acha a mudança). */
  private pulse() {
    const b = this.preview;
    if (this.tweens.isTweening(b)) return;
    const s = b.scaleX;
    this.tweens.add({ targets: b, scale: s * 1.035, duration: 80, yoyo: true, ease: 'Quad.Out' });
  }

  private randomLook() {
    const rnd = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
    const p: Record<string, unknown> = {};
    for (const [k, opts] of Object.entries(OPT)) p[k] = rnd(opts as [unknown, string][])[0];
    for (const k of COLOR_KEYS) p[k] = rnd(PAL);
    p.maskC = rnd(METAL);
    delete p.kit;
    this.setLook(p as Partial<LookOptions>, { skin: Math.floor(Math.random() * SKINS.length), hairColor: Math.floor(Math.random() * HAIR_COLORS.length), beard: rnd(BEARDS)[0] });
  }

  private pers() {
    this.zoomTo(this.pc, true);
    this.drawPers(false);
    return 0;
  }

  /** Opções da categoria: todas à vista (botões lado a lado) e as cores logo abaixo; rola se precisar. */
  private drawPers(keepScroll: boolean) {
    const p = this.persPane;
    p.clear(keepScroll);
    const W = p.w;
    const s = getSave();
    const L = s.look;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => p.add(o);
    let y = 2;

    if (this.pc === 'unif') {
      // Os 3 uniformes do time, cada um com o jogador vestido
      const gap = 6;
      const cw = (W - gap * 2) / 3;
      const ch = 150;
      KIT_IDS.forEach((id, i) => {
        const { kit } = kitInfo(this.team, id);
        const on = L.kit === id;
        const x = i * (cw + gap);
        const g = this.add.graphics();
        plate(g, x, y, cw, ch, on ? TV.ink3 : TV.ink2, 1);
        plateLine(g, x, y, cw, ch, on ? TV.yellow : TV.rule, 1, on ? 2 : 1);
        add(g);
        add(new PlayerBody(this, x + cw / 2, y + 114, this.bodyCfg({ ...L, kit: id, ...kitAccents(id, kit) }), 0.33));
        add(tvText(this, x + cw / 2, y + 132, ['CASA', 'FORA', 'NOITE'][i], 15, on ? C.yellow : C.white, 800, 1).setOrigin(0.5));
        p.hit(x, y, cw, ch, () => this.setLook({ kit: id, ...kitAccents(id, kit) }));
      });
      y += ch + 12;
      const note = tvText(this, 26, y + 2, 'CORES, NÚMERO E FONTE SÃO DO SEU TIME. TROQUE O RESTO NAS OUTRAS ABAS OU TOCANDO NO JOGADOR.', 12, C.muted, 600, 0.6)
        .setWordWrapWidth(W - 30)
        .setLineSpacing(2);
      const lk = this.add.graphics();
      lk.lineStyle(2, TV.yellow, 1);
      lk.strokeRect(6, y + 3, 9, 6);
      lk.fillStyle(TV.yellow, 1);
      lk.fillRect(4, y + 8, 13, 10);
      add(lk);
      add(note);
      p.setExtent(y + note.height + 20);
      return;
    }

    const rows = this.persRows();
    this.persNow = rows;
    this.persSig = this.pc + '|' + rows.map(rowSig).join(';');
    this.persPaint = [];
    rows.forEach((r, ri) => {
      add(tvText(this, 2, y, r.n, 12, C.muted, 700, 1));
      y += 20;
      if (r.chips) {
        // botões lado a lado (quebram linha): o escolhido fica amarelo
        const CH = 34;
        let x = 0;
        const items: { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; x: number; y: number; w: number }[] = [];
        r.chips.opts.forEach((name, i) => {
          const g = add(this.add.graphics());
          const t = tvText(this, 0, 0, name, 13, C.white, 800, 0.6).setOrigin(0.5);
          // folga para a inclinação da placa: o texto nunca encosta nas pontas
          const w = Math.max(48, t.width + 30);
          if (x + w > W) {
            x = 0;
            y += CH + 6;
          }
          t.setPosition(x + w / 2, y + CH / 2);
          add(t);
          items.push({ g, t, x, y, w });
          p.hit(x - 2, y - 3, w + 4, CH + 6, () => {
            const cur = this.persNow[ri]?.chips;
            if (cur && cur.sel !== i) cur.pick(i);
          });
          x += w + 6;
        });
        const paint = (sel: number) =>
          items.forEach((it, i) => {
            const on = i === sel;
            it.g.clear();
            plate(it.g, it.x, it.y, it.w, CH, on ? TV.yellow : TV.ink3, 1);
            if (!on) plateLine(it.g, it.x, it.y, it.w, CH, TV.rule, 1, 1);
            it.t.setColor(on ? C.ink : C.white);
          });
        paint(r.chips.sel);
        this.persPaint.push((nr) => paint(nr.chips!.sel));
        y += CH;
      } else if (r.colors) {
        const g = add(this.add.graphics());
        const pal = r.colors.pal;
        const SZ = 30;
        const GP = 6;
        const per = Math.max(1, Math.floor((W + GP) / (SZ + GP)));
        const top = y;
        const paint = (sel: number) => {
          g.clear();
          pal.forEach((cc, i) => {
            const cx = (i % per) * (SZ + GP) + 3;
            const cy = top + Math.floor(i / per) * (SZ + GP);
            const on = i === sel;
            g.fillStyle(on ? TV.yellow : TV.rule, 1);
            g.fillRect(cx - (on ? 3 : 1), cy - (on ? 3 : 1), SZ + (on ? 6 : 2), SZ + (on ? 6 : 2));
            g.fillStyle(cc, 1);
            g.fillRect(cx, cy, SZ, SZ);
            if (on) {
              // marca de escolhido no canto, legível em qualquer cor
              g.fillStyle(TV.yellow, 1);
              g.fillTriangle(cx + SZ, cy + SZ - 12, cx + SZ, cy + SZ, cx + SZ - 12, cy + SZ);
            }
          });
        };
        pal.forEach((_, i) => {
          const cx = (i % per) * (SZ + GP) + 3;
          const cy = top + Math.floor(i / per) * (SZ + GP);
          p.hit(cx - 3, cy - 3, SZ + 6, SZ + 6, () => {
            const cur = this.persNow[ri]?.colors;
            if (cur && cur.sel !== i) cur.pick(i);
          });
        });
        paint(r.colors.sel);
        this.persPaint.push((nr) => paint(nr.colors!.sel));
        y += Math.ceil(pal.length / per) * (SZ + GP) - GP;
      } else if (r.button) {
        const g = add(this.add.graphics());
        plate(g, 0, y, W, 40, TV.ink3, 1);
        plateLine(g, 0, y, W, 40, TV.rule, 1, 1);
        add(tvText(this, W / 2, y + 20, r.button.text, 15, C.white, 800, 1.2).setOrigin(0.5));
        p.hit(0, y, W, 40, r.button.fn);
        this.persPaint.push(() => {});
        y += 40;
      }
      y += 16;
    });
    p.setExtent(y + 12);
  }

  /** Linhas de opções da categoria atual (com a seleção de agora). */
  private persRows(): PersRow[] {
    const s = getSave();
    const L = s.look;
    const opt = <K extends keyof typeof OPT>(k: K, n: string): PersRow => {
      const opts = OPT[k] as [unknown, string][];
      return { n, chips: { opts: opts.map((o) => o[1]), sel: opts.findIndex(([v]) => v === L[k]), pick: (i) => this.setLook({ [k]: opts[i][0] } as Partial<LookOptions>) } };
    };
    const col = (k: (typeof COLOR_KEYS)[number], n: string, pal = PAL): PersRow => ({ n, colors: { pal, sel: pal.indexOf(L[k]), pick: (i) => this.setLook({ [k]: pal[i] } as Partial<LookOptions>) } });
    // a cor só aparece quando o item existe (sem luvas = sem cor de luva)
    const colIf = (cond: boolean, k: (typeof COLOR_KEYS)[number], n: string, pal = PAL): PersRow[] => (cond ? [col(k, n, pal)] : []);
    const beardSel = Math.max(0, BEARDS.findIndex(([v]) => v === s.beard));
    const CT: Record<Exclude<Cat, 'unif'>, () => PersRow[]> = {
      capacete: () => [opt('helmet', 'CASCA'), opt('gloss', 'ACABAMENTO'), opt('mask', 'MÁSCARA'), col('maskC', 'COR DA MÁSCARA', METAL), opt('visor', 'VISEIRA'), opt('chin', 'JUGULAR'), col('chinC', 'COR DA JUGULAR')],
      rosto: () => [
        { n: 'TOM DE PELE', colors: { pal: SKINS, sel: s.skin, pick: (i) => this.setLook({}, { skin: i }) } },
        { n: 'BARBA', chips: { opts: BEARDS.map(([v]) => (v < 0 ? 'SEM' : String(v + 1))), sel: beardSel, pick: (i) => this.setLook({}, { beard: BEARDS[i][0] }) } },
        opt('hairOut', 'CABELO PARA FORA DO CAPACETE'),
        { n: 'COR DO CABELO E DA BARBA', colors: { pal: HAIR_COLORS, sel: s.hairColor, pick: (i) => this.setLook({}, { hairColor: i }) } },
        opt('eyeblack', 'EYE BLACK'),
        opt('mouth', 'PROTETOR BUCAL'),
        ...colIf(L.mouth !== 'none', 'mouthC', 'COR DO PROTETOR'),
      ],
      corpo: () => [
        opt('jerseyLen', 'CAMISA'),
        opt('under', 'CAMISA POR BAIXO'),
        ...colIf(L.under !== 'none', 'underC', 'COR DA CAMISA POR BAIXO'),
        opt('pants', 'CALÇA'),
        opt('knee', 'JOELHEIRA'),
        ...colIf(L.knee !== 'none', 'kneeC', 'COR DA JOELHEIRA'),
        opt('nroll', 'PROTETOR DE PESCOÇO'),
        ...colIf(L.nroll !== 'none', 'nrollC', 'COR DO PROTETOR DE PESCOÇO'),
      ],
      maos: () => [
        opt('gloves', 'LUVAS'),
        ...colIf(L.gloves !== 'none', 'gloveC', 'COR DAS LUVAS'),
        opt('wrist', 'MUNHEQUEIRA'),
        ...colIf(L.wrist !== 'none', 'wristC', 'COR DA MUNHEQUEIRA'),
        opt('asl', 'MANGA DE COMPRESSÃO'),
        ...colIf(L.asl !== 'none', 'aslC', 'COR DA MANGA'),
      ],
      pes: () => [opt('sock', 'MEIÃO'), col('sockC', 'COR DO MEIÃO'), opt('sstripe', 'LISTRAS DO MEIÃO'), ...colIf(L.sstripe !== 'none', 'sstripeC', 'COR DAS LISTRAS'), opt('cleats', 'CHUTEIRA'), col('cleatC', 'COR DA CHUTEIRA'), opt('cacc', 'DETALHE DA CHUTEIRA'), ...colIf(L.cacc !== 'none', 'caccC', 'COR DO DETALHE')],
      extras: () => [
        opt('towel', 'TOALHA'),
        ...colIf(L.towel !== 'none', 'towelC', 'COR DA TOALHA'),
        opt('celebration', 'COMEMORAÇÃO DE TOUCHDOWN'),
        {
          n: 'VISUAL',
          button: {
            text: 'RESTAURAR O PADRÃO',
            fn: () => {
              const k = getSave().look.kit;
              this.setLook({ ...DEFAULT_LOOK, kit: k, ...kitAccents(k, this.team.kits[k]) });
            },
          },
        },
      ],
    };
    return this.pc === 'unif' ? [] : CT[this.pc]();
  }

  /** Depois de uma troca: se a lista tem a mesma forma, só repinta a seleção; senão redesenha. */
  private refreshPers() {
    if (this.pc === 'unif') return this.drawPers(true);
    const rows = this.persRows();
    if (this.pc + '|' + rows.map(rowSig).join(';') !== this.persSig) return this.drawPers(true);
    this.persNow = rows;
    rows.forEach((r, i) => this.persPaint[i]?.(r));
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
      const h = open ? 62 + 2 * 44 + 50 : 62;
      this.card(16, y, W, h, p.me ? OR : CARD, p.me ? 0.16 : 0.72, p.me ? OR : 0xffffff, p.me ? 1 : open ? 0.33 : 0.12, 14);
      this.portrait(26, y + 8, 46, p.face, this.team, p.me ? OR : undefined);
      // número na camisa, no canto da foto
      const g = this.add.graphics();
      g.fillStyle(this.team.colors.primary, 1);
      fillPlate(g, 58, y + 40, 22, 18, 6);
      g.lineStyle(1, 0xffffff, 0.5);
      strokePlate(g, 58, y + 40, 22, 18, 6);
      g.fillStyle(ovc(p.ovr), 1);
      fillPlate(g, 16 + W - 50, y + 16, 38, 30, 8);
      this.body.add(g);
      this.T(69, y + 49, String(p.num), 7, fgOn(this.team.colors.primary), 'title').setOrigin(0.5);
      this.T(90, y + 20, p.name, 11);
      this.T(90, y + 38, `${p.pos} · ${p.age} ANOS · ${p.tag}`, 9, '#9AA3C0');
      this.T(16 + W - 31, y + 31, String(p.ovr), 11, '#0D0D12', 'title').setOrigin(0.5);
      if (open) {
        const lp = league().byId.get(p.id);
        const cols = COLS[grpOf(p.pos)];
        const sl = lp && lp.season.gp ? cols.map((c) => `${(c.fmt ?? nf)(c.v(lp.season))} ${c.k}`).join(' · ') : 'SEM JOGOS NA TEMPORADA';
        this.T(28, y + h - 30, sl, 9, hex(YE)).setOrigin(0, 0.5);
        this.body.add(arrowAfter(this, this.T(16 + W - 12, y + h - 30, 'FICHA', 10, '#FFFFFF', 'title').setOrigin(1, 0.5) as Phaser.GameObjects.Text, C.white));
        this.body.hit(16 + W - 100, y + h - 48, 100, 40, () => this.openPlayer(p.id));
        p.attrs.forEach(([n, v], k) => {
          const cx = 28 + (k % 2) * ((W - 24) / 2 + 7);
          const cy = y + 68 + Math.floor(k / 2) * 44;
          const cw = (W - 24) / 2 - 7;
          this.T(cx, cy, n, 9, '#C9CEE0');
          this.T(cx + cw, cy, String(v), 9, hex(ovc(v)), 'title').setOrigin(1, 0);
          this.bar(cx, cy + 23, cw, 6, v / 100, ovc(v));
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
    // Você: foto, posição na liga e atalho para a ficha
    const meP = league().byId.get('me');
    this.card(16, y, W, 92, OR, 0.14, OR, 0.7, 16);
    this.portrait(28, y + 12, 68, { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard }, this.team, OR);
    this.T(110, y + 24, `${s.name} · #${s.number} QB`, 11, '#FFFFFF', 'title').setOrigin(0, 0.5);
    this.T(110, y + 46, `${this.team.name} · OVR ${s.ovr}`, 9, '#C9CEE0').setOrigin(0, 0.5);
    if (meP?.season.gp) {
      const qbs = league().players.filter((x) => x.pos === 'QB').sort((a, b) => b.season.pyds - a.season.pyds);
      this.T(110, y + 66, `${qbs.findIndex((x) => x.id === 'me') + 1}º EM JARDAS ENTRE ${qbs.length} QBS`, 9, hex(YE)).setOrigin(0, 0.5);
    } else this.T(110, y + 66, 'NOVATO · ESTREIA NA SEMANA 1', 9, hex(YE)).setOrigin(0, 0.5);
    this.body.add(arrowAfter(this, this.T(16 + W - 12, y + 80, 'FICHA', 9, '#FFFFFF', 'title').setOrigin(1, 0.5) as Phaser.GameObjects.Text, C.white));
    this.body.hit(16, y, W, 92, () => this.openPlayer('me'));
    y += 104;
    y += this.chips(y, tabs, this.st, (i) => ((this.st = i), this.show('stats')), true) + 12;
    const ss = seasonStats();
    // Uma temporada só por enquanto: CARREIRA = TEMPORADA
    const line = this.st === 2 ? ss.last : ss.total;
    const dash = !line;
    const v = (n: number) => (dash ? '–' : n.toLocaleString('pt-BR'));
    const pct = line && line.att ? Math.round((line.comp / line.att) * 100) : 0;
    const cards: [string, string, number][] = [
      [v(line?.yards ?? 0), 'JARDAS', 0xffffff],
      [v(line?.td ?? 0), 'TDS', GR],
      [v(line?.int ?? 0), 'INTS', RD],
      [dash ? '–' : `${pct}%`, 'COMPLETOS', 0xffffff],
      [dash ? '–' : String(passerRating(line!)).replace('.', ','), 'RATING', YE],
      this.st === 1 ? [String(s.combine?.score ?? '–'), 'NOTA COMBINE', OR] : [v(line?.sacks ?? 0), 'SACKS SOFR.', 0xffffff],
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
    // Uma barra por semana com jogo; altura pelas jardas (máx. 400)
    const weeks = schedule().filter((g) => !g.bye);
    const nb = weeks.length;
    const bw = (W - 28 - (nb - 1) * 6) / nb;
    const nextW = nextGame()?.week;
    weeks.forEach((wk, i) => {
      const x = 30 + i * (bw + 6);
      const yd = wk.stats?.yards;
      const bh = yd === undefined ? 3 : Math.max(4, Math.min(1, yd / 400) * 96);
      const g = this.add.graphics();
      g.fillStyle(yd !== undefined ? OR : wk.week === nextW ? 0x4a3a30 : TV.ink3, 1);
      fillPlate(g, x, y + 138 - bh, bw, bh, { tl: 3, tr: 3, bl: 0, br: 0 });
      this.body.add(g);
      this.T(x + bw / 2, y + 128 - bh, yd === undefined ? '–' : String(yd), 8, '#C9CEE0').setOrigin(0.5);
      this.T(x + bw / 2, y + 152, `S${wk.week}`, 8, '#6E7593').setOrigin(0.5);
    });
    y += 182;
    // Líderes da liga em passe (e você, novato)
    const leaders = passLeaders();
    this.card(16, y, W, 40 + 4 * 32);
    this.T(30, y + 16, 'LÍDERES DA LIGA · PASSE', 9, '#C9CEE0', 'title');
    [...leaders, { rank: '—', name: `${s.name} (${this.team.name})`, color: this.team.colors.primary, value: ss.games.length ? `${ss.total.yards.toLocaleString('pt-BR')} JD` : 'NOVATO' }].forEach((l, i) => {
      const yy = y + 38 + i * 32;
      if (i === 3) {
        const hg = this.add.graphics();
        hg.fillStyle(OR, 0.16);
        fillPlate(hg, 24, yy - 2, W - 16, 28, 10);
        this.body.add(hg);
      }
      this.T(32, yy + 12, l.rank, 10, '#9AA3C0').setOrigin(0, 0.5);
      this.body.add(this.add.circle(58, yy + 12, 4, l.color));
      this.T(70, yy + 12, l.name, 10).setOrigin(0, 0.5);
      this.T(16 + W - 14, yy + 12, l.value, 10, hex(YE)).setOrigin(1, 0.5);
    });
    return y + 40 + 4 * 32;
  }

  // ================================================================ liga

  /** Foto do rosto do jogador: quadro na cor do time, ombros nas cores do time, cantos recortados. */
  private portrait(x: number, y: number, size: number, face: FaceLook, team: CareerTeam, ring?: number) {
    for (const o of drawPortrait(this, x, y, size, face, team.colors.primary, team.colors.secondary, ring)) this.body.add(o);
  }

  /** Botão de voltar no topo das fichas. */
  private backChip(y: number, text: string, fn: () => void) {
    const t = tvText(this, 0, y + 16, text, 14, C.white, 800, 1).setOrigin(0, 0.5);
    const w = t.width + 50;
    const g = this.add.graphics();
    plate(g, 16, y, w, 32, TV.ink3);
    g.lineStyle(2.5, TV.yellow, 1);
    g.beginPath();
    g.moveTo(37, y + 10);
    g.lineTo(31, y + 16);
    g.lineTo(37, y + 22);
    g.strokePath();
    t.setX(46);
    this.body.add(g);
    this.body.add(t);
    this.body.hit(16, y, w, 32, fn);
    return 32;
  }

  private openPlayer(id: string) {
    this.plSel = id;
    this.show(this.tab);
  }
  private openTeam(id: string) {
    this.plSel = null;
    this.teamSel = id;
    this.show('times');
  }

  /** Cabeçalho de seção. */
  private section(y: number, text: string, right?: string) {
    this.body.add(sectionHead(this, 16, y + 9, text, right));
    return 24;
  }

  // ---- JOGADORES (estatísticas da liga)
  private jogadores() {
    const W = GAME_W - 32;
    const lg = league();
    const grp = POS_TABS[this.plPos];
    const cols = COLS[grp];
    let y = 4;
    y += this.chips(y, POS_TABS, this.plPos, (i) => ((this.plPos = i), (this.plSort = 0), (this.plAsc = false), (this.plLimit = 40), this.show('jogadores')), true) + 8;
    y += this.chips(y, ['LIGA', 'QAC', 'QNC', 'MEU TIME'], this.plScope, (i) => ((this.plScope = i), (this.plLimit = 40), this.show('jogadores')), true) + 12;
    const me = this.team.id;
    const rows = lg.players.filter((p) => {
      if (grpOf(p.pos) !== grp) return false;
      if (this.plScope === 1 || this.plScope === 2) return divisionOf(p.team).conf === this.plScope - 1;
      if (this.plScope === 3) return p.team.id === me;
      return true;
    });
    const col = cols[this.plSort];
    rows.sort((a, b) => (this.plAsc ? -1 : 1) * (col.v(b.season) - col.v(a.season)) || b.ovr - a.ovr);
    // Resumo
    const sub = lg.weeksPlayed ? `${rows.length} JOGADORES · ATÉ A SEMANA ${lg.weeksPlayed}` : `${rows.length} JOGADORES · TEMPORADA AINDA NÃO COMEÇOU`;
    this.T(16, y, `${grp === 'DEF' ? 'DEFESA' : grp === 'K' ? 'KICKERS' : grp + 'S'} · ${col.name}`, 9, hex(YE), 'title');
    this.T(16, y + 18, sub, 9, '#6E7593');
    y += 38;
    // Cabeçalho (tocar ordena; tocar de novo inverte)
    const cx = (i: number) => 16 + W - 26 - (cols.length - 1 - i) * 46;
    const h = 34 + Math.min(rows.length, this.plLimit) * 52;
    this.card(16, y, W, h);
    this.T(36, y + 17, '#', 9, '#6E7593').setOrigin(0.5);
    this.T(96, y + 17, 'JOGADOR', 9, '#6E7593').setOrigin(0, 0.5);
    cols.forEach((c, i) => {
      const on = i === this.plSort;
      if (on) {
        const g = this.add.graphics();
        g.fillStyle(OR, 0.25);
        fillPlate(g, cx(i) - 22, y + 5, 44, 24, 7);
        this.body.add(g);
      }
      const hk = this.T(cx(i), y + 17, c.k, 9, on ? hex(YE) : '#9AA3C0').setOrigin(0.5) as Phaser.GameObjects.Text;
      if (on) this.body.add(arrowAfter(this, hk, hex(YE), this.plAsc ? 'up' : 'down'));
      this.body.hit(cx(i) - 23, y, 46, 34, () => {
        if (on) this.plAsc = !this.plAsc;
        else (this.plSort = i), (this.plAsc = false);
        this.show('jogadores');
      });
    });
    const line = this.add.graphics();
    line.fillStyle(0xffffff, 0.08);
    line.fillRect(16, y + 33, W, 1);
    this.body.add(line);
    rows.slice(0, this.plLimit).forEach((p, i) => {
      const yy = y + 34 + i * 52;
      const mine = p.me;
      if (mine || i % 2) {
        const g = this.add.graphics();
        g.fillStyle(mine ? TV.ink3 : 0xffffff, mine ? 1 : 0.025);
        g.fillRect(17, yy, W - 2, 52);
        this.body.add(g);
      }
      const rk = this.T(36, yy + 26, String(i + 1), 10, i < 3 ? hex(YE) : '#9AA3C0', i < 3 ? 'title' : 'label').setOrigin(0.5);
      if (rk.width > 20) rk.setScale(20 / rk.width);
      this.portrait(50, yy + 7, 38, p.face, p.team, mine ? OR : undefined);
      const nm = this.T(96, yy + 18, p.name, 10, mine ? hex(YE) : '#FFFFFF').setOrigin(0, 0.5);
      const maxW = cx(0) - 26 - 96;
      if (nm.width > maxW) nm.setText(p.name.split(' ').map((w, k) => (k === 0 ? w[0] + '.' : w)).join(' '));
      fit(nm, maxW);
      this.body.add(this.add.image(103, yy + 36, p.team.logo.small).setDisplaySize(14, 14));
      this.T(114, yy + 36, `${p.team.abbr} · ${p.pos} · ${p.ovr}`, 8, '#9AA3C0').setOrigin(0, 0.5);
      cols.forEach((c, k) => {
        const v = c.v(p.season);
        this.T(cx(k), yy + 26, p.season.gp ? (c.fmt ?? nf)(v) : '–', k === this.plSort ? 9 : 10, k === this.plSort ? '#FFFFFF' : '#C9CEE0', k === this.plSort ? 'title' : 'label').setOrigin(0.5);
      });
      this.body.hit(16, yy, W, 52, () => this.openPlayer(p.id));
    });
    y += h + 12;
    if (rows.length > this.plLimit) {
      const b = this.add.graphics();
      b.fillStyle(CARD, 0.8);
      fillPlate(b, 16, y, W, 40, 12);
      b.lineStyle(1, OR, 0.6);
      strokePlate(b, 16, y, W, 40, 12);
      this.body.add(b);
      this.T(GAME_W / 2, y + 20, `VER MAIS (${rows.length - this.plLimit})`, 9, hex(YE), 'title').setOrigin(0.5);
      this.body.hit(16, y, W, 40, () => ((this.plLimit += 40), this.show('jogadores')));
      y += 52;
    }
    this.T(GAME_W / 2, y + 4, 'TOQUE NO JOGADOR: FICHA · NA COLUNA: ORDENAR', 8, '#6E7593').setOrigin(0.5);
    return y + 16;
  }

  // ---- Ficha do jogador
  private playerPage(id: string) {
    const W = GAME_W - 32;
    const lg = league();
    const p = lg.byId.get(id);
    if (!p) {
      this.plSel = null;
      return 0;
    }
    const grp = grpOf(p.pos);
    const t = p.team;
    let y = 4;
    y += this.backChip(y, 'VOLTAR', () => ((this.plSel = null), this.show(this.tab))) + 12;
    // Herói: foto grande, nome, número, posição, time
    const hh = 168;
    this.body.add(gradCard(this, 16, y, W, hh, { from: t.colors.primary, solid: true }));
    this.body.add(this.add.image(16 + W - 50, y + 44, t.logo.large).setDisplaySize(80, 80).setAlpha(0.2));
    this.portrait(30, y + 16, 136, p.face, t, p.me ? OR : 0xffffff);
    this.T(180, y + 22, `#${p.num} · ${p.pos}`, 10, '#E8EAF2', 'title');
    const parts = p.name.split(' ');
    const nm = this.T(180, y + 48, parts[0], 12, '#FFFFFF', 'title');
    const ln = this.T(180, y + 70, parts.slice(1).join(' ') || ' ', 12, '#FFFFFF', 'title');
    if (nm.width > W - 176 || ln.width > W - 176) nm.setFontSize(10), ln.setFontSize(10);
    this.body.add(this.add.image(189, y + 104, t.logo.small).setDisplaySize(18, 18));
    this.T(202, y + 104, t.name, 9, '#E8EAF2').setOrigin(0, 0.5);
    this.T(180, y + 124, `${p.age} ANOS · ${p.tag}`, 9, '#C9CEE0').setOrigin(0, 0.5);
    const og = this.add.graphics();
    og.fillStyle(ovc(p.ovr), 1);
    fillPlate(og, 180, y + 136, 72, 24, 8);
    this.body.add(og);
    this.T(216, y + 148, `OVR ${p.ovr}`, 8, '#0D0D12', 'title').setOrigin(0.5);
    this.body.hit(180, y + 94, 170, 20, () => this.openTeam(t.id));
    y += hh + 14;

    // Temporada: blocos principais da posição
    const s = p.season;
    const ts = lg.teams.get(t.id)!;
    const pc = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');
    const tiles: [string, string, number][] =
      grp === 'QB'
        ? [[nf(s.pyds), 'JARDAS', 0xffffff], [nf(s.ptd), 'TDS', GR], [nf(s.int), 'INTS', RD], [pc(s.cmp, s.att), 'COMPLETOS', 0xffffff], [s.att ? f1(rate(s)) : '–', 'RATING', YE], [nf(s.sk), 'SACKS SOFR.', 0xffffff]]
        : grp === 'RB'
          ? [[nf(s.ryds), 'JARDAS', 0xffffff], [nf(s.rtd), 'TDS', GR], [s.ratt ? f1(s.ryds / s.ratt) : '–', 'MÉDIA', YE], [nf(s.ratt), 'CORRIDAS', 0xffffff], [nf(s.rec), 'RECEPÇÕES', 0xffffff], [nf(s.yds), 'JD RECEB.', 0xffffff]]
          : grp === 'WR' || grp === 'TE'
            ? [[nf(s.rec), 'RECEPÇÕES', 0xffffff], [nf(s.yds), 'JARDAS', 0xffffff], [nf(s.td), 'TDS', GR], [nf(s.tgt), 'ALVOS', 0xffffff], [s.rec ? f1(s.yds / s.rec) : '–', 'MÉDIA', YE], [nf(s.lng), 'MAIS LONGA', 0xffffff]]
            : grp === 'DEF'
              ? [[nf(s.tck), 'TACKLES', 0xffffff], [nf(s.sacks), 'SACKS', GR], [nf(s.dint), 'INTS', YE], [nf(s.ff), 'FUMBLES FORÇ.', 0xffffff], [s.gp ? f1(s.tck / s.gp) : '–', 'TACKLES/JOGO', 0xffffff], [nf(s.gp), 'JOGOS', 0xffffff]]
              : grp === 'K'
                ? [[nf(s.fgm), 'FIELD GOALS', 0xffffff], [nf(s.fga), 'TENTATIVAS', 0xffffff], [pc(s.fgm, s.fga), 'APROVEIT.', YE], [nf(s.xpm), 'PONTOS EXTRAS', 0xffffff], [nf(s.fgm * 3 + s.xpm), 'PONTOS', GR], [nf(s.gp), 'JOGOS', 0xffffff]]
                : [[nf(s.gp), 'JOGOS', 0xffffff], [nf(ts.rushYds), 'JD CORRIDA TIME', GR], [nf(ts.passYds), 'JD PASSE TIME', 0xffffff]];
    y += this.section(y, `TEMPORADA ${seasonYear()}`, s.gp ? `${s.gp} ${s.gp === 1 ? 'JOGO' : 'JOGOS'}` : 'SEM JOGOS AINDA');
    const cw = (W - 16) / 3;
    tiles.forEach(([v, n, c], i) => {
      const x = 16 + (i % 3) * (cw + 8);
      const yy = y + Math.floor(i / 3) * 70;
      this.card(x, yy, cw, 62, CARD, 0.72, 0xffffff, 0.14, 12);
      this.T(x + cw / 2, yy + 22, s.gp ? v : '–', 13, hex(c), 'title').setOrigin(0.5);
      this.T(x + cw / 2, yy + 44, n, 9, '#9AA3C0').setOrigin(0.5);
    });
    y += Math.ceil(tiles.length / 3) * 70 + 4;
    // Posição na liga na estatística principal
    const cols = COLS[grp];
    if (cols.length && s.gp) {
      const same = lg.players.filter((x) => grpOf(x.pos) === grp).sort((a, b) => cols[0].v(b.season) - cols[0].v(a.season));
      const rk = same.findIndex((x) => x.id === p.id) + 1;
      this.card(16, y, W, 40, OR, 0.14, OR, 0.6, 12);
      this.T(30, y + 20, `${rk}º DE ${same.length} NA LIGA EM ${cols[0].name}`, 9, hex(YE), 'title').setOrigin(0, 0.5);
      y += 52;
    }
    // Atributos
    y += this.section(y, 'ATRIBUTOS');
    const ah = 22 + Math.ceil(p.attrs.length / 2) * 46;
    this.card(16, y, W, ah);
    p.attrs.forEach(([n, v], k) => {
      const ax = 30 + (k % 2) * ((W - 28) / 2 + 8);
      const ay = y + 14 + Math.floor(k / 2) * 46;
      const aw = (W - 28) / 2 - 8;
      this.T(ax, ay, n, 9, '#C9CEE0');
      this.T(ax + aw, ay, String(v), 9, hex(ovc(v)), 'title').setOrigin(1, 0);
      this.bar(ax, ay + 24, aw, 7, v / 100, ovc(v));
    });
    y += ah + 14;
    // Jogo a jogo
    if (cols.length) {
      y += this.section(y, 'JOGO A JOGO');
      const rows = p.log;
      const lh = 34 + Math.max(1, rows.length) * 40;
      this.card(16, y, W, lh);
      const gx = (i: number) => 16 + W - 24 - (cols.length - 1 - i) * 42;
      this.T(34, y + 17, 'SEM', 9, '#6E7593').setOrigin(0, 0.5);
      this.T(74, y + 17, 'ADVERSÁRIO', 9, '#6E7593').setOrigin(0, 0.5);
      cols.forEach((c, i) => this.T(gx(i), y + 17, c.k, 9, '#6E7593').setOrigin(0.5));
      if (!rows.length) this.T(GAME_W / 2, y + 54, 'NENHUM JOGO AINDA', 9, '#6E7593').setOrigin(0.5);
      rows.forEach((r, i) => {
        const yy = y + 34 + i * 40;
        const o = TeamRepository.get(r.opp);
        this.T(34, yy + 20, `S${r.week}`, 9, '#9AA3C0').setOrigin(0, 0.5);
        this.body.add(this.add.image(84, yy + 20, o.logo.small).setDisplaySize(20, 20));
        this.T(98, yy + 13, `${r.home ? 'vs' : '@'} ${o.abbr}`, 9, '#FFFFFF').setOrigin(0, 0.5);
        const win = r.us > r.them;
        this.T(98, yy + 28, `${win ? 'V' : r.us < r.them ? 'D' : 'E'} ${r.us}-${r.them}`, 8, win ? hex(GR) : r.us < r.them ? hex(RD) : '#9AA3C0').setOrigin(0, 0.5);
        cols.forEach((c, k) => this.T(gx(k), yy + 20, (c.fmt ?? nf)(c.v(r.line)), 10, '#E8EAF2').setOrigin(0.5));
      });
      y += lh + 14;
    }
    // Contrato
    this.card(16, y, W, 46);
    this.T(30, y + 23, 'CONTRATO', 9, '#9AA3C0').setOrigin(0, 0.5);
    this.T(16 + W - 14, y + 23, `${mi(p.contract.value)}/ANO · ATÉ ${p.contract.until}`, 10, hex(YE)).setOrigin(1, 0.5);
    return y + 46;
  }

  // ---- TIMES
  private times() {
    const W = GAME_W - 32;
    let y = 4;
    y += this.chips(y, [...CONFS], this.tconf, (i) => ((this.tconf = i), this.show('times')), true) + 14;
    const cw = (W - 10) / 2;
    for (let d = 0; d < 4; d++) {
      const div = this.tconf * 4 + d;
      y += this.section(y, `${CONFS[this.tconf]} ${DIVS[d]}`);
      divisionTable(div).forEach((x, i) => {
        const cx = 16 + (i % 2) * (cw + 10);
        const cy = y + Math.floor(i / 2) * 86;
        const mine = x.team.id === this.team.id;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.3);
        fillPlate(g, cx, cy + 4, cw, 78, 14);
        this.body.add(g);
        this.body.add(gradCard(this, cx, cy, cw, 78, { from: x.team.colors.primary, solid: true, stroke: mine ? OR : 0xffffff, strokeAlpha: mine ? 1 : 0.18, strokeWidth: mine ? 2 : 1 }));
        this.body.add(this.add.image(cx + 30, cy + 39, x.team.logo.small).setDisplaySize(42, 42));
        const nm = this.T(cx + 58, cy + 22, x.team.name, 8, '#FFFFFF', 'title').setOrigin(0, 0.5);
        if (nm.width > cw - 64) nm.setFontSize(6);
        this.T(cx + 58, cy + 42, `${x.w}-${x.l}${x.t ? `-${x.t}` : ''} · ${i + 1}º`, 10, '#E8EAF2').setOrigin(0, 0.5);
        this.T(cx + 58, cy + 60, `OVR ${x.team.ovr}`, 8, "#E8EAF2").setOrigin(0, 0.5);
        const ts = teamTitles(x.team.id).qflTotal;
        if (ts) {
          const tn = this.body.add(tvText(this, cx + cw - 12, cy + 60, String(ts), 15, C.yellow, 800, 0).setOrigin(1, 0.5)) as Phaser.GameObjects.Text;
          this.body.add(star(this.add.graphics(), tn.x - tn.width - 9, cy + 60, 7));
        }
        this.body.hit(cx, cy, cw, 78, () => this.openTeam(x.team.id));
      });
      y += 2 * 86 + 10;
    }
    return y;
  }

  // ---- Página do time
  private teamPage(id: string) {
    const W = GAME_W - 32;
    const lg = league();
    const x = lg.teams.get(id)!;
    const t = x.team;
    const base = teamById(id);
    const d = divisionOf(t);
    const divRank = divisionTable(d.div).findIndex((r) => r.team.id === id) + 1;
    const seed = conferenceSeeds(d.conf).findIndex((r) => r.x.team.id === id) + 1;
    const played = x.w + x.l + x.t > 0;
    let y = 4;
    y += this.backChip(y, 'TODOS OS TIMES', () => ((this.teamSel = null), this.show('times'))) + 12;
    // Herói
    const hh = 176;
    this.body.add(gradCard(this, 16, y, W, hh, { from: t.colors.primary, solid: true }));
    const g = this.add.graphics();
    g.fillStyle(t.colors.secondary, 1);
    g.fillRect(16, y + hh - 34, W, 3);
    g.lineStyle(1, 0xffffff, 0.2);
    strokePlate(g, 16, y, W, hh, 18);
    this.body.add(g);
    this.body.add(this.add.image(78, y + 70, t.logo.large).setDisplaySize(104, 104));
    const nm = this.T(144, y + 24, t.name, 13, '#FFFFFF', 'title');
    if (nm.width > W - 136) nm.setFontSize(10);
    this.T(144, y + 50, `${d.full} · ${divRank}º LUGAR`, 9, '#E8EAF2');
    this.T(144, y + 72, `${x.w}-${x.l}${x.t ? `-${x.t}` : ''}`, 20, hex(YE), 'title');
    this.T(144, y + 108, played ? `SEQUÊNCIA ${x.streak}` : 'TEMPORADA NÃO COMEÇOU', 8, '#E8EAF2');
    this.T(144, y + 124, played ? `${seed}º NA ${d.confName}${seed <= PLAYOFF_SPOTS ? ' · ZONA DE PLAYOFF' : ''}` : `PROJEÇÃO ${x.proj}`, 8, seed <= PLAYOFF_SPOTS && played ? hex(GR) : '#C9CEE0');
    this.T(30, y + hh - 16, `${t.stadium.name} · ${t.stadium.capacity.toLocaleString('pt-BR')}`, 8, '#E8EAF2').setOrigin(0, 0.5);
    this.T(16 + W - 14, y + hh - 16, `TÉC. ${coachOf(t).name}`, 8, '#E8EAF2').setOrigin(1, 0.5);
    y += hh + 14;
    // Títulos: os reais da NFL (mesma franquia/cidade) e os conquistados no jogo, com os anos
    const tt = teamTitles(id);
    y += this.section(y, 'TÍTULOS', `${tt.qflTotal + tt.nfl.length + tt.afl.length} NO TOTAL`);
    const tw = (W - 16) / 3;
    ([['QFL BOWL', tt.qflTotal], ['NFL ANTIGOS', tt.nfl.length], ['AFL', tt.afl.length]] as [string, number][]).forEach(([n, v], i) => {
      const cx = 16 + i * (tw + 8);
      this.card(cx, y, tw, 62, v ? OR : CARD, 0.4, v ? YE : 0xffffff, v ? 0.6 : 0.14, 12);
      this.T(cx + tw / 2, y + 24, String(v), 16, v ? hex(YE) : '#6E7593', 'title').setOrigin(0.5);
      this.T(cx + tw / 2, y + 47, n, 8, '#C9CEE0').setOrigin(0.5);
    });
    y += 70;
    const lines: [string, string, string][] = [];
    if (tt.sb.length) lines.push(['QFL BOWL (HISTÓRICO REAL)', tt.sb.join(' · '), '#C9CEE0']);
    if (tt.game.length) lines.push(['QFL BOWL NO JOGO', tt.game.join(' · '), hex(YE)]);
    if (tt.nfl.length) lines.push(['NFL ANTES DO SUPER BOWL', tt.nfl.join(' · '), '#C9CEE0']);
    if (tt.afl.length) lines.push(['AFL', tt.afl.join(' · '), '#C9CEE0']);
    if (lines.length) {
      let ly = y + 12;
      const items: Phaser.GameObjects.Text[] = [];
      for (const [name, years, col] of lines) {
        const a = label(this, 30, ly, name, 8, '#6E7593');
        const b = label(this, 30, ly + 14, years, 9, col).setWordWrapWidth(W - 28).setLineSpacing(3);
        items.push(a, b);
        ly += 14 + b.height + 10;
      }
      this.card(16, y, W, ly - y + 2);
      items.forEach((o) => this.body.add(o));
      y = ly + 14;
    } else {
      this.T(30, y + 4, 'SEM TÍTULOS AINDA', 9, '#6E7593');
      y += 24;
    }
    // Força do time
    y += this.section(y, 'FORÇA DO TIME', `OVR ${t.ovr}`);
    const fh = 20 + 3 * 30;
    this.card(16, y, W, fh);
    ([['ATAQUE', base.atk], ['DEFESA', base.def], ['ESPECIAIS', base.esp]] as [string, number][]).forEach(([n, v], i) => {
      const yy = y + 18 + i * 30;
      this.T(30, yy + 4, n, 9, '#C9CEE0').setOrigin(0, 0.5);
      this.bar(118, yy, W - 150, 8, v / 100, ovc(v));
      this.T(16 + W - 14, yy + 4, String(v), 9, hex(ovc(v)), 'title').setOrigin(1, 0.5);
    });
    y += fh + 14;
    // Estatísticas com ranking na liga
    const gp = (r: TeamSeason) => Math.max(1, r.w + r.l + r.t);
    const per = (v: number) => (played ? f1(v / gp(x)) : '–');
    const rk = (m: (r: TeamSeason) => number, low = false) => (played ? `${teamRank(id, m, low)}º NA LIGA` : '');
    const st: [string, string, string][] = [
      [per(x.pf), 'PONTOS/JOGO', rk((r) => r.pf / gp(r))],
      [per(x.pa), 'SOFRIDOS/JOGO', rk((r) => r.pa / gp(r), true)],
      [per(x.passYds), 'JD PASSE/JOGO', rk((r) => r.passYds / gp(r))],
      [per(x.rushYds), 'JD CORRIDA/JOGO', rk((r) => r.rushYds / gp(r))],
      [per(x.passYdsAllowed + x.rushYdsAllowed), 'JD CEDIDAS/JOGO', rk((r) => (r.passYdsAllowed + r.rushYdsAllowed) / gp(r), true)],
      [played ? `${x.takeaways - x.giveaways > 0 ? '+' : ''}${x.takeaways - x.giveaways}` : '–', 'SALDO TURNOVER', rk((r) => r.takeaways - r.giveaways)],
      [played ? String(x.sacks) : '–', 'SACKS', rk((r) => r.sacks)],
      [played ? `${x.home[0]}-${x.home[1]}` : '–', 'EM CASA', ''],
      [played ? `${x.away[0]}-${x.away[1]}` : '–', 'FORA', ''],
    ];
    y += this.section(y, 'ESTATÍSTICAS');
    const cw = (W - 16) / 3;
    st.forEach(([v, n, r], i) => {
      const cx = 16 + (i % 3) * (cw + 8);
      const cy = y + Math.floor(i / 3) * 74;
      this.card(cx, cy, cw, 66, CARD, 0.72, 0xffffff, 0.14, 12);
      this.T(cx + cw / 2, cy + (r ? 18 : 22), v, 12, '#FFFFFF', 'title').setOrigin(0.5);
      this.T(cx + cw / 2, cy + (r ? 37 : 44), n, 8, '#9AA3C0').setOrigin(0.5);
      if (r) this.T(cx + cw / 2, cy + 53, r, 8, hex(OR)).setOrigin(0.5);
    });
    y += 3 * 74 + 10;
    // Líderes do time (com foto)
    const ps = lg.players.filter((p) => p.team.id === id);
    const best = (f: (p: LeaguePlayer) => boolean, v: (l: StatLine) => number) => ps.filter(f).sort((a, b) => v(b.season) - v(a.season) || b.ovr - a.ovr)[0];
    const leaders: [string, LeaguePlayer, (l: StatLine) => string][] = [
      ['PASSE', best((p) => p.pos === 'QB', (l) => l.pyds), (l) => `${nf(l.pyds)} JD · ${l.ptd} TD`],
      ['CORRIDA', best((p) => p.pos === 'RB', (l) => l.ryds), (l) => `${nf(l.ryds)} JD · ${l.rtd} TD`],
      ['RECEPÇÃO', best((p) => ['WR', 'TE', 'RB'].includes(p.pos), (l) => l.yds), (l) => `${nf(l.yds)} JD · ${l.td} TD`],
      ['DEFESA', best((p) => grpOf(p.pos) === 'DEF', (l) => l.tck + l.sacks * 4 + l.dint * 6), (l) => `${l.tck} TCK · ${l.sacks} SK`],
    ];
    y += this.section(y, 'LÍDERES DO TIME');
    const lw = (W - 8) / 2;
    leaders.forEach(([cat, p, fmt], i) => {
      const cx = 16 + (i % 2) * (lw + 8);
      const cy = y + Math.floor(i / 2) * 92;
      this.card(cx, cy, lw, 84, CARD, 0.72, 0xffffff, 0.14, 14);
      this.portrait(cx + 10, cy + 12, 60, p.face, t, p.me ? OR : undefined);
      this.T(cx + 78, cy + 16, cat, 8, hex(OR)).setOrigin(0, 0.5);
      const pn = this.T(cx + 78, cy + 34, `${p.name[0]}. ${p.name.split(' ').slice(-1)[0]}`, 9, '#FFFFFF', 'title').setOrigin(0, 0.5);
      if (pn.width > lw - 86) pn.setFontSize(7);
      this.T(cx + 78, cy + 50, `${p.pos} #${p.num} · OVR ${p.ovr}`, 8, '#9AA3C0').setOrigin(0, 0.5);
      this.T(cx + 78, cy + 67, p.season.gp ? fmt(p.season) : '–', 8, hex(YE)).setOrigin(0, 0.5);
      this.body.hit(cx, cy, lw, 84, () => this.openPlayer(p.id));
    });
    y += 2 * 92 + 6;
    // Resultados
    const games = lg.games.filter((g2) => g2.home === id || g2.away === id);
    y += this.section(y, 'RESULTADOS');
    const rh = 20 + Math.max(1, games.length) * 38;
    this.card(16, y, W, rh);
    if (!games.length) this.T(GAME_W / 2, y + 29, 'NENHUM JOGO AINDA', 9, '#6E7593').setOrigin(0.5);
    games.forEach((g2, i) => {
      const yy = y + 10 + i * 38;
      const home = g2.home === id;
      const o = TeamRepository.get(home ? g2.away : g2.home);
      const us = home ? g2.hs : g2.as;
      const them = home ? g2.as : g2.hs;
      this.T(30, yy + 19, `S${g2.week}`, 9, '#9AA3C0').setOrigin(0, 0.5);
      this.body.add(this.add.image(74, yy + 19, o.logo.small).setDisplaySize(24, 24));
      const on = this.T(94, yy + 19, `${home ? 'vs' : '@'} ${o.name}`, 9, '#FFFFFF').setOrigin(0, 0.5);
      if (on.width > W - 170) on.setText(`${home ? 'vs' : '@'} ${o.abbr}`);
      this.tag(this.body, 16 + W - 12, yy + 19, `${us > them ? 'V' : us < them ? 'D' : 'E'} ${us}-${them}`, us > them ? GR : us < them ? RD : 0x9aa3c0, true);
      this.body.hit(16, yy, W - 90, 38, () => this.openTeam(o.id));
    });
    y += rh + 14;
    // Divisão
    y += this.section(y, d.full);
    y = this.divCard(y, d.div) + 14;
    // Elenco
    y += this.section(y, 'ELENCO TITULAR', `${ps.length} JOGADORES`);
    const eh = 8 + ps.length * 50;
    this.card(16, y, W, eh);
    ps.forEach((p, i) => {
      const yy = y + 4 + i * 50;
      this.portrait(26, yy + 6, 38, p.face, t, p.me ? OR : undefined);
      this.T(74, yy + 18, p.name, 10, p.me ? hex(YE) : '#FFFFFF').setOrigin(0, 0.5);
      this.T(74, yy + 35, `${p.pos} #${p.num} · ${p.age} ANOS · ${p.tag}`, 8, '#9AA3C0').setOrigin(0, 0.5);
      const og = this.add.graphics();
      og.fillStyle(ovc(p.ovr), 1);
      fillPlate(og, 16 + W - 50, yy + 12, 38, 26, 8);
      this.body.add(og);
      this.T(16 + W - 31, yy + 25, String(p.ovr), 10, '#0D0D12', 'title').setOrigin(0.5);
      this.body.hit(16, yy, W, 50, () => this.openPlayer(p.id));
    });
    return y + eh;
  }

  /** Tabela de uma divisão (cartão). Devolve o y final. */
  private divCard(y: number, div: number) {
    const W = GAME_W - 32;
    const rows = divisionTable(div);
    const h = 30 + rows.length * 40;
    this.card(16, y, W, h);
    const cols = { v: 16 + W - 150, d: 16 + W - 122, dv: 16 + W - 84, sq: 16 + W - 34 };
    this.T(28, y + 15, '#', 9, '#6E7593').setOrigin(0, 0.5);
    this.T(50, y + 15, 'TIME', 9, '#6E7593').setOrigin(0, 0.5);
    this.T(cols.v, y + 15, 'V', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.d, y + 15, 'D', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.dv, y + 15, 'DIV', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.sq, y + 15, 'SEQ', 9, '#6E7593').setOrigin(0.5);
    rows.forEach((r, i) => {
      const yy = y + 30 + i * 40;
      const me = r.team.id === this.team.id;
      const g = this.add.graphics();
      if (me) plate(g, 17, yy + 2, W - 2, 36, TV.plate);
      this.body.add(g);
      const ink = (c: string) => (me ? C.ink : c);
      this.T(30, yy + 20, String(i + 1), 10, me ? C.ink : i === 0 ? C.yellow : '#9AA3C0').setOrigin(0, 0.5);
      this.body.add(this.add.image(61, yy + 20, r.team.logo.small).setDisplaySize(24, 24));
      const nm = this.T(78, yy + 20, r.team.name, 8, ink('#FFFFFF'), 'title').setOrigin(0, 0.5);
      if (nm.width > cols.v - 96) nm.setFontSize(6);
      this.T(cols.v, yy + 20, String(r.w), 10, ink('#FFFFFF')).setOrigin(0.5);
      this.T(cols.d, yy + 20, String(r.l), 10, ink('#FFFFFF')).setOrigin(0.5);
      this.T(cols.dv, yy + 20, `${r.divW}-${r.divL}`, 10, ink('#C9CEE0')).setOrigin(0.5);
      this.T(cols.sq, yy + 20, r.streak, 10, r.streak.startsWith('V') ? hex(GR) : r.streak.startsWith('D') ? hex(RD) : ink('#9AA3C0')).setOrigin(0.5);
      this.body.hit(16, yy, W, 40, () => this.openTeam(r.team.id));
    });
    return y + h;
  }

  // ---- PLAYOFFS (chaveamento)
  private playoffs(y: number) {
    const W = GAME_W - 32;
    const b = bracket();
    const lg = league();
    const meId = this.team.id;
    const rec = (id: string) => {
      const x = lg.teams.get(id);
      return x ? `${x.w}-${x.l}` : '';
    };
    // Cabeçalho: projeção ou playoffs em andamento, e a sua situação
    const m = b.me;
    const sit =
      m.status === 'season'
        ? 'PROJEÇÃO: SE A TEMPORADA ACABASSE HOJE'
        : m.status === 'out'
          ? 'SEU TIME FICOU FORA DOS PLAYOFFS'
          : m.status === 'champion'
            ? 'SEU TIME É CAMPEÃO DO QFL BOWL!'
            : m.status === 'eliminated'
              ? `ELIMINADO NO ${ROUND_INFO[m.round ?? 'wc'].name}`
              : `VOCÊ: ${m.seed}º SEED DA ${['QAC', 'QNC'][m.conf]} · ${ROUND_INFO[m.round ?? 'wc'].name}`;
    this.body.add(gradCard(this, 16, y, W, 64, { from: TV.yellow }));
    this.body.add(this.add.image(46, y + 32, 'logoQflBowlS').setDisplaySize(50, 50));
    this.T(80, y + 22, `PLAYOFFS ${seasonYear()}`, 11, '#FFFFFF', 'title').setOrigin(0, 0.5);
    this.T(80, y + 44, sit, 8, m.status === 'champion' ? hex(YE) : '#E8EAF2').setOrigin(0, 0.5);
    y += 76;

    // Seeds das duas conferências
    const cw = (W - 10) / 2;
    [0, 1].forEach((c) => {
      const x = 16 + c * (cw + 10);
      this.card(x, y, cw, 30 + 7 * 26);
      this.T(x + cw / 2, y + 15, ['QAC', 'QNC'][c], 9, hex(YE), 'title').setOrigin(0.5);
      b.seeds[c].forEach((id, i) => {
        const yy = y + 30 + i * 26;
        const t = TeamRepository.get(id);
        const mine = id === meId;
        const g = this.add.graphics();
        if (mine) {
          g.fillStyle(OR, 0.25);
          g.fillRect(x + 1, yy, cw - 2, 26);
        }
        g.fillStyle(i === 0 ? YE : i < 4 ? 0xffffff : GR, i === 0 ? 1 : i < 4 ? 0.18 : 0.9);
        fillPlate(g, x + 8, yy + 5, 18, 16, 5);
        this.body.add(g);
        this.T(x + 17, yy + 13, String(i + 1), 8, i === 0 || i >= 4 ? '#0D0D12' : '#FFFFFF', 'title').setOrigin(0.5);
        this.body.add(this.add.image(x + 40, yy + 13, t.logo.small).setDisplaySize(18, 18));
        this.T(x + 54, yy + 13, t.abbr, 9, mine ? hex(YE) : '#FFFFFF', 'title').setOrigin(0, 0.5);
        this.T(x + cw - 8, yy + 13, i === 0 ? `${rec(id)} · FOLGA` : rec(id), 8, '#9AA3C0').setOrigin(1, 0.5);
        this.body.hit(x, yy, cw, 26, () => this.openTeam(id));
      });
    });
    y += 30 + 7 * 26 + 8;
    this.T(GAME_W / 2, y + 4, 'AMARELO = 1º (FOLGA NO ROUND ONE) · VERDE = WILD CARD', 7, '#6E7593').setOrigin(0.5);
    y += 22;

    // Confronto (cartão com os dois times; mandante embaixo, como na TV)
    const matchCard = (x: number, yy: number, w: number, g: PGame) => {
      const mine = g.mine;
      const h = 62;
      if (mine) this.body.add(gradCard(this, x, yy, w, h, { from: OR, fromAlpha: 0.45, to: CARD, toAlpha: 0.9, radius: 12, glow: true, stroke: OR, strokeAlpha: 1, strokeWidth: 2 }));
      else this.card(x, yy, w, h, CARD, 0.75, 0xffffff, 0.14, 12);
      const row = (id: string, seed: number, pts: number | undefined, ry: number, home: boolean) => {
        const won = g.status === 'done' && g.winner === id;
        const lost = g.status === 'done' && g.winner !== id;
        if (!id) {
          this.T(x + 10, ry, '?', 9, '#6E7593', 'title').setOrigin(0, 0.5);
          this.T(x + 30, ry, 'A DEFINIR', 8, '#6E7593').setOrigin(0, 0.5);
          return;
        }
        const t = TeamRepository.get(id);
        if (seed && seed < 99) this.T(x + 10, ry, String(seed), 8, '#9AA3C0').setOrigin(0, 0.5);
        const img = this.add.image(x + 32, ry, t.logo.small).setDisplaySize(18, 18).setAlpha(lost ? 0.45 : 1);
        this.body.add(img);
        const nm = this.T(x + 46, ry, t.abbr, 9, id === meId ? hex(YE) : lost ? '#6E7593' : '#FFFFFF', 'title').setOrigin(0, 0.5);
        if (home && g.round !== 'final') {
          // casinha = mandante
          const hg = this.add.graphics();
          hg.fillStyle(0x9aa3c0, 1);
          const hx = x + 50 + nm.width + 4;
          hg.fillTriangle(hx, ry, hx + 8, ry, hx + 4, ry - 4);
          hg.fillRect(hx + 1, ry, 6, 4);
          this.body.add(hg);
        }
        this.T(x + w - 10, ry, pts === undefined ? '' : String(pts), 11, won ? hex(YE) : '#6E7593', 'title').setOrigin(1, 0.5);
      };
      row(g.away, g.seedA, g.as, yy + 18, false);
      row(g.home, g.seedH, g.hs, yy + 44, true);
      const sep = this.add.graphics();
      sep.fillStyle(0xffffff, 0.08);
      sep.fillRect(x + 8, yy + 31, w - 16, 1);
      this.body.add(sep);
      if (g.status !== 'done') this.T(x + w - 10, yy + 31, g.status === 'pending' ? (b.projected ? '' : 'A JOGAR') : '', 7, hex(OR)).setOrigin(1, 0.5);
      if (g.home && g.away) this.body.hit(x, yy, w, h, () => this.openTeam(g.home === meId ? g.away : g.home));
      return h;
    };

    // Fases
    for (const r of ROUNDS) {
      const info = ROUND_INFO[r];
      const gs = b.games[r];
      // cabeçalho da fase com a logo
      const hg = this.add.graphics();
      hg.fillStyle(info.color, 0.25);
      fillPlate(hg, 16, y, W, 50, 14);
      hg.lineStyle(1, info.glow, 0.6);
      strokePlate(hg, 16, y, W, 50, 14);
      this.body.add(hg);
      this.body.add(this.add.image(46, y + 25, info.logoS).setDisplaySize(44, 44));
      this.T(78, y + 17, info.name, 10, '#FFFFFF', 'title').setOrigin(0, 0.5);
      this.T(78, y + 35, `${info.sub} · ${r === 'final' ? 'CAMPO NEUTRO' : 'MELHOR SEED JOGA EM CASA'}`, 7, '#C9CEE0').setOrigin(0, 0.5);
      y += 58;
      if (r === 'final') {
        const g = gs[0];
        const fw = W * 0.72;
        const fx = 16 + (W - fw) / 2;
        this.body.add(this.add.image(GAME_W / 2, y + 60, 'logoQflBowl').setDisplaySize(110, 110).setAlpha(g.status === 'done' ? 0.5 : 1));
        y += 120;
        y += matchCard(fx, y, fw, g) + 8;
        if (g.status === 'done' && g.winner) {
          const champ = TeamRepository.get(g.winner);
          this.body.add(gradCard(this, 16, y, W, 54, { from: 0xffd23f, fromAlpha: 0.55, to: CARD, toAlpha: 0.9, radius: 14, glow: true, stroke: 0xffd23f, strokeAlpha: 1, strokeWidth: 2 }));
          this.body.add(this.add.image(46, y + 27, champ.logo.small).setDisplaySize(32, 32));
          this.T(72, y + 18, 'CAMPEÃO', 8, hex(YE)).setOrigin(0, 0.5);
          this.T(72, y + 36, champ.name, 10, '#FFFFFF', 'title').setOrigin(0, 0.5);
          y += 64;
        }
        continue;
      }
      // duas colunas: QAC | QNC
      const left = gs.filter((g) => g.conf === 0);
      const right = gs.filter((g) => g.conf === 1);
      const rows = Math.max(left.length, right.length) + (r === 'wc' ? 1 : 0);
      for (let i = 0; i < rows; i++) {
        [left, right].forEach((col, c) => {
          const x = 16 + c * (cw + 10);
          const yy = y + i * 70;
          if (r === 'wc' && i === 0) {
            // o 1º de cada conferência folga
            const id = b.seeds[c][0];
            if (!id) return;
            const t = TeamRepository.get(id);
            this.card(x, yy, cw, 62, CARD, 0.45, YE, 0.6, 12);
            this.T(x + 10, yy + 18, '1', 8, '#9AA3C0').setOrigin(0, 0.5);
            this.body.add(this.add.image(x + 32, yy + 18, t.logo.small).setDisplaySize(18, 18));
            this.T(x + 46, yy + 18, t.abbr, 9, id === meId ? hex(YE) : '#FFFFFF', 'title').setOrigin(0, 0.5);
            this.T(x + 10, yy + 44, 'FOLGA · DIRETO NO ROUND TWO', 7, hex(YE)).setOrigin(0, 0.5);
            return;
          }
          const g = col[r === 'wc' ? i - 1 : i];
          if (g) matchCard(x, yy, cw, g);
        });
      }
      y += rows * 70 + 10;
    }
    return y;
  }

  // ---- TABELA
  private tabela() {
    const W = GAME_W - 32;
    let y = 4;
    y += this.chips(y, ['DIVISÕES', 'QAC', 'QNC', 'GERAL', 'PLAYOFFS'], this.div, (i) => ((this.div = i), this.show('tabela')), true) + 14;
    if (this.div === 4) return this.playoffs(y);
    if (this.div === 0) {
      // As 8 divisões, a do seu time primeiro
      const mine = divisionOf(this.team).div;
      const order = [mine, ...[0, 1, 2, 3, 4, 5, 6, 7].filter((d) => d !== mine)];
      for (const d of order) {
        y += this.section(y, `${CONFS[Math.floor(d / 4)]} ${DIVS[d % 4]}`, d === mine ? 'SUA DIVISÃO' : undefined);
        y = this.divCard(y, d) + 16;
      }
      this.T(GAME_W / 2, y, 'AMARELO = LÍDER · DIV = RETROSPECTO NA DIVISÃO', 8, '#6E7593').setOrigin(0.5);
      return y + 12;
    }
    if (this.div === 1 || this.div === 2) {
      const conf = this.div - 1;
      const seeds = conferenceSeeds(conf);
      y += this.section(y, `CONFERÊNCIA ${CONFS[conf]}`, 'CHAVEAMENTO');
      const h = 30 + seeds.length * 40 + 22;
      this.card(16, y, W, h);
      const cols = { v: 16 + W - 150, d: 16 + W - 122, pc: 16 + W - 84, cf: 16 + W - 34 };
      this.T(28, y + 15, 'SEED', 8, '#6E7593').setOrigin(0, 0.5);
      this.T(cols.v, y + 15, 'V', 9, '#6E7593').setOrigin(0.5);
      this.T(cols.d, y + 15, 'D', 9, '#6E7593').setOrigin(0.5);
      this.T(cols.pc, y + 15, 'PCT', 9, '#6E7593').setOrigin(0.5);
      this.T(cols.cf, y + 15, 'CONF', 9, '#6E7593').setOrigin(0.5);
      let yy = y + 30;
      seeds.forEach(({ x, kind }, i) => {
        if (i === PLAYOFF_SPOTS) {
          // Linha dos playoffs
          const lg2 = this.add.graphics();
          lg2.fillStyle(OR, 0.9);
          lg2.fillRect(24, yy + 10, W - 16, 2);
          this.body.add(lg2);
          this.T(GAME_W / 2, yy + 11, ' LINHA DOS PLAYOFFS ', 7, hex(OR), 'title').setOrigin(0.5).setBackgroundColor('#22284A');
          yy += 22;
        }
        const me = x.team.id === this.team.id;
        const g = this.add.graphics();
        if (me) {
          g.fillStyle(OR, 0.2);
          g.fillRect(17, yy, W - 2, 40);
        }
        const c = kind === 'div' ? YE : kind === 'wc' ? GR : 0x3a4060;
        g.fillStyle(c, 1);
        fillPlate(g, 26, yy + 9, 22, 22, 6);
        this.body.add(g);
        this.T(37, yy + 20, String(i + 1), 9, kind === 'out' ? '#9AA3C0' : '#0D0D12', 'title').setOrigin(0.5);
        this.body.add(this.add.image(66, yy + 20, x.team.logo.small).setDisplaySize(24, 24));
        const nm = this.T(84, yy + 14, x.team.name, 8, '#FFFFFF', 'title').setOrigin(0, 0.5);
        if (nm.width > cols.v - 100) nm.setFontSize(6);
        this.T(84, yy + 29, kind === 'div' ? `LÍDER ${DIVS[x.div % 4]}` : kind === 'wc' ? 'WILD CARD' : DIVS[x.div % 4], 7, kind === 'div' ? hex(YE) : kind === 'wc' ? hex(GR) : '#6E7593').setOrigin(0, 0.5);
        this.T(cols.v, yy + 20, String(x.w), 10).setOrigin(0.5);
        this.T(cols.d, yy + 20, String(x.l), 10).setOrigin(0.5);
        this.T(cols.pc, yy + 20, pct(x).toFixed(3).replace(/^0/, ''), 9, '#C9CEE0').setOrigin(0.5);
        this.T(cols.cf, yy + 20, `${x.confW}-${x.confL}`, 9, '#C9CEE0').setOrigin(0.5);
        this.body.hit(16, yy, W, 40, () => this.openTeam(x.team.id));
        yy += 40;
      });
      y += h + 12;
      this.T(GAME_W / 2, y, `${PLAYOFF_SPOTS} VÃO AOS PLAYOFFS: 4 LÍDERES + 3 WILD CARDS`, 8, '#6E7593').setOrigin(0.5);
      return y + 12;
    }
    // GERAL
    const rows = standings();
    const h = 34 + rows.length * 42;
    this.card(16, y, W, h);
    const head = y + 17;
    const cols = { r: 28, team: 50, v: 16 + W - 128, d: 16 + W - 100, pd: 16 + W - 64, pj: 16 + W - 24 };
    this.T(cols.r, head, '#', 9, '#6E7593').setOrigin(0, 0.5);
    this.T(cols.team, head, 'TIME', 9, '#6E7593').setOrigin(0, 0.5);
    this.T(cols.v, head, 'V', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.d, head, 'D', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.pd, head, 'SALDO', 9, '#6E7593').setOrigin(0.5);
    this.T(cols.pj, head, 'PROJ', 9, '#6E7593').setOrigin(0.5);
    rows.forEach((r, i) => {
      const yy = y + 34 + i * 42;
      const me = r.team.id === this.team.id;
      if (me) {
        const g = this.add.graphics();
        g.fillStyle(OR, 0.2);
        g.fillRect(17, yy, W - 2, 42);
        this.body.add(g);
      }
      this.T(cols.r, yy + 21, String(i + 1), 10, '#9AA3C0').setOrigin(0, 0.5);
      this.body.add(this.add.image(cols.team + 11, yy + 21, r.team.logo.small).setDisplaySize(24, 24));
      const nm = this.T(cols.team + 28, yy + 15, r.team.name, 8, '#FFFFFF', 'title').setOrigin(0, 0.5);
      if (nm.width > cols.v - cols.team - 44) nm.setFontSize(6);
      this.T(cols.team + 28, yy + 30, divisionOf(r.team).full, 7, '#6E7593').setOrigin(0, 0.5);
      this.T(cols.v, yy + 21, String(r.w), 10).setOrigin(0.5);
      this.T(cols.d, yy + 21, String(r.l), 10).setOrigin(0.5);
      const pd = r.pf - r.pa;
      this.T(cols.pd, yy + 21, `${pd > 0 ? '+' : ''}${pd}`, 10, pd > 0 ? hex(GR) : pd < 0 ? hex(RD) : '#9AA3C0').setOrigin(0.5);
      this.T(cols.pj, yy + 21, String(r.proj), 10, hex(ovc(r.proj + 8))).setOrigin(0.5);
      this.body.hit(16, yy, W, 42, () => this.openTeam(r.team.id));
    });
    return y + h + 8;
  }

  // ---- PRÊMIOS
  /** Cartão de um prêmio: nome, vencedor (escudo, posição, estatística) e os dois seguintes. */
  private awardCard(y: number, name: string, w: AwardWinner | null, runners: AwardWinner[] = []) {
    const W = GAME_W - 32;
    const h = w ? (runners.length ? 90 : 76) : 56;
    this.card(16, y, W, h, w?.me ? OR : w?.mine ? 0x1f5f8b : CARD, 0.4, w?.me ? YE : 0xffffff, w?.me ? 0.8 : 0.14);
    this.T(30, y + 15, name, 8, hex(YE), 'title').setOrigin(0, 0.5);
    if (!w) {
      this.T(30, y + 38, 'SEM CANDIDATOS', 9, '#6E7593').setOrigin(0, 0.5);
      return h;
    }
    this.body.add(this.add.image(46, y + 48, w.logo).setDisplaySize(30, 30));
    const nm = this.T(70, y + 40, w.name, 10, '#FFFFFF', 'title').setOrigin(0, 0.5);
    if (nm.width > W - 120) nm.setFontSize(7);
    this.T(70, y + 58, `${w.abbr} · ${w.pos} · ${w.line}`, 8, '#C9CEE0').setOrigin(0, 0.5);
    if (w.me) this.tag(this.body, 16 + W - 12, y + 15, 'VOCÊ', GR, true);
    else if (w.mine) this.tag(this.body, 16 + W - 12, y + 15, 'SEU TIME', OR, true);
    if (runners.length) {
      const t = this.T(30, y + h - 12, runners.map((r, i) => `${i + 2}º ${r.name} (${r.abbr})`).join('  ·  '), 8, '#6E7593').setOrigin(0, 0.5);
      if (t.width > W - 28) t.setFontSize(6);
    }
    return h;
  }

  private premios() {
    const W = GAME_W - 32;
    const s = getSave();
    const reveal = !!s.career.seasonDone || !!s.career.post?.final?.result;
    const awards = seasonAwards();
    let y = 4;
    if (!awards.length) {
      // Antes do fim da temporada regular: o que vai ser entregue e quanto falta
      const games = schedule().filter((g) => g.opp && !g.round);
      const done = games.filter((g) => g.result).length;
      y += 12;
      this.body.add(sectionHead(this, 16, y, `PRÊMIOS DA TEMPORADA ${seasonYear()}`, `${done}/${games.length} JOGOS`));
      y += 18;
      const g0 = this.add.graphics();
      plate(g0, 16, y, W, 74, TV.ink2, 1);
      plateLine(g0, 16, y, W, 74, TV.rule, 1, 1);
      this.body.add(g0);
      this.body.add(tvText(this, 32, y + 22, 'OS VENCEDORES SAEM NO FIM DA TEMPORADA REGULAR', 14, C.white, 800, 0.8).setOrigin(0, 0.5));
      this.bar(32, y + 44, W - 32, 8, games.length ? done / games.length : 0, YE);
      this.body.add(tvText(this, 32, y + 62, done ? `FALTAM ${games.length - done} JOGOS` : 'A TEMPORADA AINDA NÃO COMEÇOU', 12, C.muted, 600, 1).setOrigin(0, 0.5));
      y += 92;
      const LIST: [string, string][] = [
        ['MVP DA LIGA', 'O MELHOR JOGADOR DA TEMPORADA'],
        ['JOGADOR OFENSIVO DO ANO', 'MAIOR PRODUÇÃO NO ATAQUE'],
        ['JOGADOR DEFENSIVO DO ANO', 'TACKLES, SACKS E INTERCEPTAÇÕES'],
        ['NOVATO OFENSIVO DO ANO', 'O MELHOR CALOURO DO ATAQUE'],
        ['NOVATO DEFENSIVO DO ANO', 'O MELHOR CALOURO DA DEFESA'],
        ['RETORNO DO ANO', 'O MAIOR SALTO DE PRODUÇÃO'],
        ['TÉCNICO DO ANO', 'QUEM MAIS SUPEROU A EXPECTATIVA'],
        ['MVP DA FINAL', 'ESCOLHIDO DEPOIS DO QFL BOWL'],
      ];
      LIST.forEach(([n, d]) => {
        const g = this.add.graphics();
        plate(g, 16, y, W, 58, TV.ink2, 0.96);
        plate(g, 16, y, 52, 58, TV.ink3, 1, true, true);
        trophy(g, 42, y + 28, 11, mix(TV.ink3, TV.yellow, 0.75));
        this.body.add(g);
        this.body.add(tvText(this, 82, y + 20, n, 16, C.white, 800, 0.6).setOrigin(0, 0.5));
        this.body.add(tvText(this, 82, y + 40, d, 13, C.muted, 600, 0.6).setOrigin(0, 0.5));
        this.body.add(tvText(this, 16 + W - 16, y + 29, 'A DEFINIR', 12, C.dim, 700, 1.2).setOrigin(1, 0.5));
        y += 62;
      });
      return y;
    }
    y += this.section(y, `PRÊMIOS DA TEMPORADA ${seasonYear()}`, 'TEMPORADA REGULAR') + 6;
    for (const a of awards) y += this.awardCard(y, a.name, a.winner, a.runners) + 8;
    // Final
    y += 6;
    y += this.section(y, 'QFL BOWL') + 6;
    const fm = reveal ? finalMvp() : null;
    if (fm) y += this.awardCard(y, 'MVP DA FINAL', fm) + 8;
    else {
      this.card(16, y, W, 56);
      this.T(30, y + 28, reveal ? 'MVP DA FINAL: A FINAL AINDA NÃO FOI DECIDIDA' : 'MVP DA FINAL: SAI DEPOIS DO QFL BOWL', 9, '#9AA3C0').setOrigin(0, 0.5);
      y += 64;
    }
    // Resultados dos playoffs (aparecem depois de simular a temporada até o fim)
    if (s.career.seasonDone) {
      const b = bracket();
      const champ = b.games.final[0]?.winner ? TeamRepository.get(b.games.final[0].winner!) : null;
      y += 6;
      if (champ) {
        this.card(16, y, W, 72, OR, 0.4, YE, 0.8);
        this.body.add(this.add.image(54, y + 36, champ.logo.large ?? champ.logo.small).setDisplaySize(44, 44));
        this.T(90, y + 26, 'CAMPEÃO DO QFL BOWL', 8, hex(YE), 'title').setOrigin(0, 0.5);
        this.T(90, y + 48, champ.name, 12, '#FFFFFF', 'title').setOrigin(0, 0.5);
        y += 82;
      }
      for (const r of ROUNDS) {
        const games = b.games[r].filter((g) => g.status === 'done');
        if (!games.length) continue;
        y += this.section(y, `${ROUND_INFO[r].name} · ${ROUND_INFO[r].sub}`) + 4;
        const h = games.length * 34 + 8;
        this.card(16, y, W, h);
        const cx = GAME_W / 2;
        games.forEach((g, i) => {
          const yy = y + 4 + i * 34;
          const H = TeamRepository.get(g.home);
          const A = TeamRepository.get(g.away);
          const hw = g.winner === g.home;
          if (g.mine) {
            const gg = this.add.graphics();
            gg.fillStyle(OR, 0.2);
            gg.fillRect(17, yy, W - 2, 34);
            this.body.add(gg);
          }
          this.body.add(this.add.image(cx - 104, yy + 17, H.logo.small).setDisplaySize(24, 24));
          this.T(cx - 86, yy + 17, H.abbr, 9, hw ? '#FFFFFF' : '#6E7593', 'title').setOrigin(0, 0.5);
          this.T(cx - 12, yy + 17, String(g.hs ?? 0), 11, hw ? '#FFFFFF' : '#6E7593', 'title').setOrigin(1, 0.5);
          this.T(cx, yy + 17, '×', 9, '#6E7593').setOrigin(0.5);
          this.T(cx + 12, yy + 17, String(g.as ?? 0), 11, !hw ? '#FFFFFF' : '#6E7593', 'title').setOrigin(0, 0.5);
          this.T(cx + 86, yy + 17, A.abbr, 9, !hw ? '#FFFFFF' : '#6E7593', 'title').setOrigin(1, 0.5);
          this.body.add(this.add.image(cx + 104, yy + 17, A.logo.small).setDisplaySize(24, 24));
        });
        y += h + 8;
      }
    }
    // Seus troféus (temporadas anteriores + esta)
    const won: string[] = [];
    for (const rc of s.career.history ?? []) for (const a of rc.awards ?? []) if (a.me) won.push(`${rc.year} · ${a.name}`);
    for (const a of awards) if (a.winner?.me) won.push(`${seasonYear()} · ${a.name}`);
    if (fm?.me) won.push(`${seasonYear()} · MVP DA FINAL`);
    if (won.length) {
      y += 6;
      y += this.section(y, 'SEUS TROFÉUS', String(won.length)) + 4;
      const h = won.length * 28 + 12;
      this.card(16, y, W, h, CARD, 0.72, YE, 0.5);
      won.forEach((t, i) => {
        this.body.add(star(this.add.graphics(), 36, y + 20 + i * 28, 7));
        this.T(50, y + 20 + i * 28, t, 10, '#FFFFFF').setOrigin(0, 0.5);
      });
      y += h + 8;
    }
    return y;
  }

  // ---- TÍTULOS
  /** Linha de uma conquista: quantidade, nome e todos os anos. */
  private trophyRow(y: number, name: string, years: number[]) {
    const W = GAME_W - 32;
    const won = years.length > 0;
    const t = label(this, 72, 0, won ? years.join(' · ') : 'AINDA NÃO CONQUISTADO', 9, won ? '#FFFFFF' : '#6E7593').setWordWrapWidth(W - 96).setLineSpacing(4);
    const h = Math.max(54, 36 + t.height + 8);
    this.card(16, y, W, h, won ? OR : CARD, 0.4, won ? YE : 0xffffff, won ? 0.6 : 0.14);
    this.T(44, y + h / 2, String(years.length), 18, won ? hex(YE) : '#6E7593', 'title').setOrigin(0.5);
    this.T(72, y + 16, name, 8, won ? hex(YE) : '#9AA3C0', 'title').setOrigin(0, 0.5);
    t.setY(y + 32);
    this.body.add(t);
    return h;
  }

  private titulos() {
    const s = getSave();
    const tc = trophyCase();
    let y = 4;
    y += this.section(y, 'COM A EQUIPE', this.team.name) + 6;
    for (const t of tc.team) y += this.trophyRow(y, t.name, t.years) + 8;
    y += 8;
    const total = tc.individual.reduce((a, t) => a + t.years.length, 0);
    y += this.section(y, 'INDIVIDUAIS', `${total} NO TOTAL`) + 6;
    for (const t of tc.individual) y += this.trophyRow(y, t.name, t.years) + 8;
    // Temporada a temporada
    const hist = s.career.history ?? [];
    y += 8;
    y += this.section(y, 'CARREIRA POR TEMPORADA', `${hist.length} CONCLUÍDA${hist.length === 1 ? '' : 'S'}`) + 6;
    const W = GAME_W - 32;
    if (!hist.length) {
      this.card(16, y, W, 48);
      this.T(30, y + 24, 'AS TEMPORADAS APARECEM AQUI QUANDO TERMINAM', 9, '#6E7593').setOrigin(0, 0.5);
      y += 56;
    }
    for (const r of [...hist].reverse()) {
      this.card(16, y, W, 54);
      this.T(30, y + 17, `${r.year} · ${r.team}`, 9, '#FFFFFF', 'title').setOrigin(0, 0.5);
      this.T(30, y + 38, `${r.record.w}-${r.record.l} · ${r.result}`, 9, '#C9CEE0').setOrigin(0, 0.5);
      this.T(16 + W - 14, y + 17, `OVR ${r.ovrFrom} → ${r.ovrTo}`, 9, hex(YE)).setOrigin(1, 0.5);
      y += 62;
    }
    return y;
  }

  // ---- NOTÍCIAS
  private noticias() {
    const W = GAME_W - 32;
    const filters = ['TUDO', 'JOGOS', 'TROCAS', 'LESÕES', 'RUMORES'];
    const keep = ['', 'JOGO', 'TROCA', 'LESÃO', 'RUMOR'][this.nf];
    const tagColor: Record<string, number> = { TROCA: GR, RUMOR: YE, LESÃO: RD, DRAFT: OR, JOGO: 0x5aa9ff };
    let y = 4;
    y += this.chips(y, filters, this.nf, (i) => ((this.nf = i), (this.nopen = -1), this.show('noticias'))) + 10;
    newsFeed().forEach((n, i) => {
      if (keep && n.tag !== keep) return;
      const open = this.nopen === i;
      // Mede o texto para a altura do cartão
      const head = label(this, 28, y + 36, n.head, 11, '#FFFFFF').setWordWrapWidth(W - 40).setLineSpacing(2);
      const body = open ? label(this, 28, 0, n.body.toUpperCase(), 10, '#C9CEE0').setWordWrapWidth(W - 40).setLineSpacing(3) : null;
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
    const c = contractOf();
    const until = c.until;
    const elapsed = Math.max(0, (s.career.season || 1) - c.from);
    let y = 4;
    // Seu contrato (degradê na cor da liga)
    this.body.add(gradCard(this, 16, y, W, 176, { from: OR, fromAlpha: 0.55, to: CARD, toAlpha: 0.9, radius: 16, glow: true, stroke: OR, strokeAlpha: 0.6 }));
    this.T(30, y + 16, 'SEU CONTRATO', 9, hex(YE), 'title');
    const v = this.T(30, y + 44, mi(c.value), 15, '#FFFFFF', 'title');
    this.T(30 + v.width + 6, y + 50, '/ANO', 9, '#9AA3C0');
    this.T(16 + W - 14, y + 50, `${c.years} ANOS · ATÉ ${until}`, 10, '#C9CEE0').setOrigin(1, 0);
    const yw = (W - 28 - 6 * (c.years - 1)) / c.years;
    for (let i = 0; i < c.years; i++) {
      const b = this.add.graphics();
      b.fillStyle(i === elapsed ? OR : TV.ink3, 1);
      fillPlate(b, 30 + i * (yw + 6), y + 74, yw, 8, 4);
      this.body.add(b);
    }
    const half = (W - 28 - 8) / 2;
    for (const [k, [n, val, col]] of ([['BÔNUS DE ASSINATURA', mi(c.value * 1.4), '#3CCB5A'], ['CLÁUSULA', `OPÇÃO DO TIME ${c.years}º ANO`, '#FFFFFF']] as [string, string, string][]).entries()) {
      const x = 30 + k * (half + 8);
      const bg = this.add.graphics();
      bg.fillStyle(0x0a0c1a, 0.5);
      fillPlate(bg, x, y + 92, half, 44, 10);
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
    fillPlate(cg, 30, y + 34, bw, 12, 6);
    cg.fillStyle(OR, 1);
    fillPlate(cg, 30, y + 34, bw * ((used - c.value) / 200), 12, { tl: 6, bl: 6, tr: 0, br: 0 });
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
      const first = !!next && g.week === next.week;
      const pr = g.prime ? PRIME[g.prime] : null;
      const h = pr ? 76 : 58;
      this.card(16, y, W, h, CARD, 0.95, first ? OR : 0xffffff, first ? 1 : 0.14, 12);
      if (pr) {
        // Horário nobre: selo branco com o nome do programa
        const rb = tvText(this, 0, y + 12, pr.pt, 12, C.ink, 800, 1.4).setOrigin(0.5);
        const rw = rb.width + 26;
        const rg = this.add.graphics();
        plate(rg, 94, y + 3, rw, 18, TV.plate);
        this.body.add(rg);
        rb.setX(94 + rw / 2);
        this.body.add(rb);
      }
      const cy = y + h / 2 + (pr ? 6 : 0);
      if (g.round) this.body.add(this.add.image(36, cy, ROUND_INFO[g.round].logoS).setDisplaySize(30, 30));
      else this.T(28, cy, `S${g.week}`, 9, '#9AA3C0').setOrigin(0, 0.5);
      if (g.opp) this.body.add(this.add.image(70, cy, g.opp.logo.small).setDisplaySize(30, 30));
      else {
        const bg = this.add.graphics();
        bg.fillStyle(0x3a4060, 1);
        bg.fillCircle(70, cy, 12);
        this.body.add(bg);
        this.T(70, cy, '–', 9, '#FFFFFF', 'title').setOrigin(0.5);
      }
      const name = g.opp ? `${g.home ? 'vs' : '@'} ${g.opp.name}` : 'FOLGA';
      const nm = this.T(94, cy - 8, name, 9, '#FFFFFF', 'title').setOrigin(0, 0.5);
      if (nm.width > W - 210) nm.setFontSize(7);
      const sub = this.T(94, cy + 9, g.opp ? `${g.when} · ${g.where}` : 'SEMANA DE DESCANSO', 8, pr ? '#E8EAF2' : '#9AA3C0').setOrigin(0, 0.5);
      if (sub.width > W - 196) sub.setText(g.opp ? `${g.when} · ${g.home ? 'EM CASA' : 'FORA'}` : sub.text);
      // Clima previsto e temperatura (jogos sem resultado)
      if (g.opp && !g.result) {
        this.body.add(weatherIcon(this, 16 + W - 96, cy - 5, g.weather, 22, g.tod === 'night'));
        this.T(16 + W - 96, cy + 13, `${g.temp}°C`, 8, '#C9CEE0').setOrigin(0.5);
      }
      const res = g.result ? `${g.result.us}-${g.result.them}` : null;
      this.tag(this.body, 16 + W - 12, cy, res ?? (first ? 'PRÓXIMO' : g.bye ? 'FOLGA' : g.home ? 'CASA' : 'FORA'), res ? (g.result!.us > g.result!.them ? GR : RD) : first ? OR : g.bye ? TV.ink3 : g.home ? TV.plate : TV.ink3, true);
      if (g.opp) this.body.hit(16, y, W - 110, h, () => this.openTeam(g.opp!.id));
      y += h + 8;
    });
    return y;
  }
}
