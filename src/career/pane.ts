import Phaser from 'phaser';

/*
 * Área rolável (vertical ou horizontal) com recorte: arrastar rola (com inércia), tocar sem arrastar
 * aciona o item tocado. Os itens tocáveis são retângulos registrados em coordenadas do conteúdo, então
 * não dependem de objetos interativos dentro de um container com máscara.
 */
interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
}

export class Pane {
  readonly content: Phaser.GameObjects.Container;
  private hits: Hit[] = [];
  private maskG: Phaser.GameObjects.Graphics;
  private extent = 0;
  private scroll = 0;
  private vel = 0;
  private drag: { id: number; start: number; last: number; t: number; moved: boolean; sx: number; sy: number } | null = null;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    public y: number,
    readonly w: number,
    readonly h: number,
    private axis: 'x' | 'y' = 'y',
    depth = 10,
  ) {
    this.content = scene.add.container(x, y).setDepth(depth);
    this.maskG = scene.make.graphics({}, false);
    this.maskG.fillRect(x, y, w, h);
    this.content.setMask(this.maskG.createGeometryMask());
    const inside = (p: Phaser.Input.Pointer) => p.worldX >= x && p.worldX <= x + w && p.worldY >= this.y && p.worldY <= this.y + h;
    const pos = (p: Phaser.Input.Pointer) => (axis === 'y' ? p.worldY : p.worldX);
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.content.visible || !inside(p) || this.drag) return;
      this.vel = 0;
      this.drag = { id: p.id, start: pos(p), last: pos(p), t: scene.time.now, moved: false, sx: p.worldX, sy: p.worldY };
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || p.id !== d.id) return;
      const v = pos(p);
      if (Math.abs(v - d.start) > 8) d.moved = true;
      if (!d.moved) return;
      const dt = Math.max(1, scene.time.now - d.t);
      this.vel = ((v - d.last) / dt) * 16;
      this.setScroll(this.scroll - (v - d.last));
      d.last = v;
      d.t = scene.time.now;
    });
    const up = (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || p.id !== d.id) return;
      this.drag = null;
      if (d.moved) return;
      // Toque: procura o item (coordenadas do conteúdo)
      const lx = d.sx - this.content.x;
      const ly = d.sy - this.content.y;
      for (let i = this.hits.length - 1; i >= 0; i--) {
        const hh = this.hits[i];
        if (lx >= hh.x && lx <= hh.x + hh.w && ly >= hh.y && ly <= hh.y + hh.h) {
          navigator.vibrate?.(8);
          hh.fn();
          return;
        }
      }
    };
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
    scene.events.on('update', () => {
      if (this.drag || Math.abs(this.vel) < 0.1) return;
      this.setScroll(this.scroll - this.vel);
      this.vel *= 0.92;
    });
  }

  private setScroll(v: number) {
    const max = Math.max(0, this.extent - (this.axis === 'y' ? this.h : this.w));
    this.scroll = Phaser.Math.Clamp(v, 0, max);
    if (this.axis === 'y') this.content.y = this.y - this.scroll;
    else this.content.x = this.x - this.scroll;
  }

  /** Apaga tudo (troca de aba) e volta ao começo; `keepScroll` mantém a posição (redesenho no lugar). */
  clear(keepScroll = false) {
    this.content.removeAll(true);
    this.hits = [];
    this.vel = 0;
    if (keepScroll) return;
    this.extent = 0;
    this.setScroll(0);
  }

  add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.content.add(o);
    return o;
  }

  /** Registra uma área tocável (coordenadas do conteúdo). */
  hit(x: number, y: number, w: number, h: number, fn: () => void) {
    this.hits.push({ x, y, w, h, fn });
  }

  /** Tamanho total do conteúdo (altura ou largura) para limitar a rolagem. */
  setExtent(v: number) {
    this.extent = v;
    this.setScroll(this.scroll);
  }

  /** Move a área inteira (recorte junto) para outra altura. */
  moveTo(y: number) {
    this.y = y;
    this.maskG.clear();
    this.maskG.fillRect(this.x, y, this.w, this.h);
    if (this.axis === 'x') this.content.y = y;
    this.setScroll(this.scroll);
  }

  setVisible(v: boolean) {
    this.content.setVisible(v);
  }

  /** Rola para deixar a posição `v` (do conteúdo) visível. */
  reveal(v: number, size: number) {
    const view = this.axis === 'y' ? this.h : this.w;
    if (v < this.scroll) this.setScroll(v - 16);
    else if (v + size > this.scroll + view) this.setScroll(v + size - view + 16);
  }
}
