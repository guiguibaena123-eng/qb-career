import Phaser from 'phaser';

/**
 * Atalhos de desempenho para os Graphics do Phaser.
 *
 * Por padrão o Phaser desenha cada círculo com 100 pontos e cada elipse com 32, e a cada quadro
 * ainda triangula esse polígono (earcut). O jogo desenha dezenas deles por quadro (sombras dos
 * jogadores, flashes, anéis, rastro da bola), o que pesa muito no celular. Aqui círculos e elipses
 * viram um leque de triângulos com poucos pontos (mais pontos só quando a forma é grande na tela),
 * sem diferença visível.
 */
export function patchGraphicsPerf() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const G = Phaser.GameObjects.Graphics.prototype as any;

  /** Número de lados conforme o tamanho na tela (raio em px lógicos). */
  const sides = (r: number) => Math.max(10, Math.min(40, Math.round(8 + r * 0.6)));
  const COS: number[][] = [];
  const SIN: number[][] = [];
  const table = (n: number) => {
    if (!COS[n]) {
      COS[n] = Array.from({ length: n + 1 }, (_, i) => Math.cos((i / n) * Math.PI * 2));
      SIN[n] = Array.from({ length: n + 1 }, (_, i) => Math.sin((i / n) * Math.PI * 2));
    }
    return n;
  };

  const fan = (g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number) => {
    if (!(rx > 0) || !(ry > 0)) return g;
    const n = table(sides(Math.max(rx, ry)));
    const c = COS[n];
    const s = SIN[n];
    for (let i = 0; i < n; i++) {
      g.fillTriangle(x, y, x + c[i] * rx, y + s[i] * ry, x + c[i + 1] * rx, y + s[i + 1] * ry);
    }
    return g;
  };

  G.fillCircle = function (this: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
    return fan(this, x, y, r, r);
  };
  G.fillEllipse = function (this: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, smoothness?: number) {
    if (smoothness !== undefined) return this.fillEllipseShape(new Phaser.Geom.Ellipse(x, y, w, h), smoothness);
    return fan(this, x, y, w / 2, h / 2);
  };

  const ring = (g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number) => {
    if (!(rx > 0) || !(ry > 0)) return g;
    const n = table(sides(Math.max(rx, ry)));
    const c = COS[n];
    const s = SIN[n];
    g.beginPath();
    g.moveTo(x + c[0] * rx, y + s[0] * ry);
    for (let i = 1; i <= n; i++) g.lineTo(x + c[i] * rx, y + s[i] * ry);
    g.closePath();
    g.strokePath();
    return g;
  };
  G.strokeCircle = function (this: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
    return ring(this, x, y, r, r);
  };
  G.strokeEllipse = function (this: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, smoothness?: number) {
    if (smoothness !== undefined) return this.strokeEllipseShape(new Phaser.Geom.Ellipse(x, y, w, h), smoothness);
    return ring(this, x, y, w / 2, h / 2);
  };
}
