import { finalScore, qbRanking, rng, teamInterest } from '../combine/scoring';
import { TeamRepository, type CareerTeam } from '../data/TeamRepository';
import { getSave, updateSave, type PlayerSave } from '../player/PlayerSave';

/*
 * Draft: quem escolhe o jogador, em que rodada e pick, e o contrato. Tudo derivado do Combine e do
 * registro de times (com semente pelo nome do jogador, então o resultado é estável):
 *   ordem de escolha = times do pior para o melhor (overall); rodada = posição no ranking dos QBs;
 *   time = o mais interessado entre os que escolhem perto daquela posição.
 */

export type DraftInfo = NonNullable<PlayerSave['draft']>;

/** Ordem de escolha de cada rodada: do time mais fraco para o mais forte. */
export function draftOrder(): CareerTeam[] {
  return [...TeamRepository.all()].sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id));
}

/** Rodada pela posição no ranking do Combine (como a projeção da tela de resultado). */
function roundOf(rank: number, total: number) {
  const p = rank / total;
  if (p <= 0.25) return 1;
  if (p <= 0.45) return 2;
  if (p <= 0.65) return 3;
  if (p <= 0.75) return 4;
  if (p <= 0.85) return 5;
  if (p <= 0.93) return 6;
  return 7;
}

/** Contrato de calouro (4 anos): vale mais quanto mais cedo a escolha. Em milhões. */
function contractValue(round: number, pick: number, n: number) {
  const overall = (round - 1) * n + pick;
  return Math.max(3.8, Math.round((44 * Math.pow(0.955, overall - 1) + 3.5) * 10) / 10);
}

/** Calcula o Draft a partir do Combine e grava no save (e o time da carreira). */
export function runDraft(): DraftInfo {
  const s = getSave();
  const final = s.combine?.score ?? finalScore(s.combine?.tests ?? {});
  const { rank, total } = qbRanking(final, s.name);
  const round = roundOf(rank, total);
  const order = draftOrder();
  const n = order.length;
  // Onde ele "deveria" sair dentro da rodada (melhor nota → mais cedo), e o time mais interessado por perto
  const frac = Math.min(1, ((rank - 1) / total - [0, 0, 0.25, 0.45, 0.65, 0.75, 0.85, 0.93][round]) / 0.25);
  const target = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
  const interest = new Map(teamInterest(final, s.name, n).map((t) => [t.team.id, t.interest]));
  const r = rng(`draft-${s.name}`);
  let best = target;
  let bestScore = -Infinity;
  order.forEach((t, i) => {
    const near = 1 - Math.min(1, Math.abs(i - target) / 6);
    const sc = (interest.get(t.id) ?? 0) * 0.6 + near * 60 + r() * 10;
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  const pick = best + 1;
  const info: DraftInfo = { teamId: order[best].id, pick, round, contract: { years: 4, value: contractValue(round, pick, n) } };
  updateSave({ draft: info, career: { ...s.career, teamId: info.teamId } });
  return info;
}

/** Draft já feito no save (ou calcula agora). */
export function currentDraft(): DraftInfo {
  return getSave().draft ?? runDraft();
}

const FIRST = ['T.', 'L.', 'C.', 'R.', 'M.', 'J.', 'D.', 'A.', 'P.', 'G.', 'F.', 'B.'];
const LAST = ['BRANDÃO', 'VIEIRA', 'NUNES', 'ROCHA', 'MOURA', 'TEIXEIRA', 'CARDOSO', 'LIMA', 'PEIXOTO', 'FARIAS', 'CAMPOS', 'BARROS', 'MACEDO', 'PINTO', 'SALES', 'ARAÚJO'];
const POS = ['WR', 'DE', 'CB', 'OT', 'LB', 'S', 'DT', 'RB', 'TE', 'WR', 'CB', 'EDGE'];

/** Picks feitos antes do seu na mesma rodada (os últimos `count`), com nomes e posições por semente. */
export function picksBefore(d: DraftInfo, count = 3) {
  const order = draftOrder();
  const r = rng(`picks-${getSave().name}-${d.round}`);
  const out: { pick: number; team: CareerTeam; player: string; pos: string }[] = [];
  for (let i = Math.max(0, d.pick - 1 - count); i < d.pick - 1; i++) {
    out.push({ pick: i + 1, team: order[i], player: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`, pos: POS[Math.floor(r() * POS.length)] });
  }
  return out;
}

/** "1ª", "8ª"... */
export const ord = (n: number) => `${n}ª`;

/** Valor do contrato no formato da tela: "$ 31,4 MI". */
export const money = (v: number) => `$ ${v.toFixed(1).replace('.', ',')} MI`;
