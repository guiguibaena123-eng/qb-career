import Phaser from 'phaser';
import { FONT_TITLE, GAME_H, GAME_W, TEAMS, broadcast, logoKey } from '../config';
import type { Rng } from '../systems/rng';
import { GlassButton, label, title, UI } from './widgets';

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
    const dim = sc.add.rectangle(0, 0, W, H, 0x0a0c1a, 0.93).setOrigin(0);
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

  /** Abertura de horário nobre: faixa na cor da transmissão, estrelas, nome do jogo com brilho. */
  private primeBanner(pr: { name: string; color: number; glow: number }) {
    const sc = this.scene;
    const W = GAME_W;
    const glowHex = '#' + pr.glow.toString(16).padStart(6, '0');
    const band = this.add(sc.add.graphics());
    band.fillStyle(pr.color, 0.18);
    band.fillRect(0, 22, W, 100);
    band.fillStyle(pr.color, 1);
    band.fillRect(0, 34, W, 4);
    band.fillRect(0, 106, W, 4);
    band.fillStyle(pr.glow, 1);
    band.fillRect(0, 38, W, 2);
    band.fillRect(0, 104, W, 2);
    // estrelas que piscam
    for (let i = 0; i < 14; i++) {
      const x = 14 + ((i * 97) % (W - 28));
      const y = 48 + ((i * 37) % 52);
      const st = this.add(sc.add.star(x, y, 4, 1.5, i % 3 ? 3 : 5, 0xffffff, 1).setAlpha(0.2));
      sc.tweens.add({ targets: st, alpha: 0.95, duration: 500 + (i % 5) * 160, yoyo: true, repeat: -1, delay: i * 90 });
    }
    const words = pr.name.split(' ');
    const big = this.add(
      sc.add
        .text(W / 2, 64, `${words[0]} ${words[1]}`, { fontFamily: FONT_TITLE, fontSize: '19px', color: '#FFFFFF', stroke: '#0D0D12', strokeThickness: 6, shadow: { offsetX: 3, offsetY: 4, color: '#' + pr.color.toString(16).padStart(6, '0'), fill: true, stroke: true } })
        .setOrigin(0.5)
        .setScale(0.6)
        .setAlpha(0),
    );
    const sub = this.add(title(sc, W / 2, 92, words.slice(2).join(' ') || 'GAME', 11, glowHex).setOrigin(0.5).setAlpha(0));
    sc.tweens.add({ targets: big, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' });
    sc.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 250 });
    sc.tweens.add({ targets: big, scale: 1.04, duration: 900, yoyo: true, repeat: -1, delay: 500, ease: 'Sine.InOut' });
    this.add(label(sc, W / 2, 12, `QB CAREER · ${this.info.mode} · AO VIVO`, 8, '#C9CEE0').setOrigin(0.5));
  }

  private presentation(next: () => void) {
    const sc = this.scene;
    const W = GAME_W;
    const H = GAME_H;
    this.clear();
    const pr = broadcast.prime;
    if (pr) this.primeBanner(pr);
    else {
      this.add(label(sc, W / 2, 62, `QB CAREER · ${this.info.mode}`, 10, UI.muted).setOrigin(0.5));
      this.add(title(sc, W / 2, 92, 'HOJE NO ESTÁDIO', 12, '#FFFFFF').setOrigin(0.5));
    }

    const card = (side: 'home' | 'away', y: number) => {
      const t = TEAMS[side];
      const fromLeft = side === 'home';
      const c = this.add(sc.add.container(fromLeft ? -W : W * 2, y));
      const g = sc.add.graphics();
      const x0 = 14;
      const w = W - 28;
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(x0, 6, w, 150, 14);
      g.fillStyle(0x22284a, 0.9);
      g.fillRoundedRect(x0, 0, w, 150, 14);
      g.lineStyle(2, t.color, 0.9);
      g.strokeRoundedRect(x0, 0, w, 150, 14);
      // bloco da cor do time com a logo
      g.fillStyle(t.color, 1);
      g.fillRoundedRect(x0 + 8, 8, 112, 134, 10);
      g.fillStyle(0x0a0c1a, 0.35);
      g.fillRoundedRect(x0 + 8, 8, 112, 134, 10);
      c.add(g);
      c.add(sc.add.image(x0 + 64, 75, logoKey(t.id, 'l')).setDisplaySize(100, 100));
      const tx = x0 + 136;
      c.add(title(sc, tx, 22, t.name, 14, '#FFFFFF').setOrigin(0, 0.5));
      c.add(label(sc, tx, 44, `${fromLeft === this.info.homeHosts ? 'MANDANTE' : 'VISITANTE'} · OVR ${t.rating.ovr}`, 10, UI.muted).setOrigin(0, 0.5));
      const R = t.rating;
      [['ATAQUE', R.atk], ['DEFESA', R.def], ['ESPECIAIS', R.esp]].forEach(([n, v], i) => {
        const yy = 70 + i * 26;
        c.add(label(sc, tx, yy, n as string, 9, '#C9CEE0').setOrigin(0, 0.5));
        const bx = tx + 74;
        const bw = w - 136 - 74 - 40;
        const bg = sc.add.graphics();
        bg.fillStyle(UI.dark, 1);
        bg.fillRect(bx, yy - 5, bw, 10);
        bg.fillStyle(0x3a4060, 1);
        bg.fillRect(bx + 1, yy - 4, bw - 2, 8);
        c.add(bg);
        const fill = sc.add.rectangle(bx + 1, yy - 4, 0, 8, t.color).setOrigin(0, 0);
        c.add(fill);
        sc.tweens.add({ targets: fill, width: ((bw - 2) * (v as number)) / 100, delay: 650 + i * 120, duration: 600, ease: 'Quad.Out' });
        c.add(title(sc, bx + bw + 6, yy, String(v), 8, '#FFFFFF').setOrigin(0, 0.5));
      });
      sc.tweens.add({ targets: c, x: 0, duration: 520, delay: fromLeft ? 150 : 450, ease: 'Back.Out' });
      return c;
    };
    card('home', 130);
    card('away', 336);

    // VS
    const vs = this.add(
      sc.add
        .text(W / 2, 300, 'VS', { fontFamily: FONT_TITLE, fontSize: '26px', color: UI.yellow, stroke: '#0D0D12', strokeThickness: 7, shadow: { offsetX: 4, offsetY: 6, color: '#0D0D12', fill: true, stroke: true } })
        .setOrigin(0.5)
        .setAngle(-6)
        .setScale(0)
        .setAlpha(0),
    );
    sc.tweens.add({ targets: vs, scale: 1, alpha: 1, duration: 360, delay: 800, ease: 'Back.Out' });

    // Seu QB + estádio
    const info = this.add(sc.add.container(0, 0).setAlpha(0));
    const g2 = sc.add.graphics();
    g2.fillStyle(0x22284a, 0.85);
    g2.fillRoundedRect(14, 516, W - 28, 92, 14);
    g2.lineStyle(1, 0xffffff, 0.14);
    g2.strokeRoundedRect(14, 516, W - 28, 92, 14);
    info.add([
      g2,
      label(sc, 28, 534, 'SEU QUARTERBACK', 9, UI.muted).setOrigin(0, 0.5),
      title(sc, 28, 558, this.info.qb, 12, UI.yellow).setOrigin(0, 0.5),
      label(sc, 28, 584, `OVR ${this.info.ovr} · ${this.info.traits}`, 10, '#E8EAF2').setOrigin(0, 0.5),
      title(sc, W - 28, 558, `OVR ${this.info.ovr}`, 11, '#FFFFFF').setOrigin(1, 0.5),
    ]);
    sc.tweens.add({ targets: info, alpha: 1, duration: 400, delay: 1100 });
    const arena = this.add(label(sc, W / 2, 640, this.info.arena, 10, UI.muted).setOrigin(0.5).setAlpha(0));
    sc.tweens.add({ targets: arena, alpha: 1, duration: 400, delay: 1300 });

    const btn = new GlassButton(sc, W / 2, H - 60, { w: W - 60, h: 60, radius: 16, fill: TEAMS.home.color, fillAlpha: 1, borderAlpha: 0.35, primary: true });
    btn.add(title(sc, 0, 0, 'IR PARA O SORTEIO', 11, TEAMS.home.fg).setOrigin(0.5));
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
    this.add(label(sc, W / 2, 70, 'SORTEIO DO COMEÇO', 10, UI.muted).setOrigin(0.5));
    const head = this.add(title(sc, W / 2, 104, 'CARA OU COROA?', 16, UI.yellow).setOrigin(0.5));
    const sub = this.add(label(sc, W / 2, 140, 'QUEM GANHAR ESCOLHE RECEBER OU CHUTAR', 10, '#C9CEE0').setOrigin(0.5));

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
      const b = new GlassButton(sc, x, H - 70, { w: bw, h: 62, radius: 16, ...(primary ? { fill: TEAMS.home.color, fillAlpha: 1, borderAlpha: 0.35, primary: true } : {}) });
      b.add(title(sc, 0, 0, text, 12, primary ? TEAMS.home.fg : '#FFFFFF').setOrigin(0.5));
      b.onTap = () => sc.time.delayedCall(30, onTap);
      this.add(b);
      return b;
    };
    const buttons: GlassButton[] = [];
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
