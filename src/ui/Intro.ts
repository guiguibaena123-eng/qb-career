import Phaser from 'phaser';
import { GAME_H, GAME_W, TEAMS, broadcast, logoKey, VIEW } from '../config';
import type { Rng } from '../systems/rng';
import { C, onInk, plate, plateShadow, TV, TvButton, tvText } from './tv';
import { UI } from './widgets';

/*
 * Abertura da partida:
 *   1) Apresentação dos times (cartões entram dos lados, VS, seu QB, estádio)
 *   2) Cara ou coroa: você escolhe, a moeda gira e cai; quem ganha escolhe receber ou chutar
 * Termina chamando onDone(receive): true = seu time recebe, false = seu time chuta o kickoff.
 */


export class Intro {
  private root: Phaser.GameObjects.Container | null = null;
  private objs: Phaser.GameObjects.GameObject[] = [];

  /** Textos da apresentação (a carreira troca pelo jogador do save e pelo estádio do mandante). */
  info = { mode: 'PARTIDA RÁPIDA', qb: '#12 · ROOKIE', ovr: 68, traits: 'BRAÇO FORTE · MÃOS SEGURAS', arena: 'ARENA QB CAREER · 38.200 TORCEDORES', homeHosts: true };

  constructor(private scene: Phaser.Scene, private rng: Rng) {}

  get visible() {
    return !!this.root;
  }

  hide() {
    this.root?.destroy();
    this.root = null;
  }

  /** Abre a apresentação e depois o sorteio. */
  show(onDone: (receive: boolean) => void) {
    this.hide();
    const sc = this.scene;
    const W = GAME_W;
    const H = GAME_H;
    const root = (this.root = sc.add.container(0, 0).setDepth(150));
    const dim = sc.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, 0x0a0c1a, 0.93).setOrigin(0);
    root.add(dim);
    this.presentation(() => this.toss(onDone));
  }

  private clear() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.root!.add(o);
    this.objs.push(o);
    return o;
  }

  // ------------------------------------------------------------ 1) apresentação

  /** Linha "AO VIVO" do topo (ponto vermelho piscando + modo da partida). */
  private liveLine() {
    const sc = this.scene;
    const W = GAME_W;
    const t = this.add(tvText(sc, W / 2 + 8, 18, `QB CAREER · ${this.info.mode} · AO VIVO`, 12, C.muted, 700, 1.4).setOrigin(0.5));
    const dot = this.add(sc.add.circle(t.x - t.width / 2 - 10, 18, 4, TV.red));
    sc.tweens.add({ targets: dot, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
  }

  /** Abertura de horário nobre: faixa na cor da transmissão, estrelas e o nome do jogo. */
  private primeBanner(pr: { name: string; short: string; pt?: string; color: number; glow: number }) {
    const sc = this.scene;
    const W = GAME_W;
    const band = this.add(sc.add.graphics());
    band.fillStyle(pr.color, 0.35);
    band.fillRect(VIEW.x, 34, VIEW.w, 76);
    band.fillStyle(pr.color, 1);
    band.fillRect(VIEW.x, 34, VIEW.w, 4);
    band.fillRect(VIEW.x, 106, VIEW.w, 4);
    band.fillStyle(pr.glow, 1);
    band.fillRect(VIEW.x, 38, VIEW.w, 2);
    band.fillRect(VIEW.x, 104, VIEW.w, 2);
    for (let i = 0; i < 12; i++) {
      const x = 14 + ((i * 97) % (W - 28));
      const y = 46 + ((i * 37) % 52);
      const st = this.add(sc.add.star(x, y, 4, 1.5, i % 3 ? 3 : 5, 0xffffff, 1).setAlpha(0.2));
      sc.tweens.add({ targets: st, alpha: 0.9, duration: 500 + (i % 5) * 160, yoyo: true, repeat: -1, delay: i * 90 });
    }
    const words = pr.name.split(' ');
    const big = this.add(tvText(sc, W / 2, 64, pr.pt ?? `${words[0]} ${words[1]}`, 40, C.white, 800, 2).setOrigin(0.5).setAlpha(0));
    if (big.width > W - 40) big.setScale((W - 40) / big.width, 1);
    big.setShadow(3, 3, '#' + pr.color.toString(16).padStart(6, '0'), 0, false, true);
    const playoff = !['THURSDAY', 'SUNDAY', 'MONDAY'].some((d) => pr.short.startsWith(d));
    const subText = pr.pt ? (pr.name.includes('BOWL') ? 'A GRANDE FINAL' : playoff ? 'PLAYOFFS · MATA-MATA' : 'TRANSMISSÃO ESPECIAL') : words.slice(2).join(' ') || 'GAME';
    const sub = this.add(tvText(sc, W / 2, 93, subText, 15, '#' + pr.glow.toString(16).padStart(6, '0'), 800, 3).setOrigin(0.5).setAlpha(0));
    sc.tweens.add({ targets: big, alpha: 1, duration: 360 });
    sc.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 250 });
  }

  private presentation(next: () => void) {
    const sc = this.scene;
    const W = GAME_W;
    const H = GAME_H;
    this.clear();
    this.liveLine();
    const pr = broadcast.prime;
    if (pr) this.primeBanner(pr);
    else {
      this.add(tvText(sc, W / 2, 62, 'HOJE NO ESTÁDIO', 36, C.white, 800, 2).setOrigin(0.5));
      const u = this.add(sc.add.graphics());
      u.fillStyle(TV.yellow, 1);
      u.fillRect(W / 2 - 40, 86, 80, 4);
    }

    // Cartão de cada time: bloco na cor do time com o escudo + nome, papel e a força em barras
    const CH = 148;
    const card = (side: 'home' | 'away', y: number) => {
      const t = TEAMS[side];
      const fromLeft = side === 'home';
      const c = this.add(sc.add.container(fromLeft ? -W : W, y));
      const g = sc.add.graphics();
      const x0 = 16;
      const w = W - 32;
      const bw0 = 116;
      plateShadow(g, x0, 0, w, CH);
      plate(g, x0, 0, w, CH, TV.ink2, 1);
      plate(g, x0, 0, bw0, CH, t.color, 1, true, true);
      g.fillStyle(onInk(t.color), 1);
      g.fillRect(x0 + bw0, 0, w - bw0 - 12, 3);
      c.add(g);
      c.add(sc.add.image(x0 + bw0 / 2, CH / 2, logoKey(t.id, 'l')).setDisplaySize(92, 92));
      const tx = x0 + bw0 + 14;
      const nm = tvText(sc, tx, 24, t.name, 28, C.white, 800, 0.6).setOrigin(0, 0.5);
      if (nm.width > w - bw0 - 30) nm.setScale((w - bw0 - 30) / nm.width, 1);
      c.add(nm);
      const host = fromLeft === this.info.homeHosts;
      c.add(tvText(sc, tx, 50, `${host ? 'MANDANTE' : 'VISITANTE'} · OVR ${t.rating.ovr}`, 13, host ? C.yellow : C.muted, 700, 1.2).setOrigin(0, 0.5));
      const R = t.rating;
      const bx = tx + 76;
      const bw = x0 + w - 16 - 28 - bx;
      ([['ATAQUE', R.atk], ['DEFESA', R.def], ['ESPECIAIS', R.esp]] as [string, number][]).forEach(([n, v], i) => {
        const yy = 80 + i * 22;
        c.add(tvText(sc, tx, yy, n, 13, C.muted, 700, 1).setOrigin(0, 0.5));
        const bg = sc.add.graphics();
        bg.fillStyle(TV.ink, 1);
        bg.fillRect(bx, yy - 4, bw, 8);
        c.add(bg);
        const fill = sc.add.rectangle(bx, yy - 4, 0, 8, onInk(t.color)).setOrigin(0, 0);
        c.add(fill);
        sc.tweens.add({ targets: fill, width: (bw * v) / 100, delay: 650 + i * 120, duration: 600, ease: 'Quad.Out' });
        c.add(tvText(sc, x0 + w - 16, yy, String(v), 16, C.white, 800, 0).setOrigin(1, 0.5));
      });
      sc.tweens.add({ targets: c, x: 0, duration: 480, delay: fromLeft ? 150 : 420, ease: 'Expo.Out' });
      return c;
    };
    card('home', 132);
    card('away', 336);

    // VS entre os cartões
    const vs = this.add(sc.add.container(W / 2, 308).setScale(0).setAlpha(0));
    const vg = sc.add.graphics();
    plateShadow(vg, -34, -20, 68, 40);
    plate(vg, -34, -20, 68, 40, TV.yellow);
    vs.add([vg, tvText(sc, 0, 0, this.info.homeHosts ? 'VS' : '@', 28, C.ink, 800, 1).setOrigin(0.5)]);
    sc.tweens.add({ targets: vs, scale: 1, alpha: 1, duration: 320, delay: 800, ease: 'Back.Out' });

    // Seu QB (nome, características e o OVR em destaque) + estádio
    const info = this.add(sc.add.container(0, 0).setAlpha(0));
    const qy = 522;
    const qh = 96;
    const g2 = sc.add.graphics();
    plateShadow(g2, 16, qy, W - 32, qh);
    plate(g2, 16, qy, W - 32, qh, TV.ink2, 1);
    const s0 = Math.min(qh * 0.2126, 12);
    g2.fillStyle(TV.yellow, 1);
    g2.fillRect(16 + s0, qy, W - 32 - s0, 3);
    // bloco do OVR à direita
    plate(g2, W - 16 - 96, qy, 96, qh, TV.yellow, 1, true, true);
    info.add(g2);
    const qn = tvText(sc, 36, qy + 44, this.info.qb, 26, C.white, 800, 0.6).setOrigin(0, 0.5);
    if (qn.width > W - 32 - 96 - 40) qn.setScale((W - 32 - 96 - 40) / qn.width, 1);
    const tr = tvText(sc, 36, qy + 72, this.info.traits, 13, C.muted, 700, 0.8).setOrigin(0, 0.5);
    if (tr.width > W - 32 - 96 - 40) tr.setScale((W - 32 - 96 - 40) / tr.width, 1);
    info.add([
      tvText(sc, 36, qy + 18, 'SEU QUARTERBACK', 12, C.yellow, 800, 1.6).setOrigin(0, 0.5),
      qn,
      tr,
      tvText(sc, W - 16 - 48, qy + 40, String(this.info.ovr), 44, C.ink, 800, 0).setOrigin(0.5),
      tvText(sc, W - 16 - 48, qy + 74, 'OVR', 14, C.ink, 800, 2).setOrigin(0.5),
    ]);
    sc.tweens.add({ targets: info, alpha: 1, duration: 400, delay: 1100 });
    const arena = this.add(sc.add.container(0, 0).setAlpha(0));
    const at = tvText(sc, W / 2, 662, this.info.arena, 15, C.white, 800, 1.6).setOrigin(0.5);
    if (at.width > W - 120) at.setScale((W - 120) / at.width, 1);
    const ag = sc.add.graphics();
    ag.fillStyle(TV.rule, 1);
    ag.fillRect(16, 662, W / 2 - at.displayWidth / 2 - 30, 1);
    ag.fillRect(W / 2 + at.displayWidth / 2 + 14, 662, W / 2 - at.displayWidth / 2 - 30, 1);
    arena.add([ag, at, tvText(sc, W / 2, 684, 'ONDE A BOLA VAI ROLAR', 11, C.muted, 700, 1.6).setOrigin(0.5)]);
    sc.tweens.add({ targets: arena, alpha: 1, duration: 400, delay: 1300 });

    const btn = new TvButton(sc, W / 2, H - 60, { w: W - 32, h: 62, fill: TEAMS.home.color, fillAlpha: 1, primary: true });
    btn.add(tvText(sc, 0, 0, 'IR PARA O SORTEIO', 26, TEAMS.home.fg, 800, 1.6).setOrigin(0.5));
    btn.setAlpha(0);
    btn.onTap = () => sc.time.delayedCall(30, next);
    this.add(btn);
    sc.tweens.add({ targets: btn, alpha: 1, duration: 300, delay: 1500 });
  }

  // ------------------------------------------------------------ 2) cara ou coroa

  private toss(onDone: (receive: boolean) => void) {
    const sc = this.scene;
    const W = GAME_W;
    const H = GAME_H;
    this.clear();
    this.liveLine();
    this.add(tvText(sc, W / 2, 74, 'SORTEIO DO COMEÇO', 14, C.muted, 700, 2).setOrigin(0.5));
    const head = this.add(tvText(sc, W / 2, 112, 'CARA OU COROA?', 40, C.yellow, 800, 1.4).setOrigin(0.5));
    const sub = this.add(tvText(sc, W / 2, 150, 'QUEM GANHAR ESCOLHE RECEBER OU CHUTAR', 15, C.white, 700, 0.8).setOrigin(0.5));
    sub.setWordWrapWidth(W - 40).setAlign('center');

    // Moeda: dourada, com rosto (cara) de um lado e coroa do outro
    const coin = this.add(sc.add.container(W / 2, 470));
    const base = sc.add.graphics();
    base.fillStyle(UI.dark, 1);
    base.fillCircle(0, 0, 52);
    base.fillStyle(0xd9a21b, 1);
    base.fillCircle(0, 0, 48);
    base.fillStyle(0xffd23f, 1);
    base.fillCircle(0, 0, 42);
    base.lineStyle(3, 0xd9a21b, 1);
    base.strokeCircle(0, 0, 36);
    const cara = sc.add.graphics();
    cara.fillStyle(0xb98412, 1);
    cara.fillRect(-14, -16, 28, 30);
    cara.fillRect(-10, -20, 20, 6);
    cara.fillStyle(0xffd23f, 1);
    cara.fillRect(-9, -9, 5, 5);
    cara.fillRect(4, -9, 5, 5);
    cara.fillRect(-6, 6, 12, 3);
    cara.fillStyle(0xb98412, 1);
    cara.fillRect(-2, -2, 4, 8);
    const coroa = sc.add.graphics();
    coroa.fillStyle(0xb98412, 1);
    coroa.fillRect(-18, 2, 36, 14);
    coroa.fillTriangle(-18, 2, -18, -16, -8, 2);
    coroa.fillTriangle(-6, 2, 0, -20, 6, 2);
    coroa.fillTriangle(8, 2, 18, -16, 18, 2);
    coroa.fillStyle(0xffd23f, 1);
    coroa.fillRect(-14, 8, 28, 3);
    coroa.setVisible(false);
    coin.add([base, cara, coroa]);
    const shadow = this.add(sc.add.ellipse(W / 2, 560, 90, 18, 0x000000, 0.35));

    const mkBtn = (x: number, text: string, onTap: () => void, primary = false, bw = (W - 52) / 2) => {
      const b = new TvButton(sc, x, H - 70, { w: bw, h: 62, ...(primary ? { fill: TEAMS.home.color, fillAlpha: 1, primary: true } : {}) });
      b.add(tvText(sc, 0, 0, text, 26, primary ? TEAMS.home.fg : '#FFFFFF', 800, 1.6).setOrigin(0.5));
      b.onTap = () => sc.time.delayedCall(30, onTap);
      this.add(b);
      return b;
    };
    const buttons: TvButton[] = [];
    const pick = (choice: 'cara' | 'coroa') => {
      buttons.forEach((b) => b.destroy());
      buttons.length = 0;
      head.setText(`VOCÊ ESCOLHEU ${choice.toUpperCase()}`);
      sub.setText('A MOEDA ESTÁ NO AR...');
      const result: 'cara' | 'coroa' = this.rng.chance(0.5) ? 'cara' : 'coroa';
      const total = Math.PI * 2 * 7 + (result === 'coroa' ? Math.PI : 0);
      sc.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 2400,
        ease: 'Quad.Out',
        onUpdate: (tw) => {
          const p = tw.getValue() ?? 0;
          const a = p * total;
          const cs = Math.cos(a);
          coin.setScale(Math.max(0.04, Math.abs(cs)), 1 + Math.sin(p * Math.PI) * 0.25);
          cara.setVisible(cs >= 0);
          coroa.setVisible(cs < 0);
          coin.y = 470 - Math.sin(Math.min(1, p * 1.15) * Math.PI) * 230;
          shadow.setScale(1 - Math.sin(p * Math.PI) * 0.45);
        },
        onComplete: () => {
          coin.setScale(1, 1);
          coin.y = 470;
          const win = result === choice;
          head.setText(`DEU ${result.toUpperCase()}!`).setColor(win ? '#3CCB5A' : '#FF7B80');
          navigator.vibrate?.(win ? [30, 40, 30] : 40);
          if (win) {
            sub.setText('VOCÊ GANHOU O SORTEIO. O QUE ESCOLHE?');
            buttons.push(mkBtn(W / 4 + 8, 'CHUTAR', () => onDone(false)));
            buttons.push(mkBtn((W * 3) / 4 - 8, 'RECEBER', () => onDone(true), true));
          } else {
            const oppReceives = this.rng.chance(0.7);
            sub.setText(oppReceives ? `OS ${TEAMS.away.name} ESCOLHERAM RECEBER A BOLA` : `OS ${TEAMS.away.name} ESCOLHERAM CHUTAR. VOCÊ RECEBE!`);
            buttons.push(mkBtn(W / 2, 'COMEÇAR', () => onDone(!oppReceives), true, W - 60));
          }
        },
      });
    };
    buttons.push(mkBtn(W / 4 + 8, 'CARA', () => pick('cara')));
    buttons.push(mkBtn((W * 3) / 4 - 8, 'COROA', () => pick('coroa')));
  }
}
