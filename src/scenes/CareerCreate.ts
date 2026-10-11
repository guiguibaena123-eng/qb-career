import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { COLLEGES, hexNum } from '../data/colleges';
import type { KitDef } from '../data/TeamRepository';
import { PlayerBody } from '../player/PlayerBody';
import { BEARD_COUNT, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, PlayerFace, SKINS } from '../player/PlayerFace';
import { getSave, updateSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';

/*
 * Criação da carreira (Etapa 3): Nome → Faculdade → Rosto → Pele → Cabelo → Barba → Confirmação.
 * Tudo lê e grava no PlayerSave; o preview usa PlayerBody/PlayerFace, então o rosto é idêntico em
 * qualquer passo e na confirmação. `?passo=0..6` abre direto num passo.
 */
const STEPS = ['NOME', 'FACULDADE', 'ROSTO', 'PELE', 'CABELO', 'BARBA', 'CONFIRMAR'];
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

type Add = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

/** Uniforme universitário a partir das cores da faculdade. */
export function collegeKit(colors: [string, string]): KitDef {
  const p = hexNum(colors[0]);
  const s = hexNum(colors[1]);
  return { helmet: p, jersey: p, number: s, pants: 0xf4f1e8, stripe: s };
}

export class CareerCreate extends Phaser.Scene {
  private step = 0;
  private field: 'first' | 'last' = 'last';
  private ui!: Phaser.GameObjects.Container;

  constructor() {
    super('CareerCreate');
  }

  create() {
    setupHiRes(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0c1a).setOrigin(0);
    const raw = new URLSearchParams(location.search).get('passo');
    this.step = raw === null ? 0 : Phaser.Math.Clamp(Number(raw) || 0, 0, STEPS.length - 1);
    this.build();
  }

  private faceLook() {
    const s = getSave();
    return { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard };
  }

  private build() {
    this.ui?.destroy();
    this.ui = this.add.container(0, 0);
    const W = GAME_W;
    const H = GAME_H;
    const s = getSave();
    const add: Add = (o) => {
      this.ui.add(o);
      return o;
    };

    // Barra de progresso
    const bw = (W - 40 - 6 * 4) / 7;
    STEPS.forEach((_, i) => add(this.add.rectangle(20 + i * (bw + 4), 22, bw, 5, i <= this.step ? 0xffd23f : 0x2a3156).setOrigin(0, 0.5)));
    add(title(this, W / 2, 50, STEPS[this.step], 14, UI.yellow).setOrigin(0.5));
    add(label(this, W / 2, 72, `PASSO ${this.step + 1} DE ${STEPS.length}`, 8, UI.muted).setOrigin(0.5));

    const college = COLLEGES.find((c) => c.id === s.college.id) ?? COLLEGES[0];
    const kit = collegeKit(college.colors);
    if (this.step !== 0 && this.step !== 6) {
      // Antes do cartão final, só o rosto (a roupa de jogo aparece apenas na confirmação)
      add(new PlayerFace(this, W / 2, 196, this.faceLook(), 1.05, [hexNum(college.colors[0]), hexNum(college.colors[1])]));
    }

    let valid = true;
    switch (this.step) {
      case 0:
        valid = this.stepName(add);
        break;
      case 1:
        this.stepCollege(add);
        break;
      case 2:
        this.grid(add, FACE_COUNT, 5, 'face', 0.3, 340, (i) => ({ face: i }));
        break;
      case 3:
        this.colorRow(add, 380, SKINS, s.skin, (i) => this.apply({ skin: i }), 40);
        add(label(this, W / 2, 440, `TOM ${s.skin + 1} DE ${SKINS.length}`, 9, UI.muted).setOrigin(0.5));
        break;
      case 4:
        this.grid(add, HAIR_COUNT, 6, 'hair', 0.27, 332, (i) => ({ hair: i }));
        this.colorRow(add, 756, HAIR_COLORS, s.hairColor, (i) => this.apply({ hairColor: i }));
        break;
      case 5:
        this.grid(add, BEARD_COUNT + 1, 5, 'beard', 0.3, 340, (i) => ({ beard: i === 0 ? -1 : i - 1 }));
        break;
      case 6:
        this.stepConfirm(add, college.name, kit);
        return;
    }

    // Navegação
    const back = new GlassButton(this, 14 + 55, H - 40, { w: 110, h: 52, radius: 16 });
    back.add(label(this, 0, 0, this.step === 0 ? 'SAIR' : 'VOLTAR', 10, '#FFFFFF').setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => (this.step === 0 ? this.scene.start('CareerHub') : this.go(this.step - 1)));
    add(back);
    const pw = W - 28 - 110 - 10;
    const next = new GlassButton(this, W - 14 - pw / 2, H - 40, { w: pw, h: 52, radius: 16, fill: 0xffd23f, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    next.add(title(this, 0, 0, 'PRÓXIMO', 13, '#1a1a1a').setOrigin(0.5));
    next.onTap = () => this.time.delayedCall(30, () => this.go(this.step + 1));
    next.setEnabled(valid);
    add(next);
  }

  private go(n: number) {
    this.step = n;
    this.build();
  }

  /** Aplica uma mudança de rosto: grava e refaz a tela (preview ao vivo). */
  private apply(patch: Partial<ReturnType<CareerCreate['faceLook']>>) {
    updateSave(patch);
    this.build();
  }

  // ---- 1. nome
  private stepName(add: Add): boolean {
    const W = GAME_W;
    const s = getSave();
    const draw = (which: 'first' | 'last', y: number, name: string, val: string, max: number) => {
      const on = this.field === which;
      const f = new GlassButton(this, W / 2, y, { w: W - 40, h: 56, radius: 12, fill: on ? 0x3a4378 : UI.glass, border: on ? 0xffd23f : 0xffffff, borderAlpha: on ? 1 : 0.16 });
      f.add(label(this, -(W - 40) / 2 + 14, -14, name, 7, UI.muted).setOrigin(0, 0.5));
      f.add(title(this, -(W - 40) / 2 + 14, 8, val + (on ? '_' : ''), 15, '#FFFFFF').setOrigin(0, 0.5));
      f.add(label(this, (W - 40) / 2 - 14, -14, `${val.length}/${max}`, 7, UI.muted).setOrigin(1, 0.5));
      f.onTap = () => {
        this.field = which;
        this.build();
      };
      add(f);
    };
    draw('first', 130, 'NOME', s.firstName, 10);
    draw('last', 196, 'SOBRENOME (NOME NO UNIFORME)', s.name, 12);
    add(label(this, W / 2, 246, `UNIFORME: ${s.name || '—'}  #12`, 9, UI.yellow).setOrigin(0.5));

    const type = (ch: string) => {
      const key = this.field === 'first' ? 'firstName' : 'name';
      const max = this.field === 'first' ? 10 : 12;
      let v = getSave()[key];
      if (ch === '<') v = v.slice(0, -1);
      else if (v.length < max) v += ch;
      updateSave({ [key]: v });
      this.build();
    };
    const kw = 33;
    KEYS.forEach((row, r) => {
      const keys = r === 2 ? [...row, '<'] : [...row];
      keys.forEach((ch, i) => {
        const x = W / 2 + (i - (keys.length - 1) / 2) * (kw + 4);
        const k = new GlassButton(this, x, 330 + r * 50, { w: ch === '<' ? kw + 10 : kw, h: 42, radius: 8 });
        k.add(title(this, 0, 0, ch === '<' ? 'DEL' : ch, ch === '<' ? 8 : 12, '#FFFFFF').setOrigin(0.5));
        k.onTap = () => type(ch);
        add(k);
      });
    });
    return s.name.length >= 2;
  }

  // ---- 2. faculdade
  private stepCollege(add: Add) {
    const W = GAME_W;
    const cur = getSave().college.id;
    COLLEGES.forEach((c, i) => {
      const on = c.id === cur;
      const y = 345 + i * 52;
      const b = new GlassButton(this, W / 2, y, { w: W - 40, h: 46, radius: 12, fill: on ? 0x3a4378 : UI.glass, border: on ? 0xffd23f : 0xffffff, borderAlpha: on ? 1 : 0.16 });
      b.add(this.add.rectangle(-(W - 40) / 2 + 26, 0, 16, 28, hexNum(c.colors[0])));
      b.add(this.add.rectangle(-(W - 40) / 2 + 44, 0, 16, 28, hexNum(c.colors[1])));
      b.add(title(this, -(W - 40) / 2 + 66, 0, c.name, 9, '#FFFFFF').setOrigin(0, 0.5));
      b.onTap = () => {
        updateSave({ college: { id: c.id, name: c.name, colors: c.colors } });
        this.build();
      };
      add(b);
    });
  }

  // ---- 3, 5 e 6: grade de rostos / cabelos / barbas
  private grid(add: Add, count: number, cols: number, kind: 'face' | 'hair' | 'beard', sc: number, top: number, patch: (i: number) => object) {
    const W = GAME_W;
    const look = this.faceLook();
    const cell = Math.min(66, (W - 20) / cols);
    const sel = kind === 'beard' ? (look.beard < 0 ? 0 : look.beard + 1) : look[kind];
    for (let i = 0; i < count; i++) {
      const cx = W / 2 + ((i % cols) - (cols - 1) / 2) * cell;
      const cy = top + Math.floor(i / cols) * cell + cell / 2;
      const on = i === sel;
      const g = this.add.graphics();
      g.fillStyle(0x2a3156, 0.7);
      g.fillRoundedRect(cx - cell / 2 + 2, cy - cell / 2 + 2, cell - 4, cell - 4, 8);
      g.lineStyle(on ? 3 : 1, on ? 0xffd23f : 0xffffff, on ? 1 : 0.14);
      g.strokeRoundedRect(cx - cell / 2 + 2, cy - cell / 2 + 2, cell - 4, cell - 4, 8);
      add(g);
      if (kind === 'beard' && i === 0) {
        add(label(this, cx, cy, 'SEM\nBARBA', 7, '#FFFFFF').setOrigin(0.5).setAlign('center'));
      } else {
        add(new PlayerFace(this, cx, cy + 2, { ...look, ...(patch(i) as object) }, sc));
      }
      const z = this.add.zone(cx, cy, cell - 4, cell - 4).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.apply(patch(i) as never));
      add(z);
    }
  }

  private colorRow(add: Add, y: number, colors: number[], sel: number, pick: (i: number) => void, size = 36) {
    const W = GAME_W;
    const gap = Math.min(size + 6, (W - 20) / colors.length);
    colors.forEach((c, i) => {
      const x = W / 2 + (i - (colors.length - 1) / 2) * gap;
      const r = add(this.add.rectangle(x, y, gap - 4, size, c).setStrokeStyle(i === sel ? 3 : 1, i === sel ? 0xffd23f : 0xffffff, i === sel ? 1 : 0.3));
      r.setInteractive({ useHandCursor: true }).on('pointerup', () => pick(i));
    });
  }

  // ---- 7. confirmação
  private stepConfirm(add: Add, collegeName: string, kit: KitDef) {
    const W = GAME_W;
    const s = getSave();
    const card = this.add.graphics();
    card.fillStyle(0x2a3156, 0.75);
    card.fillRoundedRect(20, 90, W - 40, 560, 18);
    card.lineStyle(2, 0xffd23f, 0.8);
    card.strokeRoundedRect(20, 90, W - 40, 560, 18);
    add(card);
    add(label(this, W / 2, 112, 'ROOKIE', 9, UI.yellow).setOrigin(0.5));
    add(new PlayerBody(this, W / 2, 390, { look: s.look, kit, face: this.faceLook(), number: 12 }, 0.95));
    add(title(this, W / 2, 412, `${s.firstName ? s.firstName + ' ' : ''}${s.name}`, 15, '#FFFFFF').setOrigin(0.5));
    add(label(this, W / 2, 438, `${s.name} #${s.number} · ${collegeName}`, 8, UI.muted).setOrigin(0.5));
    add(title(this, W / 2, 478, `OVR ${s.ovr}`, 20, UI.yellow).setOrigin(0.5));
    const attrs: [string, number][] = [
      ['BRAÇO', s.attrs.arm],
      ['PRECISÃO', s.attrs.accuracy],
      ['LEITURA', s.attrs.reading],
      ['VELOCIDADE', s.attrs.speed],
    ];
    attrs.forEach(([n, v], i) => {
      const y = 518 + i * 30;
      add(label(this, 44, y, n, 9, '#C9CEE0').setOrigin(0, 0.5));
      add(this.add.rectangle(150, y, 150, 10, 0x0a0c1a).setOrigin(0, 0.5));
      add(this.add.rectangle(150, y, 150 * (v / 100), 10, 0x3ccb5a).setOrigin(0, 0.5));
      add(label(this, W - 44, y, String(v), 9, '#FFFFFF').setOrigin(1, 0.5));
    });
    const edit = new GlassButton(this, 14 + 55, GAME_H - 40, { w: 110, h: 52, radius: 16 });
    edit.add(label(this, 0, 0, 'EDITAR', 10, '#FFFFFF').setOrigin(0.5));
    edit.onTap = () => this.time.delayedCall(30, () => this.go(0));
    add(edit);
    const pw = W - 28 - 110 - 10;
    const go = new GlassButton(this, W - 14 - pw / 2, GAME_H - 40, { w: pw, h: 52, radius: 16, fill: 0xffd23f, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    go.add(title(this, 0, 0, 'IR PARA O COMBINE', 11, '#1a1a1a').setOrigin(0.5));
    go.onTap = () => {
      updateSave({ created: true });
      this.time.delayedCall(30, () => this.scene.start('CombineHub'));
    };
    add(go);
  }
}
