import Phaser from 'phaser';
import { FONT_TITLE, MATCH_SEED, TEAMS, guestTeam, hostTeam, matchConfig, venue } from '../config';
import { stadiumOf, type StandModelId } from '../data/stadiums';
import { wallQuad } from './ground';
import { hex, shade } from './pixelart';
import type { Projection, ScreenPoint } from './projection';
import { Rng } from './rng';
import { TOD, type SkyWeather, type TimeOfDay } from './daytime';
import { makeSkylineTexture, SKY_H, SKY_W } from './skyline';

/*
 * Arquibancada só no FUNDO do campo (atrás da end zone adversária), como no design.
 * Cada fileira é um objeto no mundo (posição + altura) projetado pela mesma câmera do campo:
 * quando a câmera avança, a arquibancada cresce e se aproxima.
 *
 * Os cantos são arredondados: cada fileira segue o muro — reta no fundo e um arco de 90°
 * em cada canto, até encostar na lateral. Quanto mais alta a fileira, maior o raio.
 * A posição ao longo da fileira é `u` (jardas), da ponta esquerda até a direita.
 */

const CX_L = -2; // centro do arco do canto esquerdo (x)
const CX_R = 55.3; // centro do arco do canto direito (x)
/** Distância extra entre o campo e a arquibancada (jardas). */
export const STAND_GAP = 5;

/** Combine: arquibancada vazia (só os degraus, sem torcida). */
export const standOptions = { empty: false };
const CY = 103.2 + STAND_GAP; // y dos centros dos arcos (onde a arquibancada encosta na lateral)
const R0 = 16.9; // raio da 1ª fileira (logo atrás do muro)
const DEPTH = 1.0; // jardas entre fileiras
const RISE = 1.15; // quanto cada fileira sobe
const BAND_RISE = 1.7; // quanto cada fileira de fachada (faixa/teto) sobe
const BAND_DEPTH = 0.15;
const TPY = 8; // texels por jarda na textura das fileiras
const ROW_TEX_H = 14;
const WALL_H = 1.6;
const ARC_SEGS = 12; // pedaços de cada arco
const STAIR_W = 1.8;
const EXIT_W = 3.6;
const EXIT_ROWS = 3;

/*
 * Modelos de arquibancada (máx. 5), sorteados a cada partida (?arq=1..5 ou ?arq=<id> força um):
 *   baixa      → só o anel de baixo
 *   telao      → arquibancada baixa com um telão gigante em cima
 *   anel       → anel de baixo + corredor + anel superior com teto
 *   separacao  → duas partes separadas por uma faixa no meio com um telão
 *   classica   → a arquibancada alta de sempre
 */
interface StandModel {
  id: StandModelId;
  /** Fileiras de cadeiras de cada anel (de baixo para cima). */
  tiers: number[];
  /** Fileiras de fachada entre os anéis (corredor / faixa do meio). */
  bandRows: number;
  /** Recuo extra (jardas) do anel de cima. */
  setback: number;
  /** Fileiras de teto no topo do último anel. */
  roofRows: number;
  /** Telão: em cima da arquibancada ou na faixa do meio. */
  screen: 'top' | 'mid' | null;
  /** Fileira (dentro do anel) onde ficam as saídas no topo das escadas. */
  exitRow: number;
  /** Setor visitante (fileiras dentro do anel). */
  awayRows: [number, number];
}

// O placar e o cartão do QB cobrem o alto da tela, então só ~15 jardas de altura da arquibancada aparecem:
// os modelos são compactos para caberem inteiros na parte visível (a clássica é a alta, que enche a tela).
const MODELS: StandModel[] = [
  { id: 'baixa', tiers: [9], bandRows: 0, setback: 0, roofRows: 0, screen: null, exitRow: 4, awayRows: [2, 6] },
  { id: 'telao', tiers: [8], bandRows: 0, setback: 0, roofRows: 0, screen: 'top', exitRow: 3, awayRows: [2, 5] },
  { id: 'anel', tiers: [6, 7], bandRows: 2, setback: 1.2, roofRows: 1, screen: null, exitRow: 2, awayRows: [1, 4] },
  { id: 'separacao', tiers: [6, 6], bandRows: 3, setback: 1.2, roofRows: 0, screen: 'mid', exitRow: 2, awayRows: [1, 4] },
  { id: 'classica', tiers: [70], bandRows: 0, setback: 0, roofRows: 0, screen: null, exitRow: 14, awayRows: [18, 40] },
];

/** Modelo da partida: ?arq=1..5 ou ?arq=<id> força; senão o escolhido no menu; "auto" = estádio do time da casa. */
export function pickStandModel(): StandModel {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('arq') : null;
  const byNum = q && /^\d+$/.test(q) ? MODELS[Number(q) - 1] : undefined;
  const byId = q ? MODELS.find((m) => m.id === q) : undefined;
  if (byNum ?? byId) return (byNum ?? byId)!;
  const id = matchConfig.stand === 'auto' ? stadiumOf(venue.id ?? TEAMS.home.id).model : matchConfig.stand;
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

/** Uma fileira do estádio: de cadeiras, de fachada (corredor) ou de teto. */
interface RowSpec {
  kind: 'seat' | 'band' | 'roof';
  tier: number;
  /** Posição dentro do anel (cadeiras) ou da faixa. */
  inTier: number;
  /** Quantas fileiras tem a faixa (só band/roof). */
  count: number;
  r: number;
  h: number;
}

function buildRows(m: StandModel): RowSpec[] {
  const rows: RowSpec[] = [];
  let r = R0 + 0.5;
  let h = WALL_H;
  const band = (kind: 'band' | 'roof', tier: number, count: number) => {
    for (let j = 0; j < count; j++) {
      rows.push({ kind, tier, inTier: j, count, r, h });
      r += BAND_DEPTH;
      h += BAND_RISE;
    }
  };
  m.tiers.forEach((n, t) => {
    if (t > 0) {
      band('band', t - 1, m.bandRows);
      r += m.setback;
    }
    for (let j = 0; j < n; j++) {
      rows.push({ kind: 'seat', tier: t, inTier: j, count: n, r, h });
      r += DEPTH;
      h += RISE;
    }
  });
  if (m.roofRows) band('roof', m.tiers.length - 1, m.roofRows);
  return rows;
}

const STRAIGHT = CX_R - CX_L;

/** Geometria de uma fileira de raio r. */
function rowGeom(r: number) {
  const arc = (r * Math.PI) / 2;
  return { r, arc, len: arc * 2 + STRAIGHT };
}

/** Ponto no chão da fileira, na posição u (jardas desde a ponta esquerda). */
function pointAt(r: number, u: number): [number, number] {
  const arc = (r * Math.PI) / 2;
  if (u < arc) {
    const t = Math.PI - u / r;
    return [CX_L + r * Math.cos(t), CY + r * Math.sin(t)];
  }
  if (u < arc + STRAIGHT) return [CX_L + (u - arc), CY + r];
  const t = Math.PI / 2 - (u - arc - STRAIGHT) / r;
  return [CX_R + r * Math.cos(t), CY + r * Math.sin(t)];
}

/** Posições das escadas (u) numa fileira: radiais nos cantos + duas no fundo. */
function stairsU(r: number) {
  const { arc } = rowGeom(r);
  const onArcL = (deg: number) => r * (Math.PI - (deg * Math.PI) / 180); // ângulo → u no arco esquerdo
  const onArcR = (deg: number) => arc + STRAIGHT + r * (Math.PI / 2 - (deg * Math.PI) / 180);
  return [onArcL(150), onArcL(118), arc + 8.6, arc + 47, onArcR(62), onArcR(30)];
}

/** As seis escadas têm uma saída cada, todas na mesma fileira de cada anel (o túnel corta a escada, que continua acima dele). */
const STAIR_IDS = [0, 1, 2, 3, 4, 5];

const SKIN = ['#f1c7a5', '#d9a07a', '#c68b59', '#8d5524', '#6b3f1f'];
const HAIR = ['#2a1a10', '#5a3a1a', '#111111', '#b8862e', '#3b2412', '#8a8a8a'];
const OTHER = ['#f2f2f2', '#1d1d24', '#6b6f7a', '#2a9d8f', '#b33a3a', '#e6c34a', '#5c2a86'];

/** Desenha a textura de uma fileira: degrau, cadeiras, torcedores, escadas e saídas. */
function makeRowTexture(scene: Phaser.Scene, key: string, spec: RowSpec, m: StandModel, rng: Rng) {
  const row = spec.inTier;
  const r = spec.r;
  const { len } = rowGeom(r);
  const W = Math.ceil(len * TPY);
  const H = ROW_TEX_H;
  const tex = scene.textures.createCanvas(key, W, H)!;
  const ctx = tex.getContext();
  const tx = (u: number) => Math.round(u * TPY);
  const home = [hex(hostTeam().color), shade(hostTeam().color, 0.25), shade(hostTeam().color, -0.2)];
  const away = [hex(guestTeam().color), shade(guestTeam().color, 0.3), shade(guestTeam().color, -0.25)];
  const stairs = stairsU(r);
  const awayRow = row >= m.awayRows[0] && row <= m.awayRows[1];
  const awayA = stairs[3] + STAIR_W / 2;
  const awayB = stairs[4] - STAIR_W / 2;
  const isAway = (u: number) => awayRow && u > awayA && u < awayB;
  const exitRange = (i: number) => [stairs[i] - EXIT_W / 2, stairs[i] + EXIT_W / 2];
  /** As escadas sobem o anel inteiro; só são interrompidas pelo túnel da saída (e pela placa em cima dele). */
  const inExit = row >= m.exitRow && row <= m.exitRow + EXIT_ROWS;

  // Degrau azul-acinzentado + encosto das cadeiras
  ctx.fillStyle = row % 2 ? '#3e4560' : '#394058';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#4a5270';
  ctx.fillRect(0, H - 6, W, 3);
  ctx.fillStyle = '#262a3d';
  ctx.fillRect(0, H - 3, W, 3);
  if (awayRow) {
    ctx.fillStyle = shade(guestTeam().color, -0.3);
    ctx.fillRect(tx(awayA), H - 6, tx(awayB) - tx(awayA), 3);
  }

  const blocked = (u: number) =>
    stairs.some((s) => Math.abs(u - s) < STAIR_W / 2 + 0.35) ||
    STAIR_IDS.some((i) => {
      const [a, b] = exitRange(i);
      return row >= m.exitRow && row <= m.exitRow + EXIT_ROWS && u > a - 0.3 && u < b + 0.3;
    });

  // Torcedores (cada um sorteado)
  for (let px = 3; px < W - 4; px += rng.int(6, 8)) {
    if (standOptions.empty) break;
    const u = px / TPY;
    if (blocked(u) || rng.chance(0.06)) continue;
    const team = isAway(u) ? away : home;
    const rr = rng.next();
    const shirt = rr < 0.68 ? rng.pick(team) : rr < 0.8 ? '#f2f2f2' : rng.pick(OTHER);
    const skin = rng.pick(SKIN);
    const bodyH = rng.chance(0.3) ? 6 : 4;
    const top = H - 3 - bodyH;
    ctx.fillStyle = shirt;
    ctx.fillRect(px - 2, top, 5, bodyH);
    ctx.fillStyle = skin;
    ctx.fillRect(px - 1, top - 3, 3, 3);
    ctx.fillStyle = rng.chance(0.3) ? rng.pick([...team, '#1d1d24']) : rng.pick(HAIR);
    ctx.fillRect(px - 1, top - 4, 3, 1);
    if (rng.chance(0.07)) {
      ctx.fillStyle = skin; // braços para cima
      ctx.fillRect(px - 3, top - 3, 1, 3);
      ctx.fillRect(px + 3, top - 3, 1, 3);
    }
  }

  // Escadas: cinza com degrau escuro e bordas claras (corrimão)
  stairs.forEach((s) => {
    if (inExit) return;
    const a = tx(s - STAIR_W / 2);
    const b = tx(s + STAIR_W / 2);
    ctx.fillStyle = '#6e7389';
    ctx.fillRect(a, 0, b - a, H);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(a, H - 4, b - a, 3);
    ctx.fillStyle = '#a9aec2';
    ctx.fillRect(a - 1, 0, 1, H);
    ctx.fillRect(b, 0, 1, H);
  });

  // Saídas: túnel escuro no topo da escada + placa verde "SAÍDA" na fileira de cima
  for (const i of STAIR_IDS) {
    const [ua, ub] = exitRange(i);
    const a = tx(ua);
    const b = tx(ub);
    if (row >= m.exitRow && row < m.exitRow + EXIT_ROWS) {
      ctx.fillStyle = '#8c91a8';
      ctx.fillRect(a, 0, b - a, H);
      ctx.fillStyle = '#07080d';
      ctx.fillRect(a + 2, 0, b - a - 4, row === m.exitRow ? H - 2 : H);
    }
    if (row === m.exitRow + EXIT_ROWS) {
      ctx.fillStyle = '#8c91a8';
      ctx.fillRect(a, H - 3, b - a, 3);
      ctx.fillStyle = '#1f9d55';
      ctx.fillRect(a + 1, 1, b - a - 2, H - 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = '7px Silkscreen';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SAÍDA', (a + b) / 2, (H - 4) / 2 + 1);
    }
  }
  return finishTexture(tex, r);
}

/** Textura de uma fileira de fachada: corredor com janelas acesas (band) ou teto escuro (roof). */
function makeBandTexture(scene: Phaser.Scene, key: string, spec: RowSpec, rng: Rng) {
  const r = spec.r;
  const { len } = rowGeom(r);
  const W = Math.ceil(len * TPY);
  const H = ROW_TEX_H;
  const tex = scene.textures.createCanvas(key, W, H)!;
  const ctx = tex.getContext();
  const tx = (u: number) => Math.round(u * TPY);
  const last = spec.inTier === spec.count - 1;
  if (spec.kind === 'roof') {
    ctx.fillStyle = spec.inTier % 2 ? '#2a2f45' : '#323852';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#6e7389';
    ctx.fillRect(0, last ? 0 : H - 2, W, 2); // aresta clara do teto
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, H - 3, W, 3);
  } else {
    ctx.fillStyle = '#1b1f33';
    ctx.fillRect(0, 0, W, H);
    // pilares claros e janelas do corredor, algumas acesas
    for (let u = 2; u < len; u += 9) {
      ctx.fillStyle = '#3a4160';
      ctx.fillRect(tx(u), 0, 3, H);
    }
    for (let u = 3; u < len - 1; u += 2.4) {
      if (Math.floor(u) % 9 < 1) continue;
      ctx.fillStyle = rng.chance(0.55) ? '#ffd98a' : '#2b3150';
      ctx.fillRect(tx(u), 4, 7, 5);
    }
    if (spec.inTier === 0) {
      ctx.fillStyle = hostTeam().colorHex; // faixa do time na base do corredor
      ctx.fillRect(0, H - 4, W, 3);
    }
    if (last) {
      ctx.fillStyle = '#8c91a8'; // corrimão no topo
      ctx.fillRect(0, 0, W, 2);
    }
  }
  return finishTexture(tex, r);
}

/** Atualiza a textura e a corta em pedaços: arcos em vários pedaços, a reta inteira. */
function finishTexture(tex: Phaser.Textures.CanvasTexture, r: number) {
  const W = tex.width;
  const H = ROW_TEX_H;
  const tx = (u: number) => Math.round(u * TPY);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Pedaços (frames) da fileira: arcos em vários pedaços, a reta inteira
  const g = rowGeom(r);
  const cuts: number[] = [];
  for (let i = 0; i <= ARC_SEGS; i++) cuts.push((g.arc * i) / ARC_SEGS);
  for (let i = 1; i <= ARC_SEGS; i++) cuts.push(g.arc + STRAIGHT + (g.arc * i) / ARC_SEGS);
  const pieces: { frame: string; u0: number; u1: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = tx(cuts[i]);
    const b = Math.min(W, tx(cuts[i + 1]) + 1); // 1 texel de sobra evita frestas
    const frame = `p${i}`;
    tex.add(frame, 0, a, 0, b - a, H);
    pieces.push({ frame, u0: cuts[i], u1: cuts[i + 1] });
  }
  return pieces;
}

const pa: ScreenPoint = { x: 0, y: 0, s: 0 };
const pb: ScreenPoint = { x: 0, y: 0, s: 0 };

interface Piece {
  img: Phaser.GameObjects.Image;
  k: number;
  r: number;
  u0: number;
  u1: number;
}

export class Grandstand {
  readonly model: StandModel;
  private specs: RowSpec[];
  private pieces: Piece[] = [];
  private phases: number[] = [];
  private g: Phaser.GameObjects.Graphics; // muro da frente + flashes
  private sg: Phaser.GameObjects.Graphics; // telão
  private wallText: Phaser.GameObjects.Text;
  private screenText: Phaser.GameObjects.Text | null = null;
  /** Cidade do time da casa atrás das arquibancadas compactas. */
  private skyline: Phaser.GameObjects.Image | null = null;
  /** Refletores nos cantos e no fundo das arquibancadas compactas: postes/painéis num Graphics e brilhos aditivos. */
  private lg: Phaser.GameObjects.Graphics;
  private glows: Phaser.GameObjects.Image[] = [];
  /** Painel de lâmpadas de cada torre (textura em alta resolução). */
  private panels: Phaser.GameObjects.Image[] = [];
  private fx = new Rng(MATCH_SEED + 9);
  private flashes: { k: number; u: number; life: number }[] = [];
  private time = 0;
  /** Empolgação (0..1): as fileiras pulam e os flashes aumentam. */
  excite = 0;

  constructor(scene: Phaser.Scene, private proj: Projection, private tod: TimeOfDay = 'night', weather: SkyWeather = 'clear') {
    const rng = new Rng(MATCH_SEED);
    this.model = pickStandModel();
    this.specs = buildRows(this.model);
    this.specs.forEach((spec, k) => {
      const key = `stand_row_${k}`;
      const pieces = spec.kind === 'seat' ? makeRowTexture(scene, key, spec, this.model, rng) : makeBandTexture(scene, key, spec, rng);
      for (const p of pieces) {
        const img = scene.add.image(0, 0, key, p.frame).setOrigin(0, 1);
        this.pieces.push({ img, k, r: spec.r, u0: p.u0, u1: p.u1 });
      }
      this.phases.push(rng.range(0, Math.PI * 2));
    });
    if (this.model.id !== 'classica') {
      makeSkylineTexture(scene, 'skyline', stadiumOf(venue.id ?? TEAMS.home.id).city, 11 + (venue.id ?? TEAMS.home.id).charCodeAt(0) * 7, tod, weather);
      this.skyline = scene.add.image(0, 0, 'skyline').setOrigin(0, 1).setDepth(2.9);
    }
    this.lg = scene.add.graphics().setDepth(3.45);
    if (this.model.id !== 'classica') {
      // Brilho do refletor: textura grande e suave (filtro linear: nada de pixel serrilhado ao ampliar)
      if (scene.textures.exists('glow')) scene.textures.remove('glow');
      const gt = scene.textures.createCanvas('glow', 256, 256)!;
      const gc = gt.getContext();
      const rg = gc.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, 'rgba(255,248,226,0.95)');
      rg.addColorStop(0.1, 'rgba(255,244,214,0.55)');
      rg.addColorStop(0.35, 'rgba(255,238,200,0.16)');
      rg.addColorStop(0.7, 'rgba(255,236,196,0.04)');
      rg.addColorStop(1, 'rgba(255,236,196,0)');
      gc.fillStyle = rg;
      gc.fillRect(0, 0, 256, 256);
      gt.refresh();
      gt.setFilter(Phaser.Textures.FilterMode.LINEAR);
      makeFloodPanels(scene);
      for (let i = 0; i < 4; i++) {
        this.glows.push(scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(59.5).setVisible(false));
        this.panels.push(scene.add.image(0, 0, 'flood_off').setDepth(3.46).setVisible(false));
      }
    }
    this.g = scene.add.graphics().setDepth(3.9);
    this.sg = scene.add.graphics().setDepth(3.5);
    this.wallText = scene.add
      .text(0, 0, 'QB CAREER :: QB CAREER :: QB CAREER', { fontFamily: FONT_TITLE, fontSize: '32px', color: hostTeam().colorHex })
      .setOrigin(0.5, 0.5)
      .setDepth(3.95);
    if (this.model.screen) {
      this.screenText = scene.add
        .text(0, 0, hostTeam().name, { fontFamily: FONT_TITLE, fontSize: '32px', color: '#ffffff' })
        .setOrigin(0.5, 0.5)
        .setDepth(3.55);
    }
  }

  cheer(amount = 1) {
    this.excite = Math.min(1, this.excite + amount);
  }

  private rowH(k: number) {
    return this.specs[k].h;
  }

  /** Telão gigante: em cima da arquibancada (telao) ou ocupando a faixa do meio (separacao). */
  private drawScreen() {
    const m = this.model;
    const sg = this.sg;
    sg.clear();
    const t = this.screenText;
    if (!m.screen || !t) return;
    const proj = this.proj;
    const specs = this.specs;
    let x0 = 13.5;
    let x1 = 39.8;
    let y: number;
    let h0: number;
    let h1: number;
    if (m.screen === 'top') {
      const top = specs[specs.length - 1];
      y = CY + top.r;
      h0 = top.h + 2;
      h1 = h0 + 5.5;
      // Estrutura de sustentação
      wallQuad(sg, proj, x0 + 2, y, x0 + 3.4, y, top.h - 0.5, h0, 0x2a2f45);
      wallQuad(sg, proj, x1 - 3.4, y, x1 - 2, y, top.h - 0.5, h0, 0x2a2f45);
    } else {
      const bands = specs.filter((p) => p.kind === 'band');
      y = CY + bands[bands.length >> 1].r;
      h0 = bands[0].h + 0.3;
      h1 = bands[bands.length - 1].h + 1.5;
      x0 = 12;
      x1 = 41.3;
    }
    if (y < proj.nearY) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.2);
    wallQuad(sg, proj, x0 - 0.5, y, x1 + 0.5, y, h0 - 0.5, h1 + 0.5, 0x555b73); // moldura
    wallQuad(sg, proj, x0, y, x1, y, h0, h1, 0x090b18); // tela
    const tall = h1 - h0;
    wallQuad(sg, proj, x0 + 0.3, y, x1 - 0.3, y, h0 + tall * 0.7, h1 - 0.3, 0x142257, 0.9); // brilho do topo
    wallQuad(sg, proj, x0 + 0.3, y, x1 - 0.3, y, h0 + 0.3, h0 + tall * 0.2, hostTeam().color, 0.55 + 0.3 * pulse); // faixa do time
    // Texto do telão: nome do time e "QB CAREER" alternando
    t.setText(Math.floor(this.time / 4) % 2 ? 'QB CAREER' : hostTeam().name);
    proj.project((x0 + x1) / 2, y, (h0 + h1) / 2 + tall * 0.08, pa);
    proj.project(x0, y, h0, pb);
    const wpx = Math.abs(pa.x - pb.x) * 2;
    const hpx = Math.abs(proj.project((x0 + x1) / 2, y, h1, pb).y - proj.project((x0 + x1) / 2, y, h0, pb).y);
    const sc = Math.min((wpx * 0.8) / Math.max(1, t.width), (hpx * 0.42) / 32);
    t.setPosition(pa.x, pa.y).setScale(sc).setVisible(pa.y > -60 && pa.y < proj.h + 60);
  }

  /** Refletores: 4 torres de luz saindo do topo da arquibancada (cantos e fundo), acesas conforme o horário. */
  private drawLights() {
    const g = this.lg;
    g.clear();
    if (!this.glows.length) return;
    const proj = this.proj;
    const top = this.specs[this.specs.length - 1];
    const lvl = TOD[this.tod].lamps;
    const geom = rowGeom(top.r);
    const us = [geom.arc * 0.5, geom.arc + STRAIGHT * 0.2, geom.arc + STRAIGHT * 0.8, geom.arc + STRAIGHT + geom.arc * 0.5];
    const poleH = 7;
    us.forEach((u, i) => {
      const img = this.glows[i];
      const [x, y] = pointAt(top.r, u);
      const panel = this.panels[i];
      if (y < proj.nearY) {
        img.setVisible(false);
        panel.setVisible(false);
        return;
      }
      const ht = top.h + poleH;
      proj.project(x, y, top.h - 0.5, pa);
      proj.project(x, y, ht, pb);
      g.lineStyle(Math.max(1.4, pa.s * 1.7), 0x2a2f45, 1);
      g.lineBetween(pa.x, pa.y, pb.x, pb.y);
      // Painel de lâmpadas (4 colunas × 3 fileiras), imagem suave do tamanho projetado
      const lit = lvl > 0.05;
      proj.project(x - 2.9, y, ht + 1.7, pa);
      proj.project(x + 2.9, y, ht + 1.7, pb);
      const pw = Math.abs(pb.x - pa.x);
      const ph = Math.abs(proj.project(x, y, ht - 0.3, pb).y - proj.project(x, y, ht + 3.8, pa).y);
      proj.project(x, y, ht + 1.75, pa);
      panel.setTexture(lit ? 'flood_on' : 'flood_off').setVisible(pa.y > -80).setPosition(pa.x, pa.y).setDisplaySize(pw, ph);
      // Brilho: mais fraco que antes (a luz do campo já vem da camada da noite)
      const k = lvl * 0.42 * (0.94 + 0.06 * Math.sin(this.time * 3 + i));
      img.setVisible(k > 0.02 && pa.y > -80)
        .setPosition(pa.x, pa.y)
        .setScale((pa.s * 10 * 20) / 256)
        .setAlpha(k);
    });
  }

  /** Cidade ao fundo: faixa larga bem atrás da última fileira, com a base escondida atrás das cadeiras. */
  private drawSkyline() {
    const img = this.skyline;
    if (!img) return;
    const proj = this.proj;
    const top = this.specs[this.specs.length - 1];
    const y = CY + top.r + 10;
    const yd = 100; // a cidade tem 100 jardas de largura
    const x0 = (CX_L + CX_R) / 2 - yd / 2;
    const x1 = x0 + yd;
    const hb = Math.max(0, top.h * 0.45);
    proj.project(x0, y, hb, pa);
    proj.project(x1, y, hb, pb);
    img.setVisible(y > proj.nearY).setPosition(pa.x, pa.y).setScale((pb.x - pa.x) / SKY_W, (pa.s * 10) / (SKY_W / yd));
    void SKY_H;
  }

  update(dt: number) {
    this.time += dt;
    this.excite = Math.max(0, this.excite - dt * 0.45);
    const proj = this.proj;
    const near = proj.nearY;

    // Cada pedaço: ponta esquerda projetada, largura até a ponta direita, altura pela profundidade
    for (const p of this.pieces) {
      const [x0, y0] = pointAt(p.r, p.u0);
      const [x1, y1] = pointAt(p.r, p.u1);
      if (Math.max(y0, y1) < near) {
        p.img.setVisible(false);
        continue;
      }
      const seat = this.specs[p.k].kind === 'seat';
      const jump = seat && this.excite > 0.01 ? Math.max(0, Math.sin(this.time * 11 + this.phases[p.k])) * 0.35 * this.excite : 0;
      const h = this.rowH(p.k) + jump;
      proj.project(x0, y0, h, pa);
      proj.project(x1, y1, h, pb);
      const w = p.img.frame.width;
      const sy = (pa.s * 10) / TPY;
      const sx = Math.max(0.0001, (pb.x - pa.x) / w);
      // Mais perto da câmera (y menor) na frente; fileira de fora atrás
      const ymid = (y0 + y1) / 2;
      p.img
        .setVisible(pa.y > -40 && pa.x < proj.w + 20 && pb.x > -20)
        .setPosition(pa.x, Math.max(pa.y, pb.y))
        .setScale(sx, sy)
        .setDepth(3 + (300 - ymid) * 0.001 - p.k * 0.00001);
    }

    this.drawScreen();
    this.drawSkyline();
    this.drawLights();

    // Muro escuro na frente, seguindo a curva dos cantos
    const g = this.g;
    g.clear();
    const wr = R0;
    const wl = rowGeom(wr).len;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const [ax, ay] = pointAt(wr, (wl * i) / N);
      const [bx, by] = pointAt(wr, (wl * (i + 1)) / N);
      wallQuad(g, proj, ax, ay, bx, by, 0, WALL_H + 0.4, 0x0d0d12);
      wallQuad(g, proj, ax, ay, bx, by, WALL_H + 0.25, WALL_H + 0.4, 0x555b73);
    }
    proj.project((CX_L + CX_R) / 2, CY + wr, WALL_H * 0.5, pa);
    this.wallText.setPosition(pa.x, pa.y).setScale((WALL_H * 0.55 * pa.s * 10) / 32);

    // Flashes de câmera aleatórios na torcida (só nas cadeiras)
    if (this.fx.next() < (2 + this.excite * 16) * dt) {
      const k = this.fx.int(0, this.specs.length - 1);
      if (this.specs[k].kind === 'seat') this.flashes.push({ k, u: this.fx.range(0, rowGeom(this.specs[k].r).len), life: 0.14 });
    }
    for (const f of this.flashes) {
      f.life -= dt;
      if (f.life <= 0) continue;
      const [x, y] = pointAt(this.specs[f.k].r, f.u);
      if (y < near) continue;
      proj.project(x, y, this.rowH(f.k) + 1, pa);
      if (pa.x < 0 || pa.x > proj.w || pa.y < 0) continue;
      const k = f.life / 0.14;
      const fu = pa.s * 10;
      g.fillStyle(0xffffff, 0.35 * k);
      g.fillCircle(pa.x, pa.y, fu * 0.9 * k + 1);
      g.fillStyle(0xffffff, k);
      g.fillRect(pa.x - fu * k, pa.y - 0.5, fu * 2 * k, 1);
      g.fillRect(pa.x - 0.5, pa.y - fu * k, 1, fu * 2 * k);
    }
    this.flashes = this.flashes.filter((f) => f.life > 0);
  }
}

/** Texturas do painel do refletor (aceso e apagado): carcaça com degradê, moldura e 12 lâmpadas com brilho. */
function makeFloodPanels(scene: Phaser.Scene) {
  const W = 160;
  const H = 112;
  for (const lit of [true, false]) {
    const key = lit ? 'flood_on' : 'flood_off';
    if (scene.textures.exists(key)) continue;
    const t = scene.textures.createCanvas(key, W, H)!;
    const c = t.getContext();
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    };
    // Carcaça metálica
    const body = c.createLinearGradient(0, 0, 0, H);
    body.addColorStop(0, '#6c7390');
    body.addColorStop(0.5, '#3a3f58');
    body.addColorStop(1, '#23273a');
    c.fillStyle = body;
    rr(2, 2, W - 4, H - 4, 12);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 2;
    c.stroke();
    // Fundo das lâmpadas
    c.fillStyle = '#10121f';
    rr(10, 10, W - 20, H - 20, 8);
    c.fill();
    // Lâmpadas
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const x = 30 + i * 33;
        const y = 29 + j * 27;
        if (lit) {
          const halo = c.createRadialGradient(x, y, 0, x, y, 16);
          halo.addColorStop(0, 'rgba(255,250,230,0.9)');
          halo.addColorStop(1, 'rgba(255,240,200,0)');
          c.fillStyle = halo;
          c.fillRect(x - 16, y - 16, 32, 32);
        }
        const bulb = c.createRadialGradient(x - 3, y - 3, 1, x, y, 10);
        bulb.addColorStop(0, lit ? '#ffffff' : '#c9cedc');
        bulb.addColorStop(0.6, lit ? '#fff3cf' : '#7d8399');
        bulb.addColorStop(1, lit ? '#f5d98f' : '#4a4f66');
        c.fillStyle = bulb;
        c.beginPath();
        c.arc(x, y, 10, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.45)';
        c.lineWidth = 1.5;
        c.stroke();
      }
    }
    t.refresh();
    t.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
