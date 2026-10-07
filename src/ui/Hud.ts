import Phaser from 'phaser';
import { TEAMS } from '../config';
import type { GameState } from '../state/GameState';
import { label, title, UI } from './widgets';

/*
 * HUD do topo (retrô), como no design:
 *  - placar LOB x TOU nas cores dos times, com retrospecto, quarto e relógio;
 *  - barra com descida/distância, posição e play clock;
 *  - card do QB (#12 · ROOKIE · OVR 68) com barra de CONFIANÇA.
 */
export class Hud {
  private texts: Record<string, Phaser.GameObjects.Text> = {};
  private conf: Phaser.GameObjects.Graphics;
  readonly downBar: Phaser.GameObjects.Container;
  readonly card: Phaser.GameObjects.Container;
  private playBox: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private state: GameState, depth = 100) {
    const W = scene.scale.width;
    const L = 12;
    const R = W - 12;
    const g = scene.add.graphics().setDepth(depth);

    // Placar
    const top = 14;
    const h = 44;
    const mid = 96;
    const side = (R - L - mid) / 2;
    g.fillStyle(UI.dark, 1);
    g.fillRect(L - 3, top - 3, R - L + 6, h + 6);
    g.fillStyle(TEAMS.home.color, 1);
    g.fillRect(L, top, side, h);
    g.fillStyle(0xf3f0e6, 1);
    g.fillRect(L + side, top, mid, h);
    g.fillStyle(TEAMS.away.color, 1);
    g.fillRect(L + side + mid, top, side, h);

    const t = (k: string, o: Phaser.GameObjects.Text) => (this.texts[k] = o.setDepth(depth + 1));
    t('homeAbbr', title(scene, L + 10, top + 9, TEAMS.home.abbr, 12, '#0D0D12'));
    t('homeRec', label(scene, L + 10, top + 25, '', 10, '#0D0D12'));
    t('homeScore', title(scene, L + side - 10, top + h / 2, '', 18, '#0D0D12').setOrigin(1, 0.5));
    t('quarter', label(scene, L + side + mid / 2, top + 13, '', 11, '#0D0D12').setOrigin(0.5));
    t('clock', title(scene, L + side + mid / 2, top + 31, '', 12, '#0D0D12').setOrigin(0.5));
    t('awayScore', title(scene, L + side + mid + 10, top + h / 2, '', 18, '#FFFFFF').setOrigin(0, 0.5));
    t('awayAbbr', title(scene, R - 10, top + 9, TEAMS.away.abbr, 12, '#FFFFFF').setOrigin(1, 0));
    t('awayRec', label(scene, R - 10, top + 25, '', 10, '#FFFFFF').setOrigin(1, 0));

    // Barra de descida / posição / play clock
    this.downBar = scene.add.container(0, 0).setDepth(depth);
    const bar = scene.add.graphics();
    this.playBox = scene.add.graphics();
    this.downBar.add([bar, this.playBox]);
    const by = 72;
    const bh = 34;
    const down = title(scene, 0, by + bh / 2, '', 12, '#0D0D12').setOrigin(0, 0.5);
    const spot = label(scene, 0, by + bh / 2, '', 12, '#FFFFFF').setOrigin(0, 0.5);
    const playLbl = label(scene, 0, by + bh / 2, 'PLAY', 10, '#C9CEE0').setOrigin(0, 0.5);
    const playNum = title(scene, 0, by + bh / 2, '', 12, UI.yellow).setOrigin(0, 0.5);
    this.downBar.add([down, spot, playLbl, playNum]);
    this.texts.down = down;
    this.texts.spot = spot;
    this.texts.playNum = playNum;
    this.texts.playLbl = playLbl;
    this.layoutBar = () => {
      down.setText(state.downText);
      const dw = down.width + 20;
      const playW = playLbl.width + 6 + 26 + 20;
      bar.clear();
      bar.fillStyle(UI.dark, 1);
      bar.fillRect(L - 3, by - 3, dw + 6, bh + 6);
      bar.fillStyle(0xffd23f, 1);
      bar.fillRect(L, by, dw, bh);
      bar.fillStyle(UI.dark, 1);
      bar.fillRect(L + dw + 8 - 3, by - 3, R - (L + dw + 8) - playW - 8 + 6, bh + 6);
      bar.fillStyle(UI.dark, 0.85);
      bar.fillRect(L + dw + 8, by, R - (L + dw + 8) - playW - 8, bh);
      down.setX(L + 10);
      spot.setX(L + dw + 18);
      playLbl.setX(R - playW + 10);
      playNum.setX(R - playW + 10 + playLbl.width + 6);
      this.playRect = [R - playW, by, playW, bh];
    };

    // Card do QB com barra de confiança (some na visão tática)
    this.card = scene.add.container(0, 0).setDepth(depth);
    const cg = scene.add.graphics();
    const cy = 116;
    const cw = 150;
    const ch = 46;
    cg.fillStyle(UI.dark, 1);
    cg.fillRect(L - 3, cy - 3, cw + 6, ch + 6);
    cg.fillStyle(UI.dark, 0.85);
    cg.fillRect(L, cy, cw, ch);
    this.texts.qbNum = title(scene, L + 10, cy + 9, `#${state.qb.number}`, 10, UI.yellow);
    this.texts.qbInfo = label(scene, L + 50, cy + 7, `${state.qb.level} · OVR ${state.qb.ovr}`, 11, '#FFFFFF');
    this.texts.confLbl = label(scene, L + 10, cy + 27, 'CONFIANÇA', 10, '#C9CEE0');
    this.conf = scene.add.graphics();
    this.card.add([cg, this.texts.qbNum, this.texts.qbInfo, this.texts.confLbl, this.conf]);
    this.confX = L + 10 + this.texts.confLbl.width + 6;
    this.confY = cy + 29;

    this.refresh();
  }

  private layoutBar: () => void;
  private playRect: [number, number, number, number] = [0, 0, 0, 0];
  private confX = 0;
  private confY = 0;

  // ---- Barras alternativas (lance ao vivo / resultado), no mesmo lugar da barra de descida
  private pocketBar!: Phaser.GameObjects.Container;
  private pocketSegs!: Phaser.GameObjects.Graphics;
  private pocketTime!: Phaser.GameObjects.Text;
  private pocketDown!: Phaser.GameObjects.Text;
  private resultBar!: Phaser.GameObjects.Container;
  private resultG!: Phaser.GameObjects.Graphics;
  private resultText!: Phaser.GameObjects.Text;
  private resultYds!: Phaser.GameObjects.Text;
  private resultDown!: Phaser.GameObjects.Text;

  private buildBars(depth: number) {
    const sc = this.scene;
    const L = 12;
    const R = sc.scale.width - 12;
    const by = 72;
    const bh = 34;
    // POCKET: "2ª & 7" + segmentos + segundos
    this.pocketBar = sc.add.container(0, 0).setDepth(depth).setVisible(false);
    const pg = sc.add.graphics();
    this.pocketDown = title(sc, L + 10, by + bh / 2, '', 12, '#0D0D12').setOrigin(0, 0.5);
    const plbl = label(sc, 0, by + bh / 2, 'POCKET', 10, '#C9CEE0').setOrigin(0, 0.5);
    this.pocketTime = title(sc, R - 10, by + bh / 2, '', 9, '#FFB02E').setOrigin(1, 0.5);
    this.pocketSegs = sc.add.graphics();
    this.pocketBar.add([pg, this.pocketDown, plbl, this.pocketTime, this.pocketSegs]);
    this.layoutPocket = () => {
      this.pocketDown.setText(this.state.downText);
      const dw = this.pocketDown.width + 20;
      pg.clear();
      pg.fillStyle(UI.dark, 1);
      pg.fillRect(L - 3, by - 3, dw + 6, bh + 6);
      pg.fillStyle(0xffd23f, 1);
      pg.fillRect(L, by, dw, bh);
      pg.fillStyle(UI.dark, 1);
      pg.fillRect(L + dw + 8 - 3, by - 3, R - L - dw - 8 + 6, bh + 6);
      pg.fillStyle(UI.dark, 0.85);
      pg.fillRect(L + dw + 8, by, R - L - dw - 8, bh);
      plbl.setX(L + dw + 18);
      this.segX0 = plbl.x + plbl.width + 8;
      this.segX1 = R - 50;
    };
    // Resultado: "PASSE COMPLETO · SLANT" + "+14"
    this.resultBar = sc.add.container(0, 0).setDepth(depth).setVisible(false);
    this.resultG = sc.add.graphics();
    this.resultDown = title(sc, L + 10, by + bh / 2, '', 12, '#0D0D12').setOrigin(0, 0.5);
    this.resultText = label(sc, 0, by + bh / 2, '', 11, '#FFFFFF').setOrigin(0, 0.5);
    this.resultYds = title(sc, R - 10, by + bh / 2, '', 11, '#0D0D12').setOrigin(1, 0.5);
    this.resultBar.add([this.resultG, this.resultDown, this.resultText, this.resultYds]);
  }
  private layoutPocket: () => void = () => {};
  private segX0 = 0;
  private segX1 = 0;

  /** Qual barra aparece embaixo do placar. */
  setBar(mode: 'pre' | 'pocket' | 'result') {
    if (!this.pocketBar) this.buildBars(this.downBar.depth);
    this.downBar.setVisible(mode === 'pre');
    this.pocketBar.setVisible(mode === 'pocket');
    this.resultBar.setVisible(mode === 'result');
    this.card.setVisible(mode === 'pre');
    if (mode === 'pocket') this.layoutPocket();
  }

  /** Barra POCKET: 7 segmentos (verde → laranja → vermelho) e os segundos que restam. */
  setPocket(sec: number, frac: number) {
    const g = this.pocketSegs;
    g.clear();
    const n = 7;
    const gap = 2;
    const w = (this.segX1 - this.segX0 - gap * (n - 1)) / n;
    const lit = Math.ceil(Math.max(0, Math.min(1, frac)) * n);
    for (let i = 0; i < n; i++) {
      const col = i >= lit ? 0x3a4060 : i < 3 ? 0x3ccb5a : i < 5 ? 0xffb02e : 0xe5484d;
      g.fillStyle(col, 1);
      g.fillRect(this.segX0 + i * (w + gap), 72 + 12, w, 10);
    }
    this.pocketTime.setText(`${Math.max(0, sec).toFixed(1)}s`);
    this.pocketTime.setColor(sec < 1 ? '#E5484D' : sec < 2 ? '#FFB02E' : '#3CCB5A');
  }

  /** Barra de resultado do lance. */
  setResult(text: string, yards: string, color: number, chip?: [string, number, string]) {
    if (!this.pocketBar) this.buildBars(this.downBar.depth);
    const L = 12;
    const R = this.scene.scale.width - 12;
    const by = 72;
    const bh = 34;
    this.resultDown.setText(chip ? chip[0] : this.state.downText).setColor(chip ? chip[2] : '#0D0D12');
    this.resultText.setText(text);
    this.resultYds.setText(yards);
    const dw = this.resultDown.width + 20;
    const yw = yards ? this.resultYds.width + 20 : 0;
    const g = this.resultG;
    g.clear();
    g.fillStyle(UI.dark, 1);
    g.fillRect(L - 3, by - 3, dw + 6, bh + 6);
    g.fillStyle(chip ? chip[1] : 0xffd23f, 1);
    g.fillRect(L, by, dw, bh);
    const mx = L + dw + 8;
    const mw = R - mx - (yw ? yw + 8 : 0);
    g.fillStyle(UI.dark, 1);
    g.fillRect(mx - 3, by - 3, mw + 6, bh + 6);
    g.fillStyle(UI.dark, 0.85);
    g.fillRect(mx, by, mw, bh);
    if (yw) {
      g.fillStyle(UI.dark, 1);
      g.fillRect(R - yw - 3, by - 3, yw + 6, bh + 6);
      g.fillStyle(color, 1);
      g.fillRect(R - yw, by, yw, bh);
    }
    this.resultText.setX(mx + 10);
  }

  /** Na visão tática a legenda ocupa o lugar da barra de descida e do card do QB. */
  setTactical(on: boolean) {
    this.downBar.setVisible(!on);
    this.card.setVisible(!on);
  }

  /** Atualiza todos os textos a partir do estado. */
  refresh() {
    const s = this.state;
    this.texts.homeRec.setText(s.recordText('home'));
    this.texts.awayRec.setText(s.recordText('away'));
    this.texts.homeScore.setText(String(s.score.home));
    this.texts.awayScore.setText(String(s.score.away));
    this.texts.quarter.setText(s.quarterText);
    this.texts.clock.setText(s.clockText);
    this.texts.spot.setText(s.spotText);
    this.layoutBar();
    this.setPlayClock(s.playClock);
    const g = this.conf;
    g.clear();
    for (let i = 0; i < 5; i++) {
      g.fillStyle(i < s.confidence ? 0x3ccb5a : 0x3a4060, 1);
      g.fillRect(this.confX + i * 12, this.confY, 10, 8);
    }
  }

  /** Play clock: fica vermelho e pisca nos últimos 5 segundos. */
  setPlayClock(sec: number) {
    const n = Math.ceil(sec);
    this.texts.playNum.setText(String(n).padStart(2, '0'));
    const danger = n <= 5;
    this.texts.playNum.setColor(danger ? '#FF5A5F' : UI.yellow);
    const [x, y, w, h] = this.playRect;
    const g = this.playBox;
    g.clear();
    g.fillStyle(UI.dark, 1);
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const blink = danger && Math.floor(sec * 4) % 2 === 0;
    g.fillStyle(blink ? 0x5a1418 : UI.dark, 0.9);
    g.fillRect(x, y, w, h);
  }
}

