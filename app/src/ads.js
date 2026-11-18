import { APP } from './config.js';
import { isNative } from './native.js';
import { DAY } from './calc.js';

const AD_ROUTES = new Set(['home', 'health', 'badges', 'journal', 'stats']);

export function adsAllowed(st, route, now) {
  if (!APP.adsEnabled) return false;
  if (!isNative()) return false;
  if (st.settings?.adsRemoved) return false;
  const q = st.settings?.quitAt;
  if (!q || now - q < 3 * DAY) return false;
  return AD_ROUTES.has(route);
}

/** Dashed placeholder only while capturing design screenshots. Real web builds show nothing. */
export function showPlaceholder(st, route) {
  if (!st.freezeNow) return false;
  if (st.settings?.adsRemoved) return false;
  return AD_ROUTES.has(route);
}

let shown = false;

export async function syncBanner(st, route, now) {
  if (!adsAllowed(st, route, now)) {
    if (shown && isNative()) {
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.hideBanner();
      } catch { /* ignore */ }
      shown = false;
    }
    return;
  }
  try {
    const { AdMob, BannerAdSize, BannerAdPosition, AdmobConsentStatus } = await import('@capacitor-community/admob');
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm();
    }
    try { await AdMob.requestTrackingAuthorization(); } catch { /* ATT dismissed or Android */ }
    if (!consent.canRequestAds) return;
    await AdMob.initialize({ initializeForTesting: true });
    const adId = (await import('@capacitor/core')).Capacitor.getPlatform() === 'ios'
      ? APP.admob.iosBanner : APP.admob.androidBanner;
    await AdMob.showBanner({
      adId,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 86,
    });
    shown = true;
  } catch { /* ads are scaffolding; a missing store setup must not break the app */ }
}
