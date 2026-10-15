import { TeamRepository } from '../data/TeamRepository';
import { realTitles } from '../data/titles';
import { getSave, type SeasonRecap } from '../player/PlayerSave';
import { awardsReady, finalMvp, seasonAwards } from './awards';
import { divisionTable } from './league';
import { bracket } from './playoffs';
import { careerTeam, conferenceOf, seasonYear } from './season';

/*
 * Sala de troféus da carreira: títulos individuais (prêmios) e com a equipe (QFL Bowl, conferência,
 * divisão, playoffs), com os anos; e a contagem de títulos de cada time (reais da NFL + os do jogo).
 */

export interface SeasonTitles {
  qfl: boolean;
  conf: boolean;
  div: boolean;
  playoffs: boolean;
}

export interface Trophy {
  id: string;
  name: string;
  years: number[];
}

/** A final já pode ser mostrada (você a jogou ou simulou o fim da temporada). */
export const revealed = () => !!getSave().career.seasonDone || !!getSave().career.post?.final?.result;

/** Campeão do QFL Bowl desta temporada (id do time), se a final já foi decidida e pode aparecer. */
export function champion(): string | null {
  if (!revealed()) return null;
  const g = bracket().games.final[0];
  return g && g.status === 'done' && g.winner ? g.winner : null;
}

/** Suas conquistas coletivas na temporada em andamento. */
export function seasonTitles(): SeasonTitles {
  const b = bracket();
  const me = careerTeam();
  const f = b.games.final[0];
  return {
    qfl: !!f && f.status === 'done' && f.winner === me.id,
    conf: b.games.conf.some((g) => g.status === 'done' && g.winner === me.id),
    div: awardsReady() && divisionTable(conferenceOf(me).div)[0]?.team.id === me.id,
    playoffs: !b.projected && b.me.seed !== undefined,
  };
}

/** Conquistas de uma temporada já arquivada (saves antigos: deduzidas do texto do resultado). */
export function titlesOf(r: SeasonRecap): SeasonTitles {
  if (r.titles) return r.titles;
  const champ = r.result.startsWith('CAMPEÃO');
  const vice = r.result.startsWith('VICE');
  return { qfl: champ, conf: champ || vice, div: false, playoffs: champ || vice || r.result.startsWith('ELIMINADO') };
}

/** Time campeão de uma temporada arquivada (saves antigos: só quando foi o seu time). */
function championOf(r: SeasonRecap): string | null {
  if (r.champion) return r.champion;
  if (!titlesOf(r).qfl) return null;
  return r.teamId ?? TeamRepository.all().find((t) => t.name === r.team)?.id ?? null;
}

/** Campeões do QFL Bowl no jogo, por ano (temporadas arquivadas + a atual, se já revelada). */
export function gameChampions(): { year: number; teamId: string }[] {
  const out: { year: number; teamId: string }[] = [];
  for (const r of getSave().career.history ?? []) {
    const id = championOf(r);
    if (id) out.push({ year: r.year, teamId: id });
  }
  const now = champion();
  if (now) out.push({ year: seasonYear(), teamId: now });
  return out;
}

/** Títulos de um time: os reais da NFL e os conquistados no jogo (com os anos). */
export function teamTitles(id: string) {
  const real = realTitles(id);
  const game = gameChampions()
    .filter((c) => c.teamId === id)
    .map((c) => c.year);
  return { ...real, game, qflTotal: real.sb.length + game.length };
}

/** Sala de troféus do jogador: conquistas com a equipe e prêmios individuais, com os anos. */
export function trophyCase() {
  const s = getSave();
  const hist = s.career.history ?? [];
  const cur = seasonTitles();
  const year = seasonYear();
  const yearsOf = (pick: (t: SeasonTitles) => boolean) => [...hist.filter((r) => pick(titlesOf(r))).map((r) => r.year), ...(pick(cur) ? [year] : [])];
  const team: Trophy[] = [
    { id: 'qfl', name: 'CAMPEÃO DO QFL BOWL', years: yearsOf((t) => t.qfl) },
    { id: 'conf', name: 'CAMPEÃO DA CONFERÊNCIA (SEMI BOWL)', years: yearsOf((t) => t.conf) },
    { id: 'div', name: 'CAMPEÃO DA DIVISÃO', years: yearsOf((t) => t.div) },
    { id: 'playoffs', name: 'CLASSIFICADO AOS PLAYOFFS', years: yearsOf((t) => t.playoffs) },
  ];

  const IND: [string, string][] = [
    ['mvp', 'MVP DA LIGA'],
    ['fmvp', 'MVP DA FINAL'],
    ['opoy', 'JOGADOR OFENSIVO DO ANO'],
    ['dpoy', 'JOGADOR DEFENSIVO DO ANO'],
    ['oroy', 'NOVATO OFENSIVO DO ANO'],
    ['droy', 'NOVATO DEFENSIVO DO ANO'],
    ['ret', 'RETORNO DO ANO'],
  ];
  const nowWon = new Set<string>();
  for (const a of seasonAwards()) if (a.winner?.me) nowWon.add(a.id);
  if (revealed() && finalMvp()?.me) nowWon.add('fmvp');
  const individual: Trophy[] = IND.map(([id, name]) => ({
    id,
    name,
    years: [...hist.filter((r) => r.awards?.some((a) => a.id === id && a.me)).map((r) => r.year), ...(nowWon.has(id) ? [year] : [])],
  }));
  return { team, individual };
}
