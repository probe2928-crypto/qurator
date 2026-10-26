// Generates the Android (Trusted Web Activity) project for the Google Play app with Bubblewrap.
// Run in CI: node scripts/android/twa.mjs <outDir>; then ./gradlew bundleRelease (unsigned; signed offline).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');

const cfg = JSON.parse(fs.readFileSync('android/twa-config.json', 'utf8'));
const out = process.argv[2] || 'build/twa';
const m = await TwaManifest.fromWebManifest(cfg.manifestUrl);
Object.assign(m, {
  packageId: cfg.packageId, name: cfg.name, launcherName: cfg.launcherName, startUrl: cfg.startUrl,
  appVersionCode: cfg.appVersionCode, appVersionName: cfg.appVersionName,
  themeColor: cfg.themeColor, themeColorDark: cfg.themeColor,
  navigationColor: cfg.navigationColor, navigationColorDark: cfg.navigationColor,
  navigationDividerColor: cfg.navigationColor, navigationDividerColorDark: cfg.navigationColor,
  backgroundColor: cfg.backgroundColor, enableNotifications: false, fallbackType: 'customtabs',
  enableSiteSettingsShortcut: false, orientation: 'portrait', shortcuts: [],
});
fs.mkdirSync(out, { recursive: true });
await new TwaGenerator().createTwaProject(out, m, new ConsoleLog('twa'));
await m.saveToFile(`${out}/twa-manifest.json`);
console.log('TWA project ready:', m.packageId, m.appVersionName, `(${m.appVersionCode})`, m.host + m.startUrl);
