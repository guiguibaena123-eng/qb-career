import Phaser from 'phaser';
import { CAMERA, GAME_H, GAME_W, applyMatchup, broadcast, finalGame, logoKey, matchConfig, playoffLogo, venue, LAYOUT, VIEW } from '../config';
import { isDome } from '../data/stadiums';
import { TEAM_LIST, teamById, uiColor } from '../data/teams';
import { TeamRepository } from '../data/TeamRepository';
import { Daylight, type TimeOfDay } from '../systems/daytime';
import { setupFitWidth } from '../systems/hires';
import { Rng } from '../systems/rng';
import { Weather, type WeatherKind } from '../systems/weather';

type Vis = Phaser.GameObjects.GameObject & { visible: boolean; setVisible(v: boolean): unknown };
import { World } from '../systems/world';
import { bottomGradient } from '../ui/widgets';
import { C, inkOn, plate, plateShadow, scoreBug, TV, TvButton, tvText, wipeTo } from '../ui/tv';

/*
 * Visualizador de estádios (aba da tela inicial): o estádio de qualquer time, no clima e no horário
 * escolhidos, sem jogadores e sem placar. Arrastar o dedo para cima/baixo anda pelo campo (com inércia);
 * o painel de baixo troca estádio, clima e horário, e pode ser escondido para ver a tela inteira.
 */

interface ViewerData {
  team?: string;
  tod?: TimeOfDay;
  wx?: WeatherKind;
  camY?: number;
  hidden?: boolean;
}

const TODS: { key: TimeOfDay; name: string }[] = [
  { key: 'day', name: 'DIA' },
  { key: 'dusk', name: 'TARDE' },
  { key: 'night', name: 'NOITE' },
];
const WXS: { key: WeatherKind; name: string }[] = [
  { key: 'clear', name: 'LIMPO' },
  { key: 'rain', name: 'CHUVA' },
  { key: 'snow', name: 'NEVE' },
];

export class StadiumViewer extends Phaser.Scene {
  private world!: World;
  private daylight!: Daylight;
  private weather!: Weather;
  private d!: Required<ViewerData>;
  private panel!: Phaser.GameObjects.Container;
  private vel = 0;
  private drag: { id: number; last: number; t: number } | null = null;

  constructor() {
    super('StadiumViewer');
  }

  /** Começa sem as texturas geradas antes (arquibancada, cidade...): senão a remontagem falha (chave em uso). */
  init() {
    const keep = ['__', 'logo', 'layer_', 'face_', 'drsuit_', 'stad_', 'draftimg_'];
    for (const k of this.textures.getTextureKeys()) if (!keep.some((p) => k.startsWith(p))) this.textures.remove(k);
  }

  create(data: ViewerData) {
    const team = data.team ?? matchConfig.home;
    const dome = isDome(team);
    this.d = {
      team,
      tod: data.tod ?? 'night',
      wx: dome ? 'clear' : (data.wx ?? 'clear'),
      camY: data.camY ?? 50,
      hidden: data.hidden ?? false,
    };
    const { h: MH } = setupFitWidth(this, 820, 0.6);

    // O estádio é montado a partir da configuração da partida: troca só enquanto monta e devolve na saída
    const saved = { ...matchConfig };
    const savedVenue = venue.id;
    const savedFinal = finalGame.on;
    const savedLogo = playoffLogo.key;
    const savedPrime = broadcast.prime;
    matchConfig.home = team;
    matchConfig.away = TEAM_LIST.find((t) => t.id !== team)!.id;
    matchConfig.homeUni = 0;
    matchConfig.awayUni = null;
    matchConfig.time = this.d.tod;
    matchConfig.stand = 'auto';
    venue.id = null;
    finalGame.on = false;
    playoffLogo.key = null;
    broadcast.prime = null;
    applyMatchup();
    this.events.once('shutdown', () => {
      Object.assign(matchConfig, saved);
      venue.id = savedVenue;
      finalGame.on = savedFinal;
      playoffLogo.key = savedLogo;
      broadcast.prime = savedPrime;
      applyMatchup();
    });

    this.world = new World(this, this.d.camY, this.d.wx);
    this.world.field.showLines = false;
    this.MH = MH;
    this.dome = dome;
    this.bundles.clear();
    this.active = '';
    this.buildAtmosphere();
    this.buildUi(MH, dome);
    this.bindDrag(MH);
    this.warmUp();
  }

  private MH = GAME_H;
  private dome = false;
  /**
   * Luz e clima de cada combinação horário × clima ("pacotes"): montados uma vez (os que faltam vão sendo
   * montados aos poucos, escondidos, logo que a tela abre) e depois só mostrados/escondidos: troca na hora.
   */
  private bundles = new Map<string, { daylight: Daylight; weather: Weather; objs: { o: Vis; v: boolean }[] }>();
  private active = '';

  private bundle(tod: TimeOfDay, wx: WeatherKind) {
    const key = `${tod}|${wx}`;
    let b = this.bundles.get(key);
    if (!b) {
      const before = new Set(this.children.list);
      const daylight = new Daylight(this, tod, GAME_W, GAME_H, wx);
      const weather = new Weather(this, wx, new Rng(7), tod === 'night');
      weather.pill?.setVisible(false);
      const objs = this.children.list
        .filter((o) => !before.has(o))
        .map((o) => {
          const x = o as unknown as Vis;
          const v = x.visible;
          x.setVisible(false);
          return { o: x, v };
        });
      b = { daylight, weather, objs };
      this.bundles.set(key, b);
    }
    return b;
  }

  /** Mostra a luz/clima do horário e clima atuais (e esconde os outros). */
  private buildAtmosphere() {
    const key = `${this.d.tod}|${this.d.wx}`;
    const old = this.bundles.get(this.active);
    if (old && this.active !== key) for (const it of old.objs) it.o.setVisible(false);
    const b = this.bundle(this.d.tod, this.d.wx);
    for (const it of b.objs) it.o.setVisible(it.v);
    this.active = key;
    this.daylight = b.daylight;
    this.weather = b.weather;
    this.world.sideline.snow = this.d.wx === 'snow';
  }

  /** Monta, um por vez e sem travar, a cidade e os pacotes das outras combinações (para trocas instantâneas). */
  private warmUp() {
    const jobs: (() => void)[] = [];
    for (const t of TODS) for (const w of WXS) {
      if (this.dome && w.key !== 'clear') continue;
      jobs.push(() => this.world.stand.warmLook(t.key, w.key));
    }
    for (const t of TODS) for (const w of WXS) {
      if (this.dome && w.key !== 'clear') continue;
      jobs.push(() => this.bundle(t.key, w.key));
    }
    const next = () => {
      const j = jobs.shift();
      if (!j || !this.sys.isActive()) return;
      j();
      this.time.delayedCall(60, next);
    };
    this.time.delayedCall(400, next);
  }

  /** Troca horário/clima NA HORA: só céu, cidade (em cache), refletores, luz e chuva/neve. */
  private setLook(tod: TimeOfDay, wx: WeatherKind) {
    if (tod === this.d.tod && wx === this.d.wx) return;
    this.d.tod = tod;
    this.d.wx = wx;
    matchConfig.time = tod;
    this.world.setLook(tod, wx);
    this.buildAtmosphere();
    this.refreshChoices();
  }

  // ------------------------------------------------------------------ dedo: anda pelo campo

  private bindDrag(MH: number) {
    const panelTop = MH - 214;
    const pos = (p: Phaser.Input.Pointer) => p.worldY;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.drag) return;
      if (this.panel.visible && p.worldY > panelTop) return; // toque no painel
      if (p.worldY < 60) return; // cabeçalho
      this.vel = 0;
      this.drag = { id: p.id, last: pos(p), t: this.time.now };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || p.id !== d.id) return;
      const v = pos(p);
      const dy = v - d.last;
      const dt = Math.max(1, this.time.now - d.t);
      // arrastar para cima = ir para a frente (para o fundo do campo)
      const yards = dy * this.yardsPerPx();
      this.move(yards);
      this.vel = (yards / dt) * 16;
      d.last = v;
      d.t = this.time.now;
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (this.drag && p.id === this.drag.id) this.drag = null;
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Jardas por px de arrasto: o gramado sob o dedo acompanha o dedo (perspectiva no ponto de foco). */
  private yardsPerPx() {
    const pj = this.world.proj;
    const y = pj.yAtScreen(GAME_H * 0.6);
    const a = pj.project(pj.camX, y).y;
    const b = pj.project(pj.camX, y + 1).y;
    return 1 / Math.max(1, Math.abs(a - b));
  }

  private move(yards: number) {
    const w = this.world;
    w.targetY = Phaser.Math.Clamp(w.targetY + yards, CAMERA.minY, CAMERA.maxY);
    w.proj.camY = w.targetY; // sem atraso: o campo segue o dedo
    this.d.camY = w.targetY;
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    if (!this.drag && Math.abs(this.vel) > 0.002) {
      this.move(this.vel);
      this.vel *= Math.pow(0.9, dt * 60);
    }
    this.world.update(dt);
    this.weather.update(dt, this.world.proj);
    this.daylight.update(this.world.proj, this.world.stand.topScreenY());
  }

  // ------------------------------------------------------------------ interface

  private restart(change: Partial<ViewerData>) {
    this.scene.restart({ ...this.d, ...change });
  }

  private buildUi(MH: number, dome: boolean) {
    const W = GAME_W;
    const t = teamById(this.d.team);
    const tc = uiColor(t);
    const name = TeamRepository.get(this.d.team).stadium.name;
    this.add.existing(scoreBug(this, { title: 'ESTÁDIOS', step: 'VISUALIZAÇÃO', onBack: () => wipeTo(this, 'MainMenu', tc), team: { abbr: t.abbr, color: tc }, depth: 900 }));

    // Botão de esconder/mostrar o painel (fica sempre visível)
    const eye = new TvButton(this, W - 58, 80, { w: 92, h: 30, fill: TV.ink, fillAlpha: 0.9 }).setDepth(900);
    const eyeT = tvText(this, 0, 0, this.d.hidden ? 'MOSTRAR' : 'OCULTAR', 13, C.white, 800, 1.2).setOrigin(0.5);
    eye.add(eyeT);
    eye.onTap = () => {
      this.d.hidden = !this.d.hidden;
      this.panel.setVisible(!this.d.hidden);
      eyeT.setText(this.d.hidden ? 'MOSTRAR' : 'OCULTAR');
    };

    this.buildPanel();
    void LAYOUT;
  }

  /** Painel de baixo: estádio, clima e horário (refeito a cada troca, para marcar a escolha). */
  private buildPanel() {
    this.choices = [];
    const W = GAME_W;
    const t = teamById(this.d.team);
    const tc = uiColor(t);
    const name = TeamRepository.get(this.d.team).stadium.name;
    this.panel?.destroy();
    const p = (this.panel = this.add.container(0, 0).setDepth(880).setVisible(!this.d.hidden));
    p.add(bottomGradient(this, 300, 879));
    const top = this.MH - 214;
    // dica
    p.add(tvText(this, W / 2, top - 14, 'ARRASTE O DEDO PARA ANDAR PELO ESTÁDIO', 12, C.muted, 700, 1.4).setOrigin(0.5));

    // Estádio: ◀ logo + nome ▶
    const y1 = top + 34;
    const g = this.add.graphics();
    plateShadow(g, 16, y1 - 28, W - 32, 56);
    plate(g, 16, y1 - 28, W - 32, 56, TV.ink, 0.95);
    plate(g, 62, y1 - 28, 52, 56, tc, 1);
    p.add(g);
    p.add(this.add.image(88, y1, logoKey(t.id, 'm')).setDisplaySize(38, 38));
    const tn = tvText(this, 124, y1 - 9, name, 18, C.white, 800, 0.6).setOrigin(0, 0.5);
    if (tn.width > 196) tn.setScale(196 / tn.width, 1);
    p.add(tn);
    p.add(tvText(this, 124, y1 + 12, `${t.name}${this.dome ? ' · COBERTO' : ''}`, 12, C.muted, 700, 1.2).setOrigin(0, 0.5));
    const idx = TEAM_LIST.findIndex((x) => x.id === t.id);
    const step = (k: number) => this.loadTeam(TEAM_LIST[(idx + k + TEAM_LIST.length) % TEAM_LIST.length].id);
    p.add(this.arrowBtn(38, y1, -1, () => step(-1)));
    p.add(this.arrowBtn(W - 38, y1, 1, () => step(1)));

    // Clima
    const y2 = y1 + 64;
    p.add(tvText(this, 20, y2, 'CLIMA', 13, C.white, 800, 1.6).setOrigin(0, 0.5));
    WXS.forEach((o, i) => {
      const on = this.d.wx === o.key;
      const b = this.choice(126 + i * 88, y2, o.name, on, tc);
      this.choices.push({ b, kind: 'wx', key: o.key });
      if (this.dome && o.key !== 'clear') b.setEnabled(false);
      else b.onTap = () => this.setLook(this.d.tod, o.key);
      p.add(b);
    });

    // Horário
    const y3 = y2 + 52;
    p.add(tvText(this, 20, y3, 'HORÁRIO', 13, C.white, 800, 1.6).setOrigin(0, 0.5));
    TODS.forEach((o, i) => {
      const on = this.d.tod === o.key;
      const b = this.choice(126 + i * 88, y3, o.name, on, tc);
      this.choices.push({ b, kind: 'tod', key: o.key });
      b.onTap = () => this.setLook(o.key, this.d.wx);
      p.add(b);
    });
    if (this.dome) p.add(tvText(this, W / 2, y3 + 34, 'ESTÁDIO COBERTO: SEM CHUVA NEM NEVE', 11, C.muted, 700, 1.2).setOrigin(0.5));
  }

  /** Troca de estádio: precisa remontar a arquibancada nas cores do time (aviso na tela enquanto monta). */
  private loadTeam(team: string) {
    const W = GAME_W;
    const c = this.add.container(0, 0).setDepth(2000);
    c.add(this.add.rectangle(VIEW.x, VIEW.y, VIEW.w, VIEW.h, TV.ink, 0.55).setOrigin(0));
    const t = teamById(team);
    c.add(this.add.image(W / 2, GAME_H * 0.42, logoKey(t.id, 'm')).setDisplaySize(84, 84));
    c.add(tvText(this, W / 2, GAME_H * 0.42 + 64, TeamRepository.get(team).stadium.name, 20, C.white, 800, 0.8).setOrigin(0.5));
    c.add(tvText(this, W / 2, GAME_H * 0.42 + 88, 'CARREGANDO...', 13, C.muted, 700, 2).setOrigin(0.5));
    // deixa o aviso aparecer antes de montar
    this.time.delayedCall(40, () => this.restart({ team }));
  }

  private choices: { b: TvButton; kind: 'wx' | 'tod'; key: string }[] = [];

  /** Marca no painel o clima e o horário escolhidos (sem redesenhar o painel). */
  private refreshChoices() {
    const tc = uiColor(teamById(this.d.team));
    for (const c of this.choices) {
      const on = c.kind === 'wx' ? this.d.wx === c.key : this.d.tod === c.key;
      c.b.setFill(on ? tc : TV.ink, on ? 1 : 0.92, on);
      const txt = c.b.list.find((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
      txt?.setColor(on ? inkOn(tc) : C.white);
    }
  }

  private choice(x: number, y: number, text: string, on: boolean, tc: number) {
    const b = new TvButton(this, x, y, { w: 80, h: 38, fill: on ? tc : TV.ink, fillAlpha: on ? 1 : 0.92, primary: on });
    b.add(tvText(this, 0, 0, text, 15, on ? inkOn(tc) : C.white, 800, 1.2).setOrigin(0.5));
    return b;
  }

  private arrowBtn(x: number, y: number, dir: 1 | -1, fn: () => void) {
    const b = new TvButton(this, x, y, { w: 40, h: 56, fill: TV.ink2, fillAlpha: 1 });
    const a = this.add.graphics();
    a.lineStyle(3, TV.yellow, 1);
    a.beginPath();
    a.moveTo(-4 * dir, -9);
    a.lineTo(5 * dir, 0);
    a.lineTo(-4 * dir, 9);
    a.strokePath();
    b.add(a);
    b.onTap = fn;
    return b;
  }
}
