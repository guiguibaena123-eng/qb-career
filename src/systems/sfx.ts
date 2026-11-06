/**
 * Efeitos sonoros da partida: torcida (ambiente em camadas + reações), bola, jogadores e juiz.
 *
 * Sons CC0 do Freesound (lista em public/sfx/CREDITOS.md), recortados e com volume igualado.
 * Torcida de estádio grande (Millerntor, 29 mil torcedores + jogo universitário de futebol americano), em estéreo.
 * - Cada som tem variações: sorteia sem repetir a anterior, com leve variação de tom e volume
 *   (o mesmo som idêntico repetido soa robótico).
 * - Dois barramentos: campo (jogadores, bola, juiz) e torcida.
 * - Ambiente: murmúrio de base sempre tocando + camada "empolgada" que sobe com a animação da
 *   arquibancada (excite). Cada volta entra sobreposta à anterior (sem emenda/estalo de MP3).
 * - Posição: chute, recepção e pancadas soam do lado do campo onde aconteceram.
 */

const BANK = {
  hut: ['hut_1', 'hut_2', 'hut_3', 'hut_4'],
  effort: ['effort_1', 'effort_2', 'effort_3'],
  pads: ['pads_1', 'pads_2', 'pads_3', 'pads_4', 'pads_5', 'pads_6'],
  fall: ['fall_1', 'fall_2', 'fall_3'],
  oof: ['oof_1', 'oof_2', 'oof_3'],
  kick: ['kick_1', 'kick_2'],
  catch: ['catch_1', 'catch_2'],
  throw: ['throw_1', 'throw_2'],
  bounce: ['bounce_1', 'bounce_2', 'bounce_3', 'bounce_4', 'bounce_5'],
  whistle: ['whistle_1', 'whistle_2'],
  whistleLong: ['whistle_long'],
  cheerBig: ['cheer_big_1', 'cheer_big_2'],
  cheerMed: ['cheer_med_1', 'cheer_med_2'],
  cheerSwell: ['cheer_swell_1', 'cheer_swell_2', 'cheer_swell_3'],
  crowdOof: ['oof_crowd_1', 'oof_crowd_2'],
  boo: ['boo'],
  aww: ['aww'],
  ooh: ['ooh_1', 'ooh_2', 'ooh_3'],
  // cerimônia do Draft (plateia de auditório) e Combine (passos na grama)
  applause: ['applause_1', 'applause_2', 'applause_3', 'applause_4'],
  ovation: ['ovation'],
  step: ['step_1', 'step_2', 'step_3', 'step_4', 'step_5', 'step_6'],
} as const;
export type Sfx = keyof typeof BANK;

/** Mixagem: volume base de cada som, variação de tom e se é torcida. */
const MIX: Record<Sfx, { vol: number; pitch: number; crowd?: boolean }> = {
  hut: { vol: 0.5, pitch: 0.03 },
  effort: { vol: 0.32, pitch: 0.05 },
  pads: { vol: 0.75, pitch: 0.06 },
  fall: { vol: 0.6, pitch: 0.05 },
  oof: { vol: 0.38, pitch: 0.05 },
  kick: { vol: 0.95, pitch: 0.04 },
  catch: { vol: 0.65, pitch: 0.05 },
  throw: { vol: 0.32, pitch: 0.06 },
  bounce: { vol: 0.5, pitch: 0.06 },
  whistle: { vol: 0.27, pitch: 0.015 },
  whistleLong: { vol: 0.26, pitch: 0.01 },
  cheerBig: { vol: 0.95, pitch: 0.02, crowd: true },
  cheerMed: { vol: 0.75, pitch: 0.03, crowd: true },
  cheerSwell: { vol: 0.8, pitch: 0.03, crowd: true },
  crowdOof: { vol: 0.75, pitch: 0.03, crowd: true },
  boo: { vol: 0.55, pitch: 0.03, crowd: true },
  aww: { vol: 0.7, pitch: 0.03, crowd: true },
  ooh: { vol: 0.7, pitch: 0.03, crowd: true },
  applause: { vol: 0.7, pitch: 0.03, crowd: true },
  ovation: { vol: 0.85, pitch: 0.01, crowd: true },
  step: { vol: 0.42, pitch: 0.09 },
};
const LOOPS = ['amb_base', 'amb_hype', 'hall_amb', 'sideline'] as const;
/** Ambientes fora da partida: plateia do auditório (Draft) e conversa dos treinadores (Combine). */
export type Bed = 'hall' | 'sideline' | null;
const BEDS: Record<'hall' | 'sideline', { file: string; vol: number }> = {
  hall: { file: 'hall_amb', vol: 0.55 },
  sideline: { file: 'sideline', vol: 0.5 },
};
const PREF_KEY = 'qb-career-sfx';
/** Sobreposição entre as voltas do ambiente (s). */
const LOOP_XF = 1.5;

class LoopLayer {
  readonly out: GainNode;
  private next = 0;
  private timer: number | null = null;
  private live: { src: AudioBufferSourceNode; g: GainNode }[] = [];
  constructor(
    private ctx: AudioContext,
    private buf: AudioBuffer,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
  }
  start() {
    if (this.timer !== null) return;
    // começa num ponto qualquer do arquivo (cada partida soa um pouco diferente)
    this.segment(this.ctx.currentTime + 0.05, Math.random() * (this.buf.duration - LOOP_XF * 2), true);
    this.timer = window.setInterval(() => {
      if (this.ctx.currentTime > this.next - 2.5) this.segment(this.next, 0, false);
    }, 500);
  }
  private segment(at: number, offset: number, first: boolean) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.buf;
    const g = ctx.createGain();
    src.connect(g).connect(this.out);
    const len = this.buf.duration - offset;
    const n = 32;
    const up = new Float32Array(n);
    const down = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      up[i] = Math.sin((x * Math.PI) / 2);
      down[i] = Math.cos((x * Math.PI) / 2);
    }
    if (first) g.gain.setValueAtTime(1, at);
    else g.gain.setValueCurveAtTime(up, at, LOOP_XF);
    g.gain.setValueCurveAtTime(down, at + len - LOOP_XF, LOOP_XF);
    src.start(at, offset);
    src.stop(at + len + 0.05);
    const item = { src, g };
    this.live.push(item);
    src.onended = () => {
      this.live = this.live.filter((v) => v !== item);
      g.disconnect();
    };
    this.next = at + len - LOOP_XF;
  }
  level(v: number, tc = 0.35) {
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(v, now, tc);
  }
  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, 0.25);
    for (const { src } of this.live) {
      try {
        src.stop(now + 1.2);
      } catch {
        /* já parou */
      }
    }
  }
}

class MatchSfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private field: GainNode | null = null;
  private crowdBus: GainNode | null = null;
  private bufs = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private last = new Map<Sfx, number>();
  private enabled = localStorage.getItem(PREF_KEY) !== '0';
  private paused = false;
  private crowdOn = true;
  private base: LoopLayer | null = null;
  private hype: LoopLayer | null = null;
  private inMatch = false;
  /** sons tocando agora (o fim da partida corta todos; comemoração dura até 20 s) */
  private voices = new Set<{ src: AudioBufferSourceNode; g: GainNode }>();
  /** última reação grande da torcida (evita duas comemorações empilhadas) */
  private lastCrowd = { at: -9, rank: 0 };

  constructor() {
    const kick = () => this.ensure();
    window.addEventListener('pointerdown', kick, true);
    window.addEventListener('touchend', kick, true);
    window.addEventListener('keydown', kick, true);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  get on() {
    return this.enabled;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    localStorage.setItem(PREF_KEY, on ? '1' : '0');
    this.applyMaster();
  }

  /** Cria o áudio no toque do usuário e começa a baixar os sons (prontos antes da primeira partida). */
  private ensure() {
    if (this.ctx) {
      if (this.ctx.state !== 'running' && !document.hidden) void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    // limitador leve no fim: várias pancadas + torcida juntas não estouram
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(comp);
    this.field = ctx.createGain();
    this.field.gain.value = 1;
    this.field.connect(this.master);
    this.crowdBus = ctx.createGain();
    this.crowdBus.gain.value = 0.9;
    this.crowdBus.connect(this.master);
    this.applyMaster();
    void ctx.resume();
    // baixa um pouco depois: no começo a internet fica livre para a música do menu começar logo
    // (se a partida começar antes disso, startMatch já pede os sons)
    window.setTimeout(() => void this.load(), 6000);
  }

  private load() {
    if (this.loading || !this.ctx) return this.loading;
    const ctx = this.ctx;
    const names = new Set<string>([...LOOPS, ...Object.values(BANK).flat()]);
    this.loading = Promise.all(
      [...names].map((n) =>
        fetch(`${import.meta.env.BASE_URL}sfx/${n}.mp3`)
          .then((r) => r.arrayBuffer())
          .then((a) => new Promise<AudioBuffer>((ok, bad) => ctx.decodeAudioData(a, ok, bad)))
          .then((b) => {
            this.bufs.set(n, b);
            // o ambiente do estádio entra assim que as duas camadas chegam (não espera os outros sons)
            if (this.inMatch && (n === 'amb_base' || n === 'amb_hype')) this.startAmbience();
          })
          .catch(() => {}),
      ),
    ).then(() => {
      if (this.inMatch) this.startAmbience();
    });
    return this.loading;
  }

  private applyMaster() {
    if (!this.ctx || !this.master) return;
    const v = this.enabled && !this.paused ? 1 : 0;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(v, now, 0.08);
  }

  /** Toca um som. `x` = posição no campo (jardas, 0–53) para o lado do som; `vol` multiplica o volume base. */
  play(name: Sfx, o: { vol?: number; x?: number; delay?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const mix = MIX[name];
    if (mix.crowd && !this.crowdOn) return;
    const list = BANK[name];
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.last.get(name)) i = (i + 1) % list.length;
    this.last.set(name, i);
    const buf = this.bufs.get(list[i]);
    if (import.meta.env.DEV) ((window as unknown as { __sfxLog?: string[] }).__sfxLog ??= []).push(`${list[i]}${buf ? '' : '(sem buffer)'}`);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * mix.pitch;
    const g = ctx.createGain();
    g.gain.value = mix.vol * (o.vol ?? 1) * Math.pow(10, ((Math.random() * 2 - 1) * 1) / 20);
    let node: AudioNode = src.connect(g);
    if (o.x !== undefined && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-0.55, Math.min(0.55, (o.x - 26.65) / 32));
      node = node.connect(p);
    }
    node.connect(mix.crowd ? this.crowdBus! : this.field!);
    src.start(ctx.currentTime + (o.delay ?? 0));
    const v = { src, g };
    this.voices.add(v);
    src.onended = () => {
      this.voices.delete(v);
      g.disconnect();
    };
  }

  /**
   * Reação da torcida com prioridade: uma reação menor logo depois de uma maior é ignorada
   * (ex.: o TD já chama a comemoração grande; o "cheer" de recepção não empilha por cima).
   */
  crowd(name: Sfx, rank: number, o: { vol?: number; delay?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime + (o.delay ?? 0);
    if (now - this.lastCrowd.at < 1.6 && rank <= this.lastCrowd.rank) return;
    this.lastCrowd = { at: now, rank };
    this.play(name, o);
  }

  private bed: Bed = null;
  private bedLayer: LoopLayer | null = null;

  /** Liga o ambiente da cena (ou nenhum): entra e sai devagar; chamar várias vezes não faz nada. */
  setBed(b: Bed) {
    if (b === this.bed && (this.bedLayer || !b)) return;
    if (b !== this.bed) {
      this.bedLayer?.stop();
      this.bedLayer = null;
      this.bed = b;
    }
    const ctx = this.ctx;
    if (!b || !ctx) return;
    void this.load();
    const buf = this.bufs.get(BEDS[b].file);
    if (!buf) return; // ainda baixando: tenta de novo no próximo quadro
    this.bedLayer = new LoopLayer(ctx, buf, b === 'hall' ? this.crowdBus! : this.field!);
    this.bedLayer.start();
    this.bedLayer.level(BEDS[b].vol, 1.2);
    if (import.meta.env.DEV) ((window as unknown as { __sfxLog?: string[] }).__sfxLog ??= []).push(`ambiente:${b}`);
  }

  /** Reação de plateia fora da partida (palco do Draft): toca mesmo sem o ambiente do estádio. */
  cue(name: Sfx, o: { vol?: number; delay?: number } = {}) {
    void this.load();
    const was = this.crowdOn;
    this.crowdOn = true;
    this.play(name, o);
    this.crowdOn = was;
  }

  /** Início da partida: ambiente da torcida entra (sem torcida no treino livre). */
  startMatch(crowd: boolean) {
    this.inMatch = true;
    this.crowdOn = crowd;
    this.paused = false;
    this.applyMaster();
    void this.load();
    this.startAmbience();
  }

  private startAmbience() {
    const ctx = this.ctx;
    if (!ctx || !this.crowdOn || this.base) return;
    const b = this.bufs.get('amb_base');
    const h = this.bufs.get('amb_hype');
    if (!b || !h) return;
    this.base = new LoopLayer(ctx, b, this.crowdBus!);
    this.hype = new LoopLayer(ctx, h, this.crowdBus!);
    this.base.start();
    this.hype.start();
    this.base.level(0.6, 0.8);
    this.hype.level(0.08, 0.8);
  }

  /** Chamado todo quadro: a camada empolgada acompanha a arquibancada; jogada ao vivo = mais tensão. */
  setExcite(excite: number, live: boolean, noise = false) {
    if (!this.base || !this.hype) return;
    // `noise`: fora de casa, antes do snap a torcida grita para atrapalhar o nosso ataque
    const e = Math.max(Math.min(1, Math.max(0, excite)) * 0.85 + (live ? 0.15 : 0), noise ? 0.6 : 0);
    const k = Math.min(1, e);
    // só mexe quando muda de verdade (setTargetAtTime todo quadro é desperdício)
    const hv = 0.08 + 0.72 * k * k;
    const bv = 0.6 - 0.18 * k;
    // sobe rápido (a torcida explode junto com o lance) e desce devagar
    if (Math.abs(hv - this.hypeV) > 0.01) {
      this.hype.level(hv, hv > this.hypeV ? 0.12 : 0.5);
      this.hypeV = hv;
    }
    if (Math.abs(bv - this.baseV) > 0.01) {
      this.base.level(bv, bv > this.baseV ? 0.2 : 0.4);
      this.baseV = bv;
    }
  }
  private hypeV = -1;
  private baseV = -1;

  setPaused(on: boolean) {
    this.paused = on;
    this.applyMaster();
  }

  /** Fim da partida (saiu da cena): ambiente sai suave. */
  endMatch() {
    this.inMatch = false;
    const ctx = this.ctx;
    if (ctx) {
      const now = ctx.currentTime;
      for (const v of this.voices) {
        v.g.gain.cancelScheduledValues(now);
        v.g.gain.setTargetAtTime(0, now, 0.12);
        try {
          v.src.stop(now + 0.7);
        } catch {
          /* já parou */
        }
      }
      this.voices.clear();
    }
    this.base?.stop();
    this.hype?.stop();
    this.base = this.hype = null;
    this.hypeV = this.baseV = -1;
    this.paused = false;
    this.applyMaster();
  }
}

export const sfx = new MatchSfx();

// Teste (só no desenvolvimento): window.__sfx no console
if (import.meta.env.DEV) (window as unknown as { __sfx: MatchSfx }).__sfx = sfx;
