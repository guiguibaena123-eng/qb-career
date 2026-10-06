import Phaser from 'phaser';
import { TEAMS, type TeamConfig } from '../config';
import { makePixelTexture, shade } from '../systems/pixelart';

/*
 * Sprites de pixel art desenhados à mão como grades de caracteres.
 * Pessoas das laterais estão DE PERFIL olhando para a direita (o lado direito do campo usa flipX).
 *
 * Legenda: K contorno · S pele · s pele sombra · R cabelo · H capacete · h brilho · w faixa do capacete
 *          M grade/metal · J camisa · j sombra · W número · P calça · T faixa da calça · O meião · B chuteira
 *          C boné · c brilho do boné · G headset · L polo · l sombra · X cáqui · x sombra · D prancheta · d papel
 *          V colete · v sombra · A câmera · a lente · r luz vermelha · Q calça jeans
 */

const HELMET_HEAD = [
  '....KKKKKK....',
  '...KHhhHHHK...',
  '..KHhHHHHHHK..',
  '..KHwHHHHHHMK.',
  '..KHwHHHHSMMK.',
  '..KHwHHHSSSMK.',
  '..KHHHHHSSMK..',
  '...KHHHHSSK...',
  '....KKKSSK....',
];

const BARE_HEAD = [
  '....KKKKK.....',
  '...KRRRRRK....',
  '..KRRRRRRRK...',
  '..KRRSSSSSK...',
  '..KRSSSSKSK...',
  '..KRSSSSSSSK..',
  '..KSSSSSSSK...',
  '...KSSSSSK....',
  '....KKSSK.....',
];

const TORSO = [
  '..KKJJJJJJKK..',
  '.KJJJJJJJJJJK.',
  '.KJjJJWWJJJJK.',
  '.KJjJJWWJJJJK.',
  '..KjJJJJJJJK..',
  '..KjJJJJJJSK..',
  '..KjJJJJJJSK..',
];

const LEGS_STAND = [
  '...KKKKKKKK...',
  '...KPPPPPPK...',
  '...KPTPPPPK...',
  '...KPTPKPPK...',
  '...KPPKKPPK...',
  '...KOOK.KOOK..',
  '...KOOK.KOOK..',
  '..KBBBK.KBBBK.',
  '..KKKKK.KKKKK.',
];

const LEGS_SIT = [
  '...KKKKKKKKKK.',
  '...KPPPPPPPPK.',
  '...KPTTTTTPPK.',
  '...KKKKKKKOOK.',
  '.........KOOK.',
  '.........KOOK.',
  '........KBBBK.',
  '........KKKKK.',
];

/** Reserva sem capacete segurando o capacete na cintura. */
const HOLD_TORSO = [
  '..KKJJJJJJKK..',
  '.KJJJJJJJJJJK.',
  '.KJjJJWWJJJJK.',
  '.KJjJJWWJJJJK.',
  '..KjJJJJJJJK..',
  '..KjJJJJJSKKK.',
  '..KjJJJJSKHhHK',
];
const HOLD_LEGS = [
  '...KKKKKKHHHMK',
  '...KPPPPPKHHK.',
  '...KPTPPPPKK..',
  '...KPTPKPPK...',
  '...KPPKKPPK...',
  '...KOOK.KOOK..',
  '...KOOK.KOOK..',
  '..KBBBK.KBBBK.',
  '..KKKKK.KKKKK.',
];

const COACH = [
  '...KKKKK......',
  '..KCCCCCK.....',
  '..KCcCCCCKKK..',
  '..KCCCCCCCCCK.',
  '..KGSSSSSKKKK.',
  '..GGSSSKSDDDK.',
  '..KGSSSSSDddK.',
  '...KGGGGSDddK.',
  '....KSSSKDddK.',
  '..KKLLLLSDDDK.',
  '.KLLLLLLSSKK..',
  '.KLlLLWLLLK...',
  '.KLlLLLLLLK...',
  '..KlLLLLLK....',
  '..KlLLLLLK....',
  '...KKKKKKK....',
  '...KXXXXXK....',
  '...KXxXXXK....',
  '...KXxKXXK....',
  '...KXXKXXK....',
  '...KXXKXXK....',
  '..KBBBKBBBK...',
  '..KKKKKKKKK...',
];

/** Fotógrafo de frente, câmera na frente do rosto. */
const PHOTOG = [
  '....KKKKK....',
  '...KCCCCCK...',
  '..KCcCCCCCK..',
  '..KKKKKKKKKK.',
  '...KAAAAAK...',
  '..KAAaaaAAK..',
  '..KAaWaaaAK..',
  '..KAaaaaaAK..',
  '..KSAAAAASK..',
  '.KVVSKKKSVVK.',
  '.KVVVJJJVVVK.',
  '.KVvVJJJVvVK.',
  '.KVVVJJJVVVK.',
  '.KSVVJJJVVSK.',
  '..KKKKKKKKK..',
  '..KQQQKQQQK..',
  '..KQQQKQQQK..',
  '..KQQQKQQQK..',
  '..KQQK.KQQK..',
  '.KBBBK.KBBBK.',
  '.KKKKK.KKKKK.',
];

/** Câmera de TV em pedestal com rodinhas + operador de headset. */
const TVCAM = [
  '..KKKK...............',
  '.KRRRRK..............',
  '.KGSSSK..KKKKKKKKKKKK',
  'GGSSSSK..KAAAAAAAAAAK',
  '.KSSSKKVVKAAAAAAaaaAK',
  '..KSSKVVVKAArAAAaaaAK',
  '.KJJJJSSKAAAAAAAAAAAK',
  'KJJJJJJSKAAAAAAAAAAK.',
  'KJjJJJJK.KKKKKKKKKK..',
  'KJjJJJJK.....KMK.....',
  'KJjJJJJK.....KMK.....',
  '.KJJJJK......KMK.....',
  '.KKKKKK......KMK.....',
  '.KQQQQK......KMK.....',
  '.KQQKQK......KMK.....',
  '.KQQKQK....KKMMMKK...',
  '.KQQKQK...KMMMMMMMK..',
  'KBBKBBK...KKKKKKKKK..',
  'KKKKKKK...KB..K..BK..',
];

export const SKINS = ['#F1C7A5', '#D9A07A', '#B07650', '#7A4B2E', '#5A3520'];
const HAIRS = ['#2a1a10', '#5a3a1a', '#111111', '#b8862e', '#3b2412'];

function kit(team: TeamConfig) {
  const away = team === TEAMS.away;
  return {
    K: '#14151d',
    H: shade(team.color, 0),
    h: shade(team.color, 0.45),
    w: '#ffffff',
    M: '#b9bec8',
    J: shade(team.color, 0),
    j: shade(team.color, -0.3),
    W: '#ffffff',
    P: away ? '#cfd3da' : '#f4f4f4',
    T: shade(team.color, 0),
    O: shade(team.color, -0.1),
    B: '#1d1d24',
  };
}

export const SPRITE_KEYS = {
  stand: (side: 'home' | 'away', skin: number) => `res_stand_${side}_${skin}`,
  hold: (side: 'home' | 'away', skin: number) => `res_hold_${side}_${skin}`,
  sit: (side: 'home' | 'away', skin: number) => `res_sit_${side}_${skin}`,
  sitBare: (side: 'home' | 'away', skin: number) => `res_sitbare_${side}_${skin}`,
  coach: (side: 'home' | 'away', skin: number) => `coach_${side}_${skin}`,
  photog: (skin: number) => `photog_${skin}`,
  tvcam: (skin: number) => `tvcam_${skin}`,
};

/** Gera todas as texturas das laterais (uma vez). */
export function buildSidelineTextures(scene: Phaser.Scene) {
  for (const side of ['home', 'away'] as const) {
    const team = TEAMS[side];
    const k = kit(team);
    SKINS.forEach((skin, i) => {
      const pal = { ...k, S: skin, s: skin, R: HAIRS[i % HAIRS.length] };
      makePixelTexture(scene, SPRITE_KEYS.stand(side, i), [...HELMET_HEAD, ...TORSO, ...LEGS_STAND], pal);
      makePixelTexture(scene, SPRITE_KEYS.hold(side, i), [...BARE_HEAD, ...HOLD_TORSO, ...HOLD_LEGS], pal);
      makePixelTexture(scene, SPRITE_KEYS.sit(side, i), [...HELMET_HEAD, ...TORSO, ...LEGS_SIT], pal);
      makePixelTexture(scene, SPRITE_KEYS.sitBare(side, i), [...BARE_HEAD, ...TORSO, ...LEGS_SIT], pal);
      makePixelTexture(scene, SPRITE_KEYS.coach(side, i), COACH, {
        K: '#14151d',
        S: skin,
        C: shade(team.color, 0),
        c: shade(team.color, 0.4),
        G: '#2b2d36',
        L: shade(team.color, 0),
        l: shade(team.color, -0.3),
        W: '#ffffff',
        X: '#c9b27c',
        x: '#a8925f',
        D: '#7a4f24',
        d: '#f2efe6',
        B: '#2a2118',
      });
    });
  }
  SKINS.forEach((skin, i) => {
    makePixelTexture(scene, SPRITE_KEYS.photog(i), PHOTOG, {
      K: '#14151d',
      S: skin,
      C: '#2b2d36',
      c: '#4a4d5a',
      A: '#1b1c22',
      a: '#3b6fa8',
      W: '#cfe6ff',
      V: '#8a8f99',
      v: '#6d727c',
      J: '#24262e',
      Q: '#2e3a55',
      B: '#1d1d24',
    });
    makePixelTexture(scene, SPRITE_KEYS.tvcam(i), TVCAM, {
      K: '#14151d',
      S: skin,
      R: HAIRS[i % HAIRS.length],
      G: '#2b2d36',
      A: '#2a2c34',
      a: '#5c8fd1',
      r: '#ff2a2a',
      V: '#55596a',
      J: '#1f2330',
      j: '#161926',
      Q: '#2e3a55',
      M: '#8d929c',
      B: '#111111',
    });
  });
}
