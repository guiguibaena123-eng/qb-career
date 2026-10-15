import type Phaser from 'phaser';
import { careerTeam, nextGame, PRIME } from '../career/season';
import { ROUND_INFO, type Round } from '../career/playoffs';
import { applyMatchup, broadcast, finalGame, matchConfig, matchRecords, playoffLogo, venue } from '../config';
import { league } from '../career/league';
import { TeamRepository } from '../data/TeamRepository';
import { getSave, updateSave } from '../player/PlayerSave';
import type { QbStats } from '../state/GameState';
import { MatchScene } from '../scenes/MatchScene';

/*
 * MatchBridge — camada fina entre a carreira e a partida que já existe (MatchScene).
 * Entrada: o JOGAR do CarreiraMenu põe o time do save (kit escolhido no PERSONALIZAR) contra o
 * adversário da semana e abre uma MatchScene em modo carreira. Saída: no fim de jogo a MatchScene
 * chama finishCareerMatch, que grava placar, stats do QB, XP, confiança, retrospecto, notícia e
 * avança o calendário; depois leaveCareerMatch devolve as escolhas da Partida Rápida e volta ao menu.
 */

export interface CareerMatchResult {
  us: number;
  them: number;
  stats: QbStats;
  xp: number;
  confidence: number;
}

interface Current {
  week: number;
  opp: string;
  home: boolean;
  final: boolean;
  /** Fase dos playoffs (null = temporada regular). */
  round: Round | null;
  done: boolean;
  /** Escolhas da Partida Rápida, devolvidas ao sair. */
  prev: typeof matchConfig;
}

let current: Current | null = null;
let counter = 0;

const KIT_UNI = { home: 0, away: 1, night: 2 } as const;

/** Partida da carreira em andamento (null = Partida Rápida ou treino). */
export const careerMatch = () => current;

/** JOGAR SEMANA N: abre a partida da semana. Devolve false se a temporada acabou. */
export function startCareerMatch(scene: Phaser.Scene): boolean {
  const g = nextGame();
  if (!g?.opp) return false;
  const team = careerTeam();
  const s = getSave();
  current = { week: g.week, opp: g.opp.id, home: g.home, final: !!g.final, round: g.round ?? null, done: false, prev: { ...matchConfig } };
  // QFL Bowl: campo neutro com estádio, torcida e campo da final; playoffs: logo da fase nas 40
  finalGame.on = !!g.final;
  playoffLogo.key = g.round ? ROUND_INFO[g.round].logo : null;
  // Retrospecto de cada time (temporada regular) para o placar
  const rec = (id: string) => {
    const x = league().teams.get(id);
    return x ? `${x.w}-${x.l}${x.t ? `-${x.t}` : ''}` : '';
  };
  matchRecords.home = rec(team.id);
  matchRecords.away = rec(g.opp.id);
  Object.assign(matchConfig, { home: team.id, away: g.opp.id, homeUni: KIT_UNI[s.look.kit], awayUni: null, weather: g.weather, stand: g.final ? 'classica' : 'auto', time: g.tod });
  venue.id = g.final ? null : g.venue;
  broadcast.prime = g.prime ? PRIME[g.prime] : null;
  applyMatchup();
  const key = `Career${++counter}`;
  scene.game.scene.add(key, new MatchScene(key, null, true), false);
  scene.scene.start(key);
  return true;
}

/** Fim de jogo: grava tudo no save (uma vez por partida). */
export function finishCareerMatch(r: CareerMatchResult) {
  if (!current || current.done) return;
  current.done = true;
  const s = getSave();
  const c = s.career;
  const team = careerTeam();
  const opp = TeamRepository.get(current.opp);
  const win = r.us > r.them;
  const tie = r.us === r.them;
  const line = { comp: r.stats.comp, att: r.stats.att, yards: r.stats.yards, td: r.stats.td, int: r.stats.int, sacks: r.stats.sacks };
  const schedule = c.schedule.map((g) => (g.week === current!.week ? { ...g, result: { us: r.us, them: r.them }, stats: line } : g));
  if (current.round) {
    // Playoffs: empate = o mandante (melhor seed) avança
    const rd = current.round;
    const info = ROUND_INFO[rd];
    const adv = r.us > r.them || (r.us === r.them && current.home);
    const news =
      rd === 'final'
        ? adv
          ? `${team.name} SÃO CAMPEÕES DO QFL BOWL! ${r.us} A ${r.them} SOBRE ${opp.name}`
          : `${opp.name} VENCEM O QFL BOWL; ${team.name} FICAM COM O VICE (${r.us} A ${r.them})`
        : adv
          ? `${team.name} AVANÇAM NO ${info.name} (${info.sub}): ${r.us} A ${r.them} SOBRE ${opp.name}`
          : `${team.name} ELIMINADOS NO ${info.name} (${info.sub}) PELOS ${opp.name}: ${r.us} A ${r.them}`;
    updateSave({
      career: {
        ...c,
        post: { ...(c.post ?? {}), [rd]: { opp: opp.id, result: { us: r.us, them: r.them }, stats: line } },
        week: info.week + 1,
        xp: (c.xp ?? 0) + r.xp,
        confidence: r.confidence,
        news: [...c.news, { week: info.week, text: news, body: `${s.name} completou ${line.comp} de ${line.att} passes para ${line.yards} jardas, com ${line.td} TD e ${line.int} INT (${info.sub}).` }],
      },
    });
    return;
  }
  const record = { w: c.record.w + (win ? 1 : 0), l: c.record.l + (!win && !tie ? 1 : 0) };
  const head = win
    ? `${team.name} VENCEM ${opp.name} POR ${r.us} A ${r.them}`
    : tie
      ? `${team.name} E ${opp.name} EMPATAM EM ${r.us} A ${r.them}`
      : `${team.name} PERDEM PARA ${opp.name} POR ${r.them} A ${r.us}`;
  const body = `${s.name} completou ${line.comp} de ${line.att} passes para ${line.yards} jardas, com ${line.td} TD e ${line.int} INT. Retrospecto: ${record.w}-${record.l}.`;
  updateSave({
    career: {
      ...c,
      schedule,
      record,
      week: current.week + 1,
      xp: (c.xp ?? 0) + r.xp,
      confidence: r.confidence,
      news: [...c.news, { week: current.week, text: head, body }],
    },
  });
}

/** Sai da partida da carreira: devolve as escolhas da Partida Rápida e o estádio padrão. */
export function leaveCareerMatch() {
  if (!current) return;
  Object.assign(matchConfig, current.prev);
  venue.id = null;
  broadcast.prime = null;
  finalGame.on = false;
  playoffLogo.key = null;
  matchRecords.home = matchRecords.away = '';
  applyMatchup();
  current = null;
}
