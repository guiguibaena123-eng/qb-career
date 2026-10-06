import Phaser from 'phaser';
import { FIELD, MATCH_SEED, TEAMS } from '../config';
import { BillboardLayer } from '../systems/billboards';
import { box, groundPoly, groundQuad } from '../systems/ground';
import { shadeNum } from '../systems/pixelart';
import { PLANE, type Projection } from '../systems/projection';
import { Rng } from '../systems/rng';
import { SKINS, SPRITE_KEYS, buildSidelineTextures } from './sprites';

type Side = 'home' | 'away';

/** Converte posições do plano do design (px) para jardas. */
const fx = (X: number) => (X - PLANE.originX) / PLANE.pxPerYard;
const fy = (T: number) => (PLANE.goalT - T) / PLANE.pxPerYard;

/*
 * Laterais (posições copiadas do design): área bege de cada time entre as linhas de 32,
 * e do campo para fora: coordenadores → reservas em pé → banco de metal com reservas sentados.
 * Fotógrafos e câmeras de TV atrás da linha tracejada. Lado esquerdo = LOBOS, direito = TOUROS.
 */

/** Área do time: borda do lado do campo, borda de fora, e pontas em diagonal. */
const AREA = { inner: fx(38), outer: fx(-60), y0: fy(970), y1: fy(610), taper: 5 };
const BENCH = { x0: fx(-12), x1: fx(0), y0: fy(930), y1: fy(690) };

export class Sideline {
  private g: Phaser.GameObjects.Graphics;
  readonly people: BillboardLayer;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    buildSidelineTextures(scene);
    this.g = scene.add.graphics().setDepth(0.5);
    this.people = new BillboardLayer(scene, 0.6);
    const rng = new Rng(MATCH_SEED + 3);
    const skin = () => rng.int(0, SKINS.length - 1);
    // Lado direito: espelha o X e olha para a esquerda
    const mirror = (x: number) => FIELD.width - x;

    for (const side of ['home', 'away'] as const) {
      const away = side === 'away';
      const X = (x: number) => (away ? mirror(x) : x);
      const dT = away ? 8 : 0; // o design desloca um pouco o lado direito
      // Reservas em pé (~1/3 sem capacete, segurando o capacete)
      for (let i = 0; i < 8; i++) {
        const key = i % 3 === 1 ? SPRITE_KEYS.hold(side, skin()) : SPRITE_KEYS.stand(side, skin());
        this.people.add(key, X(fx(i % 2 ? 25 : 33)), fy(690 + dT + i * 28), { flip: away });
      }
      // Reservas sentados no banco
      for (let i = 0; i < 6; i++) {
        const key = i % 3 === 1 ? SPRITE_KEYS.sitBare(side, skin()) : SPRITE_KEYS.sit(side, skin());
        this.people.add(key, X(fx(-6)), fy(705 + dT + i * 36), { flip: away, shadow: 0 });
      }
      // Coordenadores (mais perto do campo)
      for (const T of [760, 842]) {
        this.people.add(SPRITE_KEYS.coach(side, skin()), X(fx(38)), fy(T + dT), { flip: away });
      }
    }
    // Fotógrafos atrás da end zone e nas laterais
    for (const [X, T] of [
      [70, 150], [115, 158], [160, 150], [210, 158], [420, 150], [470, 158], [515, 150], [562, 158],
      [14, 230], [8, 300], [14, 380], [8, 470], [618, 240], [624, 320], [618, 400], [624, 490],
    ]) {
      this.people.add(SPRITE_KEYS.photog(skin()), fx(X), fy(T));
    }
    // Câmeras de TV (operador + câmera em pedestal)
    for (const [X, T, dir] of [
      [255, 136, 1], [380, 136, -1], [12, 480, 1], [621, 500, -1], [16, 610, 1],
    ]) {
      this.people.add(SPRITE_KEYS.tvcam(skin()), fx(X), fy(T), { flip: dir < 0, scale: 1.15, shadow: 2.2 });
    }
  }

  draw() {
    const g = this.g;
    const p = this.proj;
    g.clear();

    for (const side of ['home', 'away'] as const) this.drawTeamArea(side);

    // Linha branca tracejada atrás da end zone e descendo pelas laterais até a linha de 70
    const yLine = fy(170);
    for (let x = fx(-60); x < fx(693); x += 1.4) groundQuad(g, p, x, yLine - 0.15, x + 0.7, yLine + 0.15, 0xffffff, 0.9);
    for (let y = fy(590); y < yLine; y += 1.4) {
      groundQuad(g, p, fx(28) - 0.15, y, fx(28) + 0.15, y + 0.7, 0xffffff, 0.9);
      groundQuad(g, p, fx(603) - 0.15, y, fx(603) + 0.15, y + 0.7, 0xffffff, 0.9);
    }

    for (const side of ['home', 'away'] as const) this.drawBench(side);
    this.people.update(p);
  }

  /** Chão bege com borda branca e pontas em diagonal. */
  private drawTeamArea(side: Side) {
    const X = (x: number) => (side === 'home' ? x : FIELD.width - x);
    const { y0, y1, inner, outer, taper } = AREA;
    const shape = (pad: number): [number, number][] => [
      [X(inner + pad), y0 - pad],
      [X(inner + pad), y1 + pad],
      [X(outer - pad), y1 - taper + pad],
      [X(outer - pad), y0 + taper - pad],
    ];
    groundPoly(this.g, this.proj, shape(0.5), 0xf3f3ee);
    groundPoly(this.g, this.proj, shape(0), 0x9a8a5c);
  }

  /** Banco de metal comprido com faixa na cor do time. */
  private drawBench(side: Side) {
    const color = TEAMS[side].color;
    const X = (x: number) => (side === 'home' ? x : FIELD.width - x);
    const [x0, x1] = [X(BENCH.x0), X(BENCH.x1)].sort((a, b) => a - b);
    // Sombra no chão
    groundQuad(this.g, this.proj, x0 + 0.2, BENCH.y0 - 0.4, x1 + 0.4, BENCH.y1 - 0.4, 0x000000, 0.3);
    box(this.g, this.proj, x0, x1, BENCH.y0, BENCH.y1, 0, 0.9, 0x4a5068, 0x2a2e40, 0x3a4058);
    // Faixa na cor do time na borda virada para o campo
    const stripe = side === 'home' ? [x1 - 0.3, x1] : [x0, x0 + 0.3];
    groundQuad(this.g, this.proj, stripe[0], BENCH.y0, stripe[1], BENCH.y1, shadeNum(color, 0), 1, 0.9);
  }
}
