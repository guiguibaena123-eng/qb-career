import type { CareerTeam, KitDef } from '../data/TeamRepository';
import type { LookOptions } from '../player/PlayerSave';

/*
 * Kits travados do time (Casa / Fora / Noite). As cores do uniforme vêm do registro de times e não são
 * editáveis; ao escolher um kit, as cores dos acessórios voltam para as que combinam com ele (como no
 * design) e o usuário pode mudá-las depois.
 */

export type KitId = LookOptions['kit'];
export const KIT_IDS: KitId[] = ['home', 'away', 'night'];

const WHITE = 0xf4f1e8;
const BLACK = 0x0d0d12;

const shade = (c: number, f: number) =>
  (Math.round(((c >> 16) & 255) * f) << 16) | (Math.round(((c >> 8) & 255) * f) << 8) | Math.round((c & 255) * f);

export function kitInfo(team: CareerTeam, id: KitId): { name: string; desc: string; kit: KitDef } {
  const names: Record<KitId, [string, string]> = {
    home: ['CASA', 'COR PRINCIPAL DO TIME'],
    away: ['FORA', 'BRANCO COM A COR DO TIME'],
    night: ['NOITE', 'ESCURO COM A COR DO TIME'],
  };
  return { name: `${team.name} · ${names[id][0]}`, desc: names[id][1], kit: team.kits[id] };
}

/** Cores dos acessórios que combinam com o kit (aplicadas ao escolher o kit e ao restaurar). */
export function kitAccents(id: KitId, kit: KitDef): Partial<LookOptions> {
  if (id === 'away') {
    return { underC: kit.stripe, sockC: kit.stripe, sstripeC: WHITE, caccC: kit.stripe, cleatC: WHITE, gloveC: kit.stripe, wristC: kit.stripe };
  }
  if (id === 'night') {
    return {
      underC: kit.jersey,
      sockC: kit.jersey,
      sstripeC: kit.stripe,
      caccC: kit.jersey,
      cleatC: kit.stripe,
      gloveC: kit.stripe,
      wristC: kit.jersey,
      maskC: kit.stripe,
      chinC: kit.stripe,
      mouthC: kit.stripe,
    };
  }
  return { underC: shade(kit.jersey, 0.5), sockC: WHITE, sstripeC: kit.jersey, caccC: kit.jersey, cleatC: BLACK, gloveC: WHITE, wristC: WHITE };
}
