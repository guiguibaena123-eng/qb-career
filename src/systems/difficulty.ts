/*
 * Dificuldade: três níveis que mexem na defesa (velocidade e tackle), no pocket,
 * nas recepções e interceptações, nos chutes, na campanha dos TOUROS e no XP.
 * A escolha fica salva no aparelho (localStorage).
 */

export type Level = 'easy' | 'normal' | 'hard';

export interface DifficultyDef {
  label: string;
  /** Velocidade dos defensores. */
  defSpeed: number;
  /** Soma na chance de tackle. */
  tackle: number;
  /** Segundos somados ao tempo até a pressão chegar. */
  pocket: number;
  /** Soma na chance de pegar a bola. */
  catch: number;
  /** Multiplicador da chance de interceptação. */
  intMul: number;
  /** Soma na chance do chute. */
  kick: number;
  /** −1 (TOUROS fracos) .. +1 (fortes). */
  oppEdge: number;
  /** Multiplicador de XP. */
  xp: number;
}

export const LEVELS: Record<Level, DifficultyDef> = {
  easy: { label: 'FÁCIL', defSpeed: 0.93, tackle: -0.1, pocket: 0.8, catch: 0.06, intMul: 0.65, kick: 0.08, oppEdge: -1, xp: 0.8 },
  normal: { label: 'NORMAL', defSpeed: 1, tackle: 0, pocket: 0, catch: 0, intMul: 1, kick: 0, oppEdge: 0, xp: 1 },
  hard: { label: 'DIFÍCIL', defSpeed: 1.07, tackle: 0.08, pocket: -0.6, catch: -0.07, intMul: 1.35, kick: -0.08, oppEdge: 1, xp: 1.4 },
};

const ORDER: Level[] = ['easy', 'normal', 'hard'];
const KEY = 'qb-career-level';

let level: Level = 'normal';
try {
  const v = localStorage.getItem(KEY);
  if (v === 'easy' || v === 'normal' || v === 'hard') level = v;
} catch {
  /* sem armazenamento: fica no normal */
}

export const difficulty = {
  get level() {
    return level;
  },
  get d() {
    return LEVELS[level];
  },
  set(l: Level) {
    level = l;
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignora */
    }
  },
  /** Passa para o próximo nível (fácil → normal → difícil → fácil). */
  next() {
    this.set(ORDER[(ORDER.indexOf(level) + 1) % ORDER.length]);
    return level;
  },
};
