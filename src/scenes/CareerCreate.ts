import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { COLLEGES, hexNum } from '../data/colleges';
import type { KitDef } from '../data/TeamRepository';
import { PlayerBody } from '../player/PlayerBody';
import { BEARD_COUNT, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, PlayerFace, SKINS } from '../player/PlayerFace';
import { getSave, updateSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { jerseyTexture } from '../ui/jerseyArt';
import { C, feed, fillPlate, inkOn, plate, plateLine, plateShadow, scoreBug, strokePlate, TV, tvEnter, TvButton as GlassButton, tvText, wipeTo } from '../ui/tv';


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
    feed(this, null);
    const raw = new URLSearchParams(location.search).get('passo');
    this.step = raw === null ? 0 : Phaser.Math.Clamp(Number(raw) || 0, 0, STEPS.length - 1);
    this.field = null;
    this.build();
    tvEnter(this);
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

    // Placar do topo (voltar = passo anterior) e barra de passos
    add(scoreBug(this, { title: `CRIAR QB · ${STEPS[this.step]}`, step: `${this.step + 1} DE ${STEPS.length}`, onBack: () => (this.step === 0 ? wipeTo(this, 'CareerSlots') : this.go(this.step - 1)) }));
    const bw = (W - 24 - 6 * 3) / 7;
    const pg = this.add.graphics();
    STEPS.forEach((_, i) => plate(pg, 12 + i * (bw + 3), 62, bw, 7, i < this.step ? TV.yellow : i === this.step ? TV.plate : TV.ink3));
    add(pg);

    const college = COLLEGES.find((c) => c.id === s.college.id) ?? COLLEGES[0];
    const kit = collegeKit(college.colors);
    if (this.step !== 0 && this.step !== 6) {
      // Antes do cartão final, só o rosto (a roupa de jogo aparece apenas na confirmação)
      // passos com poucas opções mostram o rosto maior
      const big = this.step === 2 || this.step === 3 || this.step === 5;
      add(new PlayerFace(this, W / 2, big ? 226 : 196, this.faceLook(), big ? 1.4 : 1.05, [hexNum(college.colors[0]), hexNum(college.colors[1])]));
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
        this.grid(add, FACE_COUNT, 5, 'face', 0.33, 384, (i) => ({ face: i }), 72);
        break;
      case 3:
        this.colorRow(add, 520, SKINS, s.skin, (i) => this.apply({ skin: i }), 72);
        add(tvText(this, W / 2, 586, `TOM ${s.skin + 1} DE ${SKINS.length}`, 16, C.muted, 700, 1.4).setOrigin(0.5));
        break;
      case 4:
        this.grid(add, HAIR_COUNT, 6, 'hair', 0.27, 332, (i) => ({ hair: i }));
        this.colorRow(add, 756, HAIR_COLORS, s.hairColor, (i) => this.apply({ hairColor: i }));
        break;
      case 5:
        this.grid(add, BEARD_COUNT + 1, 5, 'beard', 0.33, 420, (i) => ({ beard: i === 0 ? -1 : i - 1 }), 72);
        break;
      case 6:
        this.stepConfirm(add, college.name, kit);
        return;
    }

    // Navegação
    const back = new GlassButton(this, 14 + 55, H - 40, { w: 110, h: 52, fill: TV.ink3, fillAlpha: 1 });
    back.add(tvText(this, 0, 0, this.step === 0 ? 'SAIR' : 'VOLTAR', 17, C.white, 800, 1.4).setOrigin(0.5));
    back.onTap = () => this.time.delayedCall(30, () => (this.step === 0 ? wipeTo(this, 'CareerSlots') : this.go(this.step - 1)));
    add(back);
    const pw = W - 28 - 110 - 10;
    const next = new GlassButton(this, W - 14 - pw / 2, H - 40, { w: pw, h: 52, fill: TV.yellow, fillAlpha: 1, primary: true });
    next.add(tvText(this, 0, 0, 'PRÓXIMO', 22, C.ink, 800, 1.6).setOrigin(0.5));
    next.onTap = () => this.time.delayedCall(30, () => this.go(this.step + 1));
    next.setEnabled(valid);
    add(next);
  }

  private go(n: number) {
    const dir = n > this.step ? 1 : -1;
    this.step = n;
    this.build();
    // cada passo entra deslizando do lado em que a pessoa está indo
    this.ui.setX(36 * dir).setAlpha(0.2);
    this.tweens.add({ targets: this.ui, x: 0, alpha: 1, duration: 300, ease: 'Expo.Out' });
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
    first: { x: 16, y: 88, w: GAME_W - 32, h: 62 },
    last: { x: 16, y: 158, w: GAME_W - 32, h: 62 },
    num: { x: 16, y: 228, w: 112, h: 76 },
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
      plate(g, f.x, f.y, f.w, f.h, on ? TV.ink3 : TV.ink2, 1);
      plateLine(g, f.x, f.y, f.w, f.h, on ? TV.yellow : TV.rule, 1, on ? 2 : 1);
      add(g);
      add(tvText(this, f.x + 16, f.y + 15, name, 12, on ? C.yellow : C.muted, 700, 1.4).setOrigin(0, 0.5));
      const empty = !val && !on;
      const big = which === 'num' ? 34 : 26;
      const v = add(tvText(this, f.x + 16, f.y + f.h / 2 + 10, empty ? (which === 'num' ? '–' : 'TOQUE PARA DIGITAR') : val, empty && which !== 'num' ? 17 : big, empty ? C.dim : C.white, 800, 0.6).setOrigin(0, 0.5));
      if (on) {
        // cursor: barra amarela piscando logo depois do texto
        const cur = add(this.add.rectangle(f.x + 16 + (val ? v.width + 4 : 0), f.y + f.h / 2 + 10, 3, big * 0.9, TV.yellow).setOrigin(0, 0.5));
        this.tweens.add({ targets: cur, alpha: 0, duration: 420, yoyo: true, repeat: -1, ease: 'Stepped' });
      }
      add(tvText(this, f.x + f.w - 16, f.y + 15, `${val.length}/${max}`, 12, C.dim, 700, 1).setOrigin(1, 0.5));
    };
    const num = s.number >= 0 ? String(s.number) : '';
    draw('first', 'NOME', s.firstName, 10);
    draw('last', 'SOBRENOME · VAI NAS COSTAS DA CAMISA', s.name, 12);
    draw('num', 'NÚMERO', num, 2);
    // Números clássicos de QB (atalho): placas grandes o bastante para o dedo
    const px = F.num.x + F.num.w + 10;
    add(tvText(this, px, F.num.y + 8, 'NÚMEROS CLÁSSICOS DE QB', 12, C.muted, 700, 1.2).setOrigin(0, 0.5));
    const picks = [1, 4, 7, 9, 10, 12, 15, 16, 17, 18];
    const cw = (W - 16 - px - 4 * 4) / 5;
    const chh = 28;
    picks.forEach((n, i) => {
      const x = px + (i % 5) * (cw + 4);
      const y = F.num.y + 20 + Math.floor(i / 5) * (chh + 4);
      const on = n === s.number;
      const g = this.add.graphics();
      plate(g, x, y, cw, chh, on ? TV.yellow : TV.ink3, 1);
      add(g);
      add(tvText(this, x + cw / 2, y + chh / 2, String(n), 16, on ? C.ink : C.white, 800, 0).setOrigin(0.5));
      const z = this.add.zone(x - 2, y - 2, cw + 4, chh + 4).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        navigator.vibrate?.(8);
        updateSave({ number: n });
        if (this.inputs.num) this.inputs.num.value = String(n);
        this.build();
      });
      add(z);
    });

    // Prévia: costas da camisa (arte detalhada em canvas) com o nome e o número
    const college = COLLEGES.find((c) => c.id === s.college.id) ?? COLLEGES[0];
    const jx = W / 2;
    const jy = 334;
    const jw = 280;
    const jh = 298;
    add(this.add.image(jx, jy, jerseyTexture(this, { primary: hexNum(college.colors[0]), secondary: hexNum(college.colors[1]), name: s.name, number: num, w: jw, h: jh })).setOrigin(0.5, 0).setDisplaySize(jw, jh));
    add(tvText(this, W / 2, jy + jh + 22, 'TOQUE NUM CAMPO PARA DIGITAR', 14, C.muted, 700, 1.4).setOrigin(0.5));
    return s.name.trim().length >= 2 && s.number >= 0 && s.number <= 99;
  }

  // ---- 2. faculdade
  private stepCollege(add: Add) {
    const W = GAME_W;
    const cur = getSave().college.id;
    COLLEGES.forEach((c, i) => {
      const on = c.id === cur;
      const y = 345 + i * 52;
      const b = new GlassButton(this, W / 2, y, { w: W - 40, h: 46, fill: on ? TV.ink3 : TV.ink2, fillAlpha: 1, border: TV.yellow, borderAlpha: on ? 1 : 0 });
      const sw = this.add.graphics();
      plate(sw, -(W - 40) / 2, -23, 30, 46, hexNum(c.colors[0]), 1, true, false);
      sw.fillStyle(hexNum(c.colors[1]), 1);
      sw.fillRect(-(W - 40) / 2 + 30, -23, 10, 46);
      b.add(sw);
      b.add(tvText(this, -(W - 40) / 2 + 56, 0, c.name, 18, on ? C.yellow : C.white, 800, 0.6).setOrigin(0, 0.5));
      b.onTap = () => {
        updateSave({ college: { id: c.id, name: c.name, colors: c.colors } });
        this.build();
      };
      add(b);
    });
  }

  // ---- 3, 5 e 6: grade de rostos / cabelos / barbas
  private grid(add: Add, count: number, cols: number, kind: 'face' | 'hair' | 'beard', sc: number, top: number, patch: (i: number) => object, max = 66) {
    const W = GAME_W;
    const look = this.faceLook();
    const cell = Math.min(max, (W - 20) / cols);
    const sel = kind === 'beard' ? (look.beard < 0 ? 0 : look.beard + 1) : look[kind];
    for (let i = 0; i < count; i++) {
      const cx = W / 2 + ((i % cols) - (cols - 1) / 2) * cell;
      const cy = top + Math.floor(i / cols) * cell + cell / 2;
      const on = i === sel;
      const g = this.add.graphics();
      g.fillStyle(TV.ink2, 1);
      fillPlate(g, cx - cell / 2 + 2, cy - cell / 2 + 2, cell - 4, cell - 4, 8);
      g.lineStyle(on ? 3 : 1, on ? TV.yellow : TV.rule, 1);
      strokePlate(g, cx - cell / 2 + 2, cy - cell / 2 + 2, cell - 4, cell - 4, 8);
      add(g);
      if (kind === 'beard' && i === 0) {
        add(tvText(this, cx, cy, 'SEM\nBARBA', 14, C.white, 800, 1).setOrigin(0.5).setAlign('center'));
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
      const r = add(this.add.rectangle(x, y, gap - 4, size, c).setStrokeStyle(i === sel ? 3 : 1, i === sel ? TV.yellow : TV.rule, 1));
      r.setInteractive({ useHandCursor: true }).on('pointerup', () => pick(i));
    });
  }

  // ---- 7. confirmação
  private stepConfirm(add: Add, collegeName: string, kit: KitDef) {
    const W = GAME_W;
    const s = getSave();
    // Cartão de apresentação do calouro: placa de tinta com o jogador sobre a cor da faculdade
    const c1 = hexNum(s.college.colors[0]);
    const c2 = hexNum(s.college.colors[1]);
    const cx = 20;
    const cw = W - 40;
    const card = this.add.graphics();
    plateShadow(card, cx, 96, cw, 640);
    plate(card, cx, 96, cw, 640, TV.ink2, 1);
    plate(card, cx, 96, cw, 340, c1, 1, true, true);
    card.fillStyle(c2, 1);
    card.fillRect(cx + 12, 430, cw - 24, 6);
    add(card);
    const chip = this.add.graphics();
    plate(chip, cx + 18, 86, 92, 22, TV.yellow);
    add(chip);
    add(tvText(this, cx + 64, 97, 'CALOURO', 13, C.ink, 800, 1.6).setOrigin(0.5));
    add(tvText(this, cx + cw - 20, 140, `#${s.number}`, 72, inkOn(c1), 800, 0).setOrigin(1, 0.5).setAlpha(0.22));
    add(new PlayerBody(this, W / 2, 418, { look: s.look, kit, face: this.faceLook(), number: Math.max(0, s.number) }, 0.95));
    // tarja branca com o nome
    const lt = this.add.graphics();
    plate(lt, cx + 12, 448, cw - 24, 74, TV.plate);
    plate(lt, cx + cw - 104, 456, 80, 58, TV.yellow);
    add(lt);
    const nm = tvText(this, cx + 28, 472, `${s.firstName ? s.firstName + ' ' : ''}${s.name}`, 26, C.ink, 800, 0.4).setOrigin(0, 0.5);
    if (nm.width > cw - 150) nm.setScale((cw - 150) / nm.width, 1);
    add(nm);
    const sub = tvText(this, cx + 28, 502, `QB · ${collegeName}`, 14, C.inkSoft, 600, 0.8).setOrigin(0, 0.5);
    if (sub.width > cw - 150) sub.setScale((cw - 150) / sub.width, 1);
    add(sub);
    add(tvText(this, cx + cw - 64, 474, String(s.ovr), 32, C.ink, 800, 0).setOrigin(0.5));
    add(tvText(this, cx + cw - 64, 500, 'OVR', 12, C.ink, 800, 1.6).setOrigin(0.5));
    const attrs: [string, number][] = [
      ['BRAÇO', s.attrs.arm],
      ['PRECISÃO', s.attrs.accuracy],
      ['LEITURA', s.attrs.reading],
      ['VELOCIDADE', s.attrs.speed],
    ];
    const bars = this.add.graphics();
    attrs.forEach(([n, v], i) => {
      const y = 562 + i * 40;
      add(tvText(this, cx + 22, y, n, 15, C.muted, 700, 1).setOrigin(0, 0.5));
      add(tvText(this, cx + cw - 22, y, String(v), 18, C.white, 800, 0).setOrigin(1, 0.5));
      bars.fillStyle(TV.ink, 1);
      bars.fillRect(cx + 130, y - 5, cw - 190, 10);
      bars.fillStyle(TV.yellow, 1);
      bars.fillRect(cx + 130, y - 5, (cw - 190) * (v / 100), 10);
    });
    add(bars);
    const edit = new GlassButton(this, 14 + 55, GAME_H - 40, { w: 110, h: 52, fill: TV.ink3, fillAlpha: 1 });
    edit.add(tvText(this, 0, 0, 'EDITAR', 17, C.white, 800, 1.4).setOrigin(0.5));
    edit.onTap = () => this.time.delayedCall(30, () => this.go(0));
    add(edit);
    const pw = W - 28 - 110 - 10;
    const go = new GlassButton(this, W - 14 - pw / 2, GAME_H - 40, { w: pw, h: 52, fill: TV.yellow, fillAlpha: 1, primary: true });
    go.add(tvText(this, 0, 0, 'IR PARA O COMBINE', 20, C.ink, 800, 1.2).setOrigin(0.5));
    go.onTap = () => {
      updateSave({ created: true });
      wipeTo(this, 'CombineHub', c1);
    };
    add(go);
  }
}
