import Phaser from 'phaser';
// Fontes embutidas no projeto (funcionam offline)
import '@fontsource/press-start-2p';
import '@fontsource/silkscreen';
// Fonte dos menus (transmissão de TV)
import '@fontsource/saira-condensed/600.css';
import '@fontsource/saira-condensed/700.css';
import '@fontsource/saira-condensed/800.css';
import { GAME_H, GAME_W, RES } from './config';
import { patchText } from './systems/hires';
import { Boot } from './scenes/Boot';
import { CareerTest } from './scenes/CareerTest';
import { CareerHub } from './scenes/CareerHub';
import { CombineHub } from './scenes/CombineHub';
import { Combine40 } from './scenes/Combine40';
import { Combine3Cones } from './scenes/Combine3Cones';
import { CombinePasse } from './scenes/CombinePasse';
import { CombineForca } from './scenes/CombineForca';
import { CombineResultado } from './scenes/CombineResultado';
import { CareerCreate } from './scenes/CareerCreate';
import { PlayerTest } from './scenes/PlayerTest';
import { MainMenu } from './scenes/MainMenu';
import { DraftEspera } from './scenes/DraftEspera';
import { DraftTelefone } from './scenes/DraftTelefone';
import { DraftAnuncio } from './scenes/DraftAnuncio';
import { DraftEscolhido } from './scenes/DraftEscolhido';
import { CarreiraMenu } from './scenes/CarreiraMenu';
import { PreJogo } from './scenes/PreJogo';
import { CareerSlots } from './scenes/CareerSlots';

async function boot() {
  // Espera as fontes carregarem para os textos do Phaser não nascerem com fonte padrão
  await Promise.all([
    document.fonts.load('16px "Press Start 2P"'),
    document.fonts.load('16px "Silkscreen"'),
    document.fonts.load('600 16px "Saira Condensed"'),
    document.fonts.load('700 16px "Saira Condensed"'),
    document.fonts.load('800 16px "Saira Condensed"'),
  ]).catch(() => {});

  patchText();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W * RES,
    height: GAME_H * RES,
    backgroundColor: '#0B0E14',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    // Vários dedos ao mesmo tempo: segurar o joystick e apertar SPRINT/JUKE/SPIN/MERGULHO
    input: { activePointers: 4 },
    scene: [Boot, MainMenu, CareerTest, PlayerTest, CareerHub, CareerCreate, CombineHub, Combine40, Combine3Cones, CombinePasse, CombineForca, CombineResultado, DraftEspera, DraftTelefone, DraftAnuncio, DraftEscolhido, CarreiraMenu, PreJogo, CareerSlots],
  });
  // Teste (só no desenvolvimento): acesso ao jogo pelo console
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
}

boot();

// Modo offline (só na versão publicada): o service worker guarda o jogo para abrir sem internet
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
