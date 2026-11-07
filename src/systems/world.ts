import Phaser from 'phaser';
import { CAMERA, COLORS } from '../config';
import { Sideline } from '../entities/Sideline';
import { BillboardLayer } from './billboards';
import { FieldRenderer } from './field';
import { pickTimeOfDay, shadowLights, type SkyWeather, type TimeOfDay } from './daytime';
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
  /** Horário da partida (dia, tarde ou noite). */
  tod: TimeOfDay = pickTimeOfDay();
  readonly sideline: Sideline;
  readonly players: BillboardLayer;
  /** Para onde a câmera vai (jarda no foco); ela chega lá suavemente (lerp). */
  targetY: number;

  weather: SkyWeather;

  constructor(scene: Phaser.Scene, camY: number, weather: SkyWeather = 'clear') {
    this.weather = weather;
    this.proj.camY = this.targetY = camY;
    this.stadium = new StadiumShader(scene, this.proj, this.tod, weather);
    this.stand = new Grandstand(scene, this.proj, this.tod, weather);
    this.field = new FieldRenderer(scene, this.proj);
    this.sideline = new Sideline(scene, this.proj);
    this.players = new BillboardLayer(scene, 0.7);
    this.applyLook();
  }

  /** Gramado e sombras pelo horário/clima. */
  private applyLook() {
    this.field.lights = shadowLights(this.tod, this.weather);
    // Gramado mais vivo à noite (refletores), mais quente na tarde
    if (this.tod === 'night') this.field.grass = [0x52b848, 0x5fc653];
    else if (this.tod === 'dusk') this.field.grass = [0x4fa443, 0x5ab24b];
    this.players.setLights(shadowLights(this.tod, this.weather));
    this.sideline.people.setLights(shadowLights(this.tod, this.weather)); // reservas, técnicos, fotógrafos e câmeras também projetam sombras
    if (this.tod === 'day') this.field.grass = [COLORS.grassA, COLORS.grassB];
  }

  /** Troca horário/clima sem remontar o estádio (visualizador). */
  setLook(tod: TimeOfDay, weather: SkyWeather) {
    this.tod = tod;
    this.weather = weather;
    this.stadium.setLook(tod, weather);
    this.stand.setLook(tod, weather);
    this.applyLook();
  }

  update(dt: number) {
    const k = 1 - Math.pow(1 - CAMERA.followLerp, dt * 60); // lerp independente do FPS
    this.proj.camY += (this.targetY - this.proj.camY) * k;
    // chegou: encaixa no alvo (assim o gramado e a lateral param de ser redesenhados)
    if (Math.abs(this.targetY - this.proj.camY) < 0.002) this.proj.camY = this.targetY;
    this.stadium.update();
    this.stand.update(dt);
    this.field.draw();
    this.sideline.draw();
    this.players.update(this.proj);
  }
}
