import { rng } from '../combine/scoring';
import { TeamRepository } from '../data/TeamRepository';
import { getSave } from '../player/PlayerSave';
import { conferenceSeeds, PLAYOFF_SPOTS, simScore } from './league';
import { careerTeam } from './season';

/*
 * Playoffs da QFL (como na NFL): 7 times por conferência. Round One (Wild Card): 2x7, 3x6, 4x5 e o
 * 1º folga. Round Two (Divisional): o 1º pega o pior seed que sobrou; os outros dois se enfrentam.
 * Semi Bowl: final da conferência. QFL Bowl: campeões da QAC e da QNC em campo neutro.
 * Em cada jogo, o time com o melhor seed joga em casa. Os seus jogos vêm do save; os outros são
 * simulados com semente. Enquanto o seu jogo de uma fase não acontece, a fase fica "a jogar".
 */

export type Round = 'wc' | 'div' | 'conf' | 'final';
export const ROUNDS: Round[] = ['wc', 'div', 'conf', 'final'];

export const ROUND_INFO: Record<Round, { name: string; sub: string; logo: string; logoS: string; week: number; when: string; color: number; glow: number }> = {
  wc: { name: 'ROUND ONE', sub: 'WILD CARD', logo: 'logoPoR1', logoS: 'logoPoR1S', week: 11, when: 'SÁB 20:15', color: 0x1f7a44, glow: 0xe8a33d },
  div: { name: 'ROUND TWO', sub: 'DIVISIONAL', logo: 'logoPoR2', logoS: 'logoPoR2S', week: 12, when: 'DOM 16:30', color: 0x1f5f8b, glow: 0xffc93c },
  conf: { name: 'SEMI BOWL', sub: 'FINAL DE CONFERÊNCIA', logo: 'logoPoSemi', logoS: 'logoPoSemiS', week: 13, when: 'DOM 18:30', color: 0x5b2a9e, glow: 0xe8b84a },
  final: { name: 'QFL BOWL', sub: 'A GRANDE FINAL', logo: 'logoQflBowl', logoS: 'logoQflBowlS', week: 14, when: 'DOM 19:30', color: 0xc8102e, glow: 0xffd23f },
};

export interface PGame {
  round: Round;
  /** 0 QAC, 1 QNC, -1 = final. */
  conf: number;
  /** Mandante e visitante ('' = ainda indefinido). */
  home: string;
  away: string;
  seedH: number;
  seedA: number;
  hs?: number;
  as?: number;
  /** done = jogado; pending = a jogar nesta fase; tbd = depende de jogos anteriores. */
  status: 'done' | 'pending' | 'tbd';
  mine: boolean;
  winner?: string;
}

export interface Bracket {
  /** Seeds 1..7 de cada conferência (ids). */
  seeds: [string[], string[]];
  games: Record<Round, PGame[]>;
  /** Temporada regular ainda em andamento: chaveamento é projeção pela tabela atual. */
  projected: boolean;
  /** Situação do seu time. */
  me: { status: 'season' | 'out' | 'alive' | 'eliminated' | 'champion'; seed?: number; conf: number; round?: Round; next?: PGame };
}

let memo: { key: string; b: Bracket } | null = null;

export function bracket(): Bracket {
  const s = getSave();
  const me = careerTeam().id;
  const key = JSON.stringify([s.name, me, s.career.week, s.career.schedule.map((g) => g.result), s.career.post]);
  if (memo?.key === key) return memo.b;
  const projected = !s.career.schedule.length || s.career.schedule.some((g) => g.opp && !g.result);
  const seeds = [0, 1].map((c) => conferenceSeeds(c).slice(0, PLAYOFF_SPOTS).map((r) => r.x.team.id)) as [string[], string[]];
  const seedOf = (id: string) => {
    for (const c of [0, 1]) {
      const i = seeds[c].indexOf(id);
      if (i >= 0) return i + 1;
    }
    return 99;
  };
  const myConf = seeds[0].includes(me) ? 0 : seeds[1].includes(me) ? 1 : -1;
  const post = s.career.post ?? {};
  const games: Record<Round, PGame[]> = { wc: [], div: [], conf: [], final: [] };

  /** Um jogo: mandante = melhor seed (na final, o campeão da QAC é o mandante designado). */
  const play = (round: Round, conf: number, a: string, b: string, blocked: boolean): PGame => {
    if (!a || !b) return { round, conf, home: a || '', away: b || '', seedH: a ? seedOf(a) : 0, seedA: b ? seedOf(b) : 0, status: 'tbd', mine: false };
    const [h, w] = round === 'final' ? [a, b] : seedOf(a) <= seedOf(b) ? [a, b] : [b, a];
    const g: PGame = { round, conf, home: h, away: w, seedH: seedOf(h), seedA: seedOf(w), status: 'pending', mine: h === me || w === me };
    if (projected) return g;
    if (g.mine) {
      const p = post[round];
      if (p?.result) {
        const meHome = h === me;
        g.hs = meHome ? p.result.us : p.result.them;
        g.as = meHome ? p.result.them : p.result.us;
        g.status = 'done';
      }
    } else if (!blocked) {
      const r = rng(`po-${s.name}-${me}-${round}-${h}-${w}`);
      [g.hs, g.as] = simScore(r, TeamRepository.get(h), TeamRepository.get(w), 1.5);
      g.status = 'done';
    }
    // Empate nos playoffs: o mandante (melhor seed) avança
    if (g.status === 'done') g.winner = g.as! > g.hs! ? w : h;
    return g;
  };
  // A fase em que o seu jogo ainda não aconteceu fica "a jogar" para todo mundo
  const myPendingIn = (round: Round, pairs: [string, string][]) => !projected && pairs.some(([a, b]) => (a === me || b === me) && !post[round]?.result);

  // Round One
  const wcPairs: [number, [string, string]][] = [];
  for (const c of [0, 1]) for (const [x, y] of [[2, 7], [3, 6], [4, 5]]) wcPairs.push([c, [seeds[c][x - 1] ?? '', seeds[c][y - 1] ?? '']]);
  const wcBlocked = myPendingIn('wc', wcPairs.map((p) => p[1]));
  for (const [c, [a, b]] of wcPairs) games.wc.push(play('wc', c, a, b, wcBlocked));
  // Round Two
  const divPairs: [number, [string, string]][] = [];
  for (const c of [0, 1]) {
    const ws = games.wc.filter((g) => g.conf === c).map((g) => g.winner);
    if (ws.some((w) => !w)) {
      divPairs.push([c, ['', '']], [c, ['', '']]);
      continue;
    }
    const left = [seeds[c][0], ...(ws as string[])].sort((x, y) => seedOf(x) - seedOf(y));
    divPairs.push([c, [left[0], left[3]]], [c, [left[1], left[2]]]);
  }
  const divBlocked = myPendingIn('div', divPairs.map((p) => p[1]));
  for (const [c, [a, b]] of divPairs) games.div.push(play('div', c, a, b, divBlocked));
  // Semi Bowl
  const confPairs: [number, [string, string]][] = [0, 1].map((c) => {
    const ws = games.div.filter((g) => g.conf === c).map((g) => g.winner ?? '');
    return [c, [ws[0], ws[1]] as [string, string]];
  });
  const confBlocked = myPendingIn('conf', confPairs.map((p) => p[1]));
  for (const [c, [a, b]] of confPairs) games.conf.push(play('conf', c, a, b, confBlocked));
  // QFL Bowl
  const champs: [string, string] = [games.conf[0].winner ?? '', games.conf[1].winner ?? ''];
  games.final.push(play('final', -1, champs[0], champs[1], false));

  // Sua situação
  let st: Bracket['me'] = { status: projected ? 'season' : myConf < 0 ? 'out' : 'alive', conf: Math.max(0, myConf), seed: myConf >= 0 ? seedOf(me) : undefined };
  if (!projected && myConf >= 0) {
    for (const r of ROUNDS) {
      const g = games[r].find((x) => x.home === me || x.away === me);
      if (!g) continue;
      if (g.status === 'pending' || g.status === 'tbd') {
        st = { ...st, status: 'alive', round: r, next: g.status === 'pending' ? g : undefined };
        break;
      }
      if (g.winner !== me) {
        st = { ...st, status: 'eliminated', round: r };
        break;
      }
      if (r === 'final') st = { ...st, status: 'champion', round: r };
    }
  }
  const b: Bracket = { seeds, games, projected, me: st };
  memo = { key, b };
  return b;
}
