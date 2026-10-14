import Phaser from 'phaser';
import { CAMERA, GAME_H, GAME_W, guestTeam, hostTeam } from '../config';
import { STAND_GAP } from './grandstand';
import { todInfo, type SkyWeather, type TimeOfDay } from './daytime';
import { PLANE, type Projection } from './projection';

/*
 * Chão do estádio em volta do campo (o mesmo plano inclinado do design): fundo escuro,
 * muro de cantos arredondados com listras nas cores dos times e o gramado em volta.
 * Desenhado por um shader de tela cheia: para cada pixel, desfaz a projeção e decide a cor.
 * A torcida fica só no fundo do campo (ver grandstand.ts).
 */

const rgb = (c: number) => ({ x: ((c >> 16) & 255) / 255, y: ((c >> 8) & 255) / 255, z: (c & 255) / 255 });

const frag = () => `
precision highp float;
uniform vec2 resolution;
uniform float uShift;
uniform float uSin;
uniform float uCos;
uniform vec3 uTeam;
uniform vec3 uOpp;
uniform vec3 uSkyTop;
uniform vec3 uSkyHor;
uniform vec3 uBg;
uniform vec3 uSurround;
varying vec2 fragCoord;

// Recuo do muro/gramado no fundo, acompanhando a arquibancada (px do plano)
const float GAP = ${(STAND_GAP * PLANE.pxPerYard).toFixed(1)};

const float PERS = ${PLANE.persp.toFixed(1)};
const float Z = ${CAMERA.zoom.toFixed(3)};

// Tela -> plano do design (X, T)
vec2 toPlane(vec2 s) {
  float dy = PERS * (s.y - ${(PLANE.originY + PLANE.pivotScreen).toFixed(1)}) / (PERS * uCos + (s.y - ${PLANE.originY.toFixed(1)}) * uSin);
  float f = PERS / (PERS - dy * uSin);
  float dx = (s.x - ${PLANE.screenCX.toFixed(1)}) / f + 0.5;
  return vec2(dx / Z + ${PLANE.centerX.toFixed(1)}, dy / Z + ${PLANE.pivotT.toFixed(1)} - uShift);
}

// Retângulo com cantos de cima arredondados (aberto para baixo)
bool topRounded(vec2 p, float x0, float x1, float t0, float r) {
  if (p.y < t0 || p.x < x0 || p.x > x1) return false;
  if (p.y > t0 + r) return true;
  float cx = clamp(p.x, x0 + r, x1 - r);
  return length(p - vec2(cx, t0 + r)) <= r;
}

void main() {
  vec2 s = vec2(fragCoord.x, resolution.y - fragCoord.y);
  vec2 p = toPlane(s);

  // Céu acima do muro (gradiente pelo horário); fora dele, o chão de fundo
  vec3 col = uBg;
  if (p.y < 89.0 - GAP) col = mix(uSkyTop, uSkyHor, clamp(s.y / (resolution.y * 0.42), 0.0, 1.0));

  // Muro em volta do gramado (cantos arredondados) com faixas nas cores dos times
  if (topRounded(p, -139.0, 772.0, 89.0 - GAP, 169.0)) {
    col = vec3(0.333, 0.357, 0.451);
    if (topRounded(p, -136.0, 769.0, 92.0 - GAP, 166.0)) col = vec3(0.051, 0.051, 0.071);
    if (topRounded(p, -136.0, 769.0, 92.0 - GAP, 166.0) && !topRounded(p, -133.0, 766.0, 95.0 - GAP, 163.0)) col = vec3(0.165, 0.18, 0.251);
    if (p.y >= 280.0 && mod(p.y - 280.0, 110.0) < 70.0) {
      if (p.x >= -132.0 && p.x < -114.0) col = uTeam;
      if (p.x >= 747.0 && p.x < 765.0) col = uOpp;
    }
  }
  // Gramado em volta do campo
  if (topRounded(p, -110.0, 743.0, 118.0 - GAP, 140.0)) col = uSurround;

  gl_FragColor = vec4(col, 1.0);
}
`;

export class StadiumShader {
  private shader: Phaser.GameObjects.Shader;

  constructor(scene: Phaser.Scene, private proj: Projection, tod: TimeOfDay = 'night', weather: SkyWeather = 'clear') {
    const t = todInfo(tod, weather);
    const v3 = (c: [number, number, number]) => ({ x: c[0], y: c[1], z: c[2] });
    const base = new Phaser.Display.BaseShader('stadium', frag(), undefined, {
      uShift: { type: '1f', value: 0 },
      uSin: { type: '1f', value: 0 },
      uCos: { type: '1f', value: 1 },
      uTeam: { type: '3f', value: rgb(hostTeam().color) },
      uOpp: { type: '3f', value: rgb(guestTeam().color) },
      uSkyTop: { type: '3f', value: v3(t.skyTop) },
      uSkyHor: { type: '3f', value: v3(t.skyHor) },
      uBg: { type: '3f', value: v3(t.bg) },
      // Gramado em volta do campo; na neve vira um branco azulado um pouco mais escuro que os montes
      uSurround: { type: '3f', value: weather === 'snow' ? v3([0.7, 0.75, 0.83]) : v3([0.176, 0.416, 0.169]) },
    });
    this.shader = scene.add
      .shader(base, GAME_W / 2, GAME_H / 2, GAME_W, GAME_H)
      .setDepth(-2);
  }

  update() {
    const sh = this.shader;
    sh.setUniform('uShift.value', this.proj.shift);
    sh.setUniform('uSin.value', this.proj.sin);
    sh.setUniform('uCos.value', this.proj.cos);
  }
}
