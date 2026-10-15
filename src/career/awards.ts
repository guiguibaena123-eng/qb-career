import { rng } from '../combine/scoring';
import { TeamRepository } from '../data/TeamRepository';
import { getSave, seasonTag, type SeasonAward } from '../player/PlayerSave';
import { league, type LeaguePlayer, type StatLine } from './league';
import { bracket } from './playoffs';
import { careerTeam, coachOf, passerRating, roster } from './season';

/*
 * Prêmios da temporada (calculados da liga simulada, sem nada escrito à mão): MVP, Ofensivo do Ano,
 * Defensivo do Ano, Novato Ofensivo, Novato Defensivo, Retorno do Ano e Técnico do Ano, quando a
 * temporada regular termina; e o MVP da Final, depois do QFL Bowl. Mesma semente = mesmo vencedor.
 */

export interface AwardWinner {
  name: string;
  teamId: string;
  team: string;
  abbr: string;
  logo: string;
  pos: string;
  /** Linha de estatística que justifica o prêmio. */
  line: string;
  /** Foi você. */
  me: boolean;
  /** Do seu time. */
  mine: boolean;
}

export interface Award {
  id: string;
  name: string;
  winner: AwardWinner | null;
  /** Os dois seguintes na votação. */
  runners: AwardWinner[];
}

const OFF = ['QB', 'RB', 'WR', 'TE'];
const DEF = ['DL', 'LB', 'CB', 'S'];

const offScore = (l: StatLine) => l.pyds * 0.04 + l.ptd * 4 - l.int * 2 + l.ryds * 0.1 + l.rtd * 6 + l.yds * 0.1 + l.td * 6;
const defScore = (l: StatLine) => l.sacks * 4 + l.dint * 6 + l.tck * 0.35 + l.ff * 3;
/** Produção da temporada, ofensiva ou defensiva conforme a posição. */
const prodOf = (p: LeaguePlayer) => (OFF.includes(p.pos) ? offScore(p.season) : defScore(p.season));

/** Produção de cada jogador na temporada (gravada no save ao virar o ano, base do Retorno do Ano). */
export function productionSnapshot(): Record<string, number> {
  const out: Record<string, number> = {};
  if (!awardsReady()) return out;
  for (const p of league().players) if (p.season.gp > 0 && (OFF.includes(p.pos) || DEF.includes(p.pos))) out[p.id] = Math.round(prodOf(p) * 10) / 10;
  return out;
}

/** Temporada regular concluída: todos os seus jogos têm resultado. */
export function awardsReady() {
  const sch = getSave().career.schedule;
  return sch.length > 0 && sch.every((g) => !g.opp || g.result);
}

function lineOf(p: LeaguePlayer, kind: 'off' | 'def') {
  const l = p.season;
  if (kind === 'def') return `${l.tck} TACKLES · ${l.sacks} SACKS · ${l.dint} INT`;
  if (p.pos === 'QB') return `${l.cmp}/${l.att} · ${l.pyds.toLocaleString('pt-BR')} JD · ${l.ptd} TD · ${l.int} INT`;
  if (p.pos === 'RB') return `${l.ryds} JD CORRIDOS · ${l.rtd} TD · ${l.rec} REC`;
  return `${l.rec} REC · ${l.yds} JD · ${l.td} TD`;
}

function winnerOf(p: LeaguePlayer, kind: 'off' | 'def', extra = ''): AwardWinner {
  const mine = p.team.id === careerTeam().id;
  return { name: p.me ? `${p.name} (VOCÊ)` : p.name, teamId: p.team.id, team: p.team.name, abbr: p.team.abbr, logo: p.team.logo.small, pos: p.pos, line: lineOf(p, kind) + extra, me: !!p.me, mine };
}

/** Os prêmios da temporada regular (vazio até a temporada regular acabar). */
export function seasonAwards(): Award[] {
  if (!awardsReady()) return [];
  const lg = league();
  const season = getSave().career.season || 1;
  const wins = (p: LeaguePlayer) => lg.teams.get(p.team.id)?.w ?? 0;
  const played = lg.players.filter((p) => p.season.gp > 0);
  const rookie = (p: LeaguePlayer) => (p.me ? season === 1 : p.age <= 23);
  const top = <T,>(pool: T[], score: (x: T) => number, n = 3) => [...pool].sort((a, b) => score(b) - score(a)).slice(0, n);

  const mvpPool = played.filter((p) => OFF.includes(p.pos) || DEF.includes(p.pos));
  const mvpScore = (p: LeaguePlayer) => (OFF.includes(p.pos) ? offScore(p.season) : defScore(p.season) * 0.7) + wins(p) * 1.2 + (p.pos === 'QB' ? 6 : 0);
  const mvp = top(mvpPool, mvpScore);

  // O MVP não leva também o Ofensivo do Ano: o prêmio vai para o melhor ofensivo depois dele
  const mvpWinner = mvp[0];
  const offPool = played.filter((p) => OFF.includes(p.pos) && p !== mvpWinner);
  const opoy = top(offPool, (p) => offScore(p.season));
  const dpoy = top(played.filter((p) => DEF.includes(p.pos)), (p) => defScore(p.season));
  const oroy = top(played.filter((p) => OFF.includes(p.pos) && rookie(p)), (p) => offScore(p.season));
  const droy = top(played.filter((p) => DEF.includes(p.pos) && rookie(p)), (p) => defScore(p.season));

  // Retorno do Ano: o maior salto de produção sobre a temporada anterior (e um bom ano de fato).
  // Sem registro do ano anterior (1ª temporada), usa uma base esperada pela posição e pelo OVR.
  const prev = getSave().career.prod ?? {};
  const pool = played.filter((p) => OFF.includes(p.pos) || DEF.includes(p.pos));
  const mean = (pos: string) => {
    const xs = pool.filter((p) => p.pos === pos).map(prodOf);
    return xs.length ? Math.max(1, xs.reduce((a, b) => a + b, 0) / xs.length) : 1;
  };
  const means = new Map(['QB', 'RB', 'WR', 'TE', ...DEF].map((pos) => [pos, mean(pos)] as const));
  const before = (p: LeaguePlayer) => {
    if (prev[p.id] !== undefined) return prev[p.id];
    const r = rng(`prev-${p.id}-${season}`)();
    return (means.get(p.pos) ?? 1) * Math.max(0.5, Math.min(1.25, 0.5 + (p.ovr - 60) / 50)) * (0.55 + r * 0.85);
  };
  const leap = (p: LeaguePlayer) => (prodOf(p) - before(p)) / (means.get(p.pos) ?? 1);
  const comeback = top(
    pool.filter((p) => prodOf(p) >= (means.get(p.pos) ?? 1) * 0.7),
    leap,
  );
  const leapText = (p: LeaguePlayer) => {
    const b = before(p);
    const pc = Math.round(((prodOf(p) - b) / Math.max(5, b)) * 100);
    return ` · PRODUÇÃO ${pc >= 0 ? '+' : ''}${Math.min(pc, 999)}% SOBRE O ANO ANTERIOR`;
  };

  const award = (id: string, name: string, list: LeaguePlayer[], kind: 'off' | 'def'): Award => ({
    id,
    name,
    winner: list[0] ? winnerOf(list[0], kind) : null,
    runners: list.slice(1, 3).map((p) => winnerOf(p, kind)),
  });

  // Técnico do Ano: vitórias acima do esperado pela força do time, mais o saldo de pontos
  const me = careerTeam();
  const coaches = [...lg.teams.values()]
    .map((t) => {
      const g = t.w + t.l + t.t;
      const score = t.w - (t.proj / 100) * g + (t.pf - t.pa) / 60;
      const c = coachOf(t.team);
      const w: AwardWinner = {
        name: `${c.name} (${c.scheme})`,
        teamId: t.team.id,
        team: t.team.name,
        abbr: t.team.abbr,
        logo: t.team.logo.small,
        pos: 'TÉC',
        line: `${t.w}-${t.l}${t.t ? `-${t.t}` : ''} · SALDO ${t.pf - t.pa > 0 ? '+' : ''}${t.pf - t.pa}`,
        me: false,
        mine: t.team.id === me.id,
      };
      return { w, score };
    })
    .sort((a, b) => b.score - a.score);

  return [
    award('mvp', 'MVP DA LIGA', mvp, mvpWinner && DEF.includes(mvpWinner.pos) ? 'def' : 'off'),
    award('opoy', 'JOGADOR OFENSIVO DO ANO', opoy, 'off'),
    award('dpoy', 'JOGADOR DEFENSIVO DO ANO', dpoy, 'def'),
    award('oroy', 'NOVATO OFENSIVO DO ANO', oroy, 'off'),
    award('droy', 'NOVATO DEFENSIVO DO ANO', droy, 'def'),
    {
      id: 'ret',
      name: 'RETORNO DO ANO',
      winner: comeback[0] ? winnerOf(comeback[0], DEF.includes(comeback[0].pos) ? 'def' : 'off', leapText(comeback[0])) : null,
      runners: comeback.slice(1, 3).map((p) => winnerOf(p, DEF.includes(p.pos) ? 'def' : 'off')),
    },
    { id: 'coach', name: 'TÉCNICO DO ANO', winner: coaches[0]?.w ?? null, runners: coaches.slice(1, 3).map((c) => c.w) },
  ];
}

/** MVP da Final (QFL Bowl): sai do time campeão; null enquanto a final não foi jogada. */
export function finalMvp(): AwardWinner | null {
  const g = bracket().games.final[0];
  if (!g || g.status !== 'done' || !g.winner) return null;
  const mine = careerTeam().id;
  const team = TeamRepository.get(g.winner);
  const r = rng(`fmvp-${seasonTag()}-${g.home}-${g.away}`);
  const players = roster(team).filter((p) => [...OFF, ...DEF].includes(p.pos));
  const post = getSave().career.post?.final;
  const ints = (n: number) => Math.round(n);

  type Cand = { w: number; make: () => string; name: string; pos: string; me: boolean };
  const cands: Cand[] = players.map((p) => {
    if (p.me && post?.stats) {
      const l = post.stats;
      const score = 45 + passerRating(l) * 0.25 + l.td * 4 + l.yards * 0.02 - l.int * 6 + 10;
      return { w: score, name: `${p.name} (VOCÊ)`, pos: p.pos, me: true, make: () => `${l.comp}/${l.att} · ${l.yards} JD · ${l.td} TD · ${l.int} INT` };
    }
    const bonus = p.pos === 'QB' ? 14 : OFF.includes(p.pos) ? 8 : 0;
    const w = p.ovr * 0.4 + r() * 30 + bonus;
    const make = () => {
      if (p.pos === 'QB') {
        const att = ints(24 + r() * 14);
        return `${ints(att * (0.58 + r() * 0.2))}/${att} · ${ints(190 + r() * 150)} JD · ${ints(1 + r() * 3)} TD`;
      }
      if (p.pos === 'RB') return `${ints(14 + r() * 12)} CORRIDAS · ${ints(70 + r() * 90)} JD · ${ints(r() * 2.4)} TD`;
      if (OFF.includes(p.pos)) return `${ints(5 + r() * 6)} REC · ${ints(80 + r() * 90)} JD · ${ints(1 + r() * 1.6)} TD`;
      const sk = ints(r() * 2.6);
      return `${ints(5 + r() * 6)} TACKLES · ${sk} SACKS${r() < 0.4 ? ' · 1 INT' : ''}`;
    };
    return { w, name: p.name, pos: p.pos, me: false, make };
  });
  const best = cands.sort((a, b) => b.w - a.w)[0];
  if (!best) return null;
  return { name: best.name, teamId: team.id, team: team.name, abbr: team.abbr, logo: team.logo.small, pos: best.pos, line: best.make(), me: best.me, mine: team.id === mine };
}

/** Versão enxuta para guardar no resumo da temporada. */
export function awardsRecap(): SeasonAward[] {
  const list = seasonAwards().filter((a) => a.winner);
  const f = finalMvp();
  const out: SeasonAward[] = list.map((a) => ({ id: a.id, name: a.name, winner: a.winner!.name, team: a.winner!.abbr, me: a.winner!.me, mine: a.winner!.mine }));
  if (f) out.push({ id: 'fmvp', name: 'MVP DA FINAL', winner: f.name, team: f.abbr, me: f.me, mine: f.mine });
  return out;
}
