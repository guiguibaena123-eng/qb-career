import Phaser from 'phaser';
import { FIELD, FONT_TITLE, MATCH_SEED, TEAMS } from '../config';
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
import { Player } from '../entities/Player';
import { blockAssignments, pickScheme, readText, tipText, type Scheme } from '../systems/ai';
import { groundArrow, groundPath, groundRing, groundOval, groundSegment } from '../systems/groundfx';
import { Rng } from '../systems/rng';
import { World } from '../systems/world';
import { GameState } from '../state/GameState';
import { Hud } from '../ui/Hud';
import { bottomGradient, GlassButton, label, Tag, title, UI } from '../ui/widgets';

const KEYS: RecvKey[] = ['A', 'B', 'C', 'D', 'E'];
const MID = FIELD.width / 2;
const PLAY_CLOCK = 25;
const C_BLOCK = 0xf3f3ee;
const C_PRESS = 0xe5484d;
const C_COVER = 0x7fb2ff;
const C_OPEN = 0x3ccb5a;

/**
 * Pré-snap: formação em campo, rotas tracejadas, hot routes (tocar na letra),
 * PASSE | CORRIDA, AUDIBLE, play clock e visão tática (segurar o botão).
 */
export class PreSnapScene extends Phaser.Scene {
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

  constructor() {
    super('PreSnapScene');
  }

  create() {
    const s = this.state;
    this.world = new World(this, s.los);
    this.fx = this.add.graphics().setDepth(0.8);
    this.spawnPlayers();
    this.scheme = pickScheme(this.rng);

    this.hud = new Hud(this, s);
    this.buildFieldTags();
    this.buildBottom();
    this.buildTactical();
    this.applyLos();

    // Parâmetros de depuração: ?fps mostra o FPS, ?tatica abre já na visão tática
    const q = new URLSearchParams(location.search);
    if (q.has('tatica')) this.setTactical(true);
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
      const tag = new Tag(this, k === 'E' ? 'E · RB' : k, RECV_COLORS[k], '#0D0D12', 10).setDepth(40);
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
    navigator.vibrate?.(30);
    this.cameras.main.shake(90, 0.004);
    this.toast('SNAP!', '#FFFFFF', 30);
    this.time.delayedCall(450, () => this.toast('LANCE AO VIVO NA ETAPA 4', UI.yellow, 10, 520));
    // Nova leitura da defesa para a próxima jogada
    this.scheme = pickScheme(this.rng);
    this.state.playClock = PLAY_CLOCK;
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
    const dt = Math.min(dtMs, 50) / 1000;
    this.elapsed += dt;
    const s = this.state;

    // Play clock
    s.playClock -= dt;
    if (s.playClock <= 0) this.delayOfGame();
    this.hud.setPlayClock(Math.max(0, s.playClock));

    this.world.update(dt);
    this.drawGround();
    this.placeTags();
    this.fps?.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }

  private drawGround() {
    const g = this.fx;
    const proj = this.world.proj;
    g.clear();
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
}
