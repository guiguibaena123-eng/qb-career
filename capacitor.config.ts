import type { CapacitorConfig } from '@capacitor/cli';

// App de iPhone: o jogo (pasta dist, gerada pelo `vite build`) vai DENTRO do app e roda sem internet.
const config: CapacitorConfig = {
  appId: 'com.guiguibaena.qbcareer',
  appName: 'QB Career',
  webDir: 'dist',
  backgroundColor: '#0B0E14',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0B0E14',
    scrollEnabled: false,
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#0B0E14',
      showSpinner: false,
    },
  },
};

export default config;
