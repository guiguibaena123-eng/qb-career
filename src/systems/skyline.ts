import Phaser from 'phaser';
import type { CitySpec } from '../data/stadiums';
import type { SkyWeather, TimeOfDay } from './daytime';
import { Rng } from './rng';

/*
 * Cidade ao fundo das arquibancadas: pintura em camadas feita por código.
 *  - céu (sol/nuvens de dia, pôr do sol na tarde, lua/estrelas à noite; nublado com chuva/neve);
 *  - 4 camadas de prédios com perspectiva atmosférica (as de trás somem na névoa do horizonte);
 *  - cada prédio tem material (vidro azul, vidro verde, concreto, tijolo, escuro), face lateral na
 *    sombra, borda iluminada, janelas com caixilho (de dia refletem o céu; à noite acendem) e topo
 *    detalhado (recuos, coroa acesa, antena com luz de aviso, caixa-d'água, heliponto, máquinas);
 *  - pontos de referência de cada cidade (montanhas, ponte, torre, pirâmide, cúpula, farol...);
 *  - primeiro plano com casas, rua com faróis, postes e árvores.
 * Desenhada em "unidades" de 400×100 numa textura 4× (1600×400). Também vira miniatura no menu.
 */

export const SKY_W = 1600;
export const SKY_H = 400;
const UW = 400;
const UH = 100;
const SC = SKY_W / UW;

const WIN = '#ffd98a';
const COOL = '#cfe6ff';

const hexN = (hex: string) => parseInt(hex.slice(1, 7), 16);
const rgba = (hex: string, a: number) => {
  const n = hexN(hex);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Mistura duas cores (t = 0 → a, 1 → b). */
const mix = (a: string, b: string, t: number) => {
  const x = hexN(a);
  const y = hexN(b);
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
};

type Mat = 'glass' | 'teal' | 'concrete' | 'brick' | 'dark';

function drawSky(out: CanvasRenderingContext2D, city: CitySpec, seed: number, tod: TimeOfDay, weather: SkyWeather) {
  // Silhuetas num canvas à parte (para a névoa pegar só nelas); céu, sol, lua e nuvens vão direto em `out`
  const off = document.createElement('canvas');
  off.width = SKY_W;
  off.height = SKY_H;
  const ctx = off.getContext('2d')!;
  ctx.scale(SC, SC);
  out.setTransform(SC, 0, 0, SC, 0, 0);
  const day = tod === 'day';
  const dusk = tod === 'dusk';
  const night = tod === 'night';
  const winMul = night ? 1 : dusk ? 0.55 : 0;
  const lamps = winMul > 0;
  const bad = weather !== 'clear';
  const W = UW;
  const H = UH;
  const rng = new Rng(seed);
  const accent = city.accent ?? WIN;
  /** Cor pelo horário. */
  const P = (d: string, k: string, n: string) => (day ? d : dusk ? k : n);
  /** Cor do horizonte (para onde as camadas de trás desbotam). */
  const HOR = day ? (bad ? '#a4abb6' : '#b4cdee') : dusk ? (bad ? '#7a6a78' : '#d0828a') : bad ? '#141c30' : mix('#141a3c', city.glow, 0.18);
  const q = (v: number) => Math.round(v * 4) / 4;
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(q(x), q(y), Math.max(0.25, q(w)), Math.max(0.25, q(h)));
  };
  const dot = (x: number, y: number, w: number, h: number, c: string) => {
    out.fillStyle = c;
    out.fillRect(q(x), q(y), Math.max(0.25, q(w)), Math.max(0.25, q(h)));
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
  /** Nuvem fofa (vários círculos, base reta, sombra embaixo). */
  const cloud = (cx: number, cy: number, w: number, top: string, base: string) => {
    const n = Math.max(3, Math.round(w / 9));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = (w / n) * (0.6 + Math.sin(t * Math.PI) * 0.55);
      circle(out, cx + t * w, cy - r * 0.35, r, base);
    }
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = (w / n) * (0.5 + Math.sin(t * Math.PI) * 0.5);
      circle(out, cx + t * w - 1, cy - r * 0.5 - 1, r, top);
    }
    out.fillStyle = base;
    out.fillRect(cx - w * 0.05, cy, w * 1.1, 1.2);
  };

  // ------------------------------------------------------------------ céu (direto em `out`)
  if (bad && !night) {
    // Nublado: camadas de nuvens cinzentas cobrindo o céu, sem sol
    const g = out.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, day ? (weather === 'rain' ? 'rgba(70,76,88,0.55)' : 'rgba(150,156,168,0.5)') : 'rgba(60,50,70,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    out.fillStyle = g;
    out.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
      const w = rng.range(50, 130);
      const cx = rng.range(-30, W - w * 0.4);
      const cy = rng.range(8, H * 0.55);
      const rain = weather === 'rain';
      const top = day ? (rain ? '#7c838f' : '#c3c8d0') : '#6a5a6c';
      const base = day ? (rain ? '#646b78' : '#a7adb7') : '#4c4052';
      cloud(cx, cy, w, top, base);
    }
  } else if (day) {
    // Sol com halo, nuvens fofas em camadas, pássaros e rastro de avião
    const sx = 52;
    const sy = 16;
    for (const [r, a] of [[30, 0.12], [20, 0.22], [13, 0.4]] as [number, number][]) circle(out, sx, sy, r, `rgba(255,243,176,${a})`);
    circle(out, sx, sy, 8.5, '#fff6c4');
    for (let i = 0; i < 6; i++) {
      const w = rng.range(22, 48);
      cloud(rng.range(70, W - 40), rng.range(10, 40), w, '#ffffff', '#d6e3f7');
    }
    out.strokeStyle = 'rgba(255,255,255,0.5)'; // rastro de avião
    out.lineWidth = 0.6;
    out.beginPath();
    out.moveTo(150, 34);
    out.lineTo(330, 10);
    out.stroke();
    dot(329, 9.4, 2.5, 0.8, '#f4f6fb');
    out.strokeStyle = 'rgba(40,50,80,0.75)'; // pássaros
    out.lineWidth = 0.5;
    for (let i = 0; i < 7; i++) {
      const bx = rng.range(150, 340);
      const by = rng.range(30, 56);
      out.beginPath();
      out.moveTo(bx - 2, by - 0.8);
      out.lineTo(bx, by + 0.6);
      out.lineTo(bx + 2, by - 0.8);
      out.stroke();
    }
  } else {
    // Brilho do horizonte na cor da cidade (mais forte na tarde)
    const grad = out.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(dusk ? 0.3 : 0.5, city.glow + (dusk ? '58' : '30'));
    grad.addColorStop(1, city.glow + (dusk ? 'e6' : 'a8'));
    out.fillStyle = grad;
    out.fillRect(0, 0, W, H);
    if (dusk) {
      // sol se pondo com faixas de calor e nuvens rosadas iluminadas por baixo
      for (const [r, a] of [[34, 0.12], [22, 0.22]] as [number, number][]) circle(out, W * 0.72, H - 22, r, `rgba(255,190,120,${a})`);
      circle(out, W * 0.72, H - 22, 12, '#ffd08a');
      for (let i = 0; i < 7; i++) {
        const w = rng.range(40, 110);
        const cx = rng.range(0, W - 60);
        const cy = rng.range(16, 58);
        dot(cx, cy, w, 2.2, rgba(city.glow, 0.45));
        dot(cx + 6, cy + 2.2, w * 0.7, 1, 'rgba(255,214,150,0.45)');
      }
    }
    if (!bad) {
      const stars = dusk ? 16 : 90;
      for (let i = 0; i < stars; i++) {
        const big = rng.chance(0.12);
        dot(rng.range(0, W), rng.range(0, H * 0.58), big ? 0.75 : 0.5, big ? 0.75 : 0.5, rng.chance(0.3) ? '#ffffff' : '#9aa3d0');
      }
      if (night) {
        // Lua com halo e crateras
        const mx = rng.range(250, 350);
        circle(out, mx, 17, 16, 'rgba(210,225,255,0.12)');
        circle(out, mx, 17, 10, 'rgba(210,225,255,0.2)');
        circle(out, mx, 17, 6, '#eef2ff');
        circle(out, mx + 1.6, 16, 5.2, '#e2e8fa');
        circle(out, mx - 1.5, 15.5, 1.1, '#cbd3ec');
        circle(out, mx + 1.8, 18.5, 0.9, '#cbd3ec');
        circle(out, mx - 0.5, 19.6, 0.6, '#cbd3ec');
      }
      // Avião com luzes de posição e rastro
      const ax = rng.range(70, 200);
      const ay = rng.range(18, 30);
      out.fillStyle = 'rgba(200,210,240,0.16)';
      out.fillRect(ax - 44, ay + 0.3, 44, 0.5);
      dot(ax, ay, 7, 1.25, '#d5dcf2');
      dot(ax + 2, ay - 1.5, 2.25, 4.25, '#b9c2dc');
      dot(ax + 5.5, ay - 0.2, 0.75, 0.75, '#ff3b3b');
      dot(ax + 2.5, ay + 2.75, 0.75, 0.75, '#3bff7a');
      dot(ax - 1, ay + 0.3, 0.75, 0.75, '#ffffff');
    } else {
      // noite nublada: nuvens baixas iluminadas pela cidade
      for (let i = 0; i < 10; i++) {
        const w = rng.range(60, 140);
        cloud(rng.range(-30, W - 40), rng.range(10, 50), w, mix('#1c2238', city.glow, 0.12), '#121729');
      }
    }
  }

  // ------------------------------------------------------------------ materiais e prédios
  const FACADE: Record<Mat, [string, string, string]> = {
    glass: ['#5d86b8', '#4a3f6c', '#141b38'],
    teal: ['#4f98a2', '#3c4a68', '#0f1f2e'],
    concrete: ['#cbc4b4', '#80627a', '#1c1e32'],
    brick: ['#a8644c', '#6c3e50', '#1f1526'],
    dark: ['#46516a', '#2e2a46', '#0b0e22'],
  };
  const DEPTH_FADE = [0.72, 0.48, 0.24, 0];
  const facade = (m: Mat, depth: number) => mix(P(...FACADE[m]), HOR, DEPTH_FADE[depth] * (night ? 0.75 : 1));
  const shade = (c: string, k: number) => mix(c, night ? '#000000' : '#101624', k);
  const light = (c: string, k: number) => mix(c, day ? '#ffffff' : dusk ? '#ffc890' : '#9fb0ff', k);

  const beacon = (x: number, y: number) => {
    if (day) {
      rect(x - 0.25, y - 0.25, 0.5, 0.5, '#d04040');
      return;
    }
    glow(x, y, 3.5, '#ff3030', 0.55);
    rect(x - 0.375, y - 0.375, 0.75, 0.75, '#ff6a6a');
  };

  /** Janelas de uma face. `side`: face lateral (mais escura). */
  const windows = (m: Mat, base: string, x: number, y: number, w: number, h: number, depth: number, side: boolean) => {
    if (w < 1.5 || h < 3) return;
    const near = depth >= 2;
    const glassy = m === 'glass' || m === 'teal' || m === 'dark';
    const fh = near ? 2.5 : 3; // altura do andar
    const cw = glassy ? 1.75 : 2; // largura da janela + caixilho
    if (night || dusk) {
      // janelas acesas (andares inteiros de escritório às vezes)
      const pOn = (side ? 0.3 : 0.5) * winMul * (depth === 0 ? 0.6 : 1);
      for (let wy = y + 1; wy < y + h - 1.5; wy += fh) {
        const full = rng.chance(0.12 * winMul);
        const tint = rng.chance(0.2) ? COOL : rng.chance(0.12) ? accent : WIN;
        for (let wx = x + 0.5; wx < x + w - 0.75; wx += cw) {
          if (full || rng.chance(pOn)) rect(wx, wy, cw - 0.75, fh * 0.5, side ? mix(tint, '#000000', 0.35) : tint);
          else if (near && !side) rect(wx, wy, cw - 0.75, fh * 0.5, light(base, 0.06));
        }
      }
      if (dusk && !side) {
        // reflexo do pôr do sol na fachada de vidro
        if (glassy) {
          const g = ctx.createLinearGradient(x, y, x + w, y + h);
          g.addColorStop(0, 'rgba(255,170,110,0.28)');
          g.addColorStop(1, 'rgba(255,170,110,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x, y, w, h);
        }
      }
      return;
    }
    // Dia
    if (glassy) {
      // pele de vidro: reflexo do céu (claro em cima), caixilhos verticais e linhas dos andares
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, rgba(side ? '#ffffff' : '#e8f2ff', side ? 0.08 : 0.32));
      g.addColorStop(0.5, 'rgba(255,255,255,0.06)');
      g.addColorStop(1, 'rgba(10,20,40,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      if (near) {
        for (let wx = x + cw; wx < x + w - 0.25; wx += cw) rect(wx, y, 0.25, h, shade(base, 0.25));
        for (let wy = y + fh; wy < y + h; wy += fh) rect(x, wy, w, 0.25, light(base, 0.18));
        // reflexo diagonal de nuvem
        if (!side && w > 8 && rng.chance(0.6)) poly([[x + w * 0.2, y + h * 0.1], [x + w * 0.45, y + h * 0.1], [x + w * 0.15, y + h * 0.5], [x, y + h * 0.5]], 'rgba(255,255,255,0.12)');
      } else {
        for (let wy = y + fh; wy < y + h; wy += fh * 1.3) rect(x, wy, w, 0.25, light(base, 0.12));
      }
    } else {
      // concreto/tijolo: janelas recortadas (escuras, algumas com reflexo)
      const win = mix(base, '#1d2a44', side ? 0.62 : 0.5);
      for (let wy = y + 1; wy < y + h - 1.5; wy += fh) {
        for (let wx = x + 0.5; wx < x + w - 0.75; wx += cw) {
          rect(wx, wy, cw - 0.75, fh * 0.55, win);
          if (near && !side && rng.chance(0.25)) rect(wx, wy, (cw - 0.75) * 0.5, fh * 0.2, 'rgba(220,235,255,0.5)');
        }
        if (near) rect(x, wy + fh * 0.72, w, 0.25, light(base, 0.15)); // peitoril / laje
      }
    }
  };

  /** Detalhes do topo. */
  const roof = (m: Mat, base: string, x: number, top: number, w: number, depth: number) => {
    const near = depth >= 2;
    const r = rng.next();
    const dk = shade(base, 0.35);
    if (r < 0.18 && w > 6) {
      // antena com luz de aviso
      const sh = rng.range(6, 14) * (near ? 1 : 0.7);
      rect(x + w * 0.5 - 0.25, top - sh, 0.5, sh, dk);
      rect(x + w * 0.5 - 1, top - 1.5, 2, 1.5, dk);
      beacon(x + w * 0.5, top - sh);
    } else if (r < 0.3 && (m === 'brick' || m === 'concrete') && near) {
      // caixa-d'água de madeira em pé
      const cx = x + rng.range(1.5, Math.max(1.6, w - 5));
      rect(cx, top - 4, 3.5, 3, P('#7a5a3e', '#4a3040', '#120e18'));
      poly([[cx - 0.25, top - 4], [cx + 1.75, top - 5.5], [cx + 3.75, top - 4]], P('#5e4430', '#3a2634', '#0d0a12'));
      rect(cx + 0.5, top - 1, 0.25, 1, dk);
      rect(cx + 2.75, top - 1, 0.25, 1, dk);
    } else if (r < 0.42 && w > 9) {
      // coroa iluminada
      rect(x - 0.25, top - 1.5, w + 0.5, 1.5, dk);
      rect(x, top - 1, w, 0.5, lamps ? accent : light(base, 0.3));
      if (lamps) glow(x + w / 2, top - 1, w * 0.8, accent, 0.22);
    } else if (r < 0.5 && near && w > 10) {
      // heliponto
      rect(x + 1, top - 0.75, w - 2, 0.75, dk);
      rect(x + w / 2 - 2, top - 1, 4, 0.25, day ? '#e0e4ec' : lamps ? '#7cff9a' : dk);
    } else if (r < 0.62) {
      // máquinas do ar-condicionado
      for (let k = 0; k < (near ? 3 : 1); k++) {
        const bw = rng.range(1.5, 3.5);
        rect(x + rng.range(0.5, Math.max(0.6, w - bw - 0.5)), top - rng.range(1, 2.25), bw, 2.5, dk);
      }
    } else if (r < 0.7 && w > 6) {
      // telhado inclinado
      poly([[x, top], [x + w, top], [x + w, top - w * 0.4]], base);
      poly([[x + w * 0.6, top - w * 0.24], [x + w, top - w * 0.4], [x + w, top]], shade(base, 0.25));
    }
  };

  /** Um prédio. depth 0 (bem longe) .. 3 (mais perto). */
  const building = (x: number, w: number, h: number, depth: number) => {
    const m = rng.pick<Mat>(depth >= 2 ? ['glass', 'glass', 'teal', 'concrete', 'brick', 'dark'] : ['glass', 'concrete', 'dark', 'teal']);
    const base = facade(m, depth);
    const top = H - h;
    const near = depth >= 2;
    const sw = near ? Math.max(1, w * 0.24) : depth === 1 ? Math.max(0.75, w * 0.2) : 0; // face lateral
    const fw = w - sw;
    rect(x, top, fw, h, base);
    if (sw) rect(x + fw, top, sw, h, shade(base, day ? 0.28 : 0.4));
    windows(m, base, x, top + 1, fw, h - 2, depth, false);
    if (sw && depth >= 2) windows(m, shade(base, 0.3), x + fw, top + 1, sw, h - 2, depth, true);
    // recuo no topo (degraus) em prédios altos
    if (near && h > 34 && rng.chance(0.45)) {
      const w2 = fw * rng.range(0.5, 0.7);
      const h2 = rng.range(5, 11);
      const x2 = x + (fw - w2) / 2;
      rect(x2, top - h2, w2, h2, base);
      rect(x2 + w2 - w2 * 0.2, top - h2, w2 * 0.2, h2, shade(base, 0.3));
      windows(m, base, x2, top - h2 + 0.5, w2 * 0.8, h2 - 1, depth, false);
      rect(x, top - 0.25, fw, 0.5, light(base, 0.25));
      roof(m, base, x2, top - h2, w2, depth);
    } else {
      roof(m, base, x, top, fw, depth);
    }
    // borda iluminada (lado do sol / da cidade) e friso do topo
    if (depth >= 1) {
      rect(x, top, 0.25, h, light(base, day ? 0.3 : 0.18));
      rect(x, top, fw, 0.5, light(base, day ? 0.35 : 0.15));
    }
    // térreo: portaria/loja
    if (near && h > 12) {
      rect(x, H - 3, fw, 3, shade(base, 0.45));
      if (lamps) rect(x + 0.5, H - 2.5, fw - 1, 1.25, rng.chance(0.5) ? WIN : rgba(accent, 0.9));
      else rect(x + 0.5, H - 2.5, fw - 1, 1.25, 'rgba(180,200,230,0.45)');
    }
    if (near && lamps && rng.chance(0.1)) rect(x + 1, top + h * 0.2, fw - 2, 1.5, accent); // letreiro aceso
    // à noite: contorno de LED no topo e brilho das janelas sobre a fachada
    if (night && depth >= 1) {
      if (rng.chance(depth >= 2 ? 0.35 : 0.2)) {
        const led = rng.pick([accent, COOL, WIN, '#ff5ab0', '#5affc8']);
        rect(x, top, fw, 0.5, led);
        rect(x, top, 0.5, Math.min(h, 6), led);
        rect(x + fw - 0.5, top, 0.5, Math.min(h, 6), led);
        glow(x + fw / 2, top, fw * 0.7, led, 0.2);
      }
      glow(x + fw / 2, top + h * 0.5, Math.max(fw, h * 0.5), WIN, depth >= 2 ? 0.07 : 0.05);
    }
  };

  /** Uma camada de prédios. */
  const towersLayer = (depth: number, scale: number, gapMul = 1) => {
    for (let x = -6; x < W; ) {
      const w = depth >= 2 ? rng.int(9, 22) : rng.int(6, 16);
      if (rng.chance((1 - city.density) * 0.45 * gapMul)) {
        x += w;
        continue;
      }
      const mid = 1 - (Math.abs(x - W / 2) / W) * 0.7;
      const h = rng.range(14, 24 + city.density * 58) * mid * scale;
      building(x, w, h, depth);
      x += w + (depth >= 2 ? rng.int(0, 2) : rng.int(0, 1));
    }
  };
  const tree = (x: number, r: number, depth = 3) => {
    const col = P(mix('#3f6e3c', HOR, DEPTH_FADE[depth] * 0.6), '#2a2034', '#090c1e');
    const hi = P(mix('#5c8f4e', HOR, DEPTH_FADE[depth] * 0.6), '#3c2e44', '#0e1328');
    circle(ctx, x, H - r * 0.7, r, col);
    circle(ctx, x - r * 0.5, H - r * 0.4, r * 0.7, col);
    circle(ctx, x + r * 0.6, H - r * 0.4, r * 0.75, col);
    circle(ctx, x - r * 0.25, H - r * 0.95, r * 0.5, hi);
  };
  const pines = (x0: number, x1: number, base: number, col: string) => {
    for (let x = x0; x < x1; x += rng.range(2.5, 4.5)) {
      const h = rng.range(4, 8);
      poly([[x - 1.5, base], [x, base - h], [x + 1.5, base]], col);
    }
  };
  const NEAR = P('#3c4658', '#241e36', '#0e1128');
  const NEAR2 = P('#2e3646', '#1a1628', '#090c1e');

  // ------------------------------------------------------------------ peças da cidade (de trás para a frente)
  for (const piece of city.pieces) {
    switch (piece) {
      case 'mountains': {
        const layers: [string, number, number, number][] = [
          [P('#8ea6c8', '#6a5a86', '#2a3566'), 36, 62, 30],
          [P('#6f88ad', '#54466e', '#1c2550'), 30, 74, 26],
          [P('#5a7090', '#3a3050', '#131a3a'), 16, 30, 18],
        ];
        for (const [col, hMin, hMax, step] of layers) {
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
          // lado na sombra de cada pico
          for (let i = 1; i < pts.length - 2; i += 2) {
            const [px, py] = pts[i];
            const [vx, vy] = pts[i + 1];
            poly([[px, py], [vx, vy], [vx, H], [px + (vx - px) * 0.4, H]], 'rgba(0,0,0,0.12)');
          }
          if (hMax > 60) {
            for (const [x, y] of peaks) {
              if (H - y > 52) {
                poly([[x, y], [x - 7, y + 12], [x - 3, y + 10], [x, y + 13], [x + 3, y + 10], [x + 7, y + 12]], P('#ffffff', '#ffd8e0', '#d4ddff')); // neve
                poly([[x, y], [x + 7, y + 12], [x + 3, y + 10], [x + 1, y + 12]], P('rgba(120,140,190,0.45)', 'rgba(120,90,140,0.5)', 'rgba(120,140,200,0.55)'));
              }
            }
          }
        }
        pines(0, W, H - 3, P('#2f4a3a', '#1c1830', '#0b1030'));
        break;
      }
      case 'hills': {
        for (const [col, base, amp] of [[P('#7ea36c', '#4a3a58', '#1b2347'), 26, 8], [P('#5f8a54', '#382c48', '#141b3a'), 18, 6]] as [string, number, number][]) {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 2) ctx.lineTo(x, H - base - Math.sin(x / 31 + base) * amp - Math.sin(x / 12 + 1) * 2);
          ctx.lineTo(W, H);
          ctx.fill();
        }
        for (let i = 0; i < 46; i++) tree(rng.range(0, W), rng.range(2.5, 4), 2);
        for (let i = 0; i < 14; i++) {
          // casinhas na colina
          const x = rng.range(0, W);
          const y = H - rng.range(10, 22);
          rect(x, y, 3, 2, P('#e8dcc4', '#6a5070', '#141a34'));
          poly([[x - 0.5, y], [x + 1.5, y - 1.5], [x + 3.5, y]], P('#a8503c', '#4a2c40', '#0e1228'));
          if (lamps) rect(x + 1, y + 0.75, 0.75, 0.75, WIN);
        }
        break;
      }
      case 'mesa': {
        for (let i = 0; i < 5; i++) {
          const cx = 20 + i * 85 + rng.range(-15, 15);
          const w = rng.range(46, 84);
          const h = rng.range(28, 52);
          const rock = P('#b8643c', '#6a3044', '#3a2038');
          poly([[cx - w / 2, H], [cx - w / 2 + 5, H - h], [cx + w / 2 - 5, H - h], [cx + w / 2, H]], rock);
          rect(cx - w / 2 + 5, H - h, w - 10, 2.5, P('#d68450', '#8a4458', '#5a3048')); // topo iluminado
          for (let s = 1; s < 6; s++) rect(cx - w / 2 + s * 0.9, H - h + s * (h / 6.2), w - s * 1.8, 0.5, P('rgba(120,50,30,0.35)', 'rgba(255,140,90,0.2)', 'rgba(255,140,90,0.16)')); // camadas de rocha
          poly([[cx + w / 2 - 5, H - h], [cx + w / 2, H], [cx + w / 2 - 14, H]], 'rgba(0,0,0,0.25)'); // lado na sombra
          for (let k = 0; k < 4; k++) rect(cx - w / 2 + rng.range(6, w - 10), H - h + rng.range(4, h - 4), 0.5, rng.range(3, 8), 'rgba(0,0,0,0.15)'); // fendas
        }
        const cac = P('#3e6a3a', '#1c1428', '#0b0e20');
        for (let i = 0; i < 12; i++) {
          // cactos saguaro
          const x = rng.range(5, W - 5);
          const h = rng.range(8, 14);
          rect(x, H - h, 1.5, h, cac);
          rect(x - 3, H - h * 0.7, 3, 1.2, cac);
          rect(x - 3, H - h * 0.7 - 3, 1.2, 4, cac);
          rect(x + 1.5, H - h * 0.55, 3, 1.2, cac);
          rect(x + 3.5, H - h * 0.55 - 3.5, 1.2, 4.5, cac);
        }
        break;
      }
      case 'towers':
        towersLayer(0, 0.5, 0.4);
        towersLayer(1, 0.7, 0.7);
        towersLayer(2, 0.9);
        towersLayer(3, 0.62, 1.4);
        break;
      case 'needle': {
        const x = W * 0.3;
        const col = P('#e2e6ee', '#5a4a70', '#1b2352');
        const sh = P('#a8b0c0', '#3a2e4c', '#0a0d22');
        poly([[x - 9, H], [x - 2.5, H - 52], [x + 2.5, H - 52], [x + 9, H]], col);
        poly([[x + 1, H - 52], [x + 2.5, H - 52], [x + 9, H], [x + 4, H]], sh);
        poly([[x - 9, H], [x - 4, H - 24], [x - 2, H - 24], [x - 5, H]], sh);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(x, H - 66, 19, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        rect(x - 19, H - 64.5, 38, 1.5, sh);
        rect(x - 3, H - 69, 6, 7, col);
        rect(x, H - 88, 1, 22, col);
        for (let i = -16; i < 16; i += 1.5) rect(x + i, H - 66.5, 0.75, 1, lamps ? (rng.chance(0.8) ? WIN : accent) : P('#7a8aa8', '#3a3050', '#141a34')); // restaurante giratório
        beacon(x, H - 88);
        break;
      }
      case 'bridge': {
        const a = W * 0.22;
        const b = W * 0.72;
        const cable = city.accent ?? '#c0392b';
        // água com reflexos
        rect(0, H - 6, W, 6, P('#4a76a6', '#3a2c50', 'rgba(10,16,40,0.95)'));
        for (let x = 0; x < W; x += rng.range(3, 7)) rect(x, H - rng.range(1, 5), rng.range(2, 6), 0.25, day ? 'rgba(255,255,255,0.4)' : rgba(city.glow, 0.4));
        rect(0, H - 14, W, 3, NEAR); // tabuleiro
        rect(0, H - 14, W, 0.5, light(NEAR, 0.25));
        for (let x = 2; x < W; x += 4) if (lamps) rect(x, H - 14.75, 0.75, 0.75, WIN); // luzes da pista
        for (const x of [a, b]) {
          rect(x - 3, H - 60, 3, 60, cable);
          rect(x + 3, H - 60, 3, 60, cable);
          rect(x - 1, H - 60, 1, 60, shade(cable, 0.3));
          rect(x + 5, H - 60, 1, 60, shade(cable, 0.3));
          for (const y of [H - 50, H - 36, H - 22]) rect(x - 3, y, 9, 2, cable);
          rect(x - 3, H - 60, 9, 0.75, 'rgba(255,255,255,0.3)');
          beacon(x - 1.5, H - 61);
          beacon(x + 4.5, H - 61);
        }
        ctx.strokeStyle = cable;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H - 24);
        ctx.quadraticCurveTo(a / 2, H - 24, a, H - 59);
        ctx.quadraticCurveTo((a + b) / 2, H - 10, b, H - 59);
        ctx.quadraticCurveTo((b + W) / 2, H - 24, W, H - 24);
        ctx.stroke();
        for (let x = a + 4; x < b; x += 4) {
          const t = (x - a) / (b - a);
          const y = H - 59 + 4 * t * (1 - t) * 41 * 0.82;
          rect(x, y, 0.25, H - 14 - y, cable);
        }
        // névoa baixa sobre a água
        const fog = ctx.createLinearGradient(0, H - 22, 0, H - 4);
        fog.addColorStop(0, 'rgba(200,210,240,0)');
        fog.addColorStop(1, `rgba(200,210,240,${day ? 0.22 : 0.16})`);
        ctx.fillStyle = fog;
        ctx.fillRect(0, H - 22, W, 18);
        break;
      }
      case 'pyramid': {
        const x = W * 0.56;
        const col = P('#7a8496', '#3a2e50', '#0e1128');
        poly([[x - 18, H], [x, H - 56], [x + 18, H]], col);
        poly([[x, H - 56], [x + 18, H], [x + 4, H]], shade(col, 0.35));
        rect(x - 0.25, H - 56, 0.5, 56, rgba(accent, 0.55));
        for (let y = H - 6; y > H - 50; y -= 3.5) rect(x - 15 + (H - 6 - y) * 0.32, y, 30 - (H - 6 - y) * 0.64, 0.25, day ? 'rgba(255,255,255,0.25)' : 'rgba(130,150,230,0.22)');
        if (lamps) {
          ctx.fillStyle = rgba(accent, 0.18); // feixe de luz
          ctx.fillRect(x - 3.5, 0, 7, H - 56);
          glow(x, H - 56, 7, accent, 0.5);
        }
        break;
      }
      case 'strip': {
        // cidade atrás da avenida
        towersLayer(0, 0.45, 0.5);
        towersLayer(1, 0.6, 0.8);
        for (let i = 0; i < 8; i++) {
          const w = rng.int(16, 30);
          const h = rng.range(22, 50);
          const x = 6 + i * 48 + rng.range(-6, 6);
          const base = facade(i % 2 ? 'dark' : 'glass', 2);
          rect(x, H - h, w, h, base);
          rect(x + w * 0.78, H - h, w * 0.22, h, shade(base, 0.35));
          for (let wy = H - h + 3; wy < H - 2; wy += 3) rect(x + 1, wy, w * 0.78 - 2, 0.75, lamps ? (rng.chance(0.5) ? accent : '#3fe0ff') : 'rgba(255,255,255,0.25)');
          if (lamps) glow(x + w / 2, H - h * 0.5, w, rng.chance(0.5) ? accent : '#3fe0ff', 0.12);
          if (rng.chance(0.4)) rect(x + w * 0.3, H - h - 5, 1, 5, base);
          // letreiro grande no topo
          if (rng.chance(0.5)) {
            rect(x + 2, H - h - 4, w - 4, 3.5, shade(base, 0.2));
            rect(x + 3, H - h - 3.25, w - 6, 2, lamps ? accent : '#d04878');
          }
        }
        // Roda-gigante
        const cx = W * 0.42;
        const cy = H - 24;
        ctx.strokeStyle = NEAR;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 12; k++) {
          const ang = (k * Math.PI) / 6;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15);
          ctx.stroke();
          circle(ctx, cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15, 1.2, lamps ? (k % 2 ? '#3fe0ff' : accent) : P('#e05080', '#6a3a60', '#141a34'));
        }
        poly([[cx - 5, H], [cx, cy], [cx + 5, H]], NEAR);
        // Torre alta com mirante e luzes
        const x = W * 0.8;
        rect(x - 2, H - 82, 4, 82, NEAR);
        rect(x + 0.5, H - 82, 1.5, 82, shade(NEAR, 0.3));
        for (const [dy, w] of [[82, 8], [77, 13], [72, 8]] as [number, number][]) rect(x - w, H - dy, w * 2, 3, NEAR);
        rect(x - 1, H - 98, 2, 16, NEAR);
        rect(x - 10, H - 76, 20, 0.75, lamps ? accent : '#d04878');
        beacon(x, H - 98);
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
        const col = P('#d4d8e0', '#5c4a6c', '#141a38');
        const rib = P('#a8b0bc', '#7a6890', '#2a3560');
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(x, H, 58, 35, 0, Math.PI, 0);
        ctx.fill();
        // sombra do lado direito da cúpula
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.beginPath();
        ctx.ellipse(x, H, 58, 35, 0, -Math.PI / 2, 0);
        ctx.lineTo(x, H);
        ctx.fill();
        ctx.strokeStyle = rib;
        ctx.lineWidth = 0.5;
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          ctx.ellipse(x, H, 58 - k * 9.5, 35, 0, Math.PI, 0);
          ctx.stroke();
        }
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.ellipse(x, H, 58 * Math.sqrt(1 - (k / 4) ** 2), 35 * (k / 4), 0, Math.PI, 0);
          ctx.stroke();
        }
        rect(x - 58, H - 5, 116, 5, shade(col, 0.25));
        for (let i = -52; i < 52; i += 3) rect(x + i, H - 4, 1.25, 1.5, lamps ? WIN : 'rgba(40,60,90,0.6)');
        for (const px of [x - 66, x + 66]) {
          rect(px, H - 22, 0.75, 22, NEAR);
          rect(px - 2, H - 23, 5, 1.5, NEAR);
          if (lamps) glow(px + 0.5, H - 23, 7, '#fff1c0', 0.5);
        }
        break;
      }
      case 'town': {
        // Fazendas, celeiro vermelho, cerca, torre da igreja, silo e árvores
        const wall = P('#e6dcc6', '#6c5470', '#141a34');
        const roofs = [P('#a8463a', '#5a2c40', '#0e1228'), P('#6a4a3a', '#4a3040', '#0c1024'), P('#4a5a6e', '#3a3050', '#0d1126')];
        for (let i = 0; i < 12; i++) {
          const x = 8 + i * 33 + rng.range(-6, 6);
          const w = rng.range(14, 22);
          const h = rng.range(10, 18);
          rect(x, H - h, w, h, wall);
          rect(x + w * 0.75, H - h, w * 0.25, h, shade(wall, 0.25));
          poly([[x - 2, H - h], [x + w / 2, H - h - 8], [x + w + 2, H - h]], rng.pick(roofs));
          rect(x + w - 4, H - h - 9, 2, 5, P('#7a5a4a', '#3a2c40', '#0c0f22')); // chaminé
          for (const wx of [x + 3, x + w - 7]) {
            rect(wx, H - h + 4, 2.5, 2.5, lamps && rng.chance(0.7) ? WIN : P('#5a7090', '#2a2238', '#0a0d1e'));
            if (lamps) glow(wx + 1.25, H - h + 5.25, 5, '#ffd98a', 0.22);
          }
          rect(x + w / 2 - 1.25, H - 4, 2.5, 4, P('#6a4a3a', '#2a1c2c', '#080a18')); // porta
        }
        const barn = W * 0.68; // celeiro
        const red = P('#b03a2e', '#5a1c2c', '#2a1420');
        poly([[barn - 14, H], [barn - 14, H - 14], [barn - 7, H - 21], [barn + 7, H - 21], [barn + 14, H - 14], [barn + 14, H]], red);
        rect(barn - 4, H - 10, 8, 10, shade(red, 0.4));
        rect(barn - 4, H - 10, 8, 0.5, 'rgba(255,255,255,0.4)');
        poly([[barn - 4, H - 10], [barn + 4, H], [barn + 3.4, H], [barn - 4, H - 9.2]], 'rgba(255,255,255,0.35)');
        poly([[barn + 4, H - 10], [barn - 4, H], [barn - 3.4, H], [barn + 4, H - 9.2]], 'rgba(255,255,255,0.35)');
        const c = W * 0.5; // igreja
        const white = P('#f0ece2', '#6c5874', '#141a34');
        rect(c - 5, H - 40, 10, 40, white);
        rect(c + 2.5, H - 40, 2.5, 40, shade(white, 0.25));
        poly([[c - 6, H - 40], [c, H - 64], [c + 6, H - 40]], P('#5a6478', '#3a3050', '#0e1128'));
        rect(c - 0.5, H - 74, 1, 10, NEAR);
        rect(c - 3, H - 72, 7, 1, NEAR);
        rect(c - 1.5, H - 34, 3, 5, lamps ? WIN : P('#4a5a78', '#2a2238', '#0a0d1e'));
        if (lamps) glow(c, H - 31, 7, '#ffd98a', 0.35);
        const s = W * 0.86; // silo
        const silo = P('#b8c0cc', '#5a5070', '#1d2548');
        rect(s - 6, H - 38, 12, 38, silo);
        rect(s + 2, H - 38, 4, 38, shade(silo, 0.25));
        poly([[s - 6, H - 38], [s, H - 47], [s + 6, H - 38]], shade(silo, 0.1));
        for (let k = 1; k < 9; k++) rect(s - 6, H - k * 4.5, 12, 0.25, 'rgba(0,0,0,0.12)');
        const fence = P('#e8e0cc', '#4a3c50', '#0a1120');
        for (let x = 4; x < W; x += 3) rect(x, H - 4, 0.5, 4, fence); // cerca
        rect(0, H - 3.25, W, 0.5, fence);
        for (let i = 0; i < 26; i++) tree(rng.range(0, W), rng.range(4, 8));
        break;
      }
      case 'lighthouse': {
        rect(0, H - 7, W, 7, P('#4a78a8', '#3a2c50', 'rgba(12,20,50,0.94)'));
        for (let x = 0; x < W; x += rng.range(4, 9)) rect(x, H - rng.range(1, 6), rng.range(2, 7), 0.25, day ? 'rgba(255,255,255,0.45)' : rgba(city.glow, 0.4));
        const bx = W * 0.3; // veleiro
        poly([[bx - 7, H - 7], [bx + 7, H - 7], [bx + 5, H - 4], [bx - 5, H - 4]], NEAR);
        rect(bx - 0.25, H - 17, 0.5, 10, NEAR);
        poly([[bx, H - 17], [bx + 6, H - 8], [bx, H - 8]], '#e4e6f0');
        poly([[bx, H - 15], [bx - 4, H - 8], [bx, H - 8]], '#c8ccdc');
        if (lamps) rect(bx - 6, H - 8, 0.75, 0.75, '#ff4040');
        const x = W * 0.68;
        poly([[x - 7, H], [x - 3.5, H - 48], [x + 3.5, H - 48], [x + 7, H]], '#e4e6f0');
        poly([[x + 1, H - 48], [x + 3.5, H - 48], [x + 7, H], [x + 2.5, H]], 'rgba(0,0,0,0.15)');
        for (const dy of [10, 28]) poly([[x - 6 + dy / 22, H - dy], [x - 4.5 + dy / 22, H - dy - 9], [x + 4.5 - dy / 22, H - dy - 9], [x + 6 - dy / 22, H - dy]], '#d94040');
        rect(x - 4.5, H - 54, 9, 6, lamps ? WIN : '#9ab4d0');
        for (let k = -4; k < 5; k += 2) rect(x + k, H - 54, 0.25, 6, NEAR);
        rect(x - 5.5, H - 56, 11, 2, NEAR);
        poly([[x - 3, H - 56], [x, H - 61], [x + 3, H - 56]], NEAR);
        poly([[x - 11, H], [x - 7, H - 6], [x + 7, H - 6], [x + 11, H]], P('#6a6e78', '#2a2236', '#10152e')); // rochas
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
        const trunk = P('#6a5236', '#2a1c2a', '#0a0e22');
        const leaf = P('#2f7a40', '#1e1a30', '#0a0e22');
        const leaf2 = P('#4a9a52', '#2a2440', '#0e1328');
        for (let x = 12; x < W; x += rng.int(26, 44)) {
          const h = rng.range(28, 44);
          const lean = rng.range(-6, 6);
          ctx.strokeStyle = trunk;
          ctx.lineWidth = 1.75;
          ctx.beginPath();
          ctx.moveTo(x, H);
          ctx.quadraticCurveTo(x + lean, H - h / 2, x + lean * 1.4, H - h);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; // anéis do tronco
          ctx.lineWidth = 0.3;
          for (let k = 1; k < 10; k++) {
            const t = k / 10;
            const tx0 = x + lean * (2 * t * (1 - t)) + lean * 1.4 * t * t;
            ctx.beginPath();
            ctx.moveTo(tx0 - 0.9, H - h * t);
            ctx.lineTo(tx0 + 0.9, H - h * t);
            ctx.stroke();
          }
          const tx = x + lean * 1.4;
          for (const [col, wdt] of [[leaf, 1], [leaf2, 0.5]] as [string, number][]) {
            ctx.strokeStyle = col;
            ctx.lineWidth = wdt;
            for (let a = 0; a < 10; a++) {
              const ang = Math.PI + (a / 9) * Math.PI;
              ctx.beginPath();
              ctx.moveTo(tx, H - h);
              ctx.quadraticCurveTo(tx + Math.cos(ang) * 9, H - h + Math.sin(ang) * 11 - 3, tx + Math.cos(ang) * 16, H - h + Math.sin(ang) * 4 + 7);
              ctx.stroke();
            }
          }
          circle(ctx, tx - 1, H - h + 1.5, 0.9, P('#5a4020', '#1a1424', '#0a0e22')); // cocos
          circle(ctx, tx + 1.2, H - h + 1.8, 0.9, P('#5a4020', '#1a1424', '#0a0e22'));
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
      const base = mix(rng.pick([P('#8a7a6a', '#3a2c40', '#0b0d20'), P('#6a7488', '#2c2840', '#090c1e'), P('#9a6a54', '#40283a', '#0c0b1c')]), NEAR2, 0.35);
      rect(x, H - h, w, h, base);
      rect(x, H - h, w, 0.5, light(base, 0.25));
      rect(x + w * 0.8, H - h, w * 0.2, h, shade(base, 0.3));
      if (rng.chance(0.4)) rect(x + 2, H - h - 3, 1, 3, base); // caixa-d'água/antena
      for (let wx = x + 1.5; wx < x + w * 0.8 - 1.5; wx += 2.5) {
        if (lamps) {
          if (rng.chance(0.35 * winMul + 0.1)) rect(wx, H - h + 2, 1, 1.25, WIN);
        } else rect(wx, H - h + 2, 1, 1.25, shade(base, 0.4));
      }
      x += w + rng.int(0, 3);
    }
    // rua com carros (faróis à noite)
    rect(0, H - 5, W, 1.5, P('#3a3e48', '#14101c', '#05060f'));
    for (let x = rng.range(0, 6); x < W; x += rng.range(5, 12)) {
      const white = rng.chance(0.5);
      if (lamps) rect(x, white ? H - 5.75 : H - 4.75, 1.25, 0.75, white ? '#fff6d8' : '#ff4a3a');
      else rect(x, H - 5.75, 2.5, 1.25, rng.pick(['#d04040', '#e8e8f0', '#3a5aa8', '#2a2e38', '#e0c040']));
    }
    for (let x = 10; x < W; x += 22) {
      rect(x, H - 13, 0.5, 9, NEAR2);
      rect(x - 1.5, H - 13.5, 3.5, 0.5, NEAR2);
      if (lamps) glow(x, H - 12.5, 7, '#ffd98a', night ? 0.6 : 0.4);
    }
  }
  for (let i = 0; i < (urban ? 16 : 8); i++) tree(rng.range(0, W), rng.range(2.5, 4.5));
  rect(0, H - 2, W, 2, NEAR2); // base escura (fica atrás da arquibancada)

  // Tempo fechado de dia/tarde: tudo um pouco mais cinza e apagado
  if (bad && !night) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = day ? (weather === 'rain' ? 'rgba(120,126,138,0.42)' : 'rgba(170,176,188,0.38)') : 'rgba(90,80,100,0.3)';
    ctx.fillRect(0, 0, SKY_W, SKY_H);
    ctx.restore();
  } else if (dusk) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(120,64,112,0.14)';
    ctx.fillRect(0, 0, SKY_W, SKY_H);
    ctx.restore();
  }
  // Neblina no pé da cidade (profundidade)
  const haze = ctx.createLinearGradient(0, H - 40, 0, H);
  haze.addColorStop(0, rgba(day ? HOR : city.glow, 0));
  haze.addColorStop(1, rgba(day ? HOR : city.glow, day ? 0.28 : night ? 0.32 : 0.2));
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = haze;
  ctx.fillRect(0, H - 40, W, 40);
  ctx.globalCompositeOperation = 'source-over';
  out.drawImage(off, 0, 0, SKY_W, SKY_H, 0, 0, UW, UH);
}

/** Cria a textura da cidade (SKY_W × SKY_H). */
const SKY_CACHE = new Map<string, HTMLCanvasElement>();
const skySig = (city: CitySpec, seed: number, tod: TimeOfDay, weather: SkyWeather) => `${seed}|${tod}|${weather}|${city.pieces.join(',')}|${city.density}|${city.glow}|${city.accent ?? ''}`;
/** Desenha (se ainda não estiver no cache) a cidade num horário/clima: usado para deixar as trocas instantâneas. */
export function warmSkyline(city: CitySpec, seed: number, tod: TimeOfDay, weather: SkyWeather) {
  const sig = skySig(city, seed, tod, weather);
  let cv = SKY_CACHE.get(sig);
  if (!cv) {
    cv = skylineCanvas(city, seed, tod, weather);
    if (SKY_CACHE.size > 40) SKY_CACHE.clear();
    SKY_CACHE.set(sig, cv);
  }
  return cv;
}
export function makeSkylineTexture(scene: Phaser.Scene, key: string, city: CitySpec, seed: number, tod: TimeOfDay = 'night', weather: SkyWeather = 'clear') {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, SKY_W, SKY_H)!;
  // Já desenhada antes (mesma cidade, horário e clima): só copia (troca instantânea no visualizador)
  const cv = warmSkyline(city, seed, tod, weather);
  tex.getContext().drawImage(cv, 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** Só a imagem da cidade (sem Phaser): usada para conferir os cenários e em miniaturas. */
export function skylineCanvas(city: CitySpec, seed: number, tod: TimeOfDay = 'night', weather: SkyWeather = 'clear') {
  const c = document.createElement('canvas');
  c.width = SKY_W;
  c.height = SKY_H;
  drawSky(c.getContext('2d')!, city, seed, tod, weather);
  return c;
}
