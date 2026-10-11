import Phaser from 'phaser';
import type { CitySpec } from '../data/stadiums';
import type { SkyWeather, TimeOfDay } from './daytime';
import { Rng } from './rng';

/*
 * Cidade ao fundo das arquibancadas baixas: uma faixa de pixel art em camadas (neblina distante,
 * prédios de vários estilos com janelas, antenas com luz de aviso, avião, lua, pássaros, pontos de
 * referência de cada cidade, rua com carros e postes, árvores), feita por código.
 * Desenhada em "unidades" de 400×100 numa textura de resolução dobrada (800×200).
 * Também serve de miniatura no menu (ver standThumb.ts).
 */

export const SKY_W = 800;
export const SKY_H = 200;
const UW = 400;
const UH = 100;

const WIN = '#ffd98a';
const COOL = '#cfe6ff';

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function drawSky(out: CanvasRenderingContext2D, city: CitySpec, seed: number, tod: TimeOfDay, weather: SkyWeather) {
  // Silhuetas num canvas à parte (para tingir só elas); céu, sol, lua e nuvens vão direto em `out`
  const off = document.createElement('canvas');
  off.width = SKY_W;
  off.height = SKY_H;
  const ctx = off.getContext('2d')!;
  ctx.scale(2, 2);
  out.setTransform(2, 0, 0, 2, 0, 0);
  const winMul = tod === 'night' ? 1 : tod === 'dusk' ? 0.6 : 0;
  const lamps = winMul > 0;
  const bad = weather !== 'clear';
  const W = UW;
  const H = UH;
  const rng = new Rng(seed);
  const accent = city.accent ?? WIN;
  const q = (v: number) => Math.round(v * 2) / 2;
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(q(x), q(y), Math.max(0.5, q(w)), Math.max(0.5, q(h)));
  };
  const dot = (x: number, y: number, w: number, h: number, c: string) => {
    out.fillStyle = c;
    out.fillRect(q(x), q(y), Math.max(0.5, q(w)), Math.max(0.5, q(h)));
  };
  const poly = (pts: [number, number][], c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  const circle = (c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  };
  /** Brilho suave (luz de rua, farol, aviso). */
  const glow = (x: number, y: number, r: number, hex: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, a));
    g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // ------------------------------------------------------------------ céu (direto em `out`)
  if (tod === 'day' && bad) {
    // Dia de chuva/neve: céu fechado, camadas de nuvens cinzentas e sem sol
    for (let i = 0; i < 14; i++) {
      const cy = rng.range(0, H * 0.55);
      const w = rng.range(60, 150);
      const cx = rng.range(-10, W - w * 0.5);
      dot(cx, cy, w, 8, weather === 'rain' ? 'rgba(88,94,104,0.75)' : 'rgba(150,156,166,0.7)');
      dot(cx + 12, cy - 5, w * 0.55, 6, weather === 'rain' ? 'rgba(80,86,96,0.7)' : 'rgba(160,166,176,0.7)');
      dot(cx + w * 0.2, cy + 6, w * 0.7, 3, weather === 'rain' ? 'rgba(70,76,86,0.55)' : 'rgba(170,176,186,0.55)');
    }
  } else if (tod === 'day') {
    // Sol com halo, nuvens de pixel em camadas, pássaros e rastro de avião
    out.fillStyle = 'rgba(255,243,176,0.22)';
    out.beginPath();
    out.arc(52, 16, 22, 0, Math.PI * 2);
    out.fill();
    out.fillStyle = 'rgba(255,243,176,0.4)';
    out.beginPath();
    out.arc(52, 16, 14, 0, Math.PI * 2);
    out.fill();
    circle(out, 52, 16, 9, '#fff3b0');
    for (let i = 0; i < 8; i++) {
      const cx = rng.range(10, W - 40);
      const cy = rng.range(8, 46);
      const w = rng.range(28, 60);
      dot(cx, cy, w, 5, 'rgba(255,255,255,0.93)');
      dot(cx + 6, cy - 4, w * 0.5, 5, 'rgba(255,255,255,0.93)');
      dot(cx + w * 0.55, cy - 2.5, w * 0.28, 3, 'rgba(255,255,255,0.93)');
      dot(cx + w * 0.3, cy + 5, w * 0.6, 2, 'rgba(206,222,250,0.85)');
    }
    out.strokeStyle = 'rgba(255,255,255,0.45)'; // rastro de avião
    out.lineWidth = 0.8;
    out.beginPath();
    out.moveTo(150, 34);
    out.lineTo(330, 10);
    out.stroke();
    out.strokeStyle = 'rgba(40,50,80,0.7)'; // pássaros
    out.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) {
      const bx = rng.range(150, 340);
      const by = rng.range(30, 56);
      out.beginPath();
      out.moveTo(bx - 2.5, by - 1);
      out.lineTo(bx, by + 0.8);
      out.lineTo(bx + 2.5, by - 1);
      out.stroke();
    }
  } else {
    // Brilho do horizonte: transparente em cima, na cor da cidade embaixo (mais forte na tarde)
    const dusk = tod === 'dusk';
    const grad = out.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(dusk ? 0.35 : 0.55, city.glow + (dusk ? '58' : '30'));
    grad.addColorStop(1, city.glow + (dusk ? 'e6' : 'a0'));
    out.fillStyle = grad;
    out.fillRect(0, 0, W, H);
    if (dusk) {
      circle(out, W * 0.72, H - 20, 22, 'rgba(255,208,138,0.25)');
      circle(out, W * 0.72, H - 20, 12, '#ffd08a');
      // Faixas de nuvem alaranjadas
      for (let i = 0; i < 6; i++) dot(rng.range(0, W - 80), rng.range(20, 62), rng.range(50, 120), 2, rgba(city.glow, 0.35));
    }
    const stars = bad ? 0 : dusk ? 14 : 70; // com chuva/neve o céu fica fechado, sem estrelas
    for (let i = 0; i < stars; i++) dot(rng.range(0, W), rng.range(0, H * 0.55), 0.5, 0.5, rng.chance(0.3) ? '#ffffff' : '#9aa3d0');
    if (!bad && !dusk) {
      // Lua com halo e crateras
      const mx = rng.range(250, 350);
      circle(out, mx, 17, 15, 'rgba(210,225,255,0.14)');
      circle(out, mx, 17, 9, 'rgba(210,225,255,0.22)');
      circle(out, mx, 17, 6, '#eef2ff');
      circle(out, mx - 1.5, 15.5, 1.2, '#cfd6ee');
      circle(out, mx + 1.8, 18.5, 1, '#cfd6ee');
    }
    if (!bad) {
      // Avião com luzes de posição piscando e rastro
      const ax = rng.range(70, 200);
      const ay = rng.range(18, 30);
      out.fillStyle = 'rgba(200,210,240,0.18)';
      out.fillRect(ax - 44, ay + 0.3, 44, 0.6);
      dot(ax, ay, 7, 1.5, '#d5dcf2');
      dot(ax + 2, ay - 1.5, 2.5, 4.5, '#b9c2dc');
      dot(ax - 0.5, ay - 1.2, 1.5, 1, '#d5dcf2');
      dot(ax + 5.5, ay - 0.2, 0.8, 0.8, '#ff3b3b');
      dot(ax + 2.5, ay + 3, 0.8, 0.8, '#3bff7a');
      dot(ax - 1, ay + 0.3, 0.8, 0.8, '#ffffff');
    }
  }

  // ------------------------------------------------------------------ peças reutilizáveis
  const FARFAR = '#242c58';
  const FAR = '#181d3c';
  const NEAR = '#0e1128';
  const NEAR2 = '#090c1e';
  const windowsGrid = (x: number, y: number, w: number, h: number, mul = 1) => {
    if (winMul === 0) return;
    for (let wy = y; wy < y + h - 1; wy += 3) {
      const full = rng.chance(0.07 * winMul); // andar inteiro aceso (escritórios)
      for (let wx = x; wx < x + w - 0.5; wx += 2) {
        if (full || rng.chance(0.3 * winMul * mul)) rect(wx, wy, 1, 1.2, rng.chance(0.18) ? accent : rng.chance(0.2) ? COOL : WIN);
      }
    }
  };
  const beacon = (x: number, y: number) => {
    if (!lamps) return;
    glow(x, y, 4, '#ff3030', 0.55);
    rect(x - 0.5, y - 0.5, 1, 1, '#ff5a5a');
  };
  const tower = (x: number, w: number, h: number, col: string, near: boolean) => {
    const top = H - h;
    const style = near ? rng.pick(['flat', 'flat', 'step', 'spire', 'slant', 'crown'] as const) : 'flat';
    rect(x, top, w, h, col);
    if (style === 'step') {
      const w2 = w * 0.62;
      const h2 = h * 0.28;
      rect(x + (w - w2) / 2, top - h2, w2, h2, col);
      const w3 = w2 * 0.55;
      rect(x + (w - w3) / 2, top - h2 - 4, w3, 4, col);
      if (near) windowsGrid(x + (w - w2) / 2 + 1, top - h2 + 1, w2 - 2, h2 - 1);
    } else if (style === 'spire') {
      const sh = rng.range(9, 17);
      rect(x + w / 2 - 0.5, top - sh, 1, sh, col);
      rect(x + w / 2 - 1.5, top - 2, 3, 2, col);
      beacon(x + w / 2, top - sh);
    } else if (style === 'slant') {
      poly([[x, top], [x + w, top], [x + w, top - w * 0.5]], col);
    } else if (style === 'crown') {
      rect(x - 0.5, top - 2, w + 1, 2, col);
      rect(x, top - 1.5, w, 1, accent);
      if (lamps) glow(x + w / 2, top - 1, w * 0.9, accent, 0.28);
    }
    if (near) {
      rect(x, top, 0.5, h, 'rgba(130,150,230,0.34)'); // borda iluminada
      rect(x + w - 0.5, top, 0.5, h, 'rgba(0,0,0,0.3)');
      if (w > 10) rect(x + w * 0.32, top, 0.5, h, 'rgba(255,255,255,0.06)'); // reflexo do vidro
      if (rng.chance(0.4)) rect(x + rng.range(1, Math.max(1.5, w - 4)), top - 1.5, 3, 1.5, col); // casa de máquinas
      if (rng.chance(0.09)) rect(x + 1, top + h * 0.18, w - 2, 2, accent); // letreiro aceso
      windowsGrid(x + 1, top + 2, w - 2, h - 4);
    }
  };
  /** Uma camada de prédios: escala e cor mudam de acordo com a profundidade. */
  const towersLayer = (color: string, scale: number, near: boolean, gapMul = 1) => {
    for (let x = -6; x < W; ) {
      const w = rng.int(9, 21);
      if (rng.chance((1 - city.density) * 0.45 * gapMul)) {
        x += w;
        continue;
      }
      const mid = 1 - (Math.abs(x - W / 2) / W) * 0.7;
      const h = rng.range(16, 26 + city.density * 58) * mid * scale;
      tower(x, w, h, color, near);
      x += w + rng.int(0, 2);
    }
  };
  const tree = (x: number, r: number, col: string) => {
    circle(ctx, x, H - r * 0.7, r, col);
    circle(ctx, x - r * 0.5, H - r * 0.4, r * 0.7, col);
    circle(ctx, x + r * 0.6, H - r * 0.4, r * 0.75, col);
  };
  const pines = (x0: number, x1: number, base: number, col: string) => {
    for (let x = x0; x < x1; x += rng.range(2.5, 4.5)) {
      const h = rng.range(4, 8);
      poly([[x - 1.5, base], [x, base - h], [x + 1.5, base]], col);
    }
  };

  // ------------------------------------------------------------------ peças da cidade (de trás para a frente)
  for (const piece of city.pieces) {
    switch (piece) {
      case 'mountains': {
        for (const [col, hMin, hMax, step] of [['#2a3566', 36, 62, 30], ['#1c2550', 30, 74, 26], ['#131a3a', 16, 30, 18]] as [string, number, number, number][]) {
          const pts: [number, number][] = [[0, H]];
          const peaks: [number, number][] = [];
          for (let x = 0; x <= W + step; x += step) {
            const y = H - rng.range(hMin, hMax);
            pts.push([x, y]);
            peaks.push([x, y]);
            pts.push([x + step / 2, H - rng.range(hMin * 0.55, hMin * 0.9)]);
          }
          pts.push([W, H]);
          poly(pts, col);
          if (hMax > 60) {
            for (const [x, y] of peaks) {
              if (H - y > 52) {
                poly([[x, y], [x - 7, y + 12], [x + 7, y + 12]], '#d4ddff'); // neve
                poly([[x, y], [x + 7, y + 12], [x + 1, y + 12]], 'rgba(120,140,200,0.55)'); // lado na sombra
              }
            }
          }
        }
        pines(0, W, H - 3, '#0b1030');
        break;
      }
      case 'hills': {
        for (const [col, base, amp] of [['#1b2347', 26, 8], ['#141b3a', 18, 6]] as [string, number, number][]) {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 3) ctx.lineTo(x, H - base - Math.sin(x / 31 + base) * amp - Math.sin(x / 12 + 1) * 2);
          ctx.lineTo(W, H);
          ctx.fill();
        }
        for (let i = 0; i < 40; i++) {
          const x = rng.range(0, W);
          tree(x, rng.range(2.5, 4), '#0d1533');
        }
        for (let i = 0; i < 10 && lamps; i++) rect(rng.range(0, W), H - rng.range(8, 20), 1, 1, WIN); // luzes de casas na colina
        break;
      }
      case 'mesa': {
        for (let i = 0; i < 5; i++) {
          const cx = 20 + i * 85 + rng.range(-15, 15);
          const w = rng.range(46, 84);
          const h = rng.range(28, 52);
          poly([[cx - w / 2, H], [cx - w / 2 + 5, H - h], [cx + w / 2 - 5, H - h], [cx + w / 2, H]], '#3a2038');
          rect(cx - w / 2 + 5, H - h, w - 10, 2.5, '#5a3048'); // topo iluminado
          for (let s = 1; s < 4; s++) rect(cx - w / 2 + s * 1.2, H - h + s * (h / 4.4), w - s * 2.4, 0.5, 'rgba(255,140,90,0.18)'); // camadas de rocha
          poly([[cx + w / 2 - 5, H - h], [cx + w / 2, H], [cx + w / 2 - 14, H]], 'rgba(0,0,0,0.25)'); // lado na sombra
        }
        for (let i = 0; i < 9; i++) {
          // cactos saguaro
          const x = rng.range(5, W - 5);
          const h = rng.range(8, 14);
          rect(x, H - h, 1.5, h, '#0b0e20');
          rect(x - 3, H - h * 0.7, 3, 1.2, '#0b0e20');
          rect(x - 3, H - h * 0.7 - 3, 1.2, 4, '#0b0e20');
          rect(x + 1.5, H - h * 0.55, 3, 1.2, '#0b0e20');
          rect(x + 3.5, H - h * 0.55 - 3.5, 1.2, 4.5, '#0b0e20');
        }
        break;
      }
      case 'towers':
        towersLayer(FARFAR, 0.55, false, 0.5);
        towersLayer(FAR, 0.8, false);
        towersLayer(NEAR, 1, true);
        break;
      case 'needle': {
        const x = W * 0.3;
        poly([[x - 9, H], [x - 2.5, H - 52], [x + 2.5, H - 52], [x + 9, H]], '#1b2352');
        poly([[x - 9, H], [x - 4, H - 24], [x - 2, H - 24], [x - 5, H]], '#0a0d22');
        ctx.fillStyle = '#1b2352';
        ctx.beginPath();
        ctx.ellipse(x, H - 66, 19, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        rect(x - 3, H - 69, 6, 7, '#1b2352');
        rect(x, H - 88, 1, 22, '#1b2352');
        for (let i = -16; i < 16; i += 2) if (lamps) rect(x + i, H - 66.5, 1, 1, rng.chance(0.8) ? WIN : accent); // restaurante giratório aceso
        rect(x - 17, H - 65, 34, 0.5, 'rgba(130,150,230,0.4)');
        rect(x - 1.5, H - 40, 3, 1, 'rgba(130,150,230,0.35)');
        rect(x - 2.5, H - 52, 0.5, 52, 'rgba(150,170,255,0.35)'); // borda iluminada
        beacon(x, H - 88);
        break;
      }
      case 'bridge': {
        const a = W * 0.22;
        const b = W * 0.72;
        const cable = city.accent ?? '#c0392b';
        // água embaixo, com brilho da cidade
        rect(0, H - 6, W, 6, 'rgba(10,16,40,0.9)');
        for (let x = 0; x < W; x += rng.range(4, 9)) rect(x, H - rng.range(1, 5), rng.range(2, 6), 0.5, rgba(city.glow, 0.35));
        rect(0, H - 14, W, 3, NEAR); // tabuleiro
        for (let x = 2; x < W; x += 5) if (lamps) rect(x, H - 14.8, 0.8, 0.8, WIN); // luzes da pista
        for (const x of [a, b]) {
          rect(x - 3, H - 60, 3, 60, cable);
          rect(x + 3, H - 60, 3, 60, cable);
          for (const y of [H - 50, H - 36, H - 22]) rect(x - 3, y, 9, 2, cable);
          rect(x - 3, H - 60, 3, 1, 'rgba(255,255,255,0.3)');
          beacon(x - 1.5, H - 61);
          beacon(x + 4.5, H - 61);
        }
        ctx.strokeStyle = cable;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, H - 24);
        ctx.quadraticCurveTo(a / 2, H - 24, a, H - 59);
        ctx.quadraticCurveTo((a + b) / 2, H - 10, b, H - 59);
        ctx.quadraticCurveTo((b + W) / 2, H - 24, W, H - 24);
        ctx.stroke();
        for (let x = a + 5; x < b; x += 5) {
          const t = (x - a) / (b - a);
          const y = H - 59 + 4 * t * (1 - t) * 41 * 0.82;
          rect(x, y, 0.5, H - 14 - y, cable);
        }
        // névoa baixa sobre a água
        const fog = ctx.createLinearGradient(0, H - 22, 0, H - 4);
        fog.addColorStop(0, 'rgba(200,210,240,0)');
        fog.addColorStop(1, 'rgba(200,210,240,0.16)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, H - 22, W, 18);
        break;
      }
      case 'pyramid': {
        const x = W * 0.56;
        poly([[x - 18, H], [x, H - 56], [x + 18, H]], NEAR);
        poly([[x, H - 56], [x + 18, H], [x + 4, H]], 'rgba(0,0,0,0.3)');
        rect(x - 0.5, H - 56, 1, 56, accent + '88');
        for (let y = H - 8; y > H - 48; y -= 5) rect(x - 10 + (H - 8 - y) * 0.2, y, 20 - (H - 8 - y) * 0.4, 0.5, 'rgba(130,150,230,0.2)');
        if (lamps) {
          ctx.fillStyle = rgba(accent, 0.18); // feixe de luz
          ctx.fillRect(x - 3.5, 0, 7, H - 56);
          glow(x, H - 56, 7, accent, 0.5);
        }
        break;
      }
      case 'strip': {
        for (let i = 0; i < 8; i++) {
          const w = rng.int(16, 30);
          const h = rng.range(22, 50);
          const x = 6 + i * 48 + rng.range(-6, 6);
          rect(x, H - h, w, h, i % 2 ? NEAR : FAR);
          for (let wy = H - h + 3; wy < H - 2; wy += 3.5) rect(x + 1, wy, w - 2, 0.8, rng.chance(0.5) ? accent : '#3fe0ff');
          if (lamps) glow(x + w / 2, H - h * 0.5, w, rng.chance(0.5) ? accent : '#3fe0ff', 0.12);
          if (rng.chance(0.4)) rect(x + w * 0.3, H - h - 5, 1, 5, NEAR);
        }
        // Roda-gigante iluminada
        const cx = W * 0.42;
        const cy = H - 24;
        ctx.strokeStyle = NEAR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 8; k++) {
          const ang = (k * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15);
          ctx.stroke();
          if (lamps) circle(ctx, cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15, 1.3, k % 2 ? '#3fe0ff' : accent);
        }
        poly([[cx - 5, H], [cx, cy], [cx + 5, H]], NEAR);
        // Torre alta com mirante e luzes
        const x = W * 0.8;
        rect(x - 2, H - 82, 4, 82, NEAR);
        for (const [dy, w] of [[82, 8], [77, 13], [72, 8]] as [number, number][]) rect(x - w, H - dy, w * 2, 3, NEAR);
        rect(x - 1, H - 98, 2, 16, NEAR);
        rect(x - 10, H - 76, 20, 0.8, accent);
        beacon(x, H - 98);
        // Holofotes varrendo o céu
        if (lamps) {
          for (const [bx, ang] of [[W * 0.15, -0.35], [W * 0.62, 0.3]] as [number, number][]) {
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.beginPath();
            ctx.moveTo(bx, H);
            ctx.lineTo(bx + Math.sin(ang) * 120 - 5, 0);
            ctx.lineTo(bx + Math.sin(ang) * 120 + 5, 0);
            ctx.fill();
          }
        }
        break;
      }
      case 'dome': {
        const x = W * 0.45;
        ctx.fillStyle = '#141a38';
        ctx.beginPath();
        ctx.ellipse(x, H, 58, 35, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#2a3560';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(x, H, 58, 35, 0, Math.PI, 0);
        ctx.stroke();
        for (let k = 1; k < 5; k++) {
          // nervuras da cúpula
          ctx.beginPath();
          ctx.ellipse(x, H, 58 - k * 11, 35, 0, Math.PI, 0);
          ctx.stroke();
        }
        rect(x - 58, H - 5, 116, 5, '#1d2548');
        for (let i = -52; i < 52; i += 4) if (lamps) rect(x + i, H - 4, 1.5, 1.5, WIN);
        for (const px of [x - 66, x + 66]) {
          // postes de luz em volta
          rect(px, H - 22, 0.8, 22, NEAR);
          rect(px - 2, H - 23, 5, 1.5, NEAR);
          if (lamps) glow(px + 0.5, H - 23, 7, '#fff1c0', 0.5);
        }
        break;
      }
      case 'town': {
        // Fazendas, celeiro vermelho, cerca, torre da igreja, silo e árvores
        for (let i = 0; i < 12; i++) {
          const x = 8 + i * 33 + rng.range(-6, 6);
          const w = rng.range(14, 22);
          const h = rng.range(10, 18);
          rect(x, H - h, w, h, NEAR);
          poly([[x - 2, H - h], [x + w / 2, H - h - 8], [x + w + 2, H - h]], NEAR);
          rect(x + w - 4, H - h - 9, 2, 5, NEAR); // chaminé
          if (rng.chance(0.75) && lamps) {
            rect(x + 3, H - h + 4, 2, 2, WIN);
            glow(x + 4, H - h + 5, 5, '#ffd98a', 0.25);
          }
          if (rng.chance(0.5) && lamps) rect(x + w - 6, H - h + 4, 2, 2, WIN);
        }
        const barn = W * 0.68; // celeiro
        poly([[barn - 14, H], [barn - 14, H - 14], [barn - 7, H - 21], [barn + 7, H - 21], [barn + 14, H - 14], [barn + 14, H]], '#2a1420');
        rect(barn - 4, H - 10, 8, 10, '#1a0d16');
        rect(barn - 4, H - 10, 8, 0.5, 'rgba(255,255,255,0.18)');
        const c = W * 0.5;
        rect(c - 5, H - 40, 10, 40, NEAR);
        poly([[c - 6, H - 40], [c, H - 64], [c + 6, H - 40]], NEAR);
        rect(c - 0.5, H - 74, 1, 10, NEAR);
        rect(c - 3, H - 72, 7, 1, NEAR);
        if (lamps) {
          rect(c - 1, H - 32, 2, 5, WIN);
          glow(c, H - 30, 7, '#ffd98a', 0.35);
        }
        const s = W * 0.86; // silo
        rect(s - 6, H - 38, 12, 38, '#1d2548');
        poly([[s - 6, H - 38], [s, H - 47], [s + 6, H - 38]], '#1d2548');
        for (let k = 1; k < 5; k++) rect(s - 6, H - k * 8, 12, 0.5, 'rgba(255,255,255,0.1)');
        for (let x = 4; x < W; x += 3) rect(x, H - 4, 0.5, 4, '#0a1120'); // cerca
        rect(0, H - 3.2, W, 0.5, '#0a1120');
        for (let i = 0; i < 24; i++) tree(rng.range(0, W), rng.range(4, 8), '#0a1120');
        break;
      }
      case 'lighthouse': {
        // Mar com brilhos, barco com luzes e o farol com feixe de luz
        rect(0, H - 7, W, 7, 'rgba(12,20,50,0.92)');
        for (let x = 0; x < W; x += rng.range(5, 10)) rect(x, H - rng.range(1, 6), rng.range(2, 7), 0.5, rgba(city.glow, 0.4));
        const bx = W * 0.3;
        poly([[bx - 7, H - 7], [bx + 7, H - 7], [bx + 5, H - 4], [bx - 5, H - 4]], NEAR);
        rect(bx - 0.5, H - 17, 1, 10, NEAR);
        poly([[bx, H - 17], [bx + 6, H - 8], [bx, H - 8]], '#cfd2e4');
        if (lamps) rect(bx - 6, H - 8, 1, 1, '#ff4040');
        const x = W * 0.68;
        poly([[x - 7, H], [x - 3.5, H - 48], [x + 3.5, H - 48], [x + 7, H]], '#cfd2e4');
        for (const dy of [10, 28]) poly([[x - 6 + dy / 22, H - dy], [x - 4.5 + dy / 22, H - dy - 9], [x + 4.5 - dy / 22, H - dy - 9], [x + 6 - dy / 22, H - dy]], '#d94040');
        rect(x - 4.5, H - 54, 9, 6, WIN);
        rect(x - 5.5, H - 56, 11, 2, NEAR);
        poly([[x - 3, H - 56], [x, H - 61], [x + 3, H - 56]], NEAR);
        poly([[x - 11, H], [x - 7, H - 6], [x + 7, H - 6], [x + 11, H]], '#10152e'); // rochas
        if (lamps) {
          glow(x, H - 51, 12, '#ffd98a', 0.55);
          ctx.fillStyle = 'rgba(255,217,138,0.16)';
          ctx.beginPath();
          ctx.moveTo(x + 4, H - 51);
          ctx.lineTo(x + 120, H - 76);
          ctx.lineTo(x + 120, H - 28);
          ctx.fill();
        }
        break;
      }
      case 'palms': {
        for (let x = 12; x < W; x += rng.int(26, 44)) {
          const h = rng.range(28, 44);
          const lean = rng.range(-6, 6);
          ctx.strokeStyle = '#0a0e22';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, H);
          ctx.quadraticCurveTo(x + lean, H - h / 2, x + lean * 1.4, H - h);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(80,90,150,0.3)'; // anéis do tronco
          ctx.lineWidth = 0.4;
          for (let k = 1; k < 7; k++) {
            const t = k / 7;
            const tx0 = x + lean * 1.4 * t * t * 0 + lean * (2 * t * (1 - t)) + lean * 1.4 * t * t;
            ctx.beginPath();
            ctx.moveTo(tx0 - 1, H - h * t);
            ctx.lineTo(tx0 + 1, H - h * t);
            ctx.stroke();
          }
          const tx = x + lean * 1.4;
          ctx.strokeStyle = '#0a0e22';
          ctx.lineWidth = 0.9;
          for (let a = 0; a < 9; a++) {
            const ang = Math.PI + (a / 8) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(tx, H - h);
            ctx.quadraticCurveTo(tx + Math.cos(ang) * 9, H - h + Math.sin(ang) * 11 - 3, tx + Math.cos(ang) * 16, H - h + Math.sin(ang) * 4 + 7);
            ctx.stroke();
          }
          circle(ctx, tx - 1, H - h + 1.5, 1, '#0a0e22'); // cocos
          circle(ctx, tx + 1.2, H - h + 1.8, 1, '#0a0e22');
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ primeiro plano: casas baixas, rua com carros, postes e árvores
  const urban = city.pieces.some((p) => p === 'towers' || p === 'strip' || p === 'dome' || p === 'pyramid' || p === 'bridge');
  if (urban) {
    for (let x = -4; x < W; ) {
      const w = rng.int(8, 20);
      const h = rng.range(5, 13);
      rect(x, H - h, w, h, NEAR2);
      rect(x, H - h, w, 0.5, 'rgba(130,150,230,0.2)');
      if (rng.chance(0.4)) rect(x + 2, H - h - 3, 1, 3, NEAR2); // caixa-d'água/antena
      if (lamps) for (let wx = x + 1.5; wx < x + w - 1.5; wx += 2.5) if (rng.chance(0.35 * winMul + 0.1)) rect(wx, H - h + 2, 1, 1.2, WIN);
      x += w + rng.int(0, 3);
    }
    // rua com faróis (brancos) e lanternas (vermelhas)
    rect(0, H - 5, W, 1.4, '#05060f');
    for (let x = rng.range(0, 6); x < W; x += rng.range(5, 12)) {
      const white = rng.chance(0.5);
      if (lamps) rect(x, white ? H - 5.8 : H - 4.8, 1.2, 0.7, white ? '#fff6d8' : '#ff4a3a');
    }
    for (let x = 10; x < W; x += 22) {
      rect(x, H - 13, 0.5, 9, '#07091a');
      rect(x - 1.5, H - 13.5, 3.5, 0.6, '#07091a');
      if (lamps) glow(x, H - 12.5, 6, '#ffd98a', 0.4);
    }
  }
  for (let i = 0; i < (urban ? 14 : 8); i++) tree(rng.range(0, W), rng.range(2.5, 4.5), NEAR2);
  rect(0, H - 2, W, 2, NEAR2); // base escura (fica atrás da arquibancada)

  // Tinge as silhuetas pelo horário: dia claro e azulado (neblina), tarde arroxeada
  if (tod !== 'night') {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tod === 'day' ? (bad ? 'rgba(150,154,162,0.66)' : 'rgba(150,178,220,0.62)') : 'rgba(120,64,112,0.3)';
    ctx.fillRect(0, 0, SKY_W, SKY_H);
    ctx.restore();
  }
  // Neblina leve no horizonte para dar profundidade
  const haze = ctx.createLinearGradient(0, H - 38, 0, H);
  haze.addColorStop(0, rgba(city.glow, 0));
  haze.addColorStop(1, rgba(city.glow, tod === 'day' ? 0.1 : 0.2));
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = haze;
  ctx.fillRect(0, H - 38, W, 38);
  ctx.globalCompositeOperation = 'source-over';
  out.drawImage(off, 0, 0, SKY_W, SKY_H, 0, 0, UW, UH);
}

/** Cria a textura da cidade (SKY_W × SKY_H, pixel art). */
export function makeSkylineTexture(scene: Phaser.Scene, key: string, city: CitySpec, seed: number, tod: TimeOfDay = 'night', weather: SkyWeather = 'clear') {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, SKY_W, SKY_H)!;
  drawSky(tex.getContext(), city, seed, tod, weather);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Só a imagem da cidade (sem Phaser): usada para conferir os cenários e em miniaturas. */
export function skylineCanvas(city: CitySpec, seed: number, tod: TimeOfDay = 'night', weather: SkyWeather = 'clear') {
  const c = document.createElement('canvas');
  c.width = SKY_W;
  c.height = SKY_H;
  drawSky(c.getContext('2d')!, city, seed, tod, weather);
  return c;
}
