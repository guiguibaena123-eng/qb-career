import Phaser from 'phaser';
import { GAME_W, matchConfig } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { activeSlot, deleteSlot, peekSlot, recordText, resetSave, setActiveSlot, SLOT_COUNT, updateSave, type PlayerSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { portraitTexture } from '../ui/portrait';
import { C, feed, inkOn, plate, plateShadow, scoreBug, slideIn, TV, tvEnter, TvButton, tvText, wipeTo } from '../ui/tv';

/*
 * Saves da carreira (até 3), no pacote de transmissão: cada save é a "apresentação do jogador"
 * (foto no bloco da cor do time, nome grande, time e campanha). Vaga vazia = NOVA CARREIRA.
 * APAGAR pede dois toques. O placar do topo volta ao menu principal.
 */

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

const SH = 236;
const Y0 = 78;

export class CareerSlots extends Phaser.Scene {
  private armed = -1;
  private first = true;

  constructor() {
    super('CareerSlots');
  }

  create() {
    setupHiRes(this);
    this.armed = -1;
    this.first = true;
    this.draw();
    tvEnter(this);
  }

  private draw() {
    this.children.removeAll(true);
    const cur = peekSlot(activeSlot());
    const team = cur?.draft ? (cur.career.teamId ?? cur.draft.teamId) : matchConfig.home;
    feed(this, team, 0.8);
    scoreBug(this, { title: 'CARREIRA', step: `ATÉ ${SLOT_COUNT} SAVES`, onBack: () => wipeTo(this, 'MainMenu') });
    const items: Phaser.GameObjects.Container[] = [];
    for (let n = 1; n <= SLOT_COUNT; n++) {
      const y = Y0 + (n - 1) * (SH + 12);
      const s = peekSlot(n);
      items.push(s ? this.filled(n, y, s) : this.empty(n, y));
    }
    if (this.first) slideIn(this, items, 60, 60);
    this.first = false;
  }

  private filled(n: number, y: number, s: PlayerSave) {
    const W = GAME_W - 32;
    const x = 16;
    const team = s.draft ? TeamRepository.get(s.career.teamId ?? s.draft.teamId) : null;
    const c1 = team ? team.colors.primary : hexNum(s.college.colors[0]);
    const c2 = team ? team.colors.secondary : hexNum(s.college.colors[1]);
    const cur = n === activeSlot();
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    plateShadow(g, x, y, W, SH);
    plate(g, x, y, W, SH, TV.plate, 1);
    // bloco da cor do time com a foto
    plate(g, x, y, 136, SH, c1, 1, true, false);
    g.fillStyle(0x000000, 0.16);
    g.fillRect(x + 12, y + SH - 46, 120, 46);
    c.add(g);
    const face = { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard };
    c.add(this.add.image(x + 14, y + 24, portraitTexture(this, face, c1, c2, 112, 'slant')).setOrigin(0).setDisplaySize(112, 112));
    c.add(tvText(this, x + 70, y + SH - 23, `#${s.number}`, 26, inkOn(c1), 800, 0).setOrigin(0.5));
    // número do save (selo na borda) e o último jogado
    const chip = this.add.graphics();
    plate(chip, x + 18, y - 9, 62, 20, TV.ink);
    if (cur) plate(chip, x + 82, y - 9, 66, 20, TV.yellow);
    c.add(chip);
    c.add(tvText(this, x + 49, y + 1, `SAVE ${n}`, 12, C.white, 800, 1.2).setOrigin(0.5));
    if (cur) c.add(tvText(this, x + 115, y + 1, 'ÚLTIMO', 12, C.ink, 800, 1.2).setOrigin(0.5));
    // texto
    const tx = x + 148;
    const room = x + W - 14 - tx;
    const nm = tvText(this, tx, y + 40, `${s.firstName ? s.firstName + ' ' : ''}${s.name}`, 30, C.ink, 800, 0.4).setOrigin(0, 0.5);
    if (nm.width > room) nm.setScale(room / nm.width, 1);
    c.add(nm);
    c.add(tvText(this, tx, y + 70, `QB · OVR ${s.ovr}`, 16, C.inkSoft, 700, 1).setOrigin(0, 0.5));
    if (team) {
      c.add(this.add.image(tx + 11, y + 98, team.logo.small).setDisplaySize(22, 22));
      const tn = tvText(this, tx + 28, y + 98, team.name, 16, C.ink, 700, 0.8).setOrigin(0, 0.5);
      if (tn.width > room - 28) tn.setScale((room - 28) / tn.width, 1);
      c.add(tn);
      const cr = s.career;
      c.add(tvText(this, tx, y + 124, `TEMP. ${cr.season} · SEM. ${Math.max(1, cr.week)} · ${recordText(cr.record)}`, 16, C.ink, 800, 0.8).setOrigin(0, 0.5));
    } else {
      const cn = tvText(this, tx, y + 98, s.college.name, 15, C.ink, 600, 0.6).setOrigin(0, 0.5);
      if (cn.width > room) cn.setScale(room / cn.width, 1);
      c.add(cn);
      c.add(tvText(this, tx, y + 124, `FASE: ${stageOf(s)[0]}`, 16, C.ink, 800, 1).setOrigin(0, 0.5));
    }
    c.add(tvText(this, tx, y + 150, s.updated ? `SALVO ${ago(s.updated)}` : '', 13, C.inkSoft, 600, 1).setOrigin(0, 0.5));

    // Continuar (a placa inteira ou o botão JOGAR) e APAGAR (dois toques)
    const z = this.add.zone(x + 132, y, W - 132, SH - 50).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => this.open(n, s, c1));
    c.add(z);
    const go = new TvButton(this, x + W - 76, y + SH - 28, { w: 136, h: 42, fill: TV.ink, fillAlpha: 1, primary: true });
    go.add(tvText(this, -8, 0, 'JOGAR', 20, C.yellow, 800, 1.5).setOrigin(0.5));
    const ga = this.add.graphics();
    ga.lineStyle(3, TV.yellow, 1);
    ga.beginPath();
    ga.moveTo(34, -7);
    ga.lineTo(41, 0);
    ga.lineTo(34, 7);
    ga.strokePath();
    go.add(ga);
    go.onTap = () => this.open(n, s, c1);
    c.add(go);
    const armed = this.armed === n;
    const del = new TvButton(this, x + 148 + 52, y + SH - 28, { w: armed ? 160 : 100, h: 42, fill: armed ? TV.red : TV.ink3, fillAlpha: 1 });
    del.x = x + 148 + (armed ? 80 : 50);
    del.add(tvText(this, 0, 0, armed ? 'TOQUE P/ APAGAR' : 'APAGAR', 15, C.white, 700, 1).setOrigin(0.5));
    del.onTap = () => {
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
    };
    c.add(del);
    return c;
  }

  private empty(n: number, y: number) {
    const W = GAME_W - 32;
    const x = 16;
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    plate(g, x, y, W, SH, TV.ink, 0.7);
    // contorno tracejado (vaga aberta)
    g.lineStyle(1.5, TV.rule, 1);
    const s = Math.min(SH * 0.2126, 12);
    const pts: [number, number][] = [
      [x + s, y],
      [x + W, y],
      [x + W - s, y + SH],
      [x, y + SH],
      [x + s, y],
    ];
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d < len; d += 12) {
        const a = d / len;
        const b = Math.min(1, (d + 6) / len);
        g.lineBetween(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
      }
    }
    c.add(g);
    const chip = this.add.graphics();
    plate(chip, x + 18, y - 9, 62, 20, TV.ink3);
    c.add(chip);
    c.add(tvText(this, x + 49, y + 1, `SAVE ${n}`, 12, C.muted, 800, 1.2).setOrigin(0.5));
    const cx = GAME_W / 2;
    const plus = this.add.graphics();
    plate(plus, cx - 30, y + SH / 2 - 52, 60, 56, TV.yellow);
    plus.fillStyle(TV.ink, 1);
    plus.fillRect(cx - 12, y + SH / 2 - 26, 24, 4);
    plus.fillRect(cx - 2, y + SH / 2 - 36, 4, 24);
    c.add(plus);
    c.add(tvText(this, cx, y + SH / 2 + 30, 'NOVA CARREIRA', 26, C.white, 800, 1).setOrigin(0.5));
    c.add(tvText(this, cx, y + SH / 2 + 58, 'CRIE SEU QB DO ZERO', 15, C.muted, 600, 1).setOrigin(0.5));
    const z = this.add.zone(x, y, W, SH).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => {
      navigator.vibrate?.(8);
      plus.setAlpha(0.7);
    });
    z.on('pointerout', () => plus.setAlpha(1));
    z.on('pointerup', () => {
      setActiveSlot(n);
      resetSave();
      updateSave({ name: '', firstName: '' }); // nome e sobrenome em branco: o jogador escolhe
      wipeTo(this, 'CareerCreate', TV.yellow);
    });
    c.add(z);
    return c;
  }

  private open(n: number, s: PlayerSave, color: number) {
    setActiveSlot(n);
    wipeTo(this, stageOf(s)[1], color);
  }
}
