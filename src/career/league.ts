import { rng } from '../combine/scoring';
import { TeamRepository, type CareerTeam } from '../data/TeamRepository';
import { getSave, seasonTag } from '../player/PlayerSave';
import { careerTeam, roster, type RosterPlayer } from './season';

/*
 * Liga da carreira: conferências QAC/QNC e divisões LESTE/NORTE/SUL/OESTE (a ordem do registro de times
 * segue a NFL: 4 times por divisão, as 4 primeiras divisões são da QAC). Os jogos dos outros times são
 * simulados com semente semana a semana; cada jogo gera um box score por jogador, de onde saem as
 * estatísticas de jogadores, de times, a classificação e o chaveamento dos playoffs.
 */

export const CONFS = ['QAC', 'QNC'] as const;
export const DIVS = ['LESTE', 'NORTE', 'SUL', 'OESTE'] as const;
export const PLAYOFF_SPOTS = 7;

/** Conferência (0 QAC, 1 QNC), divisão global (0-7) e nomes. */
export function divisionOf(team: CareerTeam) {
  const i = TeamRepository.all().findIndex((t) => t.id === team.id);
  const div = Math.floor(i / 4);
  const conf = Math.min(1, Math.floor(div / 4));
  return { conf, div, confName: CONFS[conf], divName: DIVS[div % 4], full: `${CONFS[conf]} ${DIVS[div % 4]}` };
}

/** Linha de estatística de um jogador (tudo opcional = 0). */
export interface StatLine {
  gp: number;
  cmp: number;
  att: number;
  pyds: number;
  ptd: number;
  int: number;
  sk: number;
  ratt: number;
  ryds: number;
  rtd: number;
  rec: number;
  tgt: number;
  yds: number;
  td: number;
  lng: number;
  tck: number;
  sacks: number;
  dint: number;
  ff: number;
  fgm: number;
  fga: number;
  xpm: number;
}
export const emptyLine = (): StatLine => ({ gp: 0, cmp: 0, att: 0, pyds: 0, ptd: 0, int: 0, sk: 0, ratt: 0, ryds: 0, rtd: 0, rec: 0, tgt: 0, yds: 0, td: 0, lng: 0, tck: 0, sacks: 0, dint: 0, ff: 0, fgm: 0, fga: 0, xpm: 0 });

export interface LeagueGame {
  week: number;
  home: string;
  away: string;
  hs: number;
  as: number;
  /** Jogo do seu time (placar e linha do QB vêm do save). */
  mine: boolean;
}

export interface TeamSeason {
  team: CareerTeam;
  w: number;
  l: number;
  t: number;
  pf: number;
  pa: number;
  /** Retrospecto dentro da divisão e da conferência. */
  divW: number;
  divL: number;
  confW: number;
  confL: number;
  home: [number, number];
  away: [number, number];
  /** Sequência atual: "V3", "D1"... */
  streak: string;
  last: ('V' | 'D' | 'E')[];
  passYds: number;
  rushYds: number;
  passYdsAllowed: number;
  rushYdsAllowed: number;
  sacks: number;
  takeaways: number;
  giveaways: number;
  proj: number;
  conf: number;
  div: number;
}

export interface LeaguePlayer extends RosterPlayer {
  team: CareerTeam;
  season: StatLine;
  log: { week: number; opp: string; home: boolean; us: number; them: number; line: StatLine }[];
}

export interface League {
  games: LeagueGame[];
  teams: Map<string, TeamSeason>;
  players: LeaguePlayer[];
  byId: Map<string, LeaguePlayer>;
  weeksPlayed: number;
}

/** Placar simulado (o time mais forte vence mais vezes, com azar possível). */
export function simScore(r: () => number, a: CareerTeam, b: CareerTeam, homeEdge: number): [number, number] {
  const drive = () => [0, 0, 3, 3, 7, 7, 7][Math.floor(r() * 7)];
  const pts = (t: CareerTeam) => Array.from({ length: 4 + Math.floor((t.ovr - 70) / 8) + Math.floor(r() * 3) }, drive).reduce((x, y) => x + y, 0);
  let sa = pts(a);
  let sb = pts(b);
  const pA = 1 / (1 + Math.exp(-(a.ovr + homeEdge - b.ovr) / 6));
  const aWins = r() < pA;
  if (aWins !== sa > sb) [sa, sb] = [sb, sa];
  if (sa === sb) aWins ? (sa += 3) : (sb += 3);
  return [sa, sb];
}

const pick = <T>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Divide `total` em partes inteiras pelos pesos (com ruído). */
function split(r: () => number, total: number, weights: number[]) {
  const w = weights.map((x) => x * (0.6 + r() * 0.8));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const out = w.map((x) => Math.floor((total * x) / sum));
  let rest = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i = (i + 1) % out.length, rest--) out[i]++;
  return out;
}

/** Sorteia `n` eventos entre os índices pelos pesos. */
function scatter(r: () => number, n: number, weights: number[]) {
  const out = weights.map(() => 0);
  const sum = weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < n; k++) {
    let x = r() * sum;
    let i = 0;
    while (x > weights[i]) x -= weights[i++];
    out[Math.min(i, out.length - 1)]++;
  }
  return out;
}

interface Offense {
  qb: { cmp: number; att: number; yds: number; td: number; int: number; sk: number };
  rushTd: number;
}

/** Linha ofensiva de um time num jogo (pelos pontos). `real` = linha do QB vinda da partida jogada. */
function offenseFor(r: () => number, team: CareerTeam, pts: number, real?: { comp: number; att: number; yards: number; td: number; int: number; sacks: number }): Offense {
  const tds = Math.max(0, Math.round(pts / 7.4));
  if (real) return { qb: { cmp: real.comp, att: real.att, yds: real.yards, td: real.td, int: real.int, sk: real.sacks }, rushTd: Math.max(0, Math.min(3, tds - real.td)) };
  const att = clampInt(27 + r() * 13, 18, 48);
  const pct = 0.55 + r() * 0.14 + (team.ovr - 80) / 200;
  const cmp = clampInt(att * pct, 8, att);
  const yds = clampInt(cmp * (9.5 + r() * 3.5) + (pts - 20) * 2, 60, 480);
  const td = Math.min(tds, clampInt(tds * (0.55 + r() * 0.3), 0, 5));
  const int = r() < 0.42 ? (r() < 0.25 ? 2 : 1) : 0;
  const sk = clampInt(r() * 4.4, 0, 6);
  return { qb: { cmp, att, yds, td, int, sk }, rushTd: Math.max(0, Math.min(3, tds - td)) };
}

/** Box score de um time num jogo: linha de cada jogador do elenco. */
function boxFor(r: () => number, team: CareerTeam, pts: number, off: Offense, oppOff: Offense, players: RosterPlayer[]) {
  const by = (pos: string, n = 0) => players.filter((p) => p.pos === pos)[n];
  const lines = new Map<string, StatLine>();
  const L = (p: RosterPlayer | undefined) => {
    if (!p) return emptyLine();
    let l = lines.get(p.id);
    if (!l) lines.set(p.id, (l = { ...emptyLine(), gp: 1 }));
    return l;
  };
  for (const p of players) L(p);
  const qb = L(by('QB'));
  Object.assign(qb, { cmp: off.qb.cmp, att: off.qb.att, pyds: off.qb.yds, ptd: off.qb.td, int: off.qb.int, sk: off.qb.sk });
  // QB também corre um pouco
  qb.ratt = clampInt(r() * 5, 0, 8);
  qb.ryds = clampInt(qb.ratt * (2 + r() * 4), 0, 60);
  // Recebedores: dividem passes completos, jardas e TDs do QB
  const recv = [by('WR', 0), by('WR', 1), by('TE'), by('RB')];
  const recW = [0.34, 0.27, 0.22, 0.17];
  const rec = split(r, off.qb.cmp, recW);
  const yds = split(r, off.qb.yds, [0.38, 0.28, 0.22, 0.12]);
  const tds = scatter(r, off.qb.td, [0.38, 0.27, 0.25, 0.1]);
  recv.forEach((p, i) => {
    const l = L(p);
    l.rec = rec[i];
    l.tgt = rec[i] + clampInt(r() * 3 + (off.qb.att - off.qb.cmp) * recW[i], 0, 12);
    l.yds = yds[i];
    l.td = tds[i];
    l.lng = rec[i] ? clampInt(yds[i] / rec[i] + r() * (yds[i] / Math.max(1, rec[i])) * 2.2, 3, 92) : 0;
  });
  // RB: corridas
  const rb = L(by('RB'));
  rb.ratt = clampInt(13 + r() * 11 + (pts - 20) / 4, 6, 32);
  rb.ryds = clampInt(rb.ratt * (3.2 + r() * 2.4 + (team.ovr - 80) / 40), 8, 220);
  rb.rtd = off.rushTd;
  // Defesa: tackles, e os sacks/INTs que o QB adversário sofreu
  const dl = L(by('DL'));
  const lb = L(by('LB'));
  const cb = L(by('CB'));
  const sf = L(by('S'));
  dl.tck = clampInt(2 + r() * 4, 0, 9);
  lb.tck = clampInt(6 + r() * 6, 2, 15);
  cb.tck = clampInt(2 + r() * 5, 0, 9);
  sf.tck = clampInt(3 + r() * 6, 1, 12);
  const sk = scatter(r, oppOff.qb.sk, [0.6, 0.3, 0.02, 0.08]);
  [dl, lb, cb, sf].forEach((l, i) => (l.sacks = sk[i]));
  const it = scatter(r, oppOff.qb.int, [0.02, 0.18, 0.45, 0.35]);
  [dl, lb, cb, sf].forEach((l, i) => (l.dint = it[i]));
  if (r() < 0.22) (r() < 0.5 ? dl : lb).ff++;
  // K: FGs e pontos extras
  const k = L(by('K'));
  const allTd = off.qb.td + off.rushTd;
  k.xpm = allTd;
  k.fgm = Math.max(0, Math.round((pts - allTd * 7) / 3));
  k.fga = k.fgm + (r() < 0.25 ? 1 : 0);
  return lines;
}

const add = (a: StatLine, b: StatLine) => {
  for (const k of Object.keys(a) as (keyof StatLine)[]) a[k] = k === 'lng' ? Math.max(a[k], b[k]) : a[k] + b[k];
};

let memo: { key: string; league: League } | null = null;

/** Liga inteira até a semana atual (memorizada; recalcula quando o save muda). */
export function league(): League {
  const s = getSave();
  const me = careerTeam();
  const key = JSON.stringify([s.name, s.career.season, me.id, s.career.week, s.career.schedule.map((g) => g.result && [g.result.us, g.result.them, g.stats]), s.attrs, s.face, s.skin, s.hair, s.hairColor, s.beard]);
  if (memo?.key === key) return memo.league;

  const all = TeamRepository.all();
  const rosters = new Map(all.map((t) => [t.id, roster(t)]));
  const players: LeaguePlayer[] = [];
  const byId = new Map<string, LeaguePlayer>();
  for (const t of all)
    for (const p of rosters.get(t.id)!) {
      const lp: LeaguePlayer = { ...p, team: t, season: emptyLine(), log: [] };
      players.push(lp);
      byId.set(p.id, lp);
    }

  const ts = new Map<string, TeamSeason>(
    all.map((t) => {
      const d = divisionOf(t);
      const proj = Math.round(Math.max(20, Math.min(95, 50 + (t.ovr - 75) * 2.6)));
      return [t.id, { team: t, w: 0, l: 0, t: 0, pf: 0, pa: 0, divW: 0, divL: 0, confW: 0, confL: 0, home: [0, 0], away: [0, 0], streak: '–', last: [], passYds: 0, rushYds: 0, passYdsAllowed: 0, rushYdsAllowed: 0, sacks: 0, takeaways: 0, giveaways: 0, proj, conf: d.conf, div: d.div }];
    }),
  );

  const games: LeagueGame[] = [];
  let weeksPlayed = 0;
  for (const g of s.career.schedule) {
    if (g.week >= s.career.week) continue;
    weeksPlayed = g.week;
    const r = rng(`league-${seasonTag()}-${me.id}-${g.week}`);
    const busy = new Set([me.id]);
    if (g.opp && g.result) {
      games.push(g.home ? { week: g.week, home: me.id, away: g.opp, hs: g.result.us, as: g.result.them, mine: true } : { week: g.week, home: g.opp, away: me.id, hs: g.result.them, as: g.result.us, mine: true });
      busy.add(g.opp);
    }
    const pool = all.filter((t) => !busy.has(t.id)).sort(() => r() - 0.5);
    for (let i = 0; i + 1 < pool.length; i += 2) {
      const [hs, as] = simScore(r, pool[i], pool[i + 1], 1.5);
      games.push({ week: g.week, home: pool[i].id, away: pool[i + 1].id, hs, as, mine: false });
    }
  }

  for (const g of games) {
    const r = rng(`box-${seasonTag()}-${g.week}-${g.home}-${g.away}`);
    const H = TeamRepository.get(g.home);
    const A = TeamRepository.get(g.away);
    const mineLine = g.mine ? s.career.schedule.find((x) => x.week === g.week)?.stats : undefined;
    const offH = offenseFor(r, H, g.hs, g.mine && H.id === me.id ? mineLine : undefined);
    const offA = offenseFor(r, A, g.as, g.mine && A.id === me.id ? mineLine : undefined);
    for (const [t, o, oo, us, them, home] of [[H, offH, offA, g.hs, g.as, true], [A, offA, offH, g.as, g.hs, false]] as const) {
      const box = boxFor(r, t, us, o, oo, rosters.get(t.id)!);
      const opp = home ? A : H;
      for (const [id, line] of box) {
        const p = byId.get(id)!;
        add(p.season, line);
        p.log.push({ week: g.week, opp: opp.id, home, us, them, line });
      }
      // Time
      const x = ts.get(t.id)!;
      const res: 'V' | 'D' | 'E' = us > them ? 'V' : us < them ? 'D' : 'E';
      if (res === 'V') x.w++;
      else if (res === 'D') x.l++;
      else x.t++;
      x.pf += us;
      x.pa += them;
      const od = divisionOf(opp);
      if (od.div === x.div) res === 'V' ? x.divW++ : res === 'D' && x.divL++;
      if (od.conf === x.conf) res === 'V' ? x.confW++ : res === 'D' && x.confL++;
      const ha = home ? x.home : x.away;
      if (res === 'V') ha[0]++;
      else if (res === 'D') ha[1]++;
      x.last.push(res);
      const rush = [...box.values()].reduce((a, l) => a + l.ryds, 0);
      x.passYds += o.qb.yds;
      x.rushYds += rush;
      x.passYdsAllowed += oo.qb.yds;
      x.sacks += oo.qb.sk;
      x.takeaways += oo.qb.int;
      x.giveaways += o.qb.int;
    }
  }
  // Jardas de corrida cedidas = jardas de corrida do adversário
  for (const g of games) {
    const h = ts.get(g.home)!;
    const a = ts.get(g.away)!;
    const rushOf = (id: string) => players.filter((p) => p.team.id === id).reduce((acc, p) => acc + (p.log.find((l) => l.week === g.week)?.line.ryds ?? 0), 0);
    h.rushYdsAllowed += rushOf(g.away);
    a.rushYdsAllowed += rushOf(g.home);
  }
  for (const x of ts.values()) {
    if (!x.last.length) continue;
    const lastR = x.last[x.last.length - 1];
    let n = 0;
    for (let i = x.last.length - 1; i >= 0 && x.last[i] === lastR; i--) n++;
    x.streak = `${lastR}${n}`;
    x.last = x.last.slice(-5);
  }
  const lg = { games, teams: ts, players, byId, weeksPlayed };
  memo = { key, league: lg };
  return lg;
}

/** % de vitórias (empate vale meia). */
export const pct = (x: TeamSeason) => (x.w + x.l + x.t ? (x.w + x.t / 2) / (x.w + x.l + x.t) : 0);

/** Ordena times: % de vitórias, saldo, projeção. */
export const rankTeams = (rows: TeamSeason[]) => [...rows].sort((a, b) => pct(b) - pct(a) || b.w - a.w || a.l - b.l || b.pf - b.pa - (a.pf - a.pa) || b.proj - a.proj);

/** Classificação de uma divisão (0-7). */
export function divisionTable(div: number) {
  return rankTeams([...league().teams.values()].filter((x) => x.div === div));
}

/** Chaveamento da conferência: líderes de divisão (1-4) e wild cards (5-7), depois o resto. */
export function conferenceSeeds(conf: number) {
  const leaders = rankTeams([0, 1, 2, 3].map((d) => divisionTable(conf * 4 + d)[0]));
  const rest = rankTeams([...league().teams.values()].filter((x) => x.conf === conf && !leaders.includes(x)));
  return [...leaders.map((x) => ({ x, kind: 'div' as const })), ...rest.map((x, i) => ({ x, kind: i < PLAYOFF_SPOTS - 4 ? ('wc' as const) : ('out' as const) }))];
}

/** Ranking (1 = melhor) de um time numa métrica. `low` = menor é melhor. */
export function teamRank(id: string, metric: (x: TeamSeason) => number, low = false) {
  const rows = [...league().teams.values()].sort((a, b) => (low ? metric(a) - metric(b) : metric(b) - metric(a)));
  return rows.findIndex((x) => x.team.id === id) + 1;
}
