import Phaser from 'phaser';
import { stadiumPhoto, stadiumSlot } from '../ui/stadiumPhoto';
import { divisionOf, league } from '../career/league';
import { ROUND_INFO } from '../career/playoffs';
import { KIT_IDS, kitAccents, type KitId } from '../career/kits';
import { careerTeam, coachOf, nextGame, PRIME } from '../career/season';
import { GAME_H, GAME_W, VIEW } from '../config';

/** Altura útil e área visível desta tela (palco um pouco maior no iPhone: ver setupFitWidth). */
let MH = GAME_H;
let MV = VIEW;
import type { CareerTeam } from '../data/TeamRepository';
import { teamById } from '../data/teams';
import { startCareerMatch } from '../integration/MatchBridge';
import { PlayerBody } from '../player/PlayerBody';
import type { FaceLook } from '../player/PlayerFace';
import { getSave, updateSave } from '../player/PlayerSave';
import { setupFitWidth } from '../systems/hires';
import { portraitTexture } from '../ui/portrait';
import { C, feed, inkOn, mix, onInk, plate, plateShadow, underline, scoreBug, sectionHead, slideIn, TV, tvEnter, TvButton, tvText, wipeTo } from '../ui/tv';
import { weatherIcon, WX_NAME } from '../ui/weatherIcon';

/*
 * Pré-jogo da carreira, como a abertura da transmissão: os dois times frente a frente, a força lado a
 * lado, o estádio e o clima numa tarja, o jogador para ficar de olho e a escolha do uniforme com o
 * corpo do jogador vestido em cada kit. ENTRAR EM CAMPO abre a partida pelo MatchBridge.
 */

const KIT_NAMES: Record<KitId, string> = { home: 'CASA', away: 'FORA', night: 'NOITE' };

export class PreJogo extends Phaser.Scene {
  private kitCards: { id: KitId; bg: TvButton; name: Phaser.GameObjects.Text; x: number; y: number; w: number; h: number }[] = [];
  private kitRing: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('PreJogo');
  }

  create() {
    ({ h: MH, view: MV } = setupFitWidth(this, 800, 0.6));
    this.kitCards = [];
    this.kitRing = null;
    const g = nextGame();
    if (!g?.opp) return this.scene.start('CarreiraMenu');
    const me = careerTeam();
    const opp = g.opp;
    const W = GAME_W;
    const host = g.home ? me : opp;
    feed(this, g.final ? me.id : host.id, 0.8);
    const where = g.final ? 'CAMPO NEUTRO' : g.home ? 'EM CASA' : 'FORA';
    const when = g.final ? 'A GRANDE FINAL' : g.round ? ROUND_INFO[g.round].sub : `SEMANA ${g.week}`;
    scoreBug(this, { title: 'PRÉ-JOGO', step: `${when} · ${where}`, onBack: () => wipeTo(this, 'CarreiraMenu', me.colors.primary), team: { abbr: teamById(me.id).abbr, color: me.colors.primary } });

    // Transmissão de horário nobre: faixa com o nome do programa
    const pr = g.prime ? PRIME[g.prime] : null;
    let top = 66;
    if (pr) {
      const pg = this.add.graphics();
      plate(pg, MV.x, 60, MV.w, 30, TV.plate, 1, false, false);
      pg.fillStyle(TV.yellow, 1);
      pg.fillRect(MV.x, 88, MV.w, 3);
      tvText(this, W / 2, 75, `${pr.pt} · ${g.when}`, 16, C.ink, 800, 2.4).setOrigin(0.5);
      top = 96;
    }

    // ---- confronto
    const lg = league();
    const rec = (t: CareerTeam) => {
      const x = lg.teams.get(t.id)!;
      return `${x.w}-${x.l}${x.t ? `-${x.t}` : ''}`;
    };
    const ph = 150;
    const mid = W / 2;
    const sk = 18;
    const panel = (t: CareerTeam, left: boolean) => {
      const col = t.colors.primary;
      const fg = inkOn(col);
      // painéis vão até as bordas da tela
      const pts = left
        ? [[MV.x, top], [mid + sk - 3, top], [mid - sk - 3, top + ph], [MV.x, top + ph]]
        : [[mid + sk + 3, top], [MV.x + MV.w, top], [MV.x + MV.w, top + ph], [mid - sk + 3, top + ph]];
      const pg = this.add.graphics();
      pg.fillStyle(col, 1);
      pg.fillPoints(pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
      const cx = left ? W * 0.25 - 6 : W * 0.75 + 6;
      this.add.image(cx, top + 52, t.logo.large).setDisplaySize(76, 76);
      const n = tvText(this, cx, top + 106, t.name, 20, fg, 800, 0.6).setOrigin(0.5);
      if (n.width > W / 2 - 44) n.setScale((W / 2 - 44) / n.width, 1);
      tvText(this, cx, top + 130, `${rec(t)} · OVR ${t.ovr}`, 15, fg, 700, 1).setOrigin(0.5).setAlpha(0.85);
    };
    panel(me, true);
    panel(opp, false);
    const vs = this.add.graphics();
    plateShadow(vs, mid - 24, top + 40, 48, 32);
    plate(vs, mid - 24, top + 40, 48, 32, TV.yellow);
    tvText(this, mid, top + 56, g.home || g.final ? 'VS' : '@', 21, C.ink, 800).setOrigin(0.5);

    // linha da divisão / técnico
    const sameDiv = divisionOf(me).div === divisionOf(opp).div;
    const ig = this.add.graphics();
    ig.fillStyle(TV.ink, 0.94);
    ig.fillRect(MV.x, top + ph, MV.w, 28);
    tvText(this, W / 2, top + ph + 14, sameDiv ? `CLÁSSICO DA ${divisionOf(me).full}` : `${divisionOf(opp).full} · TÉC. ${coachOf(opp).name}`, 14, sameDiv ? C.yellow : C.muted, 700, 1.2).setOrigin(0.5);

    // Cartão escuro padrão das faixas de informação (mesma margem, mesma cor, traço amarelo no topo)
    const infoCard = (y: number, h: number, accent: number = TV.yellow) => {
      const cg = this.add.graphics();
      plateShadow(cg, 16, y, W - 32, h, true, true, 0.8);
      plate(cg, 16, y, W - 32, h, TV.ink2, 1);
      const s0 = Math.min(h * 0.2126, 12);
      cg.fillStyle(accent, 1);
      cg.fillRect(16 + s0, y, W - 32 - s0, 3);
      return cg;
    };

    // ---- força lado a lado (barras saem do meio; quem é melhor fica aceso)
    const fy = top + ph + 36;
    const fh = 84;
    infoCard(fy, fh, TV.rule);
    const a = teamById(me.id);
    const b = teamById(opp.id);
    const rows: [string, number, number][] = [
      ['ATAQUE', a.atk, b.atk],
      ['DEFESA', a.def, b.def],
      ['ESPECIAIS', a.esp, b.esp],
    ];
    const trackL = mid - 50 - 64;
    rows.forEach(([n, va, vb], i) => {
      const yy = fy + 20 + i * 23;
      const len = (v: number) => Math.max(6, Math.min(1, (v - 50) / 50) * trackL);
      const bars = this.add.graphics();
      bars.fillStyle(TV.ink, 1);
      bars.fillRect(64, yy - 4, trackL, 8);
      bars.fillRect(mid + 50, yy - 4, trackL, 8);
      bars.fillStyle(onInk(me.colors.primary), va >= vb ? 1 : 0.4);
      bars.fillRect(mid - 50 - len(va), yy - 4, len(va), 8);
      bars.fillStyle(onInk(opp.colors.primary), vb >= va ? 1 : 0.4);
      bars.fillRect(mid + 50, yy - 4, len(vb), 8);
      tvText(this, mid, yy, n, 12, C.muted, 700, 1.2).setOrigin(0.5);
      tvText(this, 32, yy, String(va), 17, va >= vb ? C.white : C.dim, 800).setOrigin(0, 0.5);
      tvText(this, W - 32, yy, String(vb), 17, vb >= va ? C.white : C.dim, 800).setOrigin(1, 0.5);
    });

    // ---- estádio e clima
    const y3 = fy + fh + 10;
    const sh = 70;
    infoCard(y3, sh);
    const tw = 100;
    if (g.final) {
      const tg = this.add.graphics();
      plate(tg, 16, y3, tw, sh, 0x10163a, 1, true, true);
      this.add.image(16 + tw / 2, y3 + sh / 2, 'logoQflBowl').setDisplaySize(sh - 10, sh - 10);
    } else if (host.stadium.image) {
      // ilustração recortada na placa inclinada (máscara geométrica no lugar reservado)
      const key = host.stadium.image;
      const slot = stadiumSlot(this, key, (sl) => {
        sl.add(this.add.image(16, y3, stadiumPhoto(this, key, tw, sh)).setOrigin(0).setDisplaySize(tw, sh));
        if (g.tod === 'night') {
          const nt = this.add.graphics();
          plate(nt, 16, y3, tw, sh, 0x0a1030, 0.42, true, true);
          sl.add(nt);
        }
      });
      const mk = this.make.graphics({ x: 0, y: 0 }, false);
      plate(mk, 16, y3, tw, sh, 0xffffff, 1, true, true);
      slot.setMask(mk.createGeometryMask());
    }
    const tx = 16 + tw + 12;
    const colR = W - 16 - 104;
    const sn = tvText(this, tx, y3 + 18, g.final ? 'QFL BOWL' : host.stadium.name, 17, C.white, 800, 0.6).setOrigin(0, 0.5);
    if (sn.width > colR - tx - 8) sn.setScale((colR - tx - 8) / sn.width, 1);
    const cap = tvText(this, tx, y3 + 39, g.final ? 'CAMPO NEUTRO' : `${host.stadium.capacity.toLocaleString('pt-BR')} LUGARES`, 13, C.muted, 700, 0.6).setOrigin(0, 0.5);
    if (cap.width > colR - tx - 8) cap.setScale((colR - tx - 8) / cap.width, 1);
    tvText(this, tx, y3 + 57, `${g.tod === 'night' ? 'NOITE' : g.tod === 'dusk' ? 'FIM DE TARDE' : 'DIA'} · ${g.when}`, 12, C.muted, 700, 0.8).setOrigin(0, 0.5);
    // coluna do clima (separada por um fio)
    const sep = this.add.graphics();
    sep.fillStyle(TV.rule, 1);
    sep.fillRect(colR, y3 + 12, 1, sh - 24);
    weatherIcon(this, colR + 20, y3 + 21, g.weather, 20, g.tod === 'night');
    const wn = tvText(this, colR + 36, y3 + 21, WX_NAME[g.weather], 13, C.white, 800, 0.8).setOrigin(0, 0.5);
    if (wn.width > W - 28 - colR - 36) wn.setScale((W - 28 - colR - 36) / wn.width, 1);
    tvText(this, colR + 14, y3 + 44, `${g.temp}°C`, 20, C.white, 800).setOrigin(0, 0.5);
    if (g.weather === 'snow' || g.weather === 'rain') {
      tvText(this, colR + 14, y3 + 60, g.weather === 'snow' ? 'CAMPO PESADO' : 'CAMPO MOLHADO', 11, C.yellow, 800, 0.8).setOrigin(0, 0.5);
    }

    // ---- fique de olho (QB rival + os últimos 5 jogos dele)
    const y4 = y3 + sh + 10;
    const wh = 66;
    infoCard(y4, wh, onInk(opp.colors.primary));
    const qb = lg.players.find((p) => p.team.id === opp.id && p.pos === 'QB')!;
    const pt = this.add.graphics();
    plate(pt, 16, y4, 66, wh, opp.colors.primary, 1, true, true);
    this.add.image(22, y4 + 6, portraitTexture(this, qb.face, opp.colors.primary, opp.colors.secondary, 56, 'slant')).setOrigin(0).setDisplaySize(56, 56);
    const fx = 94;
    const last = lg.teams.get(opp.id)!.last;
    const lastW = last.length ? last.length * 20 + 4 : 0;
    const maxW = W - 32 - fx - lastW - 10;
    tvText(this, fx, y4 + 16, 'FIQUE DE OLHO', 12, C.yellow, 800, 1.6).setOrigin(0, 0.5);
    const qn = tvText(this, fx, y4 + 36, `${qb.name} · QB`, 17, C.white, 800, 0.6).setOrigin(0, 0.5);
    if (qn.width > maxW) qn.setScale(maxW / qn.width, 1);
    const s = qb.season;
    const st = tvText(this, fx, y4 + 54, s.gp ? `${s.pyds.toLocaleString('pt-BR')} JD · ${s.ptd} TD · ${s.int} INT · OVR ${qb.ovr}` : `OVR ${qb.ovr} · ${qb.age} ANOS · ${qb.tag}`, 12, C.muted, 700, 0.6).setOrigin(0, 0.5);
    if (st.width > maxW) st.setScale(maxW / st.width, 1);
    if (last.length) {
      tvText(this, W - 30, y4 + 16, 'ÚLTIMOS JOGOS', 11, C.muted, 700, 1.2).setOrigin(1, 0.5);
      last.forEach((r, i) => {
        const x = W - 30 - 9 - (last.length - 1 - i) * 20;
        const rg = this.add.graphics();
        plate(rg, x - 9, y4 + 32, 18, 20, r === 'V' ? TV.green : r === 'D' ? TV.red : TV.ink3);
        tvText(this, x, y4 + 42, r, 12, r === 'E' ? C.white : C.ink, 800).setOrigin(0.5);
      });
    }

    // ---- uniforme
    const y5 = y4 + wh + 24;
    sectionHead(this, 16, y5, 'UNIFORME', 'O RIVAL USA O QUE MAIS CONTRASTA');
    const save = getSave();
    const face: FaceLook = { face: save.face, skin: save.skin, hair: save.hair, hairColor: save.hairColor, beard: save.beard };
    const cw = (W - 32 - 8) / 3;
    const ky = y5 + 16;
    const ch = MH - 92 - ky;
    KIT_IDS.forEach((id, i) => {
      const x = 16 + cw / 2 + i * (cw + 4);
      const kit = me.kits[id];
      // placa de tinta; atrás do jogador, o mesmo fundo claro nos três (o kit escuro também aparece)
      const bg = new TvButton(this, x, ky + ch / 2, { w: cw, h: ch, fill: TV.ink2, fillAlpha: 1 });
      const back = this.add.graphics();
      plate(back, -cw / 2 + 6, -ch / 2 + 6, cw - 12, ch - 40, mix(TV.ink3, 0xffffff, 0.2), 1);
      back.fillStyle(0xffffff, 0.08);
      back.fillRect(-cw / 2 + 14, -ch / 2 + 6, cw - 28, (ch - 40) * 0.45);
      bg.add(back);
      const fl = this.add.graphics();
      fl.fillStyle(0x000000, 0.4);
      fl.fillEllipse(0, ch / 2 - 34, cw * 0.62, 10);
      bg.add(fl);
      const scale = Math.min((cw - 10) / 150, (ch - 50) / 300);
      bg.add(new PlayerBody(this, 0, ch / 2 - 34, { look: { ...save.look, kit: id, ...kitAccents(id, kit) }, kit, face, number: save.number }, scale));
      const name = tvText(this, 0, ch / 2 - 15, KIT_NAMES[id], 16, C.white, 800, 1.5).setOrigin(0.5);
      bg.add(name);
      bg.onTap = () => this.pickKit(id);
      this.kitCards.push({ id, bg, name, x, y: ky + ch / 2, w: cw, h: ch });
    });
    this.refreshKits();
    slideIn(this, this.kitCards.map((k) => k.bg), 50, 120);

    // ---- entrar em campo
    const hc = me.colors.primary;
    const btn = new TvButton(this, W / 2, MH - 46, { w: W - 32, h: 62, fill: hc, fillAlpha: 1, primary: true });
    btn.add(this.add.image(-(W - 32) / 2 + 36, 0, me.logo.small).setDisplaySize(32, 32));
    btn.add(tvText(this, -(W - 32) / 2 + 62, 0, 'ENTRAR EM CAMPO', 26, inkOn(hc), 800, 1.2).setOrigin(0, 0.5));
    const ar = this.add.graphics();
    ar.lineStyle(3, parseInt(inkOn(hc).slice(1), 16), 1);
    ar.beginPath();
    ar.moveTo((W - 32) / 2 - 34, -9);
    ar.lineTo((W - 32) / 2 - 25, 0);
    ar.lineTo((W - 32) / 2 - 34, 9);
    ar.strokePath();
    btn.add(ar);
    btn.onTap = () => this.time.delayedCall(30, () => startCareerMatch(this));
    tvEnter(this);
  }

  private pickKit(id: KitId) {
    const me = careerTeam();
    updateSave({ look: { ...getSave().look, kit: id, ...kitAccents(id, me.kits[id]) } });
    this.refreshKits();
  }

  private refreshKits() {
    const cur = getSave().look.kit;
    this.kitRing?.destroy();
    for (const k of this.kitCards) {
      const on = k.id === cur;
      k.name.setColor(on ? C.yellow : C.white);
      k.bg.setBorder(TV.yellow, on ? 1 : 0);
      if (on) this.kitRing = underline(this, k.x, k.y + k.h / 2 - 5, Math.min(k.name.width + 10, k.w - 24)).setDepth(5);
    }
  }
}
