import Phaser from 'phaser';
import { FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, RES, matchConfig, finalGame, TEAMS, venue, VIEW } from '../config';
import { isDome } from '../data/stadiums';
import type { Projection, ScreenPoint } from './projection';
import type { Rng } from './rng';

/*
 * Clima (telas Chuva / Neve do design):
 *   CHUVA → gotas inclinadas, respingos no gramado, relâmpago de vez em quando e tela mais escura.
 *           Bola molhada: mais drop/fumble e tackle escorrega.
 *   NEVE  → flocos caindo em ziguezague e tela mais clara/azulada.
 *           Bola escorregadia: precisão −10% e o carregador pode escorregar no corte.
 * Gotas e flocos são camadas de textura que deslizam (cobrem a tela inteira e custam quase nada por
 * quadro; antes eram centenas de linhas vetoriais refeitas a cada quadro).
 */

export type WeatherKind = 'clear' | 'rain' | 'snow';

export const WEATHER_INFO: Record<Exclude<WeatherKind, 'clear'>, { title: string; sub: string }> = {
  rain: { title: 'CHUVA FORTE · 14°C', sub: 'BOLA MOLHADA · RISCO DE FUMBLE' },
  snow: { title: 'NEVE · -3°C', sub: 'BOLA ESCORREGADIA · PRECISÃO -10%' },
};

interface Drop {
  x: number;
  y: number;
  v: number;
  len: number;
  a: number;
  size: number;
  phase: number;
}

export class Weather {
  readonly kind: WeatherKind;
  private g: Phaser.GameObjects.Graphics;
  /** Respingos: ficam no chão, abaixo dos jogadores e da interface (as gotas é que vão por cima). */
  private gs: Phaser.GameObjects.Graphics;
  private tint: Phaser.GameObjects.Rectangle;
  private flash: Phaser.GameObjects.Rectangle;
  private drops: Drop[] = [];
  /** Camadas de chuva/neve (longe → perto): textura que desliza; velocidade (px/s) e balanço da neve. */
  private layers: { ts: Phaser.GameObjects.TileSprite; v: number; sway: number; ph: number }[] = [];
  private splashAcc = 0;
  /** Respingos no gramado: posição no MUNDO (jardas), então ficam parados no campo quando a câmera anda. */
  private splashes: { x: number; y: number; t: number }[] = [];
  private pt: ScreenPoint = { x: 0, y: 0, s: 0 };
  private boltT = 0;
  private boltNext = 6;
  readonly pill: Phaser.GameObjects.Container | null = null;

  /** `night`: a iluminação da noite é a mesma do tempo limpo — a névoa do clima fica fraca e por baixo da luz. */
  constructor(private scene: Phaser.Scene, kind: WeatherKind, private rng: Rng, night = false) {
    this.kind = kind;
    const W = GAME_W;
    const H = GAME_H;
    const haze = kind === 'rain' ? (night ? 0.1 : 0.4) : kind === 'snow' ? (night ? 0.08 : 0.48) : 0;
    this.tint = scene.add
      .rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, kind === 'rain' ? 0x0a1426 : 0xf2f6ff, haze)
      .setOrigin(0)
      .setDepth(night ? 58.5 : 60);
    this.g = scene.add.graphics().setDepth(61);
    this.gs = scene.add.graphics().setDepth(0.9);
    this.flash = scene.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, 0xffffff, 0).setOrigin(0).setDepth(62);
    if (kind !== 'clear') this.buildLayers(kind);

    if (kind !== 'clear') {
      const info = WEATHER_INFO[kind];
      const c = scene.add.container(W / 2, 128).setDepth(99);
      const t1 = scene.add.text(0, -7, info.title, { fontFamily: FONT_TITLE, fontSize: '8px', color: '#FFFFFF' }).setOrigin(0, 0.5);
      const t2 = scene.add.text(0, 8, info.sub, { fontFamily: FONT_LABEL, fontSize: '9px', color: '#C9CEE0' }).setOrigin(0, 0.5);
      const w = Math.max(t1.width, t2.width) + 18 + 34;
      const bg = scene.add.graphics();
      bg.fillStyle(0x000000, 0.28);
      bg.fillRoundedRect(-w / 2, -18 + 4, w, 36, 12);
      bg.fillStyle(0x22284a, 0.85);
      bg.fillRoundedRect(-w / 2, -18, w, 36, 12);
      bg.lineStyle(1, 0xffffff, 0.16);
      bg.strokeRoundedRect(-w / 2, -18, w, 36, 12);
      // Ícone: nuvem com gotas ou floco
      const ic = scene.add.graphics();
      const ix = -w / 2 + 12;
      if (kind === 'rain') {
        ic.fillStyle(0xc9cee0, 1);
        ic.fillRoundedRect(ix, -9, 16, 8, 4);
        ic.fillStyle(0x3fd0ff, 1);
        for (const dx of [3, 8, 13]) ic.fillRect(ix + dx, 1, 2, 6);
      } else {
        ic.fillStyle(0xffffff, 1);
        ic.fillRect(ix + 7, -8, 2, 16);
        ic.fillRect(ix, -1, 16, 2);
        ic.fillRect(ix + 3, -5, 2, 2);
        ic.fillRect(ix + 11, -5, 2, 2);
        ic.fillRect(ix + 3, 3, 2, 2);
        ic.fillRect(ix + 11, 3, 2, 2);
      }
      t1.setX(-w / 2 + 36);
      t2.setX(-w / 2 + 36);
      c.add([bg, ic, t1, t2]);
      this.pill = c;
    }
  }

  /** Efeitos no jogo. */
  get dropPenalty() {
    return this.kind === 'rain' ? 0.06 : this.kind === 'snow' ? 0.03 : 0;
  }
  get accuracyPenalty() {
    return this.kind === 'snow' ? 0.1 : this.kind === 'rain' ? 0.04 : 0;
  }
  get slippery() {
    return this.kind === 'rain' ? 0.1 : 0;
  }
  get slipChance() {
    return this.kind === 'snow' ? 0.3 : this.kind === 'rain' ? 0.12 : 0;
  }
  get kickPenalty() {
    return this.kind === 'rain' ? 0.06 : this.kind === 'snow' ? 0.1 : 0;
  }

  /** Textura de uma camada (tamanho em unidades do jogo; desenhada em RES para ficar nítida). */
  private layerTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
    if (this.scene.textures.exists(key)) return key;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * RES);
    cv.height = Math.round(h * RES);
    const ctx = cv.getContext('2d')!;
    ctx.scale(RES, RES);
    draw(ctx);
    this.scene.textures.addCanvas(key, cv);
    return key;
  }

  private buildLayers(kind: 'rain' | 'snow') {
    const r = this.rng;
    const TW = 240;
    const TH = 360;
    // [densidade, comprimento/tamanho, alpha, velocidade]
    const specs: [number, number, number, number][] =
      kind === 'rain'
        ? [
            [19, 14, 0.28, 1050],
            [14, 20, 0.42, 1250],
            [9, 26, 0.58, 1480],
          ]
        : [
            [70, 2.5, 0.65, 95],
            [46, 3.5, 0.85, 135],
            [22, 5.5, 1, 185],
          ];
    const ang = (11 * Math.PI) / 180;
    specs.forEach(([n, size, a, v], li) => {
      const key = this.layerTex(`wx_${kind}_${li}`, TW, TH, (ctx) => {
        for (let i = 0; i < n; i++) {
          const x = r.range(0, TW);
          const y = r.range(0, TH);
          // desenha 3× deslocado para a emenda da textura repetida não cortar a gota
          for (const [ox, oy] of [[0, 0], [-TW, 0], [0, -TH], [-TW, -TH], [TW, 0], [0, TH]]) {
            if (kind === 'rain') {
              const len = size * r.range(0.8, 1.2);
              ctx.strokeStyle = `rgba(219,232,255,${(a * r.range(0.75, 1.1)).toFixed(3)})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x + ox, y + oy);
              ctx.lineTo(x + ox + Math.sin(ang) * len, y + oy - Math.cos(ang) * len);
              ctx.stroke();
            } else {
              const s2 = Math.max(2, Math.round(size * r.range(0.7, 1.3)));
              ctx.fillStyle = `rgba(125,136,166,${(a * 0.5).toFixed(3)})`;
              ctx.fillRect(Math.round(x + ox) + 1, Math.round(y + oy) + 1, s2, s2);
              ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
              ctx.fillRect(Math.round(x + ox), Math.round(y + oy), s2, s2);
            }
          }
        }
      });
      const ts = this.scene.add.tileSprite(VIEW.x, VIEW.y, VIEW.w, VIEW.h, key).setOrigin(0).setDepth(61).setTileScale(1 / RES);
      ts.tilePositionX = r.range(0, TW * RES);
      ts.tilePositionY = r.range(0, TH * RES);
      this.layers.push({ ts, v, sway: kind === 'snow' ? 10 + li * 6 : 0, ph: r.range(0, 6.28) });
    });
  }

  private newDrop(anyY: boolean): Drop {
    const W = GAME_W;
    const H = GAME_H;
    const r = this.rng;
    const snow = this.kind === 'snow';
    return {
      x: r.range(-60, W + 160),
      y: anyY ? r.range(-40, H) : r.range(-60, -10),
      v: snow ? r.range(130, 230) : r.range(1100, 1500),
      len: r.range(14, 26),
      a: snow ? r.range(0.7, 1) : r.range(0.4, 0.7),
      size: snow ? r.pick([2, 3, 4, 5, 6]) : 2,
      phase: r.range(0, Math.PI * 2),
    };
  }

  update(dt: number, proj?: Projection) {
    if (this.kind === 'clear') return;
    const g = this.g;
    g.clear();
    this.gs.clear();
    const H = GAME_H;
    const W = GAME_W;
    if (this.kind === 'rain') {
      // Gotas inclinadas 11°
      const sx = -Math.sin((11 * Math.PI) / 180);
      const cy = Math.cos((11 * Math.PI) / 180);
      // camadas deslizando (a textura anda para baixo e um pouco para a esquerda, 11°)
      for (const l of this.layers) {
        l.ts.tilePositionX -= sx * l.v * dt * RES;
        l.ts.tilePositionY -= cy * l.v * dt * RES;
      }
      // Respingos: ~80 por segundo, só em cima do gramado visível (nunca na arquibancada, fora do campo nem atrás da interface)
      this.splashAcc += dt * 50;
      while (this.splashAcc >= 1) {
        this.splashAcc -= 1;
        if (!proj) continue;
        const wy = proj.yAtScreen(this.rng.range(210, 640));
        if (wy > -9 && wy < 109) this.splashes.push({ x: this.rng.range(0.5, 52.8), y: wy, t: 0 });
      }
      void g;
      // Respingos (ovais que crescem e somem)
      for (const s of this.splashes) {
        s.t += dt / 0.6;
        const k = 0.2 + s.t * 1.2;
        if (!proj) continue;
        const p = proj.project(s.x, s.y, 0, this.pt);
        if (p.y < 200 || p.y > 650) continue;
        this.gs.lineStyle(1, 0xd2e4ff, 0.8 * (1 - s.t));
        this.gs.strokeEllipse(p.x, p.y, 12 * k * p.s, 4 * k * p.s);
      }
      this.splashes = this.splashes.filter((s) => s.t < 1);
      // Relâmpago
      this.boltNext -= dt;
      if (this.boltNext <= 0) {
        this.boltT = 0.35;
        this.boltNext = this.rng.range(5, 10);
      }
      if (this.boltT > 0) {
        this.boltT -= dt;
        const k = this.boltT > 0.25 || (this.boltT < 0.15 && this.boltT > 0.08) ? 0.5 : 0;
        this.flash.setFillStyle(0xffffff, k);
      } else this.flash.setFillStyle(0xffffff, 0);
    } else {
      // Flocos em ziguezague
      // flocos: cada camada cai no seu ritmo e balança de um lado para o outro
      for (const l of this.layers) {
        l.ph += dt * 1.6;
        l.ts.tilePositionY -= l.v * 0.6 * dt * RES;
        l.ts.tilePositionX -= (Math.sin(l.ph) * l.sway + 8) * dt * RES;
      }
    }
  }

  setPillVisible(on: boolean) {
    this.pill?.setVisible(on);
  }
}

/** Clima da partida: ?clima=chuva|neve|limpo força; senão sorteia (60% limpo). */
export function pickWeather(rng: Rng): WeatherKind {
  const q = new URLSearchParams(location.search).get('clima');
  if (q === 'chuva') return 'rain';
  if (q === 'neve') return 'snow';
  if (q === 'limpo') return 'clear';
  // A final (QFL Bowl) e os estádios cobertos: sempre tempo limpo
  if (finalGame.on || isDome(venue.id ?? TEAMS.home.id)) return 'clear';
  if (matchConfig.weather === 'clear') return 'clear';
  if (matchConfig.weather === 'rain') return 'rain';
  if (matchConfig.weather === 'snow') return 'snow';
  // Sorteio: um terço para cada (sorteador comum do navegador, não a semente da partida)
  void rng;
  const x = Math.random();
  return x < 1 / 3 ? 'clear' : x < 2 / 3 ? 'rain' : 'snow';
}
