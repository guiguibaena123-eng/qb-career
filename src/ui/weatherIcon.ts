import Phaser from 'phaser';

/*
 * Ícones de clima desenhados em código: sol (ou lua, à noite), nuvem com chuva e nuvem com neve.
 * (x, y) = centro; `s` = tamanho (largura aproximada).
 */

export type WxKind = 'clear' | 'rain' | 'snow';

export const WX_NAME: Record<WxKind, string> = { clear: 'CÉU LIMPO', rain: 'CHUVA', snow: 'NEVE' };

export function weatherIcon(scene: Phaser.Scene, x: number, y: number, kind: WxKind, s = 24, night = false) {
  const g = scene.add.graphics();
  const u = s / 24;
  const cloud = (cx: number, cy: number, col: number) => {
    g.fillStyle(col, 1);
    g.fillCircle(cx - 6 * u, cy + 1 * u, 5 * u);
    g.fillCircle(cx + 1 * u, cy - 3 * u, 7 * u);
    g.fillCircle(cx + 7 * u, cy + 1 * u, 5 * u);
    g.fillRoundedRect(cx - 11 * u, cy + 1 * u, 23 * u, 6 * u, 3 * u);
  };
  if (kind === 'clear') {
    if (night) {
      // Lua cheia com crateras (sem recorte escuro: funciona sobre qualquer fundo)
      g.fillStyle(0xf4e7b0, 0.25);
      g.fillCircle(x, y, 11 * u);
      g.fillStyle(0xf4e7b0, 1);
      g.fillCircle(x, y, 8.5 * u);
      g.fillStyle(0xd8c88a, 1);
      g.fillCircle(x - 3 * u, y - 2 * u, 2.2 * u);
      g.fillCircle(x + 3 * u, y + 3 * u, 1.6 * u);
      g.fillCircle(x + 2.5 * u, y - 4 * u, 1.1 * u);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(x + 9 * u, y + 6 * u, 1.2 * u);
      g.fillCircle(x - 9 * u, y - 8 * u, 1 * u);
    } else {
      g.fillStyle(0xffd23f, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillCircle(x + Math.cos(a) * 10 * u, y + Math.sin(a) * 10 * u, 1.8 * u);
      }
      g.fillStyle(0xffb02e, 1);
      g.fillCircle(x, y, 7 * u);
      g.fillStyle(0xffe27a, 1);
      g.fillCircle(x - 1.5 * u, y - 1.5 * u, 4.5 * u);
    }
    return g;
  }
  cloud(x, y - 3 * u, kind === 'rain' ? 0xb8c2d8 : 0xe8eef8);
  if (kind === 'rain') {
    g.fillStyle(0x5aa9ff, 1);
    for (let i = 0; i < 3; i++) g.fillRoundedRect(x - 7 * u + i * 6 * u, y + 7 * u + (i % 2) * 2 * u, 2 * u, 5 * u, 1 * u);
  } else {
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 3; i++) {
      const fx = x - 7 * u + i * 7 * u;
      const fy = y + 9 * u + (i % 2) * 2 * u;
      g.fillRect(fx - 2.5 * u, fy - 0.6 * u, 5 * u, 1.2 * u);
      g.fillRect(fx - 0.6 * u, fy - 2.5 * u, 1.2 * u, 5 * u);
    }
  }
  return g;
}
