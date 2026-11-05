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

  // Placas inclinadas, faixas e losangos (3 ou 4 pontos, convexos) viram triângulos diretos;
  // fillPoints triangulava o polígono (earcut) a cada quadro, em dezenas de placas dos menus.
  const origFillPoints = G.fillPoints;
  G.fillPoints = function (this: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[], closeShape?: boolean, closePath?: boolean, endIndex?: number) {
    const n = endIndex === undefined ? pts.length : Math.min(endIndex, pts.length);
    if (n === 3) return this.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    if (n === 4) {
      // convexo = todas as quinas viram para o mesmo lado
      let pos = 0;
      let neg = 0;
      for (let i = 0; i < 4; i++) {
        const a = pts[i], b = pts[(i + 1) % 4], c = pts[(i + 2) % 4];
        const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        if (cr > 0) pos++;
        else if (cr < 0) neg++;
      }
      if (!(pos && neg)) {
        this.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        return this.fillTriangle(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
      }
    }
    return origFillPoints.call(this, pts, closeShape, closePath, endIndex);
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

/**
 * Igual a `scene.textures.addCanvas(key, canvas)`, mas sem a CanvasTexture: ela lê todos os pixels
 * (getImageData) só para guardar uma cópia que o jogo nunca usa, e isso travava a troca de telas
 * (bonecos, rostos, uniformes). Aqui o canvas vai direto para a placa de vídeo como imagem comum.
 * Só para arte pronta: quem precisa redesenhar depois (getContext/refresh) usa createCanvas.
 */
export function addCanvasTex(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  return scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

/**
 * Tarefas pequenas que "aquecem" a fonte da transmissão em cada tamanho/peso: a primeira vez que o
 * navegador usa um tamanho de fonte ele prepara as letras, e isso pesava na primeira abertura de cada
 * tela. Rodadas aos poucos em tela parada, as telas seguintes abrem sem esse custo.
 */
export function fontWarmJobs(family: string, sizes: number[], weights: number[], per = 8): (() => void)[] {
  const combos: string[] = [];
  for (const w of weights) for (const s of sizes) combos.push(`${w} ${s}px ${family}`);
  const jobs: (() => void)[] = [];
  let ctx: CanvasRenderingContext2D | null = null;
  for (let i = 0; i < combos.length; i += per) {
    const part = combos.slice(i, i + per);
    jobs.push(() => {
      ctx ??= document.createElement('canvas').getContext('2d');
      if (!ctx) return;
      for (const f of part) {
        ctx.font = f;
        ctx.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZ ÁÉÍÓÚÂÊÔÃÕÀÇ 0123456789 ·×:-%');
        ctx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ ÁÉÍÓÚÂÊÔÃÕÀÇ 0123456789 ·×:-%', 0, 20);
      }
    });
  }
  return jobs;
}
