import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { TeamRepository } from '../data/TeamRepository';
import { PlayerBody } from '../player/PlayerBody';
import { BEARD_COUNT, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, PlayerFace, SKINS } from '../player/PlayerFace';
import { defaultSave, type LookOptions } from '../player/PlayerSave';
import { setupHiRes } from '../systems/hires';
import { GlassButton, label, title, UI } from '../ui/widgets';
import { backButton } from './CareerHub';

/*
 * Cena de teste da Etapa 2 (abre com ?jogadortest): jogador padrão nos 3 kits, rosto isolado grande,
 * e um botão que troca camadas/rosto em sequência para conferir que tudo recompõe sem erro.
 */
export class PlayerTest extends Phaser.Scene {
  constructor() {
    super('PlayerTest');
  }

  create() {
    setupHiRes(this);
    const W = GAME_W;
    const H = GAME_H;
    this.add.rectangle(0, 0, W, H, 0x0a0c1a).setOrigin(0);
    this.add.existing(title(this, W / 2, 24, 'TESTE DO JOGADOR', 13, UI.yellow).setOrigin(0.5));

    const s = defaultSave();
    const team = TeamRepository.get('den');
    const face = { face: s.face, skin: s.skin, hair: s.hair, hairColor: s.hairColor, beard: s.beard };

    // Jogador padrão nos 3 kits
    const kits = ['home', 'away', 'night'] as const;
    const bodies = kits.map((k, i) => {
      const x = 62 + i * 108;
      this.add.existing(label(this, x, 56, k.toUpperCase(), 8, '#C9CEE0').setOrigin(0.5));
      return new PlayerBody(this, x, 380, { look: { ...s.look, kit: k }, kit: team.kits[k], face, number: 12 }, 0.8);
    });

    // Rosto isolado grande
    this.add.existing(label(this, 100, 410, 'ROSTO ISOLADO (0 / PELE 5 / CABELO 27 / BARBA 6)', 7, '#9AA3C0').setOrigin(0, 0.5));
    const big = new PlayerFace(this, 98, 520, face, 1.1);
    const info = label(this, 250, 500, '', 8, '#FFFFFF').setOrigin(0, 0.5);
    this.add.existing(info);

    // Faixas de pele e de cor de cabelo
    SKINS.forEach((c, i) => this.add.rectangle(20 + i * 20, 640, 16, 16, c));
    HAIR_COLORS.forEach((c, i) => this.add.rectangle(20 + i * 20, 664, 16, 16, c));

    // Troca em sequência: rosto, pele, cabelo, barba, capacete, luvas, calça...
    const steps: (() => string)[] = [];
    const f = { ...face };
    const lk: LookOptions = { ...s.look };
    const apply = () => {
      big.setLook(f);
      bodies.forEach((b) => b.setLook({ face: f, look: lk }));
    };
    const cycle = <T,>(arr: readonly T[], cur: T) => arr[(arr.indexOf(cur) + 1) % arr.length];
    steps.push(() => ((f.face = (f.face + 1) % FACE_COUNT), apply(), `ROSTO ${f.face}`));
    steps.push(() => ((f.skin = (f.skin + 1) % SKINS.length), apply(), `PELE ${f.skin}`));
    steps.push(() => ((f.hair = (f.hair + 1) % HAIR_COUNT), apply(), `CABELO ${f.hair}`));
    steps.push(() => ((f.hairColor = (f.hairColor + 1) % HAIR_COLORS.length), apply(), `COR CABELO ${f.hairColor}`));
    steps.push(() => ((f.beard = (f.beard + 1) % BEARD_COUNT), apply(), `BARBA ${f.beard}`));
    steps.push(() => ((lk.helmet = cycle(['classic', 'speed', 'compact'] as const, lk.helmet)), apply(), `CAPACETE ${lk.helmet}`));
    steps.push(() => ((lk.mask = cycle(['qb', 'rb', 'wr', 'ol'] as const, lk.mask)), apply(), `MÁSCARA ${lk.mask}`));
    steps.push(() => ((lk.gloves = cycle(['none', 'short', 'full', 'lineman'] as const, lk.gloves)), apply(), `LUVAS ${lk.gloves}`));
    steps.push(() => ((lk.pants = cycle(['short', 'reg', 'long'] as const, lk.pants)), apply(), `CALÇA ${lk.pants}`));
    steps.push(() => ((lk.cleats = cycle(['low', 'mid', 'high'] as const, lk.cleats)), apply(), `CHUTEIRA ${lk.cleats}`));
    steps.push(() => ((lk.under = cycle(['none', 'short', 'long'] as const, lk.under)), apply(), `UNDER ${lk.under}`));
    steps.push(() => ((lk.towel = cycle(['none', 'L', 'R', 'F'] as const, lk.towel)), apply(), `TOALHA ${lk.towel}`));
    steps.push(() => ((lk.visor = cycle(['none', 'clear', 'smoke', 'mirror', 'amber', 'blue'] as const, lk.visor)), apply(), `VISEIRA ${lk.visor}`));
    steps.push(() => ((lk.eyeblack = cycle(['none', 'solid', 'stripe', 'double'] as const, lk.eyeblack)), apply(), `EYE BLACK ${lk.eyeblack}`));
    let n = 0;
    let errs = 0;
    const next = () => {
      try {
        info.setText(steps[n % steps.length]());
      } catch (e) {
        errs++;
        info.setText(`ERRO ${String(e).slice(0, 30)}`);
      }
      n++;
    };
    const btn = new GlassButton(this, W - 100, 720, { w: 130, h: 34, radius: 10 });
    btn.add(label(this, 0, 0, 'TROCAR CAMADA', 9, '#FFFFFF').setOrigin(0.5));
    btn.onTap = next;
    this.add.existing(btn);
    // ?passos=N roda N trocas automáticas para o teste
    const auto = Number(new URLSearchParams(location.search).get('passos') ?? 0);
    for (let i = 0; i < auto; i++) next();
    this.add.existing(label(this, 20, 720, `TROCAS: ${n} · ERROS: ${errs}`, 8, errs ? '#FF5A5F' : '#3CCB5A').setOrigin(0, 0.5));
    this.add.existing(label(this, 20, 780, `${team.name} · KIT CASA/FORA/NOITE`, 8, '#9AA3C0').setOrigin(0, 0.5));
    backButton(this, 'CareerHub');
  }
}
