import Phaser from 'phaser';
import { CAMERA, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, TEAMS } from '../config';
import { Sideline } from '../entities/Sideline';
import { FieldRenderer } from '../systems/field';
import { Projection } from '../systems/projection';
import { StadiumShader } from '../systems/stadium';

/**
 * Cena de teste do campo + estádio (etapas 1 e 2).
 * A câmera fica sempre centralizada; arrastar só move de trás para frente.
 */
export class FieldScene extends Phaser.Scene {
  private proj = new Projection();
  private field!: FieldRenderer;
  private targetY = 25;
  private stadium!: StadiumShader;
  private sideline!: Sideline;
  private fps!: Phaser.GameObjects.Text;

  constructor() {
    super('FieldScene');
  }

  create() {
    this.field = new FieldRenderer(this, this.proj);
    this.stadium = new StadiumShader(this, this.proj);
    this.sideline = new Sideline(this, this.proj);

    // Arrastar o dedo move a câmera ao longo do campo (com lerp)
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (lastY = p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      this.targetY = Phaser.Math.Clamp(this.targetY + (p.y - lastY) * 0.12, -5, 100);
      lastY = p.y;
    });

    this.add.rectangle(0, 0, GAME_W, 84, 0x0a0c1a, 0.82).setOrigin(0).setDepth(99);
    this.fps = this.add.text(10, 10, '', { fontFamily: FONT_LABEL, fontSize: '14px', color: '#9BE15D' }).setDepth(100);
    this.add
      .text(GAME_W / 2, 40, 'QB CAREER', { fontFamily: FONT_TITLE, fontSize: '18px', color: TEAMS.home.colorHex })
      .setOrigin(0.5)
      .setDepth(100);
    this.add
      .text(GAME_W / 2, 66, 'ARRASTE PARA PERCORRER O CAMPO', { fontFamily: FONT_LABEL, fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(100);

    this.button(80, GAME_H - 70, 'IR P/ TRAVE', () => (this.targetY = this.targetY > 60 ? 25 : 92));
    this.button(GAME_W - 80, GAME_H - 70, 'TORCIDA!', () => {
      this.stadium.cheer(1);
      navigator.vibrate?.([20, 40, 20]);
    });

    // Parâmetros de depuração na URL: ?y=50 posiciona a câmera
    const q = new URLSearchParams(location.search);
    if (q.has('y')) this.targetY = this.proj.camY = Number(q.get('y'));
  }

  /** Botão simples com feedback ao toque (afunda + vibra). */
  private button(x: number, y: number, label: string, onTap: () => void) {
    const bg = this.add.rectangle(0, 0, 120, 44, 0x2a3156, 0.75).setStrokeStyle(1, 0xffffff, 0.15);
    const t = this.add.text(0, 0, label, { fontFamily: FONT_TITLE, fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);
    const c = this.add.container(x, y, [bg, t]).setDepth(100).setSize(120, 44).setInteractive();
    c.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      c.setScale(0.94);
      navigator.vibrate?.(10);
      onTap();
    });
    c.on('pointerup', () => c.setScale(1));
    c.on('pointerout', () => c.setScale(1));
  }

  update(_t: number, dtMs: number) {
    this.proj.camY += (this.targetY - this.proj.camY) * CAMERA.followLerp;
    this.field.draw();
    this.sideline.draw();
    this.stadium.update(Math.min(dtMs, 50) / 1000);
    this.fps.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }
}
