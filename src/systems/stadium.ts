import Phaser from 'phaser';
import { CAMERA, GAME_H, GAME_W, MATCH_SEED, TEAMS } from '../config';
import { hex, shade } from './pixelart';
import { PLANE, type Projection } from './projection';
import { Rng } from './rng';

/*
 * Estádio igual ao do design: tudo é "pintado" no MESMO plano inclinado do campo
 * (arquibancada do fundo, das laterais, escadas, saídas, muro e gramado em volta),
 * então se move junto com a câmera.
 *
 * Desenhado por um shader de tela cheia: para cada pixel, desfaz a projeção, descobre
 * em que ponto do plano ele cai e decide a cor. Um único desenho por frame = leve no celular.
 * A torcida vem de uma textura gerada por código (pixel art), repetida em mosaico.
 */

const TILE_W = 512;
const TILE_H = 256;
const ROW = 16; // altura de cada fileira na textura (px do plano)

const SKIN = ['#f1c7a5', '#d9a07a', '#c68b59', '#8d5524', '#6b3f1f'];
const HAIR = ['#2a1a10', '#5a3a1a', '#111111', '#b8862e', '#3b2412', '#8a8a8a'];
const OTHER = ['#f2f2f2', '#1d1d24', '#6b6f7a', '#2a9d8f', '#b33a3a', '#e6c34a', '#5c2a86'];

/** Gera o mosaico de torcida (cada torcedor sorteado: pele, cabelo/boné, camisa, pose). */
function makeCrowdTile(scene: Phaser.Scene, key: string, teamColor: number, seed: number) {
  if (scene.textures.exists(key)) return [0, 0, 0];
  const tex = scene.textures.createCanvas(key, TILE_W, TILE_H)!;
  const ctx = tex.getContext();
  const rng = new Rng(seed);
  const team = [hex(teamColor), shade(teamColor, 0.25), shade(teamColor, -0.2)];

  for (let row = 0; row < TILE_H / ROW; row++) {
    const y0 = row * ROW;
    // Degrau (faixa azul-acinzentada) e encosto das cadeiras
    ctx.fillStyle = '#3e4560';
    ctx.fillRect(0, y0, TILE_W, ROW);
    ctx.fillStyle = '#4a5270';
    ctx.fillRect(0, y0 + ROW - 5, TILE_W, 3);
    ctx.fillStyle = '#2a2f45';
    ctx.fillRect(0, y0 + ROW - 2, TILE_W, 2);

    for (let x = 4; x < TILE_W - 6; x += rng.int(7, 9)) {
      if (rng.chance(0.06)) continue; // cadeira vazia
      const r = rng.next();
      const shirt = r < 0.68 ? rng.pick(team) : r < 0.8 ? '#f2f2f2' : rng.pick(OTHER);
      const skin = rng.pick(SKIN);
      const standing = rng.chance(0.35);
      const base = y0 + ROW - 3;
      const bodyH = standing ? 6 : 4;
      const top = base - bodyH;
      ctx.fillStyle = shirt;
      ctx.fillRect(x - 3, top, 6, bodyH);
      ctx.fillStyle = skin;
      ctx.fillRect(x - 2, top - 4, 4, 4);
      if (rng.chance(0.3)) {
        ctx.fillStyle = rng.pick([...team, '#1d1d24', '#f2f2f2']); // boné
        ctx.fillRect(x - 2, top - 5, 4, 2);
        ctx.fillRect(x + 1, top - 4, 2, 1);
      } else {
        ctx.fillStyle = rng.pick(HAIR); // cabelo
        ctx.fillRect(x - 2, top - 5, 4, 2);
      }
      const extra = rng.next();
      if (extra < 0.08) {
        // braços para cima
        ctx.fillStyle = shirt;
        ctx.fillRect(x - 4, top - 4, 1, 4);
        ctx.fillRect(x + 3, top - 4, 1, 4);
        ctx.fillStyle = skin;
        ctx.fillRect(x - 4, top - 5, 1, 1);
        ctx.fillRect(x + 3, top - 5, 1, 1);
      } else if (extra < 0.11 && top > y0 + 6) {
        // plaquinha branca
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 4, top - 10, 9, 4);
        ctx.fillStyle = team[0];
        ctx.fillRect(x - 3, top - 9, 7, 1);
      }
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Cor média do mosaico (usada ao longe, para não "tremer")
  const data = ctx.getImageData(0, 0, TILE_W, TILE_H).data;
  let rs = 0;
  let gs = 0;
  let bs = 0;
  for (let i = 0; i < data.length; i += 4) {
    rs += data[i];
    gs += data[i + 1];
    bs += data[i + 2];
  }
  const n = data.length / 4;
  return [rs / n / 255, gs / n / 255, bs / n / 255];
}

const rgb = (c: number) => ({ x: ((c >> 16) & 255) / 255, y: ((c >> 8) & 255) / 255, z: (c & 255) / 255 });

const FRAG = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float uShift;
uniform float uSin;
uniform float uCos;
uniform float uExcite;
uniform vec3 uAvgHome;
uniform vec3 uAvgAway;
uniform vec3 uTeam;
uniform vec3 uOpp;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
varying vec2 fragCoord;

const float PERS = ${PLANE.persp.toFixed(1)};
const float Z = ${CAMERA.zoom.toFixed(3)};

// Tela -> plano do design (X, T)
vec2 toPlane(vec2 s) {
  float dy = PERS * (s.y - ${(PLANE.originY + PLANE.pivotScreen).toFixed(1)}) / (PERS * uCos + (s.y - ${PLANE.originY.toFixed(1)}) * uSin);
  float f = PERS / (PERS - dy * uSin);
  float dx = (s.x - ${PLANE.screenCX.toFixed(1)}) / f + 0.5;
  return vec2(dx / Z + ${PLANE.centerX.toFixed(1)}, dy / Z + ${PLANE.pivotT.toFixed(1)} - uShift);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec3 crowd(vec2 p, bool away, float dens) {
  float row = floor(p.y / ${ROW.toFixed(1)});
  float ph = hash(vec2(row, floor(p.x / 128.0))) * 6.283;
  float jump = uExcite * max(0.0, sin(time * 11.0 + ph)) * 3.0;
  vec2 uv = fract(vec2(p.x / ${TILE_W.toFixed(1)}, (p.y + jump) / ${TILE_H.toFixed(1)}));
  vec3 c = away ? texture2D(iChannel1, uv).rgb : texture2D(iChannel0, uv).rgb;
  vec3 avg = away ? uAvgAway : uAvgHome;
  // Longe (muitos texels por pixel): vai para a cor média, sem cintilar
  c = mix(c, avg, clamp((dens - 2.0) / 4.0, 0.0, 0.7));
  // Flashes de câmera
  vec2 cell = floor(p / 40.0);
  float h = hash(cell + floor(time * 7.0) * 1.37);
  if (h > 0.9975 - uExcite * 0.006) {
    vec2 cp = (cell + 0.5) * 40.0;
    float d = length(p - cp);
    c = mix(c, vec3(1.0), clamp(1.0 - d / (6.0 + 4.0 * dens), 0.0, 1.0));
  }
  return c;
}

// Escada: cinza com degraus escuros a cada 14 px
vec3 stair(float along) {
  vec3 base = vec3(0.431, 0.451, 0.537);
  return mod(along, 14.0) < 3.0 ? base * 0.62 : base;
}

// Retângulo com cantos de cima arredondados (aberto para baixo)
bool topRounded(vec2 p, float x0, float x1, float t0, float r) {
  if (p.y < t0 || p.x < x0 || p.x > x1) return false;
  if (p.y > t0 + r) return true;
  float cx = clamp(p.x, x0 + r, x1 - r);
  return length(p - vec2(cx, t0 + r)) <= r;
}

// Escada vertical (no fundo): faixa de 18 px com bordas claras
bool vStair(vec2 p, float x0, inout vec3 col) {
  if (p.x >= x0 - 2.0 && p.x < x0 + 20.0) {
    col = (p.x < x0 || p.x >= x0 + 18.0) ? vec3(0.663, 0.682, 0.761) : stair(p.y);
    return true;
  }
  return false;
}
// Escada horizontal (nas laterais), repetindo a cada 260 px
bool hStair(vec2 p, float t0, inout vec3 col) {
  float t = mod(p.y - t0, 260.0);
  if (t < 22.0) {
    col = (t < 2.0 || t >= 20.0) ? vec3(0.663, 0.682, 0.761) : stair(p.x);
    return true;
  }
  return false;
}
// Escada diagonal dos cantos
bool dStair(vec2 p, vec2 o, vec2 d, inout vec3 col) {
  vec2 v = p - o;
  float along = dot(v, d);
  float perp = dot(v, vec2(-d.y, d.x));
  if (along >= 0.0 && along <= 840.0 && abs(perp) <= 12.0) {
    col = abs(perp) > 10.0 ? vec3(0.663, 0.682, 0.761) : stair(along);
    return true;
  }
  return false;
}
// Saída: túnel escuro com borda e placa verde "SAÍDA" acima
bool exitAt(vec2 p, vec2 o, inout vec3 col) {
  vec2 q = p - o;
  if (q.x >= 0.0 && q.x < 46.0 && q.y >= 0.0 && q.y < 34.0) {
    bool border = q.x < 3.0 || q.x >= 43.0 || q.y < 3.0 || q.y >= 31.0;
    col = border ? vec3(0.549, 0.569, 0.659) : vec3(0.027, 0.031, 0.051);
    return true;
  }
  vec2 s = q - vec2(6.0, -14.0);
  if (s.x >= -1.0 && s.x < 35.0 && s.y >= -1.0 && s.y < 12.0) {
    bool edge = s.x < 0.0 || s.x >= 34.0 || s.y < 0.0 || s.y >= 11.0;
    // "letras" brancas da placa: tracinhos no meio
    bool letters = s.y >= 4.0 && s.y < 7.0 && mod(s.x, 6.0) < 4.0 && s.x > 4.0 && s.x < 30.0;
    col = edge ? vec3(0.05) : (letters ? vec3(1.0) : vec3(0.122, 0.616, 0.333));
    return true;
  }
  return false;
}

void main() {
  vec2 s = vec2(fragCoord.x, resolution.y - fragCoord.y);
  vec2 p = toPlane(s);
  float dens = max(abs(toPlane(s + vec2(0.0, 1.0)).y - p.y), abs(toPlane(s + vec2(1.0, 0.0)).x - p.x));

  vec3 col = vec3(0.051, 0.051, 0.071);

  // Arquibancada do fundo, escadas verticais e setor visitante
  if (p.y <= 150.0) {
    col = crowd(p, false, dens);
    vec3 c2 = col;
    if (vStair(p, -300.0, c2) || vStair(p, -60.0, c2) || vStair(p, 116.0, c2) || vStair(p, 500.0, c2) || vStair(p, 690.0, c2) || vStair(p, 930.0, c2)) col = c2;
    vec2 a = p - vec2(520.0, -330.0);
    if (a.x >= -3.0 && a.x < 173.0 && a.y >= -3.0 && a.y < 163.0) {
      col = (a.x < 0.0 || a.x >= 170.0 || a.y < 0.0 || a.y >= 160.0) ? vec3(0.051, 0.051, 0.071) : crowd(p, true, dens);
    }
  }
  // Arquibancadas laterais (cortadas na diagonal nos cantos)
  float lx = p.x + 700.0;
  float ly = p.y + 472.0;
  if (p.x <= -110.0 && ly >= lx) {
    col = crowd(p, false, dens);
    vec3 c2 = col;
    if (hStair(p, 378.0, c2)) col = c2;
  }
  float rx = p.x - 743.0;
  if (p.x >= 743.0 && ly >= 590.0 - rx) {
    col = crowd(p, false, dens);
    vec3 c2 = col;
    if (hStair(p, 398.0, c2)) col = c2;
  }
  vec3 c3 = col;
  if (dStair(p, vec2(-110.0, 118.0), vec2(-0.7071, -0.7071), c3) || dStair(p, vec2(743.0, 118.0), vec2(0.7071, -0.7071), c3)) col = c3;

  // Saídas
  vec3 c4 = col;
  if (exitAt(p, vec2(-275.0, -420.0), c4) || exitAt(p, vec2(-35.0, -260.0), c4) || exitAt(p, vec2(141.0, -520.0), c4) ||
      exitAt(p, vec2(525.0, -560.0), c4) || exitAt(p, vec2(715.0, -260.0), c4) || exitAt(p, vec2(955.0, -420.0), c4) ||
      exitAt(p, vec2(-196.0, 406.0 + floor((p.y - 380.0) / 520.0) * 520.0), c4) ||
      exitAt(p, vec2(785.0, 426.0 + floor((p.y - 400.0) / 520.0) * 520.0), c4)) col = c4;

  // Muro em volta do gramado (cantos arredondados) com faixas nas cores dos times
  if (topRounded(p, -139.0, 772.0, 89.0, 169.0)) {
    col = vec3(0.333, 0.357, 0.451);
    if (topRounded(p, -136.0, 769.0, 92.0, 166.0)) col = vec3(0.051, 0.051, 0.071);
    if (topRounded(p, -136.0, 769.0, 92.0, 166.0) && !topRounded(p, -133.0, 766.0, 95.0, 163.0)) col = vec3(0.165, 0.18, 0.251);
    if (p.y >= 280.0 && mod(p.y - 280.0, 110.0) < 70.0) {
      if (p.x >= -132.0 && p.x < -114.0) col = uTeam;
      if (p.x >= 747.0 && p.x < 765.0) col = uOpp;
    }
  }
  // Gramado em volta do campo
  if (topRounded(p, -110.0, 743.0, 118.0, 140.0)) col = vec3(0.176, 0.416, 0.169);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class StadiumShader {
  private shader: Phaser.GameObjects.Shader;
  /** Empolgação (0..1): as fileiras pulam e os flashes aumentam. */
  excite = 0;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    const avgHome = makeCrowdTile(scene, 'crowd_home', TEAMS.home.color, MATCH_SEED);
    const avgAway = makeCrowdTile(scene, 'crowd_away', TEAMS.away.color, MATCH_SEED + 1);
    const base = new Phaser.Display.BaseShader('stadium', FRAG, undefined, {
      uShift: { type: '1f', value: 0 },
      uSin: { type: '1f', value: 0 },
      uCos: { type: '1f', value: 1 },
      uExcite: { type: '1f', value: 0 },
      uAvgHome: { type: '3f', value: { x: avgHome[0], y: avgHome[1], z: avgHome[2] } },
      uAvgAway: { type: '3f', value: { x: avgAway[0], y: avgAway[1], z: avgAway[2] } },
      uTeam: { type: '3f', value: rgb(TEAMS.home.color) },
      uOpp: { type: '3f', value: rgb(TEAMS.away.color) },
    });
    this.shader = scene.add
      .shader(base, GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, ['crowd_home', 'crowd_away'])
      .setDepth(-2);
  }

  cheer(amount = 1) {
    this.excite = Math.min(1, this.excite + amount);
  }

  update(dt: number) {
    this.excite = Math.max(0, this.excite - dt * 0.45);
    const sh = this.shader;
    sh.setUniform('uShift.value', this.proj.shift);
    sh.setUniform('uSin.value', this.proj.sin);
    sh.setUniform('uCos.value', this.proj.cos);
    sh.setUniform('uExcite.value', this.excite);
  }
}
