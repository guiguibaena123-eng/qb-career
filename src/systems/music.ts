/**
 * Trilha dos menus: 11 faixas em ordem embaralhada, com transição suave (crossfade) entre elas.
 *
 * - Dois "decks" (elementos <audio>) se revezam: perto do fim de uma faixa a próxima entra enquanto a
 *   atual sai (curvas de potência igual: o volume somado não afunda nem estoura no meio).
 * - O volume passa por um GainNode (Web Audio): no iPhone o `audio.volume` não funciona.
 * - Cada faixa é baixada inteira (fetch → blob): passa pelo service worker e fica guardada para tocar
 *   sem internet. A próxima é baixada enquanto a atual toca.
 * - Navegador só deixa tocar som depois de um toque: os decks são "destravados" no primeiro toque.
 * - Na partida e nos testes do Combine a música abaixa e pausa; no menu volta de onde parou.
 */

/**
 * Medido nos arquivos: `end` = onde o som acaba (antes do silêncio final); `out` = onde a parte cheia da
 * música termina. Algumas faixas fecham com 8–15 s quase mudos (20 dB abaixo): a próxima entra ali, senão o
 * menu ficava num "buraco" quase sem som antes da troca.
 */
const TRACKS: { file: string; end: number; out: number; start?: number }[] = [
  { file: '01', end: 162.5, out: 162.0 },
  { file: '02', end: 164.7, out: 161.0 },
  // 03 e 08: pausa baixinha logo no começo (8–14 s / 9–16 s); logo após uma troca soava como buraco →
  // começam depois dela (a entrada suave esconde o corte)
  { file: '03', end: 146.1, out: 131.5, start: 14.2 },
  { file: '04', end: 142.4, out: 128.5 },
  { file: '05', end: 270.5, out: 270.5 },
  { file: '06', end: 128.5, out: 128.5 },
  { file: '07', end: 144.0, out: 131.0 },
  { file: '08', end: 164.4, out: 148.0, start: 16.4 },
  { file: '09', end: 137.1, out: 123.5 },
  { file: '10', end: 151.5, out: 151.5 },
  { file: '11', end: 86.2, out: 86.0 },
];
/** Duração da transição entre faixas (s): longa, as duas se misturam devagar. */
const XFADE = 9;
/** Momento (s na faixa) em que a próxima começa a entrar. */
// (com final baixo, a troca começa antes: quando a antiga cai, a nova já está quase no volume cheio)
const xfadeAt = (t: number) => Math.min(TRACKS[t].end - XFADE, TRACKS[t].out - XFADE * 0.6);
/** Entrada/saída ao ir para a partida e voltar ao menu (s). */
const DUCK = 1.2;
/** Volta da música ao sair da partida (s): sobe sem pressa. */
const DUCK_IN = 2.5;
/** Entrada da primeira música ao abrir o jogo (s): sobe devagar, sem susto. */
const INTRO = 3.5;
/** Volume da trilha (0–1). */
const LEVEL = 0.55;
const PREF_KEY = 'qb-career-music';

interface Deck {
  el: HTMLAudioElement;
  gain: GainNode;
  track: number;
  url: string | null;
  /** já começou a passar a vez para o outro deck */
  handedOff: boolean;
  /** já tocou dentro de um gesto (pode tocar sozinho depois) */
  unlocked: boolean;
  /** faixa que este deck já está carregando antes do primeiro toque (-1 = nenhuma) */
  primed: number;
}

class MenuMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private decks: Deck[] = [];
  private cur = 0; // índice do deck tocando
  private order: number[] = [];
  private pos = -1;
  private blobs = new Map<number, Promise<string>>();
  /** faixas já baixadas (endereço do blob pronto) */
  private ready = new Map<number, string>();
  private wanted = false;
  private playing = false;
  private hidden = false;
  private enabled = localStorage.getItem(PREF_KEY) !== '0';
  private pauseTimer: number | null = null;
  /** preparando a próxima faixa (evita disparar duas vezes) */
  private busy = false;
  private started = false;
  /** play() bloqueado pelo navegador: tenta de novo no próximo toque */
  private blocked: (() => Promise<void>) | null = null;
  /** fim da transição em andamento (tempo do AudioContext); fora dela só o deck atual pode soar */
  private xfadeEnd = 0;
  /** deck carregando a próxima faixa (o vigia não pode pausá-lo enquanto ela ainda não começou) */
  private starting: Deck | null = null;

  constructor() {
    this.shuffle();
    // a primeira não é a faixa longa (05: o dobro do tamanho, demora mais para baixar)
    if (TRACKS[this.order[0]].file === '05') [this.order[0], this.order[1]] = [this.order[1], this.order[0]];
    // Cria o áudio já ao abrir: onde o navegador deixa (ex.: jogo instalado como app) a música começa sem
    // esperar toque; onde não deixa, fica pronta e começa no primeiro toque.
    this.unlock();
    // Já carrega a primeira faixa ao abrir o jogo (carregar não precisa de toque): no toque ela toca na hora
    this.preferCached();
    // Todo toque: cria/retoma o áudio (exigência dos navegadores) e tenta de novo o que foi bloqueado
    const kick = () => this.kick();
    window.addEventListener('pointerdown', kick, true);
    window.addEventListener('touchend', kick, true);
    window.addEventListener('keydown', kick, true);
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      this.apply();
    });
    // Vigia: nunca deixa duas faixas soando fora de uma transição
    window.setInterval(() => this.settle(), 1000);
  }

  /** Fora de uma transição, o deck que não é o atual fica parado e mudo. */
  private settle() {
    const ctx = this.ctx;
    if (!ctx) return;
    // Nunca deixa o menu sem música: faixa atual acabou/parou sem a próxima entrar → puxa a próxima
    if (this.playing && !this.busy && !this.blocked && !this.hidden && ctx.state === 'running') {
      const d = this.decks[this.cur];
      if (d.track >= 0 && !d.handedOff) {
        if (d.el.ended || d.el.currentTime >= xfadeAt(d.track) + 0.5) void this.next();
        else if (d.el.paused) void d.el.play().catch(() => {});
      }
    }
    if (ctx.currentTime < this.xfadeEnd) return;
    this.decks.forEach((d, i) => {
      if (i === this.cur || d.track < 0 || d === this.starting) return;
      if (!d.el.paused) d.el.pause();
      d.gain.gain.cancelScheduledValues(ctx.currentTime);
      d.gain.gain.setValueAtTime(0, ctx.currentTime);
    });
  }

  private kick() {
    if (!this.ctx) this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state !== 'running') void ctx.resume();
    // No toque, só alguns eventos contam como "gesto" (no celular: o dedo saindo da tela). Por isso a
    // tentativa fica guardada até dar certo, e os decks parados são destravados a cada toque.
    for (const d of this.decks) {
      if (d.unlocked || d.track >= 0 || d.primed >= 0) continue;
      d.el.src = SILENCE;
      d.el.play().then(() => {
        d.unlocked = true;
        if (d.track < 0) d.el.pause();
      }, () => {});
    }
    const retry = this.playing ? this.blocked : null; // na partida (música pausada) não destrava nada
    if (retry) {
      retry().then(() => {
        if (this.blocked === retry) this.blocked = null;
      }, () => {});
    } else if (this.playing) {
      const d = this.decks[this.cur];
      if (d.track >= 0 && d.el.paused && !d.handedOff) void d.el.play().catch(() => {});
    }
  }

  get on() {
    return this.enabled;
  }

  /** Liga/desliga a trilha (guardado no aparelho). */
  setEnabled(on: boolean) {
    this.enabled = on;
    localStorage.setItem(PREF_KEY, on ? '1' : '0');
    this.apply();
  }

  /** Menus chamam com true; partida/treino com false. */
  setWanted(on: boolean) {
    if (on === this.wanted) return;
    this.wanted = on;
    this.apply();
  }

  /** Cria o áudio dentro do toque do usuário (exigência dos navegadores, principalmente iPhone). */
  private unlock() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.master);
      const deck: Deck = { el, gain, track: -1, url: null, handedOff: false, unlocked: false, primed: -1 };
      el.addEventListener('timeupdate', () => this.onTime(deck));
      el.addEventListener('ended', () => {
        if (!deck.handedOff && this.decks[this.cur] === deck) this.next();
      });
      this.decks.push(deck);
    }
    void ctx.resume();
    this.apply();
  }

  /**
   * Primeira faixa: se alguma já está guardada no aparelho, começa por ela (toca na hora, sem internet).
   * Se nenhuma está, o deck que vai tocar já começa a carregar a primeira direto do servidor — um download
   * só (antes eram dois ao mesmo tempo dividindo a internet), e ela começa a tocar com o começo carregado.
   */
  private preferCached() {
    const prime = () => {
      if (this.pos >= 0 || this.busy) return; // já começou
      const d = this.decks[(this.cur + 1) % 2];
      if (!d || d.track >= 0) return;
      d.primed = this.order[0];
      d.el.src = this.fileUrl(d.primed);
      d.el.load();
    };
    if (!('caches' in window)) return prime();
    void caches
      .open('qb-career-music-v1')
      .then((c) => c.keys())
      .then((keys) => {
        if (this.pos >= 0 || this.busy) return;
        const have = new Set(keys.map((k) => (k.url.match(/music\/(\d+)\.mp3/) || [])[1]).filter(Boolean));
        const i = this.order.findIndex((t) => have.has(TRACKS[t].file));
        if (i < 0) return prime();
        if (i > 0) [this.order[0], this.order[i]] = [this.order[i], this.order[0]];
        void this.load(this.order[0]).catch(() => {});
      })
      .catch(prime);
  }

  private shuffle() {
    const last = this.order[this.order.length - 1];
    const o = TRACKS.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    // não repete a mesma faixa na virada da lista
    if (o[0] === last && o.length > 1) [o[0], o[1]] = [o[1], o[0]];
    this.order = o;
    this.pos = -1;
  }

  private nextTrack(): number {
    if (this.pos + 1 >= this.order.length) this.shuffle();
    return this.order[++this.pos];
  }

  private peekTrack(): number {
    if (this.pos + 1 >= this.order.length) return -1;
    return this.order[this.pos + 1];
  }

  private fileUrl(t: number) {
    return `${import.meta.env.BASE_URL}music/${TRACKS[t].file}.mp3`;
  }

  private load(t: number): Promise<string> {
    let p = this.blobs.get(t);
    if (!p) {
      p = fetch(this.fileUrl(t))
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => URL.createObjectURL(b));
      p.then((u) => this.ready.set(t, u), () => this.blobs.delete(t));
      this.blobs.set(t, p);
    }
    return p;
  }

  /** Solta da memória as faixas que não estão tocando nem são a próxima. */
  private trim() {
    const keep = new Set(this.decks.map((d) => d.track));
    keep.add(this.peekTrack());
    for (const [t, p] of this.blobs) {
      if (keep.has(t)) continue;
      this.blobs.delete(t);
      this.ready.delete(t);
      void p.then((u) => URL.revokeObjectURL(u)).catch(() => {});
    }
  }

  /** Começa a próxima faixa no outro deck, com a atual saindo junto (só depois que a nova já está tocando). */
  private async next(first = false) {
    const ctx = this.ctx;
    if (!ctx || this.busy) return;
    this.busy = true;
    const t = this.nextTrack();
    const old = this.decks[this.cur];
    const deck = this.decks[(this.cur + 1) % 2];
    let url: string;
    try {
      // Ainda baixando: toca direto do servidor enquanto baixa (não espera o arquivo inteiro). Na troca
      // de faixa espera no máximo 1,2 s pelo arquivo guardado — nunca deixa a atual acabar em silêncio.
      const have = this.ready.get(t);
      url = have ?? (first ? this.fileUrl(t) : await Promise.race([this.load(t), new Promise<string>((r) => window.setTimeout(() => r(this.fileUrl(t)), 1200))]));
    } catch {
      // sem internet e sem cache: tenta de novo daqui a pouco
      this.pos--;
      this.busy = false;
      window.setTimeout(() => this.playing && this.next(first), 4000);
      return;
    }
    if (!this.playing) {
      this.pos--; // volta para a fila; toca quando o menu voltar
      this.busy = false;
      return;
    }
    deck.track = t;
    deck.url = url;
    deck.handedOff = false;
    deck.gain.gain.cancelScheduledValues(ctx.currentTime);
    deck.gain.gain.setValueAtTime(0, ctx.currentTime);
    // já estava carregando esta faixa desde a abertura: não recomeça o download
    if (!(deck.primed === t && url === this.fileUrl(t))) deck.el.src = url;
    deck.el.currentTime = TRACKS[t].start ?? 0;
    deck.primed = -1;
    this.starting = deck;
    const go = () => {
      old.handedOff = true;
      this.cur = this.decks.indexOf(deck);
      const now = ctx.currentTime;
      const dur = first ? INTRO : XFADE;
      fade(deck.gain.gain, now, dur, true, first);
      // a antiga sai junto; se já estava parada, fica muda de vez (senão voltaria tocando junto depois)
      if (old !== deck && old.track >= 0) {
        if (!old.el.paused) fade(old.gain.gain, now, dur, false);
        else {
          old.gain.gain.cancelScheduledValues(now);
          old.gain.gain.setValueAtTime(0, now);
        }
      }
      this.xfadeEnd = now + dur;
      window.setTimeout(() => {
        if (this.decks[this.cur] !== old) old.el.pause();
        this.trim();
      }, dur * 1000 + 100);
      this.busy = false;
      // baixa a seguinte enquanto esta toca (no fim da lista, já embaralha a próxima rodada)
      if (this.peekTrack() < 0) this.shuffle();
      void this.load(this.peekTrack()).catch(() => {});
    };
    let went = false;
    const goOnce = () => {
      if (went) return;
      went = true;
      this.blocked = null;
      if (this.starting === deck) this.starting = null;
      go();
    };
    // Bloqueado pelo navegador (falta toque): tenta de novo no próximo toque. Interrompido por outro
    // motivo (ainda carregando, rede lenta): tenta de novo sozinho.
    // desiste desta tentativa sem travar: a faixa volta para a fila e começa de novo quando o menu pedir
    const abandon = () => {
      if (went || this.starting !== deck) return;
      this.starting = null;
      deck.el.pause();
      deck.track = -1;
      this.pos--;
      this.busy = false;
      if (this.playing) window.setTimeout(() => this.playing && this.decks[this.cur].track < 0 && this.next(true), 1500);
    };
    const attempt = (n: number): Promise<void> =>
      deck.el.play().then(goOnce, (e: DOMException) => {
        if (went || this.decks[(this.cur + 1) % 2] !== deck) return Promise.reject(e);
        if (e && e.name === 'NotAllowedError') {
          this.blocked = () => deck.el.play().then(goOnce);
          return Promise.reject(e);
        }
        if (this.playing && n < 20) return new Promise<void>((r) => window.setTimeout(r, 400)).then(() => attempt(n + 1));
        abandon();
        return Promise.reject(e);
      });
    attempt(0).catch(() => {});
  }

  private onTime(deck: Deck) {
    if (!this.playing || deck.handedOff || deck.track < 0 || this.decks[this.cur] !== deck) return;
    const end = Math.min(TRACKS[deck.track].end, deck.el.duration || Infinity);
    if (deck.el.currentTime >= Math.min(xfadeAt(deck.track), end - XFADE)) void this.next();
  }

  /** Decide tocar/pausar conforme menu, preferência e app em segundo plano. */
  private apply() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const should = this.wanted && this.enabled && !this.hidden;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    if (this.pauseTimer !== null) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (should) {
      void ctx.resume();
      // primeira vez: o volume geral já fica pronto (a faixa é que entra devagar); voltando da partida: sobe com calma
      master.gain.linearRampToValueAtTime(LEVEL, now + (this.started ? DUCK_IN : 0.05));
      this.started = true;
      if (!this.playing) {
        this.playing = true;
        const d = this.decks[this.cur];
        if (d.track < 0) void this.next(true);
        else {
          // volta de onde parou: a faixa atual (e a anterior só se a transição ainda não terminou)
          void d.el.play().catch(() => {});
          const o = this.decks[(this.cur + 1) % 2];
          if (o.track >= 0 && ctx.currentTime < this.xfadeEnd) void o.el.play().catch(() => {});
          else this.settle();
        }
      }
    } else if (this.playing) {
      this.playing = false;
      const quick = this.hidden;
      master.gain.linearRampToValueAtTime(0, now + (quick ? 0.15 : DUCK));
      this.pauseTimer = window.setTimeout(() => {
        this.pauseTimer = null;
        if (!this.playing) for (const k of this.decks) k.el.pause();
      }, (quick ? 0.15 : DUCK) * 1000 + 50);
    }
  }
}

/** Curva de potência igual (seno/cosseno): somadas, as duas faixas mantêm o volume no meio da troca. */
function fade(p: AudioParam, at: number, dur: number, up: boolean, intro = false) {
  const n = 64;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    // entrada do zero (abrindo o jogo): começa bem baixinho e acelera no fim (o ouvido sente subida uniforme)
    curve[i] = intro ? x * x * (3 - 2 * x) * x : up ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2);
  }
  p.cancelScheduledValues(at);
  p.setValueAtTime(up ? 0 : p.value, at);
  if (!up) for (let i = 0; i < n; i++) curve[i] *= p.value;
  p.setValueCurveAtTime(curve, at, dur);
}

/** Meio segundo de silêncio (WAV mínimo) para destravar os elementos de áudio no primeiro toque. */
const SILENCE = (() => {
  const rate = 8000;
  const n = rate / 2;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const s = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  s(8, 'WAVE');
  s(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  s(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
})();

export const music = new MenuMusic();

// Teste (só no desenvolvimento): window.__music no console
if (import.meta.env.DEV) (window as unknown as { __music: MenuMusic }).__music = music;
