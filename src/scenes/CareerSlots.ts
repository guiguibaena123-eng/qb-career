import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { activeSlot, deleteSlot, peekSlot, resetSave, setActiveSlot, SLOT_COUNT, updateSave, type PlayerSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { gradCard } from '../ui/gradcard';
import { portrait } from '../ui/portrait';
import { GlassButton, label, title, UI } from '../ui/widgets';

/*
 * Saves da carreira: até 3 carreiras. Cada espaço mostra o jogador (foto), time, temporada, campanha,
 * OVR e a fase; tocar continua de onde parou. Espaço vazio = NOVA CARREIRA. APAGAR pede confirmação.
 */

const OR = 0xf26b1d;
const CARD = 0x22284a;
const hexNum = (h: string) => parseInt(h.slice(1), 16);

/** Fase da carreira e a tela onde ela continua. */
function stageOf(s: PlayerSave): [string, string] {
  if (s.draft) return ['TEMPORADA', 'CarreiraMenu'];
  if (s.combine?.score !== undefined) return ['DRAFT', 'DraftEspera'];
  return ['COMBINE', 'CombineHub'];
}

function ago(t?: number) {
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'AGORA';
  if (m < 60) return `HÁ ${m} MIN`;
  const h = Math.floor(m / 60);
  if (h < 24) return `HÁ ${h}H`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ONTEM' : `HÁ ${d} DIAS`;
}

export class CareerSlots extends Phaser.Scene {
  private armed = -1;

  constructor() {
    super('CareerSlots');
  }

  create() {
    setupHiRes(this);
    this.armed = -1;
    this.draw();
  }

  private draw() {
    this.children.removeAll(true);
    const W = GAME_W;
    const H = GAME_H;
    const g = this.add.graphics();
    g.fillStyle(0x0a0c1a, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 14; i > 0; i--) {
      g.fillStyle(OR, 0.02);
      g.fillEllipse(W / 2, 0, (360 * i) / 14 * 2, (260 * i) / 14 * 2);
    }
    g.fillStyle(0xffffff, 0.025);
    for (let x = 0; x < W; x += 24) g.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 24) g.fillRect(0, y, W, 1);

    title(this, W / 2, 64, 'CARREIRA', 20, UI.yellow).setOrigin(0.5).setAngle(-3);
    label(this, W / 2, 100, `ESCOLHA UM SAVE · ATÉ ${SLOT_COUNT} CARREIRAS`, 9, '#C9CEE0').setOrigin(0.5);

    const ch = 178;
    for (let n = 1; n <= SLOT_COUNT; n++) {
      const y = 128 + (n - 1) * (ch + 14);
      const s = peekSlot(n);
      if (s) this.filled(n, y, ch, s);
      else this.empty(n, y, ch);
    }

    // Voltar ao menu principal do jogo (um botão só)
    const menu = new GlassButton(this, W / 2, H - 52, { w: W - 32, h: 54, radius: 16 });
    menu.add(title(this, 0, 0, '‹ MENU PRINCIPAL', 11, '#FFFFFF').setOrigin(0.5));
    menu.onTap = () => this.time.delayedCall(30, () => this.scene.start('MainMenu'));
  }

  private filled(n: number, y: number, h: number, s: PlayerSave) {
    const W = GAME_W - 32;
    const team = s.draft ? TeamRepository.get(s.career.teamId ?? s.draft.teamId) : null;
    const c1 = team ? team.colors.primary : hexNum(s.college.colors[0]);
    const c2 = team ? team.colors.secondary : hexNum(s.college.colors[1]);
    const cur = n === activeSlot();
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.35);
    sh.fillRoundedRect(16, y + 5, W, h, 18);
    gradCard(this, 16, y, W, h, { from: c1, fromAlpha: 0.95, mid: 0x161a33, midAlpha: 0.9, to: CARD, toAlpha: 0.95, radius: 18, glow: true, stroke: cur ? OR : 0xffffff, strokeAlpha: cur ? 1 : 0.2, strokeWidth: cur ? 2 : 1 });
    if (team) this.add.image(16 + W - 56, y + 58, team.logo.large).setDisplaySize(88, 88).setAlpha(0.2);
    // Número do save
    const tag = this.add.graphics();
    tag.fillStyle(cur ? OR : 0x0a0c1a, cur ? 1 : 0.6);
    tag.fillRoundedRect(28, y + 12, 70, 20, 7);
    label(this, 63, y + 22, `SAVE ${n}`, 8, cur ? '#0D0D12' : '#FFFFFF').setOrigin(0.5);
    portrait(this, 28, y + 42, 92, { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard }, c1, c2, cur ? OR : 0xffffff);
    const x = 134;
    const nm = title(this, x, y + 54, `${s.firstName ? s.firstName + ' ' : ''}${s.name}`, 11, '#FFFFFF').setOrigin(0, 0.5);
    if (nm.width > W - x + 6) nm.setFontSize(8);
    label(this, x, y + 74, `QB #${s.number} · OVR ${s.ovr}`, 9, '#E8EAF2').setOrigin(0, 0.5);
    if (team) {
      this.add.image(x + 9, y + 96, team.logo.small).setDisplaySize(18, 18);
      label(this, x + 24, y + 96, team.name, 9, '#E8EAF2').setOrigin(0, 0.5);
      const c = s.career;
      label(this, x, y + 116, `TEMP. ${c.season} · SEM. ${Math.max(1, c.week)} · ${c.record.w}-${c.record.l}`, 9, '#FFD23F').setOrigin(0, 0.5);
    } else {
      label(this, x, y + 96, s.college.name, 8, '#E8EAF2').setOrigin(0, 0.5);
      label(this, x, y + 116, `FASE: ${stageOf(s)[0]}`, 9, '#FFD23F').setOrigin(0, 0.5);
    }
    label(this, 28, y + h - 18, s.updated ? `SALVO ${ago(s.updated)}` : '', 8, '#9AA3C0').setOrigin(0, 0.5);

    // Continuar (o cartão inteiro) e APAGAR (dois toques)
    this.add
      .zone(16, y, W - 110, h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.open(n, s));
    const go = new GlassButton(this, 16 + W - 64, y + h - 26, { w: 108, h: 36, radius: 12, fill: OR, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    go.add(title(this, 0, 0, 'JOGAR ›', 9, '#0D0D12').setOrigin(0.5));
    go.onTap = () => this.time.delayedCall(30, () => this.open(n, s));
    const armed = this.armed === n;
    const del = label(this, 16 + W - 14, y + 22, armed ? 'TOQUE DE NOVO P/ APAGAR' : 'APAGAR', 8, armed ? '#FF7B80' : '#C9CEE0').setOrigin(1, 0.5);
    const dz = this.add.zone(del.x - del.width - 10, y + 6, del.width + 20, 32).setOrigin(0).setInteractive({ useHandCursor: true });
    dz.on('pointerdown', () => {
      if (this.armed !== n) {
        this.armed = n;
        this.time.delayedCall(2600, () => {
          if (this.armed === n) {
            this.armed = -1;
            this.draw();
          }
        });
      } else {
        this.armed = -1;
        deleteSlot(n);
      }
      this.time.delayedCall(20, () => this.draw());
    });
  }

  private empty(n: number, y: number, h: number) {
    const W = GAME_W - 32;
    const g = this.add.graphics();
    g.fillStyle(CARD, 0.45);
    g.fillRoundedRect(16, y, W, h, 18);
    // borda tracejada
    g.lineStyle(2, 0xffffff, 0.22);
    const dash = (x0: number, y0: number, x1: number, y1: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d < len; d += 14) {
        const a = d / len;
        const b = Math.min(1, (d + 8) / len);
        g.lineBetween(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
      }
    };
    dash(34, y, 16 + W - 18, y);
    dash(34, y + h, 16 + W - 18, y + h);
    dash(16, y + 18, 16, y + h - 18);
    dash(16 + W, y + 18, 16 + W, y + h - 18);
    label(this, 30, y + 22, `SAVE ${n} · VAZIO`, 8, '#6E7593').setOrigin(0, 0.5);
    const plus = this.add.graphics();
    plus.fillStyle(OR, 1);
    plus.fillCircle(GAME_W / 2, y + h / 2 - 12, 22);
    plus.fillStyle(0x0d0d12, 1);
    plus.fillRect(GAME_W / 2 - 10, y + h / 2 - 14, 20, 4);
    plus.fillRect(GAME_W / 2 - 2, y + h / 2 - 22, 4, 20);
    title(this, GAME_W / 2, y + h / 2 + 26, 'NOVA CARREIRA', 10, '#FFFFFF').setOrigin(0.5);
    label(this, GAME_W / 2, y + h / 2 + 46, 'CRIE SEU QB DO ZERO', 8, '#9AA3C0').setOrigin(0.5);
    this.add
      .zone(16, y, W, h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        setActiveSlot(n);
        resetSave();
        updateSave({ name: '', firstName: '' }); // nome e sobrenome em branco: o jogador escolhe
        this.time.delayedCall(30, () => this.scene.start('CareerCreate'));
      });
  }

  private open(n: number, s: PlayerSave) {
    setActiveSlot(n);
    this.scene.start(stageOf(s)[1]);
  }
}
