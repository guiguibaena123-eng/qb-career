import Phaser from 'phaser';
import { CAMERA } from '../config';
import { Sideline } from '../entities/Sideline';
import { BillboardLayer } from './billboards';
import { FieldRenderer } from './field';
import { Grandstand } from './grandstand';
import { Projection } from './projection';
import { StadiumShader } from './stadium';

/**
 * O "mundo" da partida: câmera, campo, estádio, arquibancada, laterais e a camada
 * de jogadores. Todas as cenas de jogo (pré-snap, lance, chute...) usam o mesmo.
 */
export class World {
  readonly proj = new Projection();
  readonly field: FieldRenderer;
  readonly stadium: StadiumShader;
  readonly stand: Grandstand;
  readonly sideline: Sideline;
  readonly players: BillboardLayer;
  /** Para onde a câmera vai (jarda no foco); ela chega lá suavemente (lerp). */
  targetY: number;

  constructor(scene: Phaser.Scene, camY: number) {
    this.proj.camY = this.targetY = camY;
    this.stadium = new StadiumShader(scene, this.proj);
    this.stand = new Grandstand(scene, this.proj);
    this.field = new FieldRenderer(scene, this.proj);
    this.sideline = new Sideline(scene, this.proj);
    this.players = new BillboardLayer(scene, 0.7);
  }

  update(dt: number) {
    const k = 1 - Math.pow(1 - CAMERA.followLerp, dt * 60); // lerp independente do FPS
    this.proj.camY += (this.targetY - this.proj.camY) * k;
    this.stadium.update();
    this.stand.update(dt);
    this.field.draw();
    this.sideline.draw();
    this.players.update(this.proj);
  }
}
