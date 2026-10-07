import { TEAMS } from '../config';

/** Estado central da partida. Tudo que o HUD mostra sai daqui. */
export interface QbStats {
  comp: number;
  att: number;
  yards: number;
  td: number;
  int: number;
}

export class GameState {
  score = { home: 14, away: 10 };
  /** Retrospecto da temporada (vitórias-derrotas). */
  record = { home: [4, 2], away: [2, 3] };
  quarter = 3;
  /** Relógio do quarto, em segundos. */
  clock = 8 * 60 + 42;
  /** Play clock (segundos para dar o snap). */
  playClock = 25;
  down = 2;
  distance = 7;
  /** Linha de scrimmage em jardas (0 = nossa linha de gol, 100 = a deles). */
  los = 35;
  possession: 'home' | 'away' = 'home';
  qb = { number: 12, level: 'ROOKIE', ovr: 68 };
  stats: QbStats = { comp: 0, att: 0, yards: 0, td: 0, int: 0 };
  /** Confiança do QB (0–5). */
  confidence = 3;
  xp = 0;
  /** Vento: direção em graus (0 = a favor, rumo à end zone) e intensidade (mph). */
  wind = { dir: 0, mph: 6 };

  get firstDownLine() {
    return Math.min(100, this.los + this.distance);
  }

  /** "2ª & 7", "1ª & GOL"... */
  get downText() {
    const goal = this.los + this.distance >= 100;
    return `${this.down}ª & ${goal ? 'GOL' : this.distance}`;
  }

  /** "NO SEU 35", "NO DELES 20", "NO MEIO". */
  get spotText() {
    if (this.los === 50) return 'NO MEIO';
    return this.los < 50 ? `NO SEU ${Math.round(this.los)}` : `NO DELES ${Math.round(100 - this.los)}`;
  }

  get quarterText() {
    return `${this.quarter}º QUARTO`;
  }

  get clockText() {
    const m = Math.floor(this.clock / 60);
    const s = Math.floor(this.clock % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  recordText(side: 'home' | 'away') {
    return this.record[side].join('-');
  }

  teamAbbr(side: 'home' | 'away') {
    return TEAMS[side].abbr;
  }
}
