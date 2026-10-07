import Phaser from 'phaser';
import { FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchConfig } from '../config';
import type { Projection, ScreenPoint } from './projection';
import type { Rng } from './rng';

/*
 * Clima (telas Chuva / Neve do design):
 *   CHUVA → gotas inclinadas, respingos no gramado, relâmpago de vez em quando e tela mais escura.
 *           Bola molhada: mais drop/fumble e tackle escorrega.
 *   NEVE  → flocos caindo em ziguezague e tela mais clara/azulada.
 *           Bola escorregadia: precisão −10% e o carregador pode escorregar no corte.
 * Tudo desenhado em tela (partículas simples), sem imagens.
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
  private tint: Phaser.GameObjects.Rectangle;
  private flash: Phaser.GameObjects.Rectangle;
  private drops: Drop[] = [];
  /** Respingos no gramado: posição no MUNDO (jardas), então ficam parados no campo quando a câmera anda. */
  private splashes: { x: number; y: number; t: number }[] = [];
  private pt: ScreenPoint = { x: 0, y: 0, s: 0 };
  private boltT = 0;
  private boltNext = 6;
  readonly pill: Phaser.GameObjects.Container | null = null;

  constructor(private scene: Phaser.Scene, kind: WeatherKind, private rng: Rng) {
    this.kind = kind;
    const W = GAME_W;
    const H = GAME_H;
    this.tint = scene.add
      .rectangle(0, 0, W, H, kind === 'rain' ? 0x0a1426 : 0xf2f6ff, kind === 'rain' ? 0.32 : kind === 'snow' ? 0.48 : 0)
      .setOrigin(0)
      .setDepth(60);
    this.g = scene.add.graphics().setDepth(61);
    this.flash = scene.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(62);
    const n = kind === 'rain' ? 150 : kind === 'snow' ? 300 : 0;
    for (let i = 0; i < n; i++) this.drops.push(this.newDrop(true));

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

  private newDrop(anyY: boolean): Drop {
    const W = GAME_W;
    const H = GAME_H;
    const r = this.rng;
    const snow = this.kind === 'snow';
    return {
      x: r.range(-60, W + 160),
      y: anyY ? r.range(-40, H) : r.range(-60, -10),
      v: snow ? r.range(130, 230) : r.range(1100, 1500),
      len: r.range(9, 15),
      a: snow ? r.range(0.7, 1) : r.range(0.35, 0.55),
      size: snow ? r.pick([2, 3, 4, 5]) : 2,
      phase: r.range(0, Math.PI * 2),
    };
  }

  update(dt: number, proj?: Projection) {
    if (this.kind === 'clear') return;
    const g = this.g;
    g.clear();
    const H = GAME_H;
    const W = GAME_W;
    if (this.kind === 'rain') {
      // Gotas inclinadas 11°
      const sx = -Math.sin((11 * Math.PI) / 180);
      const cy = Math.cos((11 * Math.PI) / 180);
      for (const d of this.drops) {
        d.x += sx * d.v * dt;
        d.y += cy * d.v * dt;
        if (d.y > H + 20) {
          if (proj && this.rng.chance(0.45)) this.splashes.push({ x: this.rng.range(0.5, 52.8), y: proj.yAtScreen(this.rng.range(330, H - 40)), t: 0 });
          Object.assign(d, this.newDrop(false));
        }
        g.lineStyle(1.5, 0xcddeff, d.a);
        g.lineBetween(d.x, d.y, d.x - sx * d.len, d.y - cy * d.len);
      }
      // Respingos (ovais que crescem e somem)
      for (const s of this.splashes) {
        s.t += dt / 0.6;
        const k = 0.2 + s.t * 1.2;
        if (!proj) continue;
        const p = proj.project(s.x, s.y, 0, this.pt);
        if (p.y < 150 || p.y > H) continue;
        g.lineStyle(1, 0xd2e4ff, 0.9 * (1 - s.t));
        g.strokeEllipse(p.x, p.y, 12 * k * p.s, 4 * k * p.s);
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
      for (const d of this.drops) {
        d.phase += dt * 1.6;
        d.y += d.v * dt * 0.6;
        d.x += Math.sin(d.phase) * 22 * dt + 8 * dt;
        if (d.y > H + 10 || d.x > W + 30) Object.assign(d, this.newDrop(false));
        g.fillStyle(0x7d88a6, d.a * 0.5);
        g.fillRect(d.x + 1, d.y + 1, d.size, d.size);
        g.fillStyle(0xffffff, d.a);
        g.fillRect(d.x, d.y, d.size, d.size);
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
  if (matchConfig.weather === 'clear') return 'clear';
  if (matchConfig.weather === 'rain') return 'rain';
  if (matchConfig.weather === 'snow') return 'snow';
  // Sorteio: um terço para cada (sorteador comum do navegador, não a semente da partida)
  void rng;
  const x = Math.random();
  return x < 1 / 3 ? 'clear' : x < 2 / 3 ? 'rain' : 'snow';
}
