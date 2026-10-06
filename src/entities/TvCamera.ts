import { FIELD } from '../config';
import type { BillboardLayer } from '../systems/billboards';
import type { Rng } from '../systems/rng';
import { SKINS, SPRITE_KEYS } from './sprites';

/**
 * Câmeras de TV da transmissão (operador + câmera em pedestal com rodinhas).
 * Ficam atrás das end zones, dos lados da trave, e nas laterais fora das áreas dos times.
 */
export function placeTvCameras(layer: BillboardLayer, rng: Rng) {
  const skin = () => SPRITE_KEYS.tvcam(rng.int(0, SKINS.length - 1));
  const cx = FIELD.width / 2;
  // Atrás das end zones: viradas para o centro do campo
  for (const y of [115, -15]) {
    layer.add(skin(), cx - 7.5, y, { scale: 1.15, shadow: 2.2 });
    layer.add(skin(), cx + 7.5, y, { scale: 1.15, shadow: 2.2, flip: true });
  }
  // Laterais
  for (const y of [22, 78]) {
    layer.add(skin(), -3.6, y, { scale: 1.15, shadow: 2.2 });
    layer.add(skin(), FIELD.width + 3.6, y, { scale: 1.15, shadow: 2.2, flip: true });
  }
}
