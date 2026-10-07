import type { Rng } from './rng';

/*
 * Campanha dos TOUROS simulada por regras (tela "Defesa" do design).
 * Coordenadas: as NOSSAS jardas (0 = nossa linha de gol). Eles atacam rumo ao 0.
 * Cada jogada: corrida ou passe (completo, incompleto, sack da sua defesa, INT),
 * e na 4ª descida: field goal no alcance, punt, ou tenta perto da end zone.
 */

export interface DriveRow {
  down: string;
  spot: string;
  text: string;
  /** good = bom para você (verde), end = fim da campanha (amarelo). */
  tone: 'normal' | 'good' | 'end' | 'bad';
  /** Posição da bola depois da jogada (nossas jardas). */
  y: number;
}

export interface DriveResult {
  rows: DriveRow[];
  points: number;
  /** Onde você recebe a bola (nossas jardas). */
  ourLos: number;
  seconds: number;
  /** Texto final: "LOBOS NA SUA 12 · 1ª & 10". */
  head: string;
  start: number;
}

export function spotName(y: number, homeAbbr: string, awayAbbr: string) {
  const v = Math.round(y);
  if (v === 50) return 'MEIO';
  return v < 50 ? `${homeAbbr} ${v}` : `${awayAbbr} ${100 - v}`;
}

export function simulateDrive(start: number, rng: Rng, home = 'LOB', away = 'TOU', teamName = 'TOUROS', edge = 0): DriveResult {
  const w = 1 - 0.5 * edge; // largura das jogadas ruins para eles
  const gm = 1 + 0.25 * edge; // ganho das jogadas boas
  const rows: DriveRow[] = [];
  let y = start;
  let down = 1;
  let dist = 10;
  let seconds = 0;
  let points = 0;
  let ourLos = 25;
  const sp = (v: number) => spotName(v, home, away);
  const dd = () => `${down}ª & ${y - dist <= 0 ? 'GOL' : dist}`;

  for (let n = 0; n < 16; n++) {
    const label = dd();
    const at = sp(y);
    seconds += rng.int(10, 20);

    // 4ª descida: decide
    if (down === 4) {
      const fgDist = Math.round(y + 17);
      if (fgDist <= 52) {
        const ok = rng.chance(Math.max(0.35, 1.02 - fgDist * 0.012));
        rows.push({ down: label, spot: at, text: ok ? `FIELD GOAL DE ${fgDist} JDS · +3` : `ERROU O FIELD GOAL DE ${fgDist}`, tone: ok ? 'bad' : 'good', y });
        if (ok) points = 3;
        ourLos = ok ? 25 : Math.max(20, Math.round(y + 7));
        break;
      }
      if (dist > 2 || y > 45) {
        const kick = rng.int(38, 50);
        const land = y - kick;
        ourLos = land <= 0 ? 20 : Math.max(5, Math.round(land + rng.int(0, 9)));
        rows.push({ down: label, spot: at, text: `PUNT DOS ${teamName}`, tone: 'end', y });
        break;
      }
    }

    // Jogada
    const r = rng.next();
    let gain = 0;
    let text: string;
    let tone: DriveRow['tone'] = 'normal';
    let turnover = false;
    if (r < 0.42) {
      gain = Math.round((rng.range(-2, 8) + (rng.chance(0.08) ? rng.range(8, 25) : 0)) * gm);
      text = gain >= 10 ? `CORRIDA LONGA · +${gain} JDS` : gain > 3 ? `CORRIDA PELO MEIO · +${gain} JDS` : gain > 0 ? `CORRIDA CURTA · +${gain} JDS` : `PARADO NA LINHA · ${gain} JDS`;
      if (gain <= 0) tone = 'good';
    } else if (r < 0.42 + 0.05 * w) {
      gain = -rng.int(5, 9);
      text = `SACK DA SUA DEFESA! ${gain} JDS`;
      tone = 'good';
    } else if (r < 0.42 + 0.085 * w) {
      turnover = true;
      text = 'INTERCEPTAÇÃO DA SUA DEFESA!';
      tone = 'good';
    } else if (r < 0.42 + 0.1 * w) {
      turnover = true;
      text = 'FUMBLE! SUA DEFESA RECUPEROU';
      tone = 'good';
    } else if (r < 0.66) {
      text = 'PASSE INCOMPLETO';
    } else {
      gain = Math.round((rng.range(4, 14) + (rng.chance(0.12) ? rng.range(10, 35) : 0)) * gm);
      text = `PASSE COMPLETO · +${gain} JDS`;
      if (gain >= 20) tone = 'bad';
    }
    if (turnover) {
      rows.push({ down: label, spot: at, text, tone, y });
      ourLos = Math.max(1, Math.min(99, Math.round(y)));
      break;
    }
    y -= gain;
    if (y <= 0) {
      points = 7;
      rows.push({ down: label, spot: at, text: `${text.split(' ·')[0]} · TOUCHDOWN DOS ${teamName}`, tone: 'bad', y: 0 });
      ourLos = 25;
      break;
    }
    rows.push({ down: label, spot: at, text, tone, y });
    if (gain >= dist) {
      down = 1;
      dist = Math.min(10, Math.ceil(y));
    } else {
      dist -= gain;
      down++;
      if (down > 4) {
        rows.push({ down: '4ª', spot: sp(y), text: 'PARADOS NA 4ª DESCIDA!', tone: 'good', y });
        ourLos = Math.round(y);
        break;
      }
    }
  }
  return { rows, points, ourLos, seconds, head: '', start };
}
