import Phaser from 'phaser';
import { FIELD, MATCH_SEED, TEAMS } from '../config';
import { BillboardLayer } from '../systems/billboards';
import { box, groundPoly, groundQuad } from '../systems/ground';
import { shadeNum } from '../systems/pixelart';
import type { Projection } from '../systems/projection';
import { Rng } from '../systems/rng';
import { SKINS, SPRITE_KEYS, buildSidelineTextures } from './sprites';
import { placeTvCameras } from './TvCamera';

type Side = 'home' | 'away';

/** Área dos times entre as linhas de 32 jardas. */
const AREA = { y0: 32, y1: 68, inner: 4, outer: 12.5, taper: 4 };
const DASH_OFF = 2.2; // linha tracejada branca, a partir da linha lateral
const BENCH_OFF = 10.6;
const BENCHES: [number, number][] = [
  [37, 48.5],
  [51.5, 63],
];

/**
 * Laterais: chão bege das áreas dos times, linha tracejada, bancos de metal,
 * reservas, coordenadores, fotógrafos e câmeras de TV.
 * O lado esquerdo (x < 0) é dos LOBOS, o direito dos TOUROS.
 */
export class Sideline {
  private g: Phaser.GameObjects.Graphics;
  readonly people: BillboardLayer;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    buildSidelineTextures(scene);
    this.g = scene.add.graphics().setDepth(0.5);
    this.people = new BillboardLayer(scene, 0.6);
    const rng = new Rng(MATCH_SEED + 3);

    for (const side of ['home', 'away'] as const) {
      const X = (off: number) => (side === 'home' ? -off : FIELD.width + off);
      // Olham para o campo: lado esquerdo vira para a direita (sprite original)
      const flip = side === 'away';
      const skin = () => rng.int(0, SKINS.length - 1);

      // Coordenadores (mais perto do campo)
      for (const y of [41, 50, 58.5]) {
        this.people.add(SPRITE_KEYS.coach(side, skin()), X(AREA.inner + 1 + rng.range(0, 0.6)), y + rng.range(-1.5, 1.5), { flip });
      }
      // Reservas em pé (~1/3 sem capacete, segurando o capacete)
      for (let y = AREA.y0 + 2.5; y < AREA.y1 - 2; y += rng.range(1.8, 2.8)) {
        const key = rng.chance(0.33) ? SPRITE_KEYS.hold(side, skin()) : SPRITE_KEYS.stand(side, skin());
        this.people.add(key, X(7 + rng.range(-0.6, 0.6)), y, { flip });
      }
      // Reservas sentados no banco
      for (const [b0, b1] of BENCHES) {
        for (let y = b0 + 0.9; y < b1 - 0.5; y += rng.range(1.5, 2.4)) {
          if (rng.chance(0.15)) continue; // lugar vazio
          const key = rng.chance(0.33) ? SPRITE_KEYS.sitBare(side, skin()) : SPRITE_KEYS.sit(side, skin());
          this.people.add(key, X(BENCH_OFF), y, { flip, shadow: 0 });
        }
      }
      // Fotógrafos atrás da linha tracejada lateral (fora da área do time)
      for (const y of [10, 20, 80, 90]) {
        this.people.add(SPRITE_KEYS.photog(skin()), X(DASH_OFF + 1.2 + rng.range(0, 0.8)), y + rng.range(-2, 2));
      }
    }
    // Fotógrafos atrás das end zones (dos lados da trave)
    for (const y of [112.6, -12.6]) {
      for (const x of [3, 7.5, 12, 41.3, 45.8, 50.3]) {
        this.people.add(SPRITE_KEYS.photog(rng.int(0, SKINS.length - 1)), x + rng.range(-1, 1), y + (y > 0 ? rng.range(0, 1) : -rng.range(0, 1)));
      }
    }
    placeTvCameras(this.people, rng);
  }

  draw() {
    const g = this.g;
    const p = this.proj;
    g.clear();

    for (const side of ['home', 'away'] as const) this.drawTeamArea(side);

    // Linha branca tracejada ao longo das laterais e atrás das end zones
    for (let y = -12; y < 112; y += 2) {
      groundQuad(g, p, -DASH_OFF - 0.18, y, -DASH_OFF + 0.18, y + 1, 0xffffff, 0.85);
      groundQuad(g, p, FIELD.width + DASH_OFF - 0.18, y, FIELD.width + DASH_OFF + 0.18, y + 1, 0xffffff, 0.85);
    }
    for (let x = -DASH_OFF; x < FIELD.width + DASH_OFF; x += 2) {
      groundQuad(g, p, x, 112 - 0.18, x + 1, 112 + 0.18, 0xffffff, 0.85);
      groundQuad(g, p, x, -12 - 0.18, x + 1, -12 + 0.18, 0xffffff, 0.85);
    }

    for (const side of ['home', 'away'] as const) this.drawBenches(side);
    this.people.update(p);
  }

  /** Chão bege com borda branca e pontas em diagonal. */
  private drawTeamArea(side: Side) {
    const s = side === 'home' ? -1 : 1;
    const base = side === 'home' ? 0 : FIELD.width;
    const X = (off: number) => base + s * off;
    const { y0, y1, inner, outer, taper } = AREA;
    const shape = (pad: number): [number, number][] => [
      [X(inner - pad), y0 - pad],
      [X(inner - pad), y1 + pad],
      [X(outer + pad), y1 - taper + pad],
      [X(outer + pad), y0 + taper - pad],
    ];
    groundPoly(this.g, this.proj, shape(0.35), 0xffffff);
    groundPoly(this.g, this.proj, shape(0), 0x9a8a5c);
  }

  /** Bancos de metal com encosto na cor do time. */
  private drawBenches(side: Side) {
    const color = TEAMS[side].color;
    const s = side === 'home' ? -1 : 1;
    const base = side === 'home' ? 0 : FIELD.width;
    const xa = base + s * (BENCH_OFF - 0.7);
    const xb = base + s * (BENCH_OFF + 0.7);
    const [x0, x1] = xa < xb ? [xa, xb] : [xb, xa];
    const backA = base + s * (BENCH_OFF + 0.7);
    const backB = base + s * (BENCH_OFF + 1.0);
    const [bx0, bx1] = backA < backB ? [backA, backB] : [backB, backA];
    for (const [y0, y1] of BENCHES) {
      // Encosto (atrás) com faixa na cor do time
      box(this.g, this.proj, bx0, bx1, y0, y1, 1.3, 2.7, 0xc5cad3, 0x8d929c, 0x9da2ab);
      box(this.g, this.proj, bx0 - 0.01, bx1 + 0.01, y0, y1, 1.7, 2.3, shadeNum(color, 0.1), color, shadeNum(color, -0.2));
      // Assento
      box(this.g, this.proj, x0, x1, y0, y1, 0, 1.3, 0xd4d8df, 0x7a7f8a, 0x8d929c);
    }
  }
}
