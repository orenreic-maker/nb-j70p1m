import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(path.join(root, 'app.config.json'), 'utf8'));

const cap = {
  appId: cfg.appId,
  appName: cfg.appName,
  webDir: 'dist',
  backgroundColor: '#F6EFE3',
  android: { allowMixedContent: false },
  ios: { contentInset: 'automatic' },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 900,
      backgroundColor: '#F6EFE3',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: { style: 'LIGHT', backgroundColor: '#F6EFE3' },
    LocalNotifications: { smallIcon: 'ic_stat_breathanew', iconColor: '#C4623F' },
  },
};

writeFileSync(path.join(root, 'capacitor.config.json'), JSON.stringify(cap, null, 2) + '\n');
console.log(`capacitor.config.json ← ${cfg.appId}`);
