import Phaser from 'phaser';
import { divisionOf, league } from '../career/league';
import { ROUND_INFO } from '../career/playoffs';
import { KIT_IDS, kitAccents, type KitId } from '../career/kits';
import { careerTeam, coachOf, nextGame, PRIME } from '../career/season';
import { GAME_H, GAME_W } from '../config';
import type { CareerTeam } from '../data/TeamRepository';
import { teamById } from '../data/teams';
import { startCareerMatch } from '../integration/MatchBridge';
import { PlayerBody } from '../player/PlayerBody';
import type { FaceLook } from '../player/PlayerFace';
import { getSave, updateSave } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { gradCard } from '../ui/gradcard';
import { portrait as drawPortrait } from '../ui/portrait';
import { weatherIcon, WX_NAME } from '../ui/weatherIcon';
import { GlassButton, label, title } from '../ui/widgets';

/*
 * Pré-jogo da carreira: antes de cada partida mostra o confronto (times, campanhas, estádio, força
 * lado a lado, o jogador para ficar de olho) e a escolha do uniforme com o corpo do jogador vestido
 * em cada kit. ENTRAR EM CAMPO abre a partida pelo MatchBridge com o kit escolhido.
 */

const OR = 0xf26b1d;
const GR = 0x3ccb5a;
const YE = 0xffd23f;
const RD = 0xff7b80;
const CARD = 0x22284a;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const KIT_NAMES: Record<KitId, string> = { home: 'CASA', away: 'FORA', night: 'NOITE' };

export class PreJogo extends Phaser.Scene {
  private kitCards: { id: KitId; ring: Phaser.GameObjects.Graphics; check: Phaser.GameObjects.Container; x: number; w: number }[] = [];

  constructor() {
    super('PreJogo');
  }

  create() {
    setupHiRes(this);
    this.kitCards = [];
    const g = nextGame();
    if (!g?.opp) return this.scene.start('CarreiraMenu');
    const me = careerTeam();
    const opp = g.opp;
    const W = GAME_W;
    this.drawBackground(me, opp);

    // Topo
    const pr = g.prime ? PRIME[g.prime] : null;
    const back = this.add.zone(30, 36, 52, 52).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('CarreiraMenu'));
    title(this, 22, 36, '‹', 16, '#FFFFFF').setOrigin(0, 0.5);
    title(this, 52, 28, 'PRÉ-JOGO', 12, '#FFFFFF');
    label(this, 52, 46, g.final ? `A GRANDE FINAL · ${g.when} · CAMPO NEUTRO` : g.round ? `${ROUND_INFO[g.round].sub} · ${g.when} · ${g.home ? 'EM CASA' : 'FORA'}` : `SEMANA ${g.week} · ${g.when} · ${g.home ? 'EM CASA' : 'FORA'}`, 9, '#C9CEE0');

    // Confronto (horário nobre: degradê e faixa da transmissão)
    const lg = league();
    const rec = (t: CareerTeam) => {
      const x = lg.teams.get(t.id)!;
      return `${x.w}-${x.l}${x.t ? `-${x.t}` : ''}`;
    };
    const y0 = 76;
    const hh = 150;
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.35);
    sh.fillRoundedRect(16, y0 + 4, W - 32, hh, 18);
    gradCard(
      this,
      16,
      y0,
      W - 32,
      hh,
      pr
        ? { from: pr.color, mid: 0x0d0f1f, midAlpha: 0.95, to: pr.color, radius: 18, glow: true, stroke: pr.glow, strokeAlpha: 0.9, strokeWidth: 2, sheen: 0.18 }
        : { from: me.colors.primary, mid: 0x161a33, midAlpha: 0.92, to: opp.colors.primary, radius: 18, glow: true, strokeAlpha: 0.25 },
    );
    if (pr) {
      for (let i = 0; i < 12; i++) {
        const st = this.add.star(30 + ((i * 113) % (W - 60)), y0 + 18 + ((i * 41) % 110), 4, 1.2, i % 3 ? 2.5 : 4, 0xffffff).setAlpha(0.2);
        this.tweens.add({ targets: st, alpha: 0.9, duration: 600 + (i % 4) * 150, yoyo: true, repeat: -1, delay: i * 120 });
      }
      const rg = this.add.graphics();
      const rt = title(this, W / 2, y0, `★ ${pr.name} ★`, 8, '#0D0D12').setOrigin(0.5);
      const rw = rt.width + 26;
      rg.fillStyle(pr.glow, 1);
      rg.fillRoundedRect(W / 2 - rw / 2, y0 - 10, rw, 20, 8);
    }
    const side = (t: CareerTeam, cx: number) => {
      this.add.image(cx, y0 + 54, t.logo.large).setDisplaySize(72, 72);
      const n = title(this, cx, y0 + 102, t.name, 8, '#FFFFFF').setOrigin(0.5);
      if (n.width > 150) n.setFontSize(6);
      label(this, cx, y0 + 118, `${rec(t)} · OVR ${t.ovr}`, 9, '#E8EAF2').setOrigin(0.5);
    };
    side(me, 96);
    side(opp, W - 96);
    this.add
      .text(W / 2, y0 + 56, g.home ? 'VS' : '@', { fontFamily: '"Press Start 2P", monospace', fontSize: '22px', color: hex(pr ? pr.glow : YE), stroke: '#0D0D12', strokeThickness: 6 })
      .setOrigin(0.5)
      .setAngle(-6);
    const sameDiv = divisionOf(me).div === divisionOf(opp).div;
    label(this, W / 2, y0 + 138, sameDiv ? `CLÁSSICO DA ${divisionOf(me).full}` : `${divisionOf(opp).full} · TÉC. ${coachOf(opp).name}`, 8, sameDiv ? hex(YE) : '#C9CEE0').setOrigin(0.5);

    // Estádio (miniatura) e clima
    const y1 = y0 + hh + 10;
    const host = g.home ? me : opp;
    this.card(16, y1, W - 32, 78);
    const tw = 112;
    const th = 62;
    if (g.final) {
      const tg = this.add.graphics();
      tg.fillStyle(0x10163a, 1);
      tg.fillRect(24, y1 + 8, tw, th);
      this.add.image(24 + tw / 2, y1 + 8 + th / 2, 'logoQflBowl').setDisplaySize(th - 4, th - 4);
    } else if (host.stadium.image && this.textures.exists(host.stadium.image)) {
      this.add.image(24, y1 + 8, host.stadium.image).setOrigin(0).setDisplaySize(tw, th);
    } else {
      const tg = this.add.graphics();
      tg.fillStyle(0x2a3156, 1);
      tg.fillRect(24, y1 + 8, tw, th);
    }
    const fr = this.add.graphics();
    if (g.tod === 'night') {
      fr.fillStyle(0x0a0c1a, 0.4);
      fr.fillRect(24, y1 + 8, tw, th);
    }
    fr.lineStyle(2, 0xffffff, 0.35);
    fr.strokeRoundedRect(24, y1 + 8, tw, th, 6);
    const tx = 24 + tw + 12;
    const sn = title(this, tx, y1 + 18, g.final ? 'QFL BOWL' : host.stadium.name, 7, g.final ? '#FFD23F' : '#FFFFFF').setOrigin(0, 0.5);
    if (sn.width > W - 16 - tx - 8) sn.setFontSize(6);
    label(this, tx, y1 + 34, g.final ? 'CAMPO NEUTRO · ARQUIBANCADA ALTA · ' + (g.tod === 'night' ? 'NOITE' : 'DIA') : `${host.stadium.capacity.toLocaleString('pt-BR')} LUGARES · ${g.tod === 'night' ? 'NOITE' : g.tod === 'dusk' ? 'FIM DE TARDE' : 'DIA'}`, 8, '#9AA3C0').setOrigin(0, 0.5);
    weatherIcon(this, tx + 14, y1 + 58, g.weather, 26, g.tod === 'night');
    title(this, tx + 34, y1 + 53, WX_NAME[g.weather], 8, g.weather === 'snow' ? '#E8F1FF' : g.weather === 'rain' ? '#7FBFFF' : hex(YE)).setOrigin(0, 0.5);
    label(this, tx + 34, y1 + 68, `${g.temp}°C${g.weather === 'snow' ? ' · CAMPO PESADO' : g.weather === 'rain' ? ' · BOLA MOLHADA' : ''}`, 8, '#C9CEE0').setOrigin(0, 0.5);

    // Força lado a lado
    const y2 = y1 + 88;
    this.card(16, y2, W - 32, 100);
    const a = teamById(me.id);
    const b = teamById(opp.id);
    const rows: [string, number, number][] = [
      ['OVR', me.ovr, opp.ovr],
      ['ATAQUE', a.atk, b.atk],
      ['DEFESA', a.def, b.def],
      ['ESPECIAIS', a.esp, b.esp],
    ];
    const mid = W / 2;
    rows.forEach(([n, va, vb], i) => {
      const yy = y2 + 17 + i * 22;
      label(this, mid, yy, n, 8, '#9AA3C0').setOrigin(0.5);
      const bw = 104;
      const bar = this.add.graphics();
      bar.fillStyle(0x0f1224, 1);
      bar.fillRoundedRect(mid - 44 - bw, yy - 4, bw, 8, 4);
      bar.fillRoundedRect(mid + 44, yy - 4, bw, 8, 4);
      bar.fillStyle(va >= vb ? GR : 0x8a91a8, 1);
      bar.fillRoundedRect(mid - 44 - (bw * va) / 100, yy - 4, (bw * va) / 100, 8, 4);
      bar.fillStyle(vb > va ? RD : 0x8a91a8, 1);
      bar.fillRoundedRect(mid + 44, yy - 4, (bw * vb) / 100, 8, 4);
      title(this, 30, yy, String(va), 8, va >= vb ? hex(GR) : '#C9CEE0').setOrigin(0, 0.5);
      title(this, W - 30, yy, String(vb), 8, vb > va ? hex(RD) : '#C9CEE0').setOrigin(1, 0.5);
    });

    // Fique de olho: QB deles (com foto) e a fase do adversário
    const y3 = y2 + 110;
    this.card(16, y3, W - 32, 64);
    const qb = lg.players.find((p) => p.team.id === opp.id && p.pos === 'QB')!;
    this.portrait(26, y3 + 8, 48, qb.face, opp);
    label(this, 86, y3 + 15, 'FIQUE DE OLHO', 8, hex(OR)).setOrigin(0, 0.5);
    title(this, 86, y3 + 32, `${qb.name} · QB`, 8, '#FFFFFF').setOrigin(0, 0.5);
    const s = qb.season;
    label(this, 86, y3 + 50, s.gp ? `${s.pyds.toLocaleString('pt-BR')} JD · ${s.ptd} TD · ${s.int} INT · OVR ${qb.ovr}` : `OVR ${qb.ovr} · ${qb.age} ANOS · ${qb.tag}`, 8, '#C9CEE0').setOrigin(0, 0.5);
    const last = lg.teams.get(opp.id)!.last;
    last.forEach((r, i) => {
      const x = W - 28 - (last.length - 1 - i) * 18;
      const c = this.add.graphics();
      c.fillStyle(r === 'V' ? GR : r === 'D' ? RD : 0x8a91a8, 1);
      c.fillRoundedRect(x - 8, y3 + 7, 16, 16, 5);
      label(this, x, y3 + 15, r, 8, '#0D0D12').setOrigin(0.5);
    });

    // Uniforme
    const y4 = y3 + 76;
    title(this, 16, y4, 'ESCOLHA O UNIFORME', 9, '#FFFFFF');
    label(this, W - 16, y4 + 2, 'O ADVERSÁRIO USA O QUE MAIS CONTRASTA', 7, '#6E7593').setOrigin(1, 0);
    const save = getSave();
    const face: FaceLook = { face: save.face, skin: save.skin, hair: save.hair, hairColor: save.hairColor, beard: save.beard };
    const cw = (W - 32 - 16) / 3;
    const ch = GAME_H - 96 - (y4 + 20);
    KIT_IDS.forEach((id, i) => {
      const x = 16 + i * (cw + 8);
      const y = y4 + 20;
      const kit = me.kits[id];
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.3);
      bg.fillRoundedRect(x, y + 4, cw, ch, 16);
      gradCard(this, x, y, cw, ch, { from: kit.jersey, fromAlpha: 0.75, to: CARD, toAlpha: 0.92, mid: kit.stripe, midAlpha: 0.25, radius: 16, glow: true, strokeAlpha: 0 });
      // chão
      const fl = this.add.graphics();
      fl.fillStyle(0x000000, 0.35);
      fl.fillEllipse(x + cw / 2, y + ch - 40, cw * 0.7, 12);
      const scale = Math.min((cw - 8) / 150, (ch - 60) / 300);
      new PlayerBody(this, x + cw / 2, y + ch - 40, { look: { ...save.look, kit: id, ...kitAccents(id, kit) }, kit, face, number: save.number }, scale);
      title(this, x + cw / 2, y + ch - 18, KIT_NAMES[id], 9, '#FFFFFF').setOrigin(0.5);
      const ring = this.add.graphics();
      const check = this.add.container(x + cw - 16, y + 16);
      const cg = this.add.graphics();
      cg.fillStyle(OR, 1);
      cg.fillCircle(0, 0, 11);
      cg.lineStyle(3, 0x0d0d12, 1);
      cg.beginPath();
      cg.moveTo(-5, 0);
      cg.lineTo(-1, 4);
      cg.lineTo(5, -4);
      cg.strokePath();
      check.add(cg);
      this.kitCards.push({ id, ring, check, x, w: cw });
      this.add
        .zone(x, y, cw, ch)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.pickKit(id));
    });
    this.refreshKits(y4 + 20, ch);

    // Entrar em campo
    const btn = new GlassButton(this, W / 2, GAME_H - 26 - 29, { w: W - 32, h: 58, radius: 18, fill: OR, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    btn.add(title(this, 0, 0, 'ENTRAR EM CAMPO ›', 12, '#0D0D12').setOrigin(0.5));
    btn.onTap = () => this.time.delayedCall(30, () => startCareerMatch(this));
  }

  private kitTop = 0;
  private kitH = 0;

  private pickKit(id: KitId) {
    const me = careerTeam();
    navigator.vibrate?.(8);
    updateSave({ look: { ...getSave().look, kit: id, ...kitAccents(id, me.kits[id]) } });
    this.refreshKits(this.kitTop, this.kitH);
  }

  private refreshKits(top: number, h: number) {
    this.kitTop = top;
    this.kitH = h;
    const cur = getSave().look.kit;
    for (const k of this.kitCards) {
      const on = k.id === cur;
      k.ring.clear();
      k.ring.lineStyle(on ? 3 : 1, on ? OR : 0xffffff, on ? 1 : 0.18);
      k.ring.strokeRoundedRect(k.x, top, k.w, h, 16);
      k.check.setVisible(on);
    }
  }

  private card(x: number, y: number, w: number, h: number) {
    const g = this.add.graphics();
    g.fillStyle(CARD, 0.78);
    g.fillRoundedRect(x, y, w, h, 16);
    g.lineStyle(1, 0xffffff, 0.14);
    g.strokeRoundedRect(x, y, w, h, 16);
  }

  private portrait(x: number, y: number, size: number, face: FaceLook, team: CareerTeam) {
    drawPortrait(this, x, y, size, face, team.colors.primary, team.colors.secondary);
  }

  private drawBackground(me: CareerTeam, opp: CareerTeam) {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x0a0c1a, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    for (let i = 12; i > 0; i--) {
      g.fillStyle(me.colors.primary, 0.03);
      g.fillEllipse(0, 120, (300 * i) / 12 * 2, (260 * i) / 12 * 2);
      g.fillStyle(opp.colors.primary, 0.03);
      g.fillEllipse(GAME_W, 120, (300 * i) / 12 * 2, (260 * i) / 12 * 2);
    }
    g.fillStyle(0xffffff, 0.025);
    for (let x = 0; x < GAME_W; x += 24) g.fillRect(x, 0, 1, GAME_H);
    for (let y = 0; y < GAME_H; y += 24) g.fillRect(0, y, GAME_W, 1);
  }
}
