import Phaser from 'phaser';
import { sfx } from '../systems/sfx';
import { CombineBase } from '../combine/CombineBase';
import { clamp, scoreArm } from '../combine/scoring';
import { Actor, CombineStage, MID, playerLook } from '../combine/stage';
import { GAME_H, GAME_W } from '../config';
import { getSave, type TestId } from '../player/PlayerSave';
import { makeThrow } from '../systems/passing';
import { bottomShade, fieldText, MeterBar, pill, primaryButton } from '../combine/ui';

/*
 * Teste 4 — força de braço, no campo da partida. 3 lançamentos de potência: segure o botão para
 * carregar a barra e solte dentro da zona dourada (ela se move); depois toque no centro do marcador
 * para acertar o giro. Mede velocidade (≈ 48–62 mph) e distância (≈ 55–75 jardas); a câmera segue a
 * bola. Vale o melhor lançamento. Duas tentativas do teste (vale a melhor).
 */
const THROWS = 3;
const BAR_X = 45;
const BAR_W = GAME_W - 90;
const QB_Y = 20;
const CAM0 = 34;

export class CombineForca extends CombineBase {
  constructor() {
    super('CombineForca');
  }

  protected testId: TestId = 'arm';
  protected heading = 'FORÇA DE BRAÇO';
  protected instructions = ['3 LANÇAMENTOS DE POTÊNCIA', '', 'SEGURE PARA CARREGAR E SOLTE', 'DENTRO DA ZONA DOURADA', '', 'DEPOIS TOQUE NO CENTRO DO GIRO'];
  private phase: 'idle' | 'charge' | 'timing' | 'fly' | 'done' = 'idle';
  private qb!: Actor;
  private powerBar!: MeterBar;
  private timeBar!: MeterBar;
  private info!: ReturnType<typeof pill>;
  private btnText!: Phaser.GameObjects.Text;
  private radar!: Phaser.GameObjects.Text;
  private latched = false;
  private downAt = 0;
  private lockTimer?: Phaser.Time.TimerEvent;
  private power = 0;
  private dir = 1;
  private mark = 0;
  private mdir = 1;
  private zone = 0.6;
  private n = 0;
  private qPower = 0;
  private yds = 0;
  private results: { mph: number; yds: number }[] = [];
  private rand!: () => number;
  private armF = 1;

  protected world() {
    this.stage = new CombineStage(this, CAM0);
    this.qb = this.stage.actor(MID, QB_Y, playerLook());
    this.stage.makeBall();
    // Marcas de distância a partir do QB: 55, 60, 65, 70 e 75 jardas
    for (const yd of [55, 60, 65, 70, 75]) this.stage.mark(`${yd}`, 4, QB_Y + yd, 16, '#FFD23F');
    this.radar = fieldText(this, GAME_W / 2, 170, 38, '#FFC400');
    this.info = pill(this, 116);
  }

  protected scoreOf(raw: number, extra = 55) {
    return scoreArm(raw, extra);
  }

  protected show(raw: number, extra = 0) {
    return `${raw.toFixed(0)} mph · ${extra.toFixed(0)} jd`;
  }

  protected play(rand: () => number) {
    this.rand = rand;
    this.armF = 0.88 + getSave().attrs.arm / 550; // rookie (66) ≈ 1.0
    bottomShade(this, 300);
    this.powerBar = new MeterBar(this, GAME_H - 176);
    this.timeBar = new MeterBar(this, GAME_H - 134);
    const b = primaryButton(this, 'SEGURE');
    this.btnText = b.text;
    b.btn.onDown = () => this.down();
    b.btn.onUp = () => this.up();
    // Soltar o dedo em qualquer lugar (ou sair da tela) também solta o arremesso; no giro, tocar em qualquer lugar vale
    this.input.on('pointerup', () => this.up());
    this.input.on('pointerupoutside', () => this.up());
    const onBlur = () => this.sys.isActive() && this.up();
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.phase === 'timing' && p.worldY < GAME_H - 130) this.lockTiming();
    });
    this.next();
  }

  private next() {
    this.phase = 'idle';
    this.power = 0;
    this.dir = 1;
    this.btnText.setText('SEGURE');
    this.info.set(`LANÇAMENTO ${this.n + 1}/${THROWS}`);
    this.stage.world.targetY = CAM0;
  }

  private down() {
    if (this.phase === 'idle') {
      this.phase = 'charge';
      this.latched = false;
      this.downAt = this.time.now;
      this.btnText.setText('SOLTE NO DOURADO');
    } else if (this.phase === 'charge' && this.latched) {
      // toque simples: o primeiro toque começou a carregar, este solta
      this.latched = false;
      this.up(true);
    } else if (this.phase === 'timing') this.lockTiming();
  }

  private up(force = false) {
    if (this.phase !== 'charge') return;
    // Toque rápido (menos de 0,25 s) mantém a barra carregando até o próximo toque
    if (!force && this.time.now - this.downAt < 250) {
      this.latched = true;
      this.btnText.setText('TOQUE PARA SOLTAR');
      return;
    }
    this.latched = false;
    const miss = Math.abs(this.power - this.zone);
    this.qPower = clamp(1 - miss / 0.4, 0, 1);
    this.popText(GAME_W / 2, 480, miss < 0.08 ? 'POTÊNCIA PERFEITA!' : miss < 0.2 ? 'BOA POTÊNCIA' : 'FRACA', miss < 0.08 ? '#3CCB5A' : '#FFD23F');
    this.phase = 'timing';
    this.mark = 0;
    this.mdir = 1;
    this.btnText.setText('TOQUE NO CENTRO!');
    this.lockTimer?.remove();
    this.lockTimer = this.time.delayedCall(1700, () => this.phase === 'timing' && this.lockTiming());
  }

  private lockTiming() {
    if (this.phase !== 'timing') return;
    this.lockTimer?.remove();
    this.phase = 'fly';
    const acc = clamp(1 - Math.abs(this.mark - 0.5) * 2.2, 0, 1);
    const q = clamp((this.qPower * 0.78 + acc * 0.22) * this.armF + (this.rand() - 0.5) * 0.04, 0, 1);
    const mph = 48 + 14 * q;
    const yds = 55 + 20 * clamp(q * 0.96 + (this.rand() - 0.5) * 0.06, 0, 1);
    this.results.push({ mph, yds });
    this.yds = yds;
    this.radar.setText(`${mph.toFixed(1)} MPH`);
    this.btnText.setText('...');
    // Mesma bola da partida, em arco até a distância medida; giro ruim abre o lançamento para o lado
    const side = (1 - acc) * 5 * (this.rand() < 0.5 ? -1 : 1);
    const t = makeThrow(MID, QB_Y, clamp(MID + side, 6, 47), QB_Y + yds, 1);
    this.qb.pose = 'throw';
    this.time.delayedCall(350, () => (this.qb.pose = null));
    this.stage.ball!.launch(t);
  }

  private landed() {
    const ball = this.stage.ball!;
    const p = this.screenAt(ball.x, ball.y);
    ball.state = 'held';
    ball.hide();
    sfx.play('bounce', { vol: 0.7, x: ball.x });
    this.puff(p.x, p.y);
    this.popText(p.x, p.y - 50, `${this.yds.toFixed(0)} JARDAS`, '#FFFFFF');
    this.buzz(20);
    this.n++;
    if (this.n >= THROWS) {
      this.phase = 'done';
      const bst = this.results.reduce((a, b) => (scoreArm(b.mph, b.yds) > scoreArm(a.mph, a.yds) ? b : a));
      this.time.delayedCall(900, () => this.finish(bst.mph, bst.yds));
    } else this.time.delayedCall(1200, () => this.next());
  }

  protected tick(s: number) {
    const st = this.stage;
    // Linhas de distância no gramado e câmera seguindo a bola
    for (const yd of [55, 60, 65, 70, 75]) st.line(QB_Y + yd, 3, FIELD_RIGHT, 0xffd23f, 0.5, 3);
    if (this.phase === 'fly') {
      const ball = st.ball!;
      st.world.targetY = clamp(ball.y + 8, CAM0, 90);
      if (ball.update(s)) this.landed();
    }
    this.zone = 0.62 + Math.sin(this.time.now / 600) * 0.1;
    if (this.phase === 'charge') {
      this.power += this.dir * 0.75 * s;
      if (this.power >= 1 || this.power <= 0) {
        this.power = clamp(this.power, 0, 1);
        this.dir *= -1;
      }
    }
    if (this.phase === 'timing') {
      this.mark += this.mdir * 1.2 * s;
      if (this.mark >= 1 || this.mark <= 0) {
        this.mark = clamp(this.mark, 0, 1);
        this.mdir *= -1;
      }
    }
    // Barras no desenho da partida: faixa boa em degradê e agulha branca
    this.powerBar?.draw(this.power * 2 - 1, this.zone * 2 - 1, 0.2, this.phase === 'charge');
    this.timeBar?.draw(this.mark * 2 - 1, 0, 0.12, this.phase === 'timing');
  }
}

const FIELD_RIGHT = 50;
