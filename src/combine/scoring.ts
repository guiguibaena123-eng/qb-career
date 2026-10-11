import type { Attrs, TestId } from '../player/PlayerSave';
import { DEFAULT_ATTRS } from '../player/PlayerSave';
import { TeamRepository } from '../data/TeamRepository';

/*
 * Notas, letras e dados simulados do Combine. Tudo por código e com seed (reproduzível).
 */

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Gerador pseudoaleatório com seed (mulberry32). */
export function rng(seed: string | number) {
  let h = typeof seed === 'number' ? seed >>> 0 : 1779033703;
  if (typeof seed === 'string') for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 3432918353) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TESTS: { id: TestId; name: string; scene: string; weight: number; unit: string }[] = [
  { id: 'sprint40', name: '40 JARDAS', scene: 'Combine40', weight: 0.25, unit: 's' },
  { id: 'cones', name: '3 CONES', scene: 'Combine3Cones', weight: 0.2, unit: 's' },
  { id: 'passing', name: 'PRECISÃO DE PASSE', scene: 'CombinePasse', weight: 0.3, unit: 'pts' },
  { id: 'arm', name: 'FORÇA DE BRAÇO', scene: 'CombineForca', weight: 0.25, unit: 'mph' },
];

/** Média dos QBs no Combine (valor bruto), usada na comparação. */
export const QB_AVG: Record<TestId, number> = { sprint40: 4.9, cones: 7.2, passing: 62, arm: 55 };

export function grade(score: number): string {
  return score >= 92 ? 'A+' : score >= 85 ? 'A' : score >= 78 ? 'B+' : score >= 70 ? 'B' : score >= 62 ? 'C+' : score >= 52 ? 'C' : 'D';
}

export const gradeColor = (g: string) => (g[0] === 'A' ? '#3CCB5A' : g[0] === 'B' ? '#9BE15D' : g[0] === 'C' ? '#FFD23F' : '#FF5A5F');

/** Nota 0–100 de um tempo (menor é melhor): `best` = 100, `worst` = 0, linear. */
export const timeScore = (t: number, best: number, worst: number) => Math.round(clamp(((worst - t) / (worst - best)) * 100, 0, 100));

export const score40 = (t: number) => timeScore(t, 4.4, 5.3);
export const scoreCones = (t: number) => timeScore(t, 6.8, 7.8);
/** Força: 60% velocidade (48–62 mph) + 40% distância (55–75 jardas). */
export const scoreArm = (mph: number, yds: number) =>
  Math.round(clamp(((mph - 48) / 14) * 0.6 + ((yds - 55) / 20) * 0.4, 0, 1) * 100);

/** Penalidade escolhida: pular um teste dá nota fixa 40 (D). Documentado no CombineHub. */
export const SKIP_SCORE = 40;

/** Nota final do Combine: média ponderada dos 4 testes (pendente conta como pulado). */
export function finalScore(tests: Partial<Record<TestId, { score: number }>>): number {
  let s = 0;
  for (const t of TESTS) s += (tests[t.id]?.score ?? SKIP_SCORE) * t.weight;
  return Math.round(s);
}

/** Atributos do rookie ajustados pelo Combine (sempre a partir dos valores base: não acumula). */
export function attrsFromCombine(tests: Partial<Record<TestId, { score: number }>>, final: number): Attrs {
  const sc = (id: TestId) => tests[id]?.score ?? SKIP_SCORE;
  const adj = (base: number, score: number, k = 0.35) => Math.round(clamp(base + (score - 55) * k, 40, 99));
  return {
    speed: adj(DEFAULT_ATTRS.speed, (sc('sprint40') + sc('cones')) / 2),
    accuracy: adj(DEFAULT_ATTRS.accuracy, sc('passing')),
    arm: adj(DEFAULT_ATTRS.arm, sc('arm')),
    reading: adj(DEFAULT_ATTRS.reading, final, 0.15),
  };
}

/** ~24 QBs gerados por código: nota de cada um e ranking do jogador entre eles. */
export function qbRanking(final: number, seed: string) {
  const r = rng(`qbs-${seed}`);
  const field = Array.from({ length: 24 }, () => Math.round(clamp(62 + (r() + r() + r() - 1.5) * 26, 25, 98)));
  const rank = field.filter((s) => s > final).length + 1;
  return { rank, total: field.length + 1 };
}

export function projection(rank: number, total: number): string {
  const p = rank / total;
  if (p <= 0.12) return 'TOP 5 DA 1ª RODADA';
  if (p <= 0.25) return '1ª RODADA';
  if (p <= 0.45) return '2ª RODADA';
  if (p <= 0.65) return '3ª RODADA';
  if (p <= 0.85) return '4ª–5ª RODADA';
  return '6ª–7ª RODADA';
}

/** Times mais interessados (do registro): mistura de acaso com seed e da nota final. */
export function teamInterest(final: number, seed: string, n = 5) {
  const r = rng(`interest-${seed}`);
  return TeamRepository.all()
    .map((t) => ({ team: t, interest: clamp(Math.round(30 + (final - 55) * 0.8 + r() * 45 - (t.ovr - 70) * 0.5), 5, 99) }))
    .sort((a, b) => b.interest - a.interest)
    .slice(0, n);
}
