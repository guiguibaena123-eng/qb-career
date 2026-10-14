import { rng } from '../combine/scoring';
import { TeamRepository, type CareerTeam } from '../data/TeamRepository';
import { currentDraft } from '../draft/logic';
import { getSave, updateSave, type GameLine, type PlayerSave } from '../player/PlayerSave';
import { BEARD_COUNT, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SKINS, type FaceLook } from '../player/PlayerFace';
import { divisionOf, league, rankTeams } from './league';

/*
 * Temporada da carreira (dados de clube e liga, sem backend): calendário, elenco do time, tabela,
 * notícias, líderes e técnico. Tudo derivado do time do Draft e do registro de times, com semente
 * (o mesmo save gera sempre a mesma liga). O calendário e as notícias ficam gravados no save, para o
 * resultado das partidas (Etapa 8) atualizar placar, retrospecto, tabela e notícias.
 */

export const SEASON_YEAR = 2026;
export const WEEKS = 10;
const BYE_WEEK = 6;
/** Horário de cada semana; os jogos às 20h+ são de horário nobre (QUI/DOM/SEG à noite). */
const KICKOFFS = ['DOM 13:00', 'QUI 20:15', 'DOM 16:25', 'SEG 20:15', 'DOM 13:00', '', 'DOM 16:05', 'DOM 20:20', 'DOM 13:00', 'SEG 20:15'];

export type Prime = 'TNF' | 'SNF' | 'MNF';
export type Weather = 'clear' | 'rain' | 'snow';
export type Tod = 'day' | 'dusk' | 'night';
/** Apresentação dos jogos de horário nobre: nome e cor da transmissão. */
export const PRIME: Record<Prime, { name: string; short: string; color: number; glow: number }> = {
  TNF: { name: 'THURSDAY NIGHT GAME', short: 'THURSDAY NIGHT', color: 0x7b4dd6, glow: 0xb48cff },
  SNF: { name: 'SUNDAY NIGHT GAME', short: 'SUNDAY NIGHT', color: 0x1f5fe0, glow: 0xffd23f },
  MNF: { name: 'MONDAY NIGHT GAME', short: 'MONDAY NIGHT', color: 0xd63a3a, glow: 0xffb02e },
};

function primeOf(when: string): Prime | null {
  const h = Number(when.slice(4, 6));
  if (!when || h < 20) return null;
  return when.startsWith('QUI') ? 'TNF' : when.startsWith('SEG') ? 'MNF' : 'SNF';
}
const todOf = (when: string): Tod => {
  const h = Number(when.slice(4, 6));
  return h >= 20 ? 'night' : h >= 16 ? 'dusk' : 'day';
};

/** Estádios de clima quente (sul e costa oeste): nunca neva lá; chove mais. */
const WARM = new Set(['mia', 'jax', 'tb', 'hou', 'no', 'atl', 'car', 'dal', 'ari', 'lar', 'lac', 'lv', 'sf']);
/** Clima da semana (o inverno chega no fim da temporada). Mesma semente = mesmo clima. */
function seasonWeather(games: { week: number; venue: string }[], seed: string) {
  const r = rng(`wx-${seed}`);
  const out = new Map<number, Weather>(games.map((g) => [g.week, 'clear' as Weather]));
  const n = games.length;
  // 20% neve: só em estádios frios, nas últimas semanas (fim do ano nos EUA)
  const snowN = Math.round(n * 0.2);
  const cold = games.filter((g) => !WARM.has(g.venue) && g.week >= WEEKS - 4).sort((a, b) => b.week - a.week + (r() - 0.5) * 3);
  cold.slice(0, snowN).forEach((g) => out.set(g.week, 'snow'));
  // 20% chuva: mais provável nos estádios quentes
  let rainN = Math.round(n * 0.2);
  const pool = games.filter((g) => out.get(g.week) === 'clear');
  while (rainN-- > 0 && pool.length) {
    const wts = pool.map((g) => (WARM.has(g.venue) ? 3 : 1));
    let x = r() * wts.reduce((a, b) => a + b, 0);
    let i = 0;
    while (x > wts[i]) x -= wts[i++];
    out.set(pool[i].week, 'rain');
    pool.splice(i, 1);
  }
  return out;
}

/** Temperatura plausível (°C) pela região, semana e clima. */
function tempOf(venue: string, week: number, wx: Weather, seed: string) {
  const r = rng(`temp-${seed}-${week}`)();
  const t = WARM.has(venue) ? 30 - week * 0.9 : 22 - week * 2.6;
  return Math.round(wx === 'snow' ? Math.min(-1, t) - r * 4 : t + (r - 0.5) * 6 - (wx === 'rain' ? 3 : 0));
}

const COACHES = ['MARQUES', 'OLIVEIRA', 'SANTANA', 'MEDEIROS', 'QUEIROZ', 'FONSECA', 'BITTENCOURT', 'DUARTE'];
const SCHEMES = ['ATAQUE VERTICAL', 'WEST COAST', 'CORRIDA FORTE', 'SPREAD RÁPIDO'];
const FIRST = ['MARCOS', 'DUDU', 'TIAGO', 'BRUNO', 'ÍTALO', 'PEDRO', 'CAIO', 'VITOR', 'LEO', 'RAUL', 'GABI', 'RENAN', 'JOÃO', 'FELIPE', 'ANDRÉ', 'DIEGO'];
const LAST = ['LIMA', 'REIS', 'MOURA', 'SALES', 'GOMES', 'NUNES', 'ROCHA', 'ALVES', 'FARIAS', 'TEIXEIRA', 'CRUZ', 'MACEDO', 'PINTO', 'BARROS', 'CAMPOS', 'ARAÚJO'];

/** Técnico do time (o mesmo nome que liga no Draft). */
export function coachOf(team: CareerTeam) {
  const r = rng(`coach-${team.id}`);
  return { name: COACHES[Math.floor(r() * COACHES.length)], scheme: SCHEMES[Math.floor(rng(`scheme-${team.id}`)() * SCHEMES.length)] };
}

/** Conferência (0 QAC, 1 QNC) e divisão (0-7), como na NFL. */
export function conferenceOf(team: CareerTeam) {
  const d = divisionOf(team);
  return { conf: d.conf, div: d.div };
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
  /** Estádio (id do time mandante). */
  venue: string;
  prime: Prime | null;
  tod: Tod;
  weather: Weather;
  temp: number;
  result?: { us: number; them: number };
  stats?: GameLine;
}

export function schedule(): Game[] {
  const s = getSave();
  const team = careerTeam();
  const seed = `${s.name}-${team.id}`;
  const wx = seasonWeather(
    s.career.schedule.filter((g) => g.opp).map((g) => ({ week: g.week, venue: g.home ? team.id : g.opp })),
    seed,
  );
  return s.career.schedule.map((g) => {
    const opp = g.opp ? TeamRepository.get(g.opp) : null;
    const when = KICKOFFS[(g.week - 1) % KICKOFFS.length];
    const venue = opp ? (g.home ? team.id : opp.id) : team.id;
    const weather = wx.get(g.week) ?? 'clear';
    return {
      venue,
      prime: opp ? primeOf(when) : null,
      tod: todOf(when),
      weather,
      temp: tempOf(venue, g.week, weather, seed),
      week: g.week,
      bye: !opp,
      opp,
      home: g.home,
      when: KICKOFFS[(g.week - 1) % KICKOFFS.length],
      where: opp ? (g.home ? team.stadium.name : opp.stadium.name) : '',
      result: g.result,
      stats: g.stats,
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
  /** Identificador estável: 'me' (você) ou '<time>-<posição><n>'. */
  id: string;
  name: string;
  num: number;
  pos: string;
  age: number;
  ovr: number;
  tag: string;
  attrs: [string, number][];
  contract: { until: number; value: number };
  me?: boolean;
  face: FaceLook;
}

/** Rosto sorteado (com semente) de um jogador gerado. */
function faceFor(id: string): FaceLook {
  const r = rng(`face-${id}`);
  const n = (k: number) => Math.floor(r() * k);
  const bald = r() < 0.12;
  return { face: n(FACE_COUNT), skin: n(SKINS.length), hair: bald ? -1 : n(HAIR_COUNT), hairColor: r() < 0.85 ? n(3) : n(HAIR_COLORS.length - 1), beard: r() < 0.45 ? -1 : n(BEARD_COUNT) };
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

const QB_NUMS = [1, 4, 7, 9, 10, 14, 15, 16, 17];

/** Elenco do time: o QB (você no seu time) e os titulares gerados pela força do time. */
export function roster(team: CareerTeam): RosterPlayer[] {
  const s = getSave();
  const r = rng(`roster-${team.id}`);
  const until = SEASON_YEAR + (s.draft?.contract.years ?? 4) - 1;
  const me: RosterPlayer = {
    id: 'me',
    face: { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard },
    name: s.name,
    num: s.number,
    pos: 'QB',
    age: 21,
    ovr: s.ovr,
    tag: 'VOCÊ',
    me: true,
    attrs: [['PRECISÃO', s.attrs.accuracy], ['FORÇA DE BRAÇO', s.attrs.arm], ['VISÃO', s.attrs.reading], ['AGILIDADE', s.attrs.speed]],
    contract: { until, value: s.draft?.contract.value ?? 4 },
  };
  const used = new Set<string>();
  const count: Record<string, number> = {};
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
    const id = `${team.id}-${pos}${(count[pos] = (count[pos] ?? 0) + 1)}`;
    return { id, face: faceFor(id), name, num, pos, age, ovr, tag, attrs, contract: { until: SEASON_YEAR + 1 + Math.floor(r() * 3), value } };
  });
  if (team.id === careerTeam().id) return [me, ...others];
  // Outros times: QB titular gerado (sorteio próprio, para não mudar os nomes do resto do elenco)
  const q = rng(`qb-${team.id}`);
  let name = '';
  do name = `${FIRST[Math.floor(q() * FIRST.length)]} ${LAST[Math.floor(q() * LAST.length)]}`;
  while (used.has(name));
  const ovr = Math.max(64, Math.min(96, Math.round(team.ovr + (q() - 0.4) * 12)));
  const age = 23 + Math.floor(q() * 13);
  const id = `${team.id}-QB1`;
  const qb: RosterPlayer = {
    id,
    face: faceFor(id),
    name,
    num: QB_NUMS[Math.floor(q() * QB_NUMS.length)],
    pos: 'QB',
    age,
    ovr,
    tag: ovr >= 88 ? 'ESTRELA' : age >= 32 ? 'VETERANO' : age <= 24 ? 'PROMESSA' : 'TITULAR',
    attrs: ['PRECISÃO', 'FORÇA DE BRAÇO', 'VISÃO', 'AGILIDADE'].map((n) => [n, Math.max(50, Math.min(99, Math.round(ovr + (q() - 0.5) * 14)))] as [string, number]),
    contract: { until: SEASON_YEAR + 1 + Math.floor(q() * 4), value: Math.round((8 + (ovr - 64) * 1.3 + q() * 6) * 10) / 10 },
  };
  return [qb, ...others];
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

/** Classificação geral (a liga inteira vem de career/league.ts). */
export function standings(): Standing[] {
  return rankTeams([...league().teams.values()]).map((x) => ({ team: x.team, w: x.w, l: x.l, pf: x.pf, pa: x.pa, proj: x.proj, conf: x.conf }));
}

/** Soma das linhas do QB nos jogos da carreira (e a do último jogo). */
export function seasonStats() {
  const games = schedule().filter((g) => g.stats);
  const tot: GameLine = { comp: 0, att: 0, yards: 0, td: 0, int: 0, sacks: 0 };
  for (const g of games) for (const k of Object.keys(tot) as (keyof GameLine)[]) tot[k] += g.stats![k];
  return { games, total: tot, last: games[games.length - 1]?.stats ?? null };
}

/** Passer rating da NFL (0 a 158,3). */
export function passerRating(l: GameLine) {
  if (!l.att) return 0;
  const c = (v: number) => Math.max(0, Math.min(2.375, v));
  const a = c((l.comp / l.att - 0.3) * 5);
  const b = c((l.yards / l.att - 3) * 0.25);
  const t = c((l.td / l.att) * 20);
  const i = c(2.375 - (l.int / l.att) * 25);
  return Math.round(((a + b + t + i) / 6) * 1000) / 10;
}

/** Líderes de passe da liga (QBs de outros times, pelas jardas; antes da semana 1, pelo OVR). */
export function passLeaders() {
  const qbs = league().players.filter((p) => p.pos === 'QB' && !p.me);
  return qbs
    .sort((a, b) => b.season.pyds - a.season.pyds || b.ovr - a.ovr)
    .slice(0, 3)
    .map((p, i) => ({ rank: String(i + 1), name: `${p.name} (${p.team.abbr})`, color: p.team.colors.primary, value: p.season.gp ? `${p.season.pyds.toLocaleString('pt-BR')} JD` : `OVR ${p.ovr}` }));
}

// ------------------------------------------------------------------ notícias

export interface NewsItem {
  tag: 'TROCA' | 'RUMOR' | 'LESÃO' | 'DRAFT' | 'JOGO';
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
  // Resultados dos seus jogos (o mais recente primeiro)
  const games: NewsItem[] = s.career.news
    .filter((n) => n.week > 0)
    .reverse()
    .map((n) => ({ tag: 'JOGO', when: n.week === s.career.week - 1 ? 'HOJE' : `SEM. ${n.week}`, head: n.text, body: n.body ?? '', impact: n.text.includes('VENCEM') ? 'MORAL EM ALTA' : 'PRESSÃO NO VESTIÁRIO' }));
  return [
    ...games,
    {
      tag: 'DRAFT',
      when: games.length ? 'PRÉ-TEMPORADA' : 'HOJE',
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
