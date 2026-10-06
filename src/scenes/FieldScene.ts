import Phaser from 'phaser';
import { CAMERA, COLORS, FIELD, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, TEAMS } from '../config';
import { Sideline } from '../entities/Sideline';
import { FieldRenderer } from '../systems/field';
import { Projection } from '../systems/projection';
import { Stadium } from '../systems/stadium';

/**
 * Cena de teste do campo + estádio (etapas 1 e 2).
 * Arraste para percorrer o campo (vertical) e olhar as laterais (horizontal).
 */
export class FieldScene extends Phaser.Scene {
  private proj = new Projection();
  private field!: FieldRenderer;
  private targetY = 25;
  private targetX = FIELD.width / 2;
  private stadium!: Stadium;
  private sideline!: Sideline;
  private fps!: Phaser.GameObjects.Text;
  private tiltLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('FieldScene');
  }

  create() {
    this.drawSky();
    this.field = new FieldRenderer(this, this.proj);
    this.sideline = new Sideline(this, this.proj);
    this.stadium = new Stadium(this, this.proj);

    // Arrastar o dedo move a câmera ao longo do campo (com lerp)
    let lastX = 0;
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      lastX = p.x;
      lastY = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      this.targetY = Phaser.Math.Clamp(this.targetY + (p.y - lastY) * 0.12, -5, 100);
      this.targetX = Phaser.Math.Clamp(this.targetX - (p.x - lastX) * 0.08, -8, FIELD.width + 8);
      lastX = p.x;
      lastY = p.y;
    });

    this.fps = this.add.text(10, 10, '', { fontFamily: FONT_LABEL, fontSize: '14px', color: '#9BE15D' }).setDepth(100);
    this.add
      .text(GAME_W / 2, 40, 'QB CAREER', { fontFamily: FONT_TITLE, fontSize: '18px', color: TEAMS.home.colorHex })
      .setOrigin(0.5)
      .setDepth(100);
    this.add
      .text(GAME_W / 2, 66, 'ARRASTE PARA OLHAR O ESTÁDIO', { fontFamily: FONT_LABEL, fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(100);

    this.tiltLabel = this.add
      .text(GAME_W / 2, GAME_H - 60, '', { fontFamily: FONT_TITLE, fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(100);
    this.button(70, GAME_H - 60, 'TILT -', () => this.setTilt(this.proj.tilt - 4));
    this.button(GAME_W - 70, GAME_H - 60, 'TILT +', () => this.setTilt(this.proj.tilt + 4));
    this.button(70, GAME_H - 110, 'IR P/ TRAVE', () => (this.targetY = this.targetY > 60 ? 25 : 92));
    this.button(GAME_W - 70, GAME_H - 110, 'TORCIDA!', () => {
      this.stadium.cheer(1);
      navigator.vibrate?.([20, 40, 20]);
    });
    this.button(GAME_W / 2, GAME_H - 160, 'CENTRALIZAR', () => (this.targetX = FIELD.width / 2));
    this.setTilt(this.proj.tilt);

    // Parâmetros de depuração na URL: ?x=-5&y=50 posiciona a câmera
    const q = new URLSearchParams(location.search);
    if (q.has('x')) this.targetX = this.proj.camX = Number(q.get('x'));
    if (q.has('y')) this.targetY = this.proj.camY = Number(q.get('y'));
  }

  private setTilt(v: number) {
    this.proj.tilt = Phaser.Math.Clamp(v, CAMERA.tiltMin, CAMERA.tiltMax);
    this.tiltLabel.setText(`${this.proj.tilt}°`);
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

  /** Céu escuro acima do horizonte (o estádio entra na etapa 2). */
  private drawSky() {
    const g = this.add.graphics().setDepth(-1);
    g.fillGradientStyle(0x05060e, 0x05060e, 0x1a1f3a, 0x1a1f3a, 1);
    g.fillRect(0, 0, GAME_W, this.proj.horizonY + 4);
    g.fillStyle(COLORS.sky, 1);
    g.fillRect(0, this.proj.horizonY + 4, GAME_W, GAME_H);
  }

  update(_t: number, dtMs: number) {
    this.proj.camY += (this.targetY - this.proj.camY) * CAMERA.followLerp;
    this.proj.camX += (this.targetX - this.proj.camX) * CAMERA.followLerp;
    this.field.draw();
    this.sideline.draw();
    this.stadium.update(Math.min(dtMs, 50) / 1000);
    this.fps.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
  }
}
