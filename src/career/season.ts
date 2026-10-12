import { rng } from '../combine/scoring';
import { TeamRepository, type CareerTeam } from '../data/TeamRepository';
import { currentDraft } from '../draft/logic';
import { getSave, updateSave, type PlayerSave } from '../player/PlayerSave';

/*
 * Temporada da carreira (dados de clube e liga, sem backend): calendário, elenco do time, tabela,
 * notícias, líderes e técnico. Tudo derivado do time do Draft e do registro de times, com semente
 * (o mesmo save gera sempre a mesma liga). O calendário e as notícias ficam gravados no save, para o
 * resultado das partidas (Etapa 8) atualizar placar, retrospecto, tabela e notícias.
 */

export const SEASON_YEAR = 2026;
export const WEEKS = 10;
const BYE_WEEK = 6;
const KICKOFFS = ['DOM 16:00', 'DOM 13:00', 'DOM 16:25', 'SEG 21:15', 'DOM 13:00', '', 'DOM 16:05', 'DOM 20:20', 'DOM 13:00', 'DOM 16:25'];

const COACHES = ['MARQUES', 'OLIVEIRA', 'SANTANA', 'MEDEIROS', 'QUEIROZ', 'FONSECA', 'BITTENCOURT', 'DUARTE'];
const SCHEMES = ['ATAQUE VERTICAL', 'WEST COAST', 'CORRIDA FORTE', 'SPREAD RÁPIDO'];
const FIRST = ['MARCOS', 'DUDU', 'TIAGO', 'BRUNO', 'ÍTALO', 'PEDRO', 'CAIO', 'VITOR', 'LEO', 'RAUL', 'GABI', 'RENAN', 'JOÃO', 'FELIPE', 'ANDRÉ', 'DIEGO'];
const LAST = ['LIMA', 'REIS', 'MOURA', 'SALES', 'GOMES', 'NUNES', 'ROCHA', 'ALVES', 'FARIAS', 'TEIXEIRA', 'CRUZ', 'MACEDO', 'PINTO', 'BARROS', 'CAMPOS', 'ARAÚJO'];

/** Técnico do time (o mesmo nome que liga no Draft). */
export function coachOf(team: CareerTeam) {
  const r = rng(`coach-${team.id}`);
  return { name: COACHES[Math.floor(r() * COACHES.length)], scheme: SCHEMES[Math.floor(rng(`scheme-${team.id}`)() * SCHEMES.length)] };
}

/** Conferência (NORTE = primeira metade do registro, SUL = segunda) e divisão, pela ordem do registro. */
export function conferenceOf(team: CareerTeam) {
  const i = TeamRepository.all().findIndex((t) => t.id === team.id);
  const n = TeamRepository.count();
  return { conf: i < n / 2 ? 0 : 1, div: Math.floor(i / 4) };
}

/** Time da carreira (do Draft; sem Draft, o primeiro time do registro). */
export function careerTeam(): CareerTeam {
  const s = getSave();
  return TeamRepository.get(s.career.teamId ?? s.draft?.teamId ?? TeamRepository.all()[0].id);
}

/**
 * Garante que a temporada existe no save: calendário de WEEKS semanas (uma folga), com o rival da
 * divisão na semana 1, e as primeiras notícias. Só cria uma vez por time.
 */
export function ensureSeason(): PlayerSave {
  const s = getSave();
  if (!s.draft) currentDraft();
  const team = careerTeam();
  const c = getSave().career;
  if (c.schedule.length) return getSave();
  const r = rng(`season-${s.name}-${team.id}`);
  const all = TeamRepository.all().filter((t) => t.id !== team.id);
  const { div } = conferenceOf(team);
  const rivals = all.filter((t) => conferenceOf(t).div === div);
  const pool = all.filter((t) => !rivals.includes(t)).sort(() => r() - 0.5);
  const opps = [rivals[0] ?? pool.shift()!, ...pool.slice(0, WEEKS - 2)];
  const schedule: PlayerSave['career']['schedule'] = [];
  let k = 0;
  for (let w = 1; w <= WEEKS; w++) {
    if (w === BYE_WEEK) {
      schedule.push({ week: w, opp: '', home: false });
      continue;
    }
    schedule.push({ week: w, opp: opps[k].id, home: k % 2 === 0 });
    k++;
  }
  const d = getSave().draft!;
  const news = [
    { week: 0, text: `${s.name} ASSINA COM OS ${team.name}: ${d.contract.years} ANOS DE CONTRATO APÓS A ${d.pick}ª ESCOLHA DA ${d.round}ª RODADA` },
    { week: 0, text: `${s.name} É O NOVO QB DOS ${team.name}` },
  ];
  return updateSave({ career: { ...c, teamId: team.id, season: 1, week: 1, record: { w: 0, l: 0 }, schedule, news } });
}

export interface Game {
  week: number;
  bye: boolean;
  opp: CareerTeam | null;
  home: boolean;
  when: string;
  where: string;
  result?: { us: number; them: number };
}

export function schedule(): Game[] {
  const s = getSave();
  const team = careerTeam();
  return s.career.schedule.map((g) => {
    const opp = g.opp ? TeamRepository.get(g.opp) : null;
    return {
      week: g.week,
      bye: !opp,
      opp,
      home: g.home,
      when: KICKOFFS[(g.week - 1) % KICKOFFS.length],
      where: opp ? (g.home ? team.stadium.name : opp.stadium.name) : '',
      result: g.result,
    };
  });
}

/** Próxima semana com jogo (ou a última). */
export function nextGame(): Game | null {
  const s = getSave();
  return schedule().find((g) => g.week >= s.career.week && !g.bye && !g.result) ?? null;
}

// ------------------------------------------------------------------ elenco

export interface RosterPlayer {
  name: string;
  num: number;
  pos: string;
  age: number;
  ovr: number;
  tag: string;
  attrs: [string, number][];
  contract: { until: number; value: number };
  me?: boolean;
}

const POS_ATTRS: Record<string, string[]> = {
  RB: ['VELOCIDADE', 'FORÇA', 'AGILIDADE', 'SEGURAR BOLA'],
  WR: ['VELOCIDADE', 'MÃOS', 'ROTAS', 'SALTO'],
  TE: ['BLOQUEIO', 'MÃOS', 'FORÇA', 'ROTAS'],
  OL: ['BLOQ. PASSE', 'BLOQ. CORRIDA', 'FORÇA', 'AGILIDADE'],
  DL: ['PRESSÃO', 'FORÇA', 'TACKLE', 'VELOCIDADE'],
  LB: ['TACKLE', 'COBERTURA', 'VELOCIDADE', 'VISÃO'],
  CB: ['COBERTURA', 'VELOCIDADE', 'SALTO', 'TACKLE'],
  S: ['COBERTURA', 'TACKLE', 'VISÃO', 'VELOCIDADE'],
  K: ['PRECISÃO', 'POTÊNCIA', 'CLUTCH', 'CONSIST.'],
};
const SLOTS: [string, number][] = [['RB', 28], ['WR', 11], ['WR', 84], ['TE', 88], ['OL', 71], ['OL', 76], ['DL', 93], ['LB', 54], ['CB', 24], ['S', 32], ['K', 3]];

/** Elenco do time: você (QB, com os atributos do save) e os titulares gerados pela força do time. */
export function roster(team: CareerTeam): RosterPlayer[] {
  const s = getSave();
  const r = rng(`roster-${team.id}`);
  const until = SEASON_YEAR + (s.draft?.contract.years ?? 4) - 1;
  const me: RosterPlayer = {
    name: s.name,
    num: 12,
    pos: 'QB',
    age: 21,
    ovr: s.ovr,
    tag: 'VOCÊ',
    me: true,
    attrs: [['PRECISÃO', s.attrs.accuracy], ['FORÇA DE BRAÇO', s.attrs.arm], ['VISÃO', s.attrs.reading], ['AGILIDADE', s.attrs.speed]],
    contract: { until, value: s.draft?.contract.value ?? 4 },
  };
  const used = new Set<string>();
  const others = SLOTS.map(([pos, num], i) => {
    let name = '';
    do name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    while (used.has(name));
    used.add(name);
    const ovr = Math.max(55, Math.min(95, Math.round(team.ovr + (r() - 0.5) * 18)));
    const age = 22 + Math.floor(r() * 10);
    const tag = i === 4 ? 'CAPITÃO' : ovr >= 85 ? 'ESTRELA' : age <= 23 ? 'PROMESSA' : age >= 30 ? 'VETERANO' : 'TITULAR';
    const attrs = POS_ATTRS[pos].map((n) => [n, Math.max(45, Math.min(99, Math.round(ovr + (r() - 0.5) * 16)))] as [string, number]);
    const value = Math.round(Math.max(1.2, (ovr - 60) * 0.6 + r() * 3) * 10) / 10;
    return { name, num, pos, age, ovr, tag, attrs, contract: { until: SEASON_YEAR + 1 + Math.floor(r() * 3), value } };
  });
  return [me, ...others];
}

// ------------------------------------------------------------------ liga

export interface Standing {
  team: CareerTeam;
  w: number;
  l: number;
  pf: number;
  pa: number;
  proj: number;
  conf: number;
}

/** Classificação (antes da semana 1 todos zerados; PROJ = vitórias projetadas pela força do time). */
export function standings(): Standing[] {
  const s = getSave();
  const me = careerTeam();
  const rows = TeamRepository.all().map((t) => {
    const mine = t.id === me.id;
    const w = mine ? s.career.record.w : 0;
    const l = mine ? s.career.record.l : 0;
    let pf = 0;
    let pa = 0;
    if (mine) for (const g of s.career.schedule) if (g.result) (pf += g.result.us), (pa += g.result.them);
    const proj = Math.round(Math.max(20, Math.min(95, 50 + (t.ovr - 75) * 2.6)));
    return { team: t, w, l, pf, pa, proj, conf: conferenceOf(t).conf };
  });
  return rows.sort((a, b) => b.w - a.w || a.l - b.l || b.proj - a.proj);
}

/** Líderes de passe da liga (QBs de outros times) e você no fim. */
export function passLeaders() {
  const me = careerTeam();
  const r = rng(`leaders-${me.id}`);
  const top = [...TeamRepository.all()].filter((t) => t.id !== me.id).sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  return top.map((t, i) => ({
    rank: String(i + 1),
    name: `${'ABCDEFGJKLMRST'[Math.floor(r() * 14)]}. ${LAST[(Math.floor(r() * LAST.length) + i * 5) % LAST.length]} (${t.name})`,
    color: t.colors.primary,
    value: `${(4800 - i * 140 - Math.floor(r() * 60)).toLocaleString('pt-BR')} JD`,
  }));
}

// ------------------------------------------------------------------ notícias

export interface NewsItem {
  tag: 'TROCA' | 'RUMOR' | 'LESÃO' | 'DRAFT';
  when: string;
  head: string;
  body: string;
  impact: string;
}

/** Feed gerado por regras: a sua contratação e notícias da liga com times reais do registro. */
export function newsFeed(): NewsItem[] {
  const s = getSave();
  const me = careerTeam();
  const g = schedule().filter((x) => !x.bye);
  const first = g[0]?.opp ?? me;
  const r = rng(`news-${me.id}`);
  const others = TeamRepository.all().filter((t) => t.id !== me.id && t.id !== first.id).sort(() => r() - 0.5);
  const team = roster(me).filter((p) => !p.me);
  const star = [...team].sort((a, b) => b.ovr - a.ovr)[0];
  const d = s.draft;
  return [
    {
      tag: 'DRAFT',
      when: 'HOJE',
      head: `${s.name} É O NOVO QB DOS ${me.name}`,
      body: `Escolhido na ${d?.pick ?? 1}ª escolha da ${d?.round ?? 1}ª rodada, o novato chega com OVR ${s.ovr} e assina por ${d?.contract.years ?? 4} anos.`,
      impact: 'TORCIDA ESPERANÇOSA',
    },
    {
      tag: 'TROCA',
      when: 'HÁ 2H',
      head: `${me.name} TROCAM CB RESERVA POR ESCOLHA DE 3ª RODADA COM ${others[0].name}`,
      body: 'O time abre espaço no teto salarial e ganha uma escolha extra para o próximo draft. O técnico diz que a defesa segue forte.',
      impact: 'TETO +$ 2,1M',
    },
    {
      tag: 'RUMOR',
      when: 'HÁ 5H',
      head: `${others[1].name} ESTUDA TROCAR O QB TITULAR APÓS SEQUÊNCIA DE DERROTAS`,
      body: 'Fontes dizem que a diretoria avalia ofertas. Um QB veterano pode ficar disponível antes do prazo de trocas.',
      impact: 'RIVAL ENFRAQUECE',
    },
    {
      tag: 'LESÃO',
      when: 'ONTEM',
      head: `${first.name} PERDE O RECEPTOR ESTRELA POR 4 SEMANAS COM LESÃO NO TORNOZELO`,
      body: `Seu primeiro adversário chega à semana 1 sem a principal arma aérea. A defesa dos ${me.name} deve apostar em pressão.`,
      impact: 'VANTAGEM SEM. 1',
    },
    {
      tag: 'TROCA',
      when: 'ONTEM',
      head: `${others[2].name} CONTRATA O LEAD BLOCKER LIVRE NO MERCADO POR 3 ANOS`,
      body: 'O contrato de $ 5,5M por ano sobe a linha ofensiva do time para o top 10 da liga.',
      impact: 'NEUTRO',
    },
    {
      tag: 'RUMOR',
      when: '2 DIAS',
      head: `${star.name} ENTRA NA LISTA DE DESEJOS DE TRÊS TIMES PARA A PRÓXIMA JANELA`,
      body: `O ${star.pos === 'WR' ? 'receptor' : 'titular'} tem contrato até ${star.contract.until}. A diretoria dos ${me.name} já sinalizou que quer renovar.`,
      impact: 'RENOVAR AJUDA QUÍMICA',
    },
  ];
}

/** Valor em milhões no formato da tela: "$ 8,4M". */
export const mi = (v: number) => `$ ${v.toFixed(1).replace('.', ',')}M`;
