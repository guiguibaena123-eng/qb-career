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

/** `end` = onde a música acaba de verdade (antes do silêncio final), medido nos arquivos. */
const TRACKS: { file: string; end: number }[] = [
  { file: '01', end: 162.5 },
  { file: '02', end: 164.7 },
  { file: '03', end: 146.1 },
  { file: '04', end: 142.4 },
  { file: '05', end: 270.5 },
  { file: '06', end: 128.5 },
  { file: '07', end: 144.0 },
  { file: '08', end: 164.4 },
  { file: '09', end: 137.1 },
  { file: '10', end: 151.5 },
  { file: '11', end: 86.2 },
];
/** Duração da transição entre faixas (s). */
const XFADE = 6;
/** Entrada/saída ao ir para a partida e voltar ao menu (s). */
const DUCK = 1.2;
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

  constructor() {
    // Já baixa a primeira faixa ao abrir o jogo (baixar não precisa de toque): no primeiro toque ela toca na hora
    this.shuffle();
    void this.load(this.order[0]).catch(() => {});
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
    if (!ctx || ctx.currentTime < this.xfadeEnd) return;
    this.decks.forEach((d, i) => {
      if (i === this.cur || d.track < 0) return;
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
      if (d.unlocked || d.track >= 0) continue;
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
      const deck: Deck = { el, gain, track: -1, url: null, handedOff: false, unlocked: false };
      el.addEventListener('timeupdate', () => this.onTime(deck));
      el.addEventListener('ended', () => {
        if (!deck.handedOff && this.decks[this.cur] === deck) this.next();
      });
      this.decks.push(deck);
    }
    void ctx.resume();
    this.apply();
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
      // primeira faixa ainda baixando: toca direto do servidor enquanto baixa (não espera o arquivo inteiro)
      url = first && !this.ready.has(t) ? this.fileUrl(t) : await this.load(t);
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
    deck.el.src = url;
    deck.el.currentTime = 0;
    const go = () => {
      old.handedOff = true;
      this.cur = this.decks.indexOf(deck);
      const now = ctx.currentTime;
      const dur = first ? 0.6 : XFADE;
      fade(deck.gain.gain, now, dur, true);
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
      go();
    };
    deck.el.play().then(goOnce, () => {
      this.blocked = () => deck.el.play().then(goOnce);
    });
  }

  private onTime(deck: Deck) {
    if (!this.playing || deck.handedOff || this.decks[this.cur] !== deck) return;
    const end = Math.min(TRACKS[deck.track].end, deck.el.duration || Infinity);
    if (deck.el.currentTime >= end - XFADE) void this.next();
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
      // primeira vez: entra rápido; voltando da partida: sobe com calma
      master.gain.linearRampToValueAtTime(LEVEL, now + (this.started ? DUCK : 0.6));
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
function fade(p: AudioParam, at: number, dur: number, up: boolean) {
  const n = 48;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    curve[i] = up ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2);
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
