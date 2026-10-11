import Phaser from 'phaser';
import { stadiumOf, type StandModelId } from '../data/stadiums';
import { TOD, todInfo, type SkyWeather, type TimeOfDay } from './daytime';
import { hex, shade } from './pixelart';
import { Rng } from './rng';
import { makeSkylineTexture, SKY_H, SKY_W } from './skyline';

/*
 * Miniatura de um estádio para o menu: céu com a cidade do time, a arquibancada do modelo
 * (cadeiras com torcedores, escadas, saídas, telão, anel, teto) e a ponta do campo na cor do time.
 * Pixel art 84×96, desenhada por código.
 */

export const THUMB_W = 84;
export const THUMB_H = 96;

const FIELD_Y = 76;

export function makeStandThumb(scene: Phaser.Scene, key: string, model: StandModelId, teamId: string, teamColor: number, awayColor: number, tod: TimeOfDay = 'night', weather: SkyWeather = 'clear') {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, THUMB_W, THUMB_H)!;
  const ctx = tex.getContext();
  const rng = new Rng(model.length * 977 + teamId.charCodeAt(0));
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const home = [hex(teamColor), shade(teamColor, 0.25), shade(teamColor, -0.2)];
  const away = [hex(awayColor), shade(awayColor, 0.3)];

  // Cantos arredondados
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, THUMB_W, THUMB_H, 7);
  ctx.clip();

  // Céu noturno
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD_Y);
  const city = stadiumOf(teamId).city;
  const rgb = (c: number[]) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  const T = { ...TOD[tod], ...todInfo(tod, weather) };
  sky.addColorStop(0, rgb(T.skyTop));
  sky.addColorStop(tod === 'day' ? 1 : 0.55, tod === 'day' ? rgb(T.skyHor) : rgb(T.skyHor.map((v) => v * 0.85)));
  sky.addColorStop(1, tod === 'day' ? rgb(T.skyHor) : city.glow + (tod === 'dusk' ? 'e0' : 'c0'));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, THUMB_W, FIELD_Y);

  // Cidade ao fundo
  const skyKey = `__thumbsky_${teamId}_${tod}_${weather}`;
  makeSkylineTexture(scene, skyKey, city, 7 + teamId.charCodeAt(0), tod, weather);
  const src = scene.textures.get(skyKey).getSourceImage() as HTMLCanvasElement;
  ctx.imageSmoothingEnabled = false;
  const cw = THUMB_W * 1.9; // recorta o meio da cidade, em escala maior
  const ch = (cw * SKY_H) / SKY_W;
  ctx.drawImage(src, (THUMB_W - cw) / 2, FIELD_Y - 4 - ch, cw, ch);

  // Campo: gramado listrado e a end zone na cor do mandante
  for (let i = 0; i < 5; i++) rect(0, FIELD_Y + i * 4, THUMB_W, 4, i % 2 ? '#48993f' : '#3f8e39');
  rect(6, FIELD_Y, THUMB_W - 12, 5, hex(teamColor));
  rect(6, FIELD_Y + 5, THUMB_W - 12, 1, '#ffffff');
  rect(2, FIELD_Y - 1, THUMB_W - 4, 2, '#0d0d12'); // muro

  // Uma fileira de torcedores (cadeiras) entre y0 e y0+rows*2
  const seats = (y0: number, rows: number, x0 = 3, x1 = THUMB_W - 3) => {
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * 2;
      rect(x0, y, x1 - x0, 2, r % 2 ? '#3e4560' : '#394058');
      for (let x = x0 + 1; x < x1 - 1; x += 2) {
        if (rng.chance(0.1)) continue;
        const away_ = x > 50 && x < 62 && r > 0;
        const c = rng.chance(0.7) ? rng.pick(away_ ? away : home) : rng.pick(['#f2f2f2', '#e6c34a', '#2a9d8f', '#b33a3a']);
        rect(x, y, 1, 2, c);
      }
    }
  };
  /** Escadas (cinza) que sobem o anel, interrompidas pelo túnel de saída. */
  const stairs = (yTop: number, yBottom: number, tunnelY: number) => {
    for (const x of [22, 41, 60]) {
      rect(x, yTop, 2, yBottom - yTop, '#7b8097');
      rect(x - 1, tunnelY, 4, 3, '#07080d');
      rect(x - 1, tunnelY - 2, 4, 1, '#1f9d55');
    }
  };
  const band = (y: number, h: number) => {
    rect(3, y, THUMB_W - 6, h, '#1b1f33');
    for (let x = 5; x < THUMB_W - 6; x += 4) if (rng.chance(0.6)) rect(x, y + 1, 2, 1, '#ffd98a');
    rect(3, y + h - 1, THUMB_W - 6, 1, hex(teamColor));
  };
  const screen = (x: number, y: number, w: number, h: number) => {
    rect(x - 1, y - 1, w + 2, h + 2, '#555b73');
    rect(x, y, w, h, '#090b18');
    rect(x, y, w, Math.max(1, h * 0.35), '#142257');
    rect(x + 1, y + h - 2, w - 2, 1, hex(teamColor));
    for (let i = 0; i < w - 4; i += 3) rect(x + 2 + i, y + h * 0.5, 2, 1, '#ffffff');
  };

  const base = FIELD_Y - 2;
  switch (model) {
    case 'baixa':
      seats(base - 14, 7);
      stairs(base - 14, base, base - 9);
      break;
    case 'telao':
      seats(base - 12, 6);
      stairs(base - 12, base, base - 8);
      rect(24, base - 20, 3, 8, '#2a2f45');
      rect(57, base - 20, 3, 8, '#2a2f45');
      screen(18, base - 32, 48, 14);
      break;
    case 'anel':
      seats(base - 8, 4);
      stairs(base - 8, base, base - 5);
      band(base - 14, 6);
      seats(base - 28, 7);
      stairs(base - 28, base - 14, base - 22);
      rect(3, base - 30, THUMB_W - 6, 2, '#323852'); // teto
      rect(3, base - 31, THUMB_W - 6, 1, '#6e7389');
      break;
    case 'separacao':
      seats(base - 8, 4);
      stairs(base - 8, base, base - 5);
      band(base - 16, 8);
      screen(14, base - 15, 56, 6);
      seats(base - 28, 6);
      stairs(base - 28, base - 16, base - 23);
      break;
    case 'classica':
      seats(base - 34, 17);
      stairs(base - 34, base, base - 16);
      break;
  }
  // Refletores nas pontas das arquibancadas baixas
  if (model !== 'classica') {
    const on = T.lamps;
    for (const x of [9, THUMB_W - 9]) {
      rect(x - 1, base - 26, 1, 22, '#2a2f45');
      rect(x - 4, base - 31, 8, 5, '#14172a');
      for (let i = 0; i < 3; i++) rect(x - 3 + i * 3, base - 30, 2, 3, on > 0.05 ? '#fff6d8' : '#8a90a4');
      if (on > 0.05) {
        const rg = ctx.createRadialGradient(x, base - 28, 0, x, base - 28, 12);
        rg.addColorStop(0, `rgba(255,246,216,${0.8 * on})`);
        rg.addColorStop(1, 'rgba(255,246,216,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - 12, base - 40, 24, 24);
      }
    }
  }
  // Luz do horário sobre a miniatura (tarde quente, noite azulada)
  if (T.light !== null) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#' + T.light.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, THUMB_W, THUMB_H);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // Borda clara
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, THUMB_W - 1, THUMB_H - 1, 7);
  ctx.stroke();

  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
