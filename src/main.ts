import Phaser from 'phaser';
// Fontes embutidas no projeto (funcionam offline)
import '@fontsource/press-start-2p';
import '@fontsource/silkscreen';
import { GAME_H, GAME_W } from './config';
import { MainMenu } from './scenes/MainMenu';

async function boot() {
  // Espera as fontes carregarem para os textos do Phaser não nascerem com fonte padrão
  await Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('16px "Silkscreen"')]).catch(() => {});

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#0A0C1A',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    scene: [MainMenu],
  });
}

boot();
