import Phaser from 'phaser';
import { stadiumPhoto, stadiumSlot } from '../ui/stadiumPhoto';
import { GAME_H, GAME_W, VIEW } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { getSave, resetSave, updateSave, calcOvr } from '../player/PlayerSave';
import { careerAssetCounts } from '../systems/careerAssets';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';
import { backButton } from './CareerHub';

/*
 * Cena de teste da Etapa 1 (abre com ?carreiratest): confere os assets da carreira, o save do jogador
 * (grava, lê e recalcula o OVR) e lista todos os times com logo, estádio e os 3 kits.
 */
export class CareerTest extends Phaser.Scene {
  constructor() {
    super('CareerTest');
  }

  create() {
    setupHiRes(this);
    const W = GAME_W;
    const H = GAME_H;
    this.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, 0x0a0c1a).setOrigin(0).setScrollFactor(0);

    // ---- cabeçalho fixo
    // Objetos fixos na tela (não rolam com a lista)
    const head = {
      add: <T extends Phaser.GameObjects.GameObject>(o: T): T => {
        if (!o.scene) this.add.existing(o);
        (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
        (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(51);
        return o;
      },
    };
    this.add.rectangle(0, 0, W, 214, 0x0a0c1a, 1).setOrigin(0).setScrollFactor(0).setDepth(50);
    head.add(title(this, W / 2, 26, 'TESTE DA CARREIRA', 13, UI.yellow).setOrigin(0.5));

    // Assets carregados
    const c = careerAssetCounts(this);
    const want: Record<string, number> = { layers: 132, faces: 7, draft_suit: 14, stadiums: 30 };
    let y = 56;
    for (const [g, n] of Object.entries(c)) {
      const ok = n === want[g];
      head.add(label(this, 16, y, g.toUpperCase(), 9, '#C9CEE0').setOrigin(0, 0.5));
      head.add(label(this, W - 16, y, `${n} / ${want[g]}  ${ok ? 'OK' : 'FALTA'}`, 9, ok ? '#3CCB5A' : '#FF5A5F').setOrigin(1, 0.5));
      y += 18;
    }

    // Save: grava, lê de novo e confere o OVR
    const before = getSave();
    const wrote = updateSave({ name: before.name });
    const back = getSave();
    const saveOk = back.name === wrote.name && back.ovr === calcOvr(back.attrs);
    head.add(label(this, 16, 134, 'SAVE (GRAVA E LÊ)', 9, '#C9CEE0').setOrigin(0, 0.5));
    head.add(label(this, W - 16, 134, saveOk ? 'OK' : 'ERRO', 9, saveOk ? '#3CCB5A' : '#FF5A5F').setOrigin(1, 0.5));
    head.add(label(this, 16, 152, `${back.name} #${back.number} · OVR ${back.ovr} · ${back.college.name}`, 9, '#FFFFFF').setOrigin(0, 0.5));
    head.add(label(this, 16, 170, `ROSTO ${back.face} · PELE ${back.skin} · CABELO ${back.hair} · BARBA ${back.beard}`, 9, '#9AA3C0').setOrigin(0, 0.5));
    const reset = new GlassButton(this, W - 70, 196, { w: 120, h: 26, radius: 8 });
    reset.add(label(this, 0, 0, 'RESETAR SAVE', 8, '#FFFFFF').setOrigin(0.5));
    reset.onTap = () => {
      resetSave();
      this.time.delayedCall(30, () => this.scene.restart());
    };
    head.add(reset);
    head.add(label(this, 16, 196, `${TeamRepository.count()} TIMES NO REGISTRO`, 9, UI.yellow).setOrigin(0, 0.5));

    // ---- lista de times (rola arrastando)
    const rowH = 58;
    const top = 222;
    TeamRepository.all().forEach((t, i) => {
      const ry = top + i * rowH;
      const g = this.add.graphics();
      g.fillStyle(0x2a3156, 0.7);
      g.fillRoundedRect(10, ry, W - 20, rowH - 6, 10);
      g.fillStyle(t.colors.primary, 1);
      g.fillRect(10, ry + 8, 4, rowH - 22);
      this.add.image(40, ry + (rowH - 6) / 2, t.logo.small).setDisplaySize(38, 38);
      this.add.existing(title(this, 66, ry + 14, t.abbr, 10, '#FFFFFF').setOrigin(0, 0.5));
      this.add.existing(label(this, 66, ry + 32, t.stadium.name, 7, '#9AA3C0').setOrigin(0, 0.5));
      // Miniatura do estádio (ou o quadro padrão em código)
      const sx = W - 14 - 72;
      if (t.stadium.image) {
        const key = t.stadium.image;
        stadiumSlot(this, key, (slot) => slot.add(this.add.image(sx, ry + 4, stadiumPhoto(this, key, 72, 40)).setOrigin(0).setDisplaySize(72, 40)));
      } else {
        g.fillStyle(t.colors.primary, 0.6);
        g.fillRect(sx, ry + 4, 72, 40);
        this.add.existing(label(this, sx + 36, ry + 24, 'SEM FOTO', 7, '#FFFFFF').setOrigin(0.5));
      }
      // Os 3 kits: camisa, número e calça
      (['home', 'away', 'night'] as const).forEach((k, j) => {
        const kit = t.kits[k];
        const kx = 150 + j * 30;
        g.fillStyle(0x000000, 0.5);
        g.fillRect(kx - 1, ry + 11, 26, 30);
        g.fillStyle(kit.jersey, 1);
        g.fillRect(kx, ry + 12, 24, 16);
        g.fillStyle(kit.number, 1);
        g.fillRect(kx + 9, ry + 16, 6, 8);
        g.fillStyle(kit.pants, 1);
        g.fillRect(kx + 3, ry + 28, 18, 12);
        g.fillStyle(kit.stripe, 1);
        g.fillRect(kx + 11, ry + 28, 2, 12);
      });
    });

    // Rolagem por arrasto
    const total = top + TeamRepository.count() * rowH + 20;
    const cam = this.cameras.main;
    let startY = 0;
    let startScroll = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      startY = p.y;
      startScroll = cam.scrollY;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) cam.scrollY = Phaser.Math.Clamp(startScroll + (startY - p.y), 0, Math.max(0, total - H));
    });
    backButton(this, 'CareerHub');
  }
}
