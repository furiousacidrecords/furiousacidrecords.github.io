import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.furiousacid.purplerabbit',
  appName: 'Purple Rabbit Chemistry',
  webDir: '.mobile-web',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
