import { Capacitor } from '@capacitor/core';

export function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function haptic(style = 'light') {
  if (!isNative()) {
    try { navigator.vibrate?.(style === 'heavy' ? 30 : 12); } catch { /* ignore */ }
    return;
  }
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] || ImpactStyle.Light });
  } catch { /* plugin unavailable */ }
}

export async function sharePayload({ title, text, url, file }) {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title || 'BreathAnew', files: file ? [file] : undefined });
      return true;
    } catch (e) {
      if (e?.message?.includes('canceled') || e?.name === 'AbortError') return false;
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (e) {
      if (e?.name === 'AbortError') return false;
    }
  }
  return false;
}

export async function writeCacheFile(name, data, encoding = 'utf8') {
  if (!isNative()) return null;
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  await Filesystem.writeFile({
    path: name,
    data,
    directory: Directory.Cache,
    encoding: encoding === 'utf8' ? Encoding.UTF8 : undefined,
  });
  const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: name });
  return uri;
}

export async function openLink(url) {
  if (isNative()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch { /* fall through */ }
  }
  window.open(url, '_blank', 'noopener');
}

export async function applyStatusBar(theme) {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#151B17' : '#F6EFE3' });
  } catch { /* ignore */ }
}

export async function hideSplash() {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }
}

/** Local notifications exist only in the installed app. The browser preview does not schedule them. */
export async function syncNotifications(st, plan) {
  if (!isNative()) return { ok: false, reason: 'web' };
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return { ok: false, reason: 'denied' };
    const pending = await LocalNotifications.getPending();
    if (pending.notifications?.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    if (!plan.length) return { ok: true };
    await LocalNotifications.schedule({ notifications: plan.slice(0, 48) });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function onNotificationOpen(handler) {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
      handler(ev.notification?.extra || {});
    });
  } catch { /* ignore */ }
}

function decodeBase64Utf8(b64) {
  const bin = atob(String(b64 || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

// Native backup picker: opens the system Files/documents picker directly,
// with only JSON files selectable. Resolves to the file text, or null when
// the user cancels. Throws { code: 'unavailable' } if the plugin is missing.
export async function pickJsonNative() {
  let FilePicker;
  try {
    ({ FilePicker } = await import('@capawesome/capacitor-file-picker'));
  } catch {
    const e = new Error('unavailable'); e.code = 'unavailable'; throw e;
  }
  let res;
  try {
    res = await FilePicker.pickFiles({ types: ['application/json'], limit: 1, readData: true });
  } catch (e) {
    const msg = String(e?.message || e || '');
    if (/cancel/i.test(msg)) return null;
    if (/not implemented|unimplemented/i.test(msg) || e?.code === 'UNIMPLEMENTED') { const u = new Error('unavailable'); u.code = 'unavailable'; throw u; }
    throw e;
  }
  const f = res?.files?.[0];
  if (!f) return null;
  if (f.data) return decodeBase64Utf8(f.data);
  if (f.blob) return f.blob.text();
  throw new Error('no data');
}
