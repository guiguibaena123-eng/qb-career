import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { COLLEGES, hexNum } from '../data/colleges';
import type { KitDef } from '../data/TeamRepository';
import { PlayerBody } from '../player/PlayerBody';
import { BEARD_COUNT, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, PlayerFace, SKINS } from '../player/PlayerFace';
import { getSave, updateSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { jerseyTexture } from '../ui/jerseyArt';
import { GlassButton, label, title, UI } from '../ui/widgets';

const fgOnHex = (c: number) => (((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114 > 150 ? '#0D0D12' : '#FFFFFF');

/*
 * Criação da carreira (Etapa 3): Nome → Faculdade → Rosto → Pele → Cabelo → Barba → Confirmação.
 * Tudo lê e grava no PlayerSave; o preview usa PlayerBody/PlayerFace, então o rosto é idêntico em
 * qualquer passo e na confirmação. `?passo=0..6` abre direto num passo.
 */
const STEPS = ['NOME', 'FACULDADE', 'ROSTO', 'PELE', 'CABELO', 'BARBA', 'CONFIRMAR'];

type Add = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

/** Uniforme universitário a partir das cores da faculdade. */
export function collegeKit(colors: [string, string]): KitDef {
  const p = hexNum(colors[0]);
  const s = hexNum(colors[1]);
  return { helmet: p, jersey: p, number: s, pants: 0xf4f1e8, stripe: s };
}

export class CareerCreate extends Phaser.Scene {
  private step = 0;
  private field: 'first' | 'last' | 'num' | null = null;
  private ui!: Phaser.GameObjects.Container;

  constructor() {
    super('CareerCreate');
  }

  create() {
    setupHiRes(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0c1a).setOrigin(0);
    const raw = new URLSearchParams(location.search).get('passo');
    this.step = raw === null ? 0 : Phaser.Math.Clamp(Number(raw) || 0, 0, STEPS.length - 1);
    this.field = null;
    this.build();
    // Campos de texto do celular: acompanham o tamanho do canvas e somem ao sair da cena
    const place = () => this.placeInputs();
    this.scale.on('resize', place);
    window.addEventListener('resize', place);
    this.events.once('shutdown', () => {
      window.removeEventListener('resize', place);
      for (const el of Object.values(this.inputs)) el?.remove();
      this.inputs = {};
    });
  }

  private faceLook() {
    const s = getSave();
    return { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard };
  }

  private build() {
    this.ui?.destroy();
    this.ui = this.add.container(0, 0);
    this.syncInputs();
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
    back.onTap = () => this.time.delayedCall(30, () => (this.step === 0 ? this.scene.start('CareerSlots') : this.go(this.step - 1)));
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

  // ---- 1. nome e número
  /**
   * Os campos são <input> de verdade (por cima do canvas, transparentes): tocar abre o teclado do
   * celular (o de números, no NÚMERO). O texto aparece desenhado no estilo do jogo.
   */
  private inputs: Partial<Record<'first' | 'last' | 'num', HTMLInputElement>> = {};

  /** Posição de cada campo na tela do jogo (coordenadas do jogo). */
  private static FIELDS = {
    first: { x: 20, y: 102, w: GAME_W - 40, h: 56 },
    last: { x: 20, y: 168, w: GAME_W - 40, h: 56 },
    num: { x: 20, y: 234, w: 150, h: 56 },
  };

  private syncInputs() {
    const want = this.step === 0;
    if (!want) {
      for (const el of Object.values(this.inputs)) el?.remove();
      this.inputs = {};
      return;
    }
    const s = getSave();
    const make = (which: 'first' | 'last' | 'num', max: number, value: string, numeric = false) => {
      let el = this.inputs[which];
      if (!el) {
        el = document.createElement('input');
        el.type = numeric ? 'tel' : 'text';
        if (numeric) el.inputMode = 'numeric';
        el.maxLength = max;
        el.autocomplete = 'off';
        el.spellcheck = false;
        el.setAttribute('autocapitalize', 'characters');
        el.setAttribute('autocorrect', 'off');
        // Transparente: o jogo desenha o texto; font-size 16px evita o zoom do iPhone ao focar
        Object.assign(el.style, { position: 'fixed', zIndex: '10', background: 'transparent', border: 'none', outline: 'none', color: 'transparent', caretColor: 'transparent', fontSize: '16px', padding: '0', margin: '0', opacity: '0.01' });
        el.value = value;
        el.addEventListener('focus', () => {
          // Número: seleciona o atual para que digitar substitua (o campo tem só 2 dígitos)
          if (numeric) setTimeout(() => el!.select(), 0);
          this.field = which;
          this.build();
        });
        el.addEventListener('input', () => {
          if (numeric) {
            el!.value = el!.value.replace(/\D/g, '').slice(0, 2);
            updateSave({ number: el!.value === '' ? -1 : Number(el!.value) });
          } else {
            const v = el!.value.toUpperCase().replace(/[^A-ZÇÁÉÍÓÚÃÕÂÊÔÀÜ' -]/g, '').replace(/ {2,}/g, ' ').replace(/^ /, '').slice(0, max);
            el!.value = v;
            updateSave(which === 'first' ? { firstName: v } : { name: v });
          }
          this.build();
        });
        el.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (which === 'first') this.inputs.last?.focus();
          else if (which === 'last') this.inputs.num?.focus();
          else el!.blur();
        });
        el.addEventListener('blur', () => {
          if (this.field === which) {
            this.field = null;
            if (this.step === 0) this.build();
          }
        });
        document.body.appendChild(el);
        this.inputs[which] = el;
      }
      return el;
    };
    make('first', 10, s.firstName);
    make('last', 12, s.name);
    make('num', 2, s.number >= 0 ? String(s.number) : '', true);
    this.placeInputs();
  }

  /** Coloca cada <input> exatamente sobre o campo desenhado (acompanha a escala do canvas). */
  private placeInputs() {
    const r = this.game.canvas.getBoundingClientRect();
    const k = r.width / GAME_W;
    for (const [which, el] of Object.entries(this.inputs)) {
      const f = CareerCreate.FIELDS[which as 'first' | 'last' | 'num'];
      if (!el) continue;
      Object.assign(el.style, { left: `${r.left + f.x * k}px`, top: `${r.top + f.y * k}px`, width: `${f.w * k}px`, height: `${f.h * k}px` });
    }
  }

  private stepName(add: Add): boolean {
    const W = GAME_W;
    const s = getSave();
    const F = CareerCreate.FIELDS;
    const draw = (which: 'first' | 'last' | 'num', name: string, val: string, max: number) => {
      const on = this.field === which;
      const f = F[which];
      const g = this.add.graphics();
      g.fillStyle(on ? 0x3a4378 : 0x1c2142, on ? 1 : 0.85);
      g.fillRoundedRect(f.x, f.y, f.w, f.h, 12);
      g.lineStyle(on ? 2 : 1, on ? 0xffd23f : 0xffffff, on ? 1 : 0.16);
      g.strokeRoundedRect(f.x, f.y, f.w, f.h, 12);
      add(g);
      add(label(this, f.x + 14, f.y + 14, name, 7, UI.muted).setOrigin(0, 0.5));
      const blink = on && Math.floor(this.time.now / 500) % 2 === 0;
      add(title(this, f.x + 14, f.y + 36, (val || (on ? '' : which === 'num' ? '–' : 'TOQUE PARA DIGITAR')) + (on ? '_' : ''), val || on ? 15 : 8, val || on ? '#FFFFFF' : '#6E7593').setOrigin(0, 0.5));
      void blink;
      add(label(this, f.x + f.w - 14, f.y + 14, `${val.length}/${max}`, 7, UI.muted).setOrigin(1, 0.5));
    };
    const num = s.number >= 0 ? String(s.number) : '';
    draw('first', 'NOME', s.firstName, 10);
    draw('last', 'SOBRENOME (NOME NO UNIFORME)', s.name, 12);
    draw('num', 'NÚMERO (0 A 99)', num, 2);
    // Números clássicos de QB (atalho)
    add(label(this, F.num.x + F.num.w + 14, F.num.y + 12, 'NÚMEROS DE QB', 7, UI.muted).setOrigin(0, 0.5));
    const picks = [1, 4, 7, 9, 10, 12, 15, 16, 17, 18];
    const cw = 34;
    picks.forEach((n, i) => {
      const x = F.num.x + F.num.w + 14 + (i % 5) * (cw + 3);
      const y = F.num.y + 22 + Math.floor(i / 5) * 18;
      const on = n === s.number;
      const g = this.add.graphics();
      g.fillStyle(on ? 0xffd23f : 0x2a3156, 1);
      g.fillRoundedRect(x, y, cw, 15, 4);
      add(g);
      add(label(this, x + cw / 2, y + 7.5, String(n), 8, on ? '#0D0D12' : '#FFFFFF').setOrigin(0.5));
      const z = this.add.zone(x, y, cw, 15).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        updateSave({ number: n });
        if (this.inputs.num) this.inputs.num.value = String(n);
        this.build();
      });
      add(z);
    });

    // Prévia: costas da camisa (arte detalhada em canvas) com o nome e o número
    const college = COLLEGES.find((c) => c.id === s.college.id) ?? COLLEGES[0];
    const jx = W / 2;
    const jy = 318;
    const jw = 270;
    const jh = 288;
    add(this.add.image(jx, jy, jerseyTexture(this, { primary: hexNum(college.colors[0]), secondary: hexNum(college.colors[1]), name: s.name, number: num, w: jw, h: jh })).setOrigin(0.5, 0).setDisplaySize(jw, jh));
    add(label(this, W / 2, jy + jh + 18, 'TOQUE NUM CAMPO: ABRE O TECLADO DO CELULAR', 7, UI.muted).setOrigin(0.5));
    return s.name.trim().length >= 2 && s.number >= 0 && s.number <= 99;
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
    add(new PlayerBody(this, W / 2, 390, { look: s.look, kit, face: this.faceLook(), number: Math.max(0, s.number) }, 0.95));
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
