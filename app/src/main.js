import { Capacitor } from '@capacitor/core';
import { ACH, syncUnlocks } from './achievements.js';
import { adsAllowed, syncBanner } from './ads.js';
import { DAY, HOUR, MIN, ils, ppcOf } from './calc.js';
import { HEALTH } from './health.js';
import { applyCheckin, applySlip, applyWin, blank, migrate } from './model.js';
import { applyStatusBar, haptic, hideSplash, isNative, onNotificationOpen, openLink, sharePayload, syncNotifications, writeCacheFile } from './native.js';
import { buyRemoveAds, restoreRemoveAds } from './purchases.js';
import { livePatch, render, theme } from './render.js';
import { drawCard } from './sharecard.js';
import { canPersist, load, now, save, st, useMemory } from './store.js';
import { demoState } from './demo.js';
import { bump, ui } from './ui-state.js';
import { weekStats } from './insights.js';

const PHASES = {
  '478': [['שאיפה', 4, 1], ['החזקה', 7, 1], ['נשיפה', 8, 0.82]],
  box: [['שאיפה', 4, 1], ['החזקה', 4, 1], ['נשיפה', 4, 0.82], ['החזקה', 4, 0.82]],
};
let sos = null;
let tipTimer = null;
let toastTimer = 0;
let ac;

function toast(m) {
  ui.toast = m;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = ''; render(); }, 2800);
}

async function persist() {
  bump();
  if (canPersist()) await save();
  render();
  scheduleNotes();
  syncBanner(st, ui.route, now());
}

function reduced() {
  return !st.settings.celebrate || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function beep(kind) {
  if (!st.settings.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = kind === 'win' ? 660 : 420;
    g.gain.value = 0.04;
    o.connect(g); g.connect(ac.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
    o.stop(ac.currentTime + 0.2);
  } catch { /* autoplay */ }
}

function collectUnlocks(fresh) {
  if (!fresh.length) return;
  if (fresh.length === 1) ui.pending.push(fresh[0]);
  else {
    ui.pending.push(fresh[fresh.length - 1]);
    ui.toast = `נרשמו ${fresh.length} תחנות. מוצגת האחרונה.`;
  }
}

let cheerTimer = 0;
function armCheer(item) {
  ui.cheer = item;
  ui.unlock = null;
  render();
  clearTimeout(cheerTimer);
  if (st.freezeNow) return;
  const reduce = document.documentElement.classList.contains('reduce');
  cheerTimer = setTimeout(() => {
    ui.cheer = null;
    render();
    showUnlock();
  }, reduce ? 1400 : 2200);
}
function showUnlock() {
  if (ui.cheer || ui.route === 'sos' || ui.overlay === 'slip' || ui.overlay === 'insight') return;
  const next = ui.pending.shift();
  if (!next) return;
  if (st.settings.haptics) haptic('medium');
  beep('win');
  armCheer(next);
}

async function logWin({ dur = 0 } = {}) {
  const entry = applyWin(st, { now: now(), dur, intensity: 5, triggers: [], note: '' });
  ui.insightId = entry.id;
  ui.overlay = 'insight';
  ui.route = ui.route === 'sos' ? 'home' : ui.route;
  stopSos();
  const fresh = syncUnlocks(st, now());
  collectUnlocks(fresh);
  if (st.settings.haptics) haptic('light');
  beep('win');
  await persist();
}

function stopSos() {
  if (!sos) return;
  clearTimeout(sos.timer);
  clearInterval(sos.tick);
  clearInterval(tipTimer);
  sos = null;
}

function startSos() {
  if (sos) return;
  sos = { start: now(), phase: 0, tip: 0 };
  ui.route = 'sos';
  ui.overlay = null;
  render();
  runPhase(0);
  sos.tick = setInterval(patchSos, 250);
  tipTimer = setInterval(() => {
    if (!sos) return;
    sos.tip = (sos.tip + 1) % 10;
    const el = document.querySelector('[data-live=tip]');
    if (el) el.textContent = document.querySelector('[data-live=tip]') ? tipsAt(sos.tip) : '';
  }, 11000);
  if (st.settings.haptics) haptic('light');
}

function tipsAt(i) {
  const list = ['כוס מים קרים, לאט לאט. הקור מסיט את החשק.', 'הליכה קצרה משנה את הגל.', 'החשק עולה ויורד. לא צריך להכריע עכשיו.', 'לצחצח שיניים. הטעם הנקי מקצר את הרגע.', 'להחליף חדר. הסביבה היא חלק מההרגל.', 'נשימה איטית, בלי מאמץ.', 'הידיים מחפשות עיסוק. משהו קטן מספיק.', 'הגל הזה נגמר גם בלי סיגריה.', 'לשתות מים ואז לעצום עיניים לעשר שניות.', 'אפשר לרשום אחר כך מה עורר את זה.'];
  return list[i % list.length];
}

function runPhase(i) {
  if (!sos) return;
  const P = PHASES[ui.breathMode];
  const [name, sec, scale] = P[i % P.length];
  sos.phase = i;
  sos.phaseEnd = Date.now() + sec * 1000;
  sos.name = name;
  const blobs = document.querySelector('.blobs');
  if (blobs) {
    blobs.style.transitionDuration = reduced() ? '0.01s' : `${sec}s`;
    blobs.style.transform = `scale(${scale})`;
    if (reduced()) blobs.style.opacity = scale > 0.9 ? '1' : '0.72';
  }
  document.querySelectorAll('[data-phase]').forEach((el) => el.classList.toggle('on', +el.dataset.phase === i % P.length));
  const ph = document.querySelector('[data-live=phase]');
  if (ph) ph.textContent = name;
  if (i && st.settings.haptics) haptic('light');
  clearTimeout(sos.timer);
  sos.timer = setTimeout(() => runPhase(i + 1), sec * 1000);
}

function patchSos() {
  if (!sos) return;
  const left = Math.max(0, 600 - Math.floor((Date.now() - sos.start) / 1000));
  const clock = document.querySelector('[data-live=sosclock]');
  if (clock) clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const phaseLeft = document.querySelector('[data-live=phaseleft]');
  if (phaseLeft) phaseLeft.textContent = `עוד ${Math.max(1, Math.ceil((sos.phaseEnd - Date.now()) / 1000))} שניות`;
  const wave = document.querySelector('[data-live=wave]');
  if (wave) {
    const shown = Math.round((1 - left / 600) * 334);
    wave.setAttribute('stroke-dasharray', `${shown} 2000`);
  }
  if (left === 0 && !sos.done) {
    sos.done = true;
    toast('10 דקות עברו. הגל יכול לעבור גם בלי סיגריה.');
    if (st.settings.haptics) haptic('medium');
  }
}

function readCost() {
  const o = { ...(ui.cost || {}) };
  document.querySelectorAll('[data-cost]').forEach((el) => { o[el.dataset.cost] = el.value; });
  ui.cost = o;
  return o;
}

function num(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

async function finishOnboarding() {
  const s = st.settings;
  if (ui.dateMode === 'past' && ui.dateValue) s.quitAt = Math.min(Date.now(), new Date(ui.dateValue).getTime());
  else s.quitAt = Date.now();
  if (ui.habitMode) s.mode = ui.habitMode;
  if (ui.cpd) s.cpd = ui.cpd;
  s.years = parseInt(document.getElementById('years')?.value || ui.years || '0', 10) || 0;
  const cost = readCost();
  for (const [k, v] of Object.entries(cost)) s[k] = num(v, s[k]);
  s.name = (document.getElementById('obname')?.value || ui.name || '').trim();
  const why = (document.getElementById('obwhy')?.value || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (why.length) s.reasons = why.slice(0, 12);
  s.goalName = (document.getElementById('obgoal')?.value || '').trim();
  s.goalPrice = num(document.getElementById('obgoalp')?.value, 0);
  st.onboarded = true;
  const fresh = syncUnlocks(st, now());
  collectUnlocks(fresh);
  ui.route = 'home';
  ui.overlay = null;
  await persist();
  showUnlock();
}

async function importText(text) {
  const data = JSON.parse(text);
  if (!data?.settings || !Number.isFinite(+data.settings.quitAt)) throw new Error('bad');
  const next = migrate(data);
  next.onboarded = true;
  Object.assign(st, next);
  st.settings = next.settings;
  syncUnlocks(st, now());
  ui.route = 'home';
  ui.overlay = null;
  await persist();
  toast('הגיבוי נכנס. הנתונים נשארים רק במכשיר הזה.');
}

function filePick(accept, cb) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => { const f = input.files?.[0]; if (f) cb(f); };
  input.click();
}

async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 480 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } finally { URL.revokeObjectURL(url); }
}

async function exportBackup() {
  const name = `breathanew-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify({ ...st, freezeNow: undefined }, null, 2);
  if (isNative()) {
    try {
      const uri = await writeCacheFile(name, json);
      const shared = await sharePayload({ title: 'גיבוי BreathAnew', text: 'קובץ הגיבוי נשאר אצלך.', url: uri, file: uri });
      if (shared) toast('הגיבוי מוכן לשיתוף');
      return;
    } catch { /* fall through */ }
  }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  toast('הגיבוי ירד למכשיר');
}

async function shareCanvas(extra = {}) {
  const canvas = await drawCard(st, now(), { shape: ui.shareShape, money: ui.shareMoney, dots: ui.shareDots, ...extra });
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], 'breathanew.png', { type: 'image/png' });
  if (isNative()) {
    try {
      const buf = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const uri = await writeCacheFile('breathanew-share.png', btoa(binary), 'base64');
      await sharePayload({ title: 'BreathAnew', text: 'בלי שם ובלי תאריך.', url: uri, file: uri });
      return;
    } catch { /* download */ }
  }
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'BreathAnew' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'breathanew.png';
  a.click();
  toast('התמונה ירדה');
}

async function paintCard() {
  const canvas = document.getElementById('card');
  if (!canvas) return;
  const drawn = await drawCard(st, now(), { shape: ui.shareShape, money: ui.shareMoney, dots: ui.shareDots });
  const g = canvas.getContext('2d');
  canvas.width = drawn.width; canvas.height = drawn.height;
  g.drawImage(drawn, 0, 0);
}

function scheduleNotes() {
  if (!isNative() || !canPersist() || !st.onboarded || !st.settings.quitAt) return;
  const plan = [];
  const t = Date.now();
  if (st.settings.dailyCheckin) {
    plan.push({
      id: 1001, title: 'BreathAnew', body: 'איך עבר היום? נגיעה אחת, והרצף נשמר.',
      schedule: { on: { hour: st.settings.checkinHour || 21, minute: 0 }, repeats: true, allowWhileIdle: true },
      extra: { route: 'checkin' },
    });
  }
  if (st.settings.healthNotifs) {
    let n = 0;
    for (const h of HEALTH) {
      const at = st.settings.quitAt + h.at;
      if (at > t && at < t + 70 * DAY && n < 18) {
        plan.push({
          id: 2100 + n, title: 'תחנה בגוף', body: `${h.when}: ${h.title}`,
          schedule: { at: new Date(at), allowWhileIdle: true }, extra: { route: 'health' },
        });
        n += 1;
      }
    }
  }
  for (const a of ACH.filter((x) => x.k === 'time' && !st.unlocked[x.id])) {
    const at = st.settings.quitAt + a.v;
    if (at > t && at < t + 120 * DAY && plan.length < 40) {
      plan.push({
        id: 3000 + plan.length, title: 'BreathAnew', body: a.t,
        schedule: { at: new Date(at), allowWhileIdle: true }, extra: { route: 'health' },
      });
    }
  }
  syncNotifications(st, plan);
}

function registerPreviewWorker() {
  if (!('serviceWorker' in navigator) || isNative()) return;
  if (!location.protocol.startsWith('http')) return;
  const scopeUrl = new URL('./', location.href);
  if (!scopeUrl.pathname.endsWith('/preview/')) return;
  navigator.serviceWorker.register(new URL('sw.js', scopeUrl), { scope: scopeUrl.pathname }).catch(() => {});
}

function applyShot(shot) {
  const demoShots = new Set(['home', 'sos', 'health', 'badges', 'stats', 'journal', 'history', 'settings', 'settings2', 'share', 'week', 'slip', 'slipdone', 'insight', 'checkin', 'unlock']);
  if (demoShots.has(shot)) {
    useMemory(demoState());
    syncUnlocks(st, now());
    ui.pending = [];
  }
  if (shot === 'welcome') { ui.route = 'onboard'; ui.obStep = 0; }
  if (shot === 'date') { ui.route = 'onboard'; ui.obStep = 1; ui.dateMode = 'past'; ui.dateValue = '2026-11-14T06:00'; }
  if (shot === 'habit') { ui.route = 'onboard'; ui.obStep = 2; }
  if (shot === 'cost') { ui.route = 'onboard'; ui.obStep = 3; ui.habitMode = 'ryo'; }
  if (shot === 'why') { ui.route = 'onboard'; ui.obStep = 4; ui.habitMode = 'ryo'; ui.cpd = 10; ui.dateMode = 'now'; }
  if (shot === 'home') ui.route = 'home';
  if (shot === 'sos') { ui.route = 'sos'; }
  if (shot === 'health') ui.route = 'health';
  if (shot === 'badges' || shot === 'pocket') ui.route = 'pocket';
  if (shot === 'unlock') { ui.route = 'pocket'; ui.cheer = { kind: 'ach', item: ACH.find((a) => a.id === 'd3') }; }
  if (shot === 'stats') ui.route = 'stats';
  if (shot === 'journal') ui.route = 'journal';
  if (shot === 'history') { ui.route = 'journal'; ui.journalTab = 'history'; }
  if (shot === 'settings') ui.route = 'settings';
  if (shot === 'settings2') { ui.route = 'settings'; ui.scroll = 640; }
  if (shot === 'share') ui.route = 'share';
  if (shot === 'week') ui.route = 'week';
  if (shot === 'slip') { ui.route = 'home'; ui.overlay = 'slip'; }
  if (shot === 'slipdone') ui.route = 'slipdone';
  if (shot === 'insight') { ui.route = 'home'; ui.overlay = 'insight'; ui.insightId = st.cravings.at(-1)?.id; }
  if (shot === 'checkin') { ui.route = 'journal'; ui.overlay = 'checkin'; }
}

const actions = {
  go(el) {
    const goTo = el.dataset.go === 'badges' ? 'pocket' : el.dataset.go;
    ui.route = goTo;
    ui.overlay = null;
    ui.unlock = null;
    ui.cheer = null;
    render();
    if (ui.route === 'share') paintCard();
    syncBanner(st, ui.route, now());
  },
  back() { ui.route = 'home'; ui.overlay = null; render(); },
  sos() { startSos(); },
  'sos-close'() { stopSos(); ui.route = 'home'; render(); },
  'sos-won'() { const dur = sos ? Date.now() - sos.start : 0; logWin({ dur }); },
  'sos-slip'() { stopSos(); ui.route = 'home'; ui.overlay = 'slip'; render(); },
  breath(el) { ui.breathMode = el.dataset.mode; if (sos) { clearTimeout(sos.timer); render(); runPhase(0); } else render(); },
  win() { logWin({ dur: 0 }); },
  'open-checkin'() { ui.overlay = 'checkin'; ui.route = 'home'; render(); },
  slip() { ui.overlay = 'slip'; render(); },
  'overlay-off'() { ui.overlay = null; ui.editor = null; render(); },
  'slip-n'(el) { ui.slipCigs = Math.max(0, Math.min(40, ui.slipCigs + (+el.dataset.d || 0))); render(); },
  'slip-mode'(el) { ui.slipMode = el.dataset.mode; render(); },
  'slip-trig'(el) {
    const id = el.dataset.id;
    ui.slipTriggers = ui.slipTriggers.includes(id) ? ui.slipTriggers.filter((x) => x !== id) : [...ui.slipTriggers, id];
    render();
  },
  async 'slip-save'() {
    ui.slipNote = document.getElementById('slipnote')?.value || '';
    applySlip(st, { now: now(), cigs: ui.slipCigs, note: ui.slipNote, triggers: ui.slipTriggers, mode: ui.slipMode, intensity: null });
    syncUnlocks(st, now());
    ui.overlay = null;
    ui.route = 'slipdone';
    ui.slipTriggers = [];
    beep('slip');
    await persist();
  },
  'insight-close'() {
    const entry = st.cravings.find((c) => c.id === ui.insightId);
    if (entry) entry.note = document.getElementById('lognote')?.value || entry.note;
    ui.overlay = null;
    persist().then(() => showUnlock());
  },
  'undo-win'() {
    st.cravings = st.cravings.filter((c) => c.id !== ui.insightId);
    ui.overlay = null;
    ui.pending = [];
    persist();
  },
  'log-trig'(el) {
    const entry = st.cravings.find((c) => c.id === ui.insightId);
    if (!entry) return;
    const id = el.dataset.id;
    entry.triggers = (entry.triggers || []).includes(id) ? entry.triggers.filter((x) => x !== id) : [...(entry.triggers || []), id];
    render();
  },
  shuffle() { st.shuf = (st.shuf || 0) + 1; persist(); },
  hfilter(el) { ui.healthFilter = el.dataset.id; render(); },
  hpast() {
    st.settings.hideDoneHealth = !st.settings.hideDoneHealth;
    render();
    save();
  },
  link(el) { openLink(el.dataset.url); },
  ach(el) {
    const a = ACH.find((x) => x.id === el.dataset.id);
    if (!a) return;
    if (st.unlocked[a.id]) armCheer({ kind: 'ach', item: a });
    else toast(`${a.t}: עוד בדרך`);
  },
  'unlock-ok'() { ui.unlock = null; render(); showUnlock(); },
  jtab(el) { ui.journalTab = el.dataset.tab; render(); },
  mood(el) { ui.checkinMood = +el.dataset.m; render(); },
  checkin() {
    if (!ui.checkinMood) { toast('בוחרים מצב רוח, נגיעה אחת'); return; }
    applyCheckin(st, { now: now(), mood: ui.checkinMood, crave: +document.getElementById('crave')?.value || 0, note: document.getElementById('cnote')?.value || '' });
    const fresh = syncUnlocks(st, now());
    collectUnlocks(fresh);
    toast(ui.checkinMood <= 2 ? 'נשמר. ימים קשים עוברים.' : 'נשמר. תודה על הרצף.');
    persist().then(() => showUnlock());
  },
  'checkin-tap'(el) {
    ui.checkinMood = +el.dataset.m;
    applyCheckin(st, { now: now(), mood: ui.checkinMood, crave: 0, note: '' });
    const fresh = syncUnlocks(st, now());
    collectUnlocks(fresh);
    ui.overlay = null;
    persist().then(() => { toast(`נשמר. רצף של ${st.checkins.length ? '' : ''}${document.querySelector('.small') ? '' : ''}`); showUnlock(); });
  },
  'why-ok'() { st.seenJournalWhy = true; persist(); },
  theme(el) { st.settings.theme = el.dataset.theme; applyStatusBar(theme()); persist(); },
  toggle(el) {
    const k = el.dataset.key;
    st.settings[k] = !st.settings[k];
    if (st.settings.haptics && k === 'haptics') haptic('light');
    persist();
  },
  async set(el) {
    const k = el.dataset.set;
    if (k === 'export') return exportBackup();
    if (k === 'import') return filePick('application/json', async (f) => { try { await importText(await f.text()); } catch { toast('הקובץ לא נראה כמו גיבוי'); } });
    if (k === 'reset') {
      if (!confirm('למחוק את כל הנתונים מהמכשיר?')) return;
      if (!confirm('בלי גיבוי אי אפשר לשחזר. למחוק?')) return;
      const fresh = blank();
      Object.assign(st, fresh);
      st.settings = fresh.settings;
      ui.route = 'onboard'; ui.obStep = 0;
      await persist();
      return;
    }
    if (k === 'privacy') { location.href = './privacy.html'; return; }
    if (k === 'about') { ui.overlay = 'about'; render(); return; }
    if (k === 'hmo') { ui.overlay = 'hmo'; render(); return; }
    if (k === 'restore') return restore();
    ui.editor = k === 'date' || k === 'cpd' || k === 'goal' || k === 'why' || k === 'cost' ? k : null;
    render();
  },
  editor: (el) => { ui.editor = el.dataset.ed; render(); },
  setmode(el) { st.settings.mode = el.dataset.mode; render(); },
  async 'editor-save'() {
    const s = st.settings;
    if (ui.editor === 'date') {
      const v = new Date(document.getElementById('edit-date')?.value).getTime();
      if (Number.isFinite(v)) s.quitAt = Math.min(Date.now(), v);
    }
    if (ui.editor === 'cpd') {
      s.cpd = num(document.getElementById('edit-cpd')?.value, s.cpd);
      s.mpc = num(document.getElementById('edit-mpc')?.value, s.mpc);
    }
    if (ui.editor === 'goal') {
      s.goalName = document.getElementById('edit-goal')?.value.trim() || '';
      s.goalPrice = num(document.getElementById('edit-goalp')?.value, 0);
    }
    if (ui.editor === 'why') {
      s.reasons = (document.getElementById('edit-why')?.value || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
    }
    if (ui.editor === 'cost') {
      const cost = readCost();
      for (const [k, v] of Object.entries(cost)) s[k] = num(v, s[k]);
    }
    ui.editor = null;
    syncUnlocks(st, now());
    await persist();
  },
  'clear-photo'() { st.settings.photo = ''; persist(); },
  async buy() {
    if (st.settings.adsRemoved) return;
    const res = await buyRemoveAds();
    if (!isNative() || res.reason === 'web') { toast('הרכישה זמינה באפליקציה בחנות. בדפדפן אין פרסומות.'); return; }
    if (res.ok) { st.settings.adsRemoved = true; await persist(); toast('הרכישה נשמרה במכשיר'); }
    else toast('חשבון החנות עוד לא מחובר. אפשר לנסות שוב אחרי החיבור.');
  },
  shape(el) { ui.shareShape = el.dataset.shape; render(); paintCard(); },
  sharetoggle(el) { ui[el.dataset.key] = !ui[el.dataset.key]; render(); paintCard(); },
  'share-go'() { shareCanvas(); },
  'week-share'() {
    const w = weekStats(st, now());
    shareCanvas({ caption: `${w.beaten} גלים השבוע · ${ils(w.saved, 0)}` });
  },
  'ob-back'() { ui.obStep = Math.max(0, ui.obStep - 1); render(); },
  'ob-skip'() {
    if (ui.obStep === 3) readCost();
    if (ui.obStep < 4 && obMissing()) { toast('חסר תאריך, סוג, או מספר סיגריות'); return; }
    if (ui.obStep < 4) { ui.obStep += 1; render(); return; }
    finishOnboarding();
  },
  'ob-next'(el) {
    if (el.classList.contains('dis')) return;
    if (ui.obStep === 1 && ui.dateMode === 'past') ui.dateValue = document.getElementById('qdt')?.value || ui.dateValue;
    if (ui.obStep === 2) ui.years = document.getElementById('years')?.value || '';
    if (ui.obStep === 3) readCost();
    if (ui.obStep === 4) { finishOnboarding(); return; }
    ui.obStep += 1;
    render();
  },
  'date-mode'(el) { ui.dateMode = el.dataset.mode; render(); },
  habit(el) { ui.habitMode = el.dataset.mode; render(); },
  cpd(el) {
    const d = +el.dataset.d;
    ui.cpd = Math.max(1, Math.min(80, (ui.cpd || 0) + d));
    if (d < 0 && ui.cpd === 1 && (ui.cpd + d) < 1 && !el.dataset.keep) {
      /* stay at 1 */
    }
    render();
  },
  import() { filePick('.json,application/json', async (f) => { try { await importText(await f.text()); } catch { toast('הקובץ לא נראה כמו גיבוי'); } }); },
};

function obMissing() {
  if (!ui.dateMode) return true;
  if (ui.dateMode === 'past' && !(document.getElementById('qdt')?.value || ui.dateValue)) return true;
  if (!ui.habitMode || !ui.cpd) return true;
  return false;
}

async function restore() {
  const res = await restoreRemoveAds();
  if (!isNative()) { toast('שחזור רכישה זמין באפליקציה בחנות'); return; }
  if (res.ok && res.owned) { st.settings.adsRemoved = true; await persist(); toast('הרכישה שוחזרה'); }
  else if (res.ok) toast('לא נמצאה רכישה למוצר הזה');
  else toast('חשבון החנות עוד לא מחובר');
}

document.body.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  if (b.dataset.act !== 'import' && b.tagName === 'LABEL') return;
  actions[b.dataset.act]?.(b, e);
});

document.body.addEventListener('change', async (e) => {
  if (e.target.id === 'invest') persist();
  if (e.target.id === 'qdt') ui.dateValue = e.target.value;
  if (e.target.id === 'obphoto' || e.target.id === 'edit-photo') {
    const file = e.target.files?.[0];
    if (!file) return;
    st.settings.photo = await compress(file);
    if (ui.editor) await persist();
    else toast('התמונה תישמר עם סיום ההתחלה');
  }
});

document.body.addEventListener('input', (e) => {
  if (e.target.dataset?.cost) {
    ui.cost = ui.cost || {};
    ui.cost[e.target.dataset.cost] = e.target.value;
  }
  if (e.target.id === 'crave') {
    const v = document.getElementById('craveV');
    if (v) v.textContent = `${e.target.value} מתוך 10`;
    const th = e.target.parentElement?.querySelector('.th');
    if (th) th.style.insetInlineEnd = `${e.target.value * 10}%`;
  }
  if (e.target.id === 'invest') {
    const v = Math.min(10, Math.max(3, Math.round(+e.target.value) || 7));
    st.settings.investRate = v / 100;
    const lab = document.getElementById('investV');
    if (lab) lab.textContent = `${v}%`;
    const sc = document.querySelector('.screen.money-screen');
    const top = sc ? sc.scrollTop : 0;
    render();
    const next = document.querySelector('.screen.money-screen');
    if (next) next.scrollTop = top;
  }
  if (e.target.id === 'logint') {
    const entry = st.cravings.find((c) => c.id === ui.insightId);
    if (entry) entry.intensity = +e.target.value;
  }
});

function tick() {
  if ((ui.route === 'home' || ui.route === 'pocket') && !ui.overlay) livePatch();
  if (Math.floor(Date.now() / 60000) !== tick.min) {
    tick.min = Math.floor(Date.now() / 60000);
    if (st.onboarded && canPersist()) {
      const fresh = syncUnlocks(st, now());
      if (fresh.length) { collectUnlocks(fresh); save(); showUnlock(); }
    }
  }
}
tick.min = 0;

async function boot() {
  await load();
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (shot) applyShot(shot);
  if (q.get('theme') === 'dark' || q.get('theme') === 'light') st.settings.theme = q.get('theme');
  if (shot && q.get('days')) {
    const days = Math.max(0, parseInt(q.get('days'), 10) || 0);
    if (!st.freezeNow) st.freezeNow = Date.now();
    st.settings.quitAt = st.freezeNow - days * DAY - (5 * HOUR + 23 * MIN + 3000);
    const target = parseFloat(q.get('money') || '');
    if (Number.isFinite(target) && target > 0) {
      const elapsed = st.freezeNow - st.settings.quitAt;
      const ppc = ppcOf(st.settings);
      if (ppc > 0 && elapsed > 0) st.settings.cpd = target / ((elapsed / DAY) * ppc);
    }
    syncUnlocks(st, st.freezeNow);
    ui.pending = [];
  }
  if (shot && q.get('nobars') === '1') st.cravings = [];
  if (shot && q.get('live') === '1') st.freezeNow = null;
  if (shot && q.get('sat')) document.documentElement.style.setProperty('--sat', `${parseInt(q.get('sat'), 10) || 0}px`);
  else if (!st.onboarded) { ui.route = 'onboard'; ui.obStep = 0; }
  render();
  applyStatusBar(theme());
  hideSplash();
  registerPreviewWorker();
  onNotificationOpen((extra) => {
    if (extra.route === 'checkin') { ui.route = 'journal'; ui.overlay = 'checkin'; }
    else if (extra.route === 'badges') ui.route = 'health';
    else if (extra.route) ui.route = extra.route;
    render();
  });
  if (Capacitor.isNativePlatform()) {
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive || !st.onboarded) return;
        const fresh = syncUnlocks(st, now());
        if (fresh.length) { collectUnlocks(fresh); save(); showUnlock(); }
      });
    } catch { /* ignore */ }
  }
  if (ui.route === 'sos' && shot === 'sos') {
    /* static frame for screenshots; don't start the timer loop over the painted phase */
  } else if (ui.route === 'share') paintCard();
  scheduleNotes();
  setInterval(tick, 1000);
}

boot();
