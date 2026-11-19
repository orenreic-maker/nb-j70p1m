import { PACK_EST, RYO_EST, ppcOf, uid } from './calc.js';

export function blank() {
  return {
    v: 3,
    onboarded: false,
    seenJournalWhy: false,
    settings: {
      name: '',
      gender: 'x',
      ageOk: false,
      brandId: '',
      brandLabel: '',
      costSource: '',
      priceModel: '',
      lastBackup: null,
      years: 0,
      quitAt: null,
      mode: null,
      cpd: null,
      mpc: 11,
      ...RYO_EST,
      ...PACK_EST,
      reasons: [],
      photo: '',
      goalName: '',
      goalPrice: 0,
      theme: 'auto',
      sound: true,
      haptics: true,
      celebrate: true,
      dailyCheckin: true,
      checkinHour: 21,
      healthNotifs: true,
      hideDoneHealth: false,
      investRate: 0.07,
      seenStage: '',
      adsRemoved: false,
    },
    cravings: [],
    checkins: [],
    slips: [],
    attempts: [],
    unlocked: {},
    healthUnlocked: {},
    goalDone: false,
    longest: 0,
    shuf: 0,
  };
}

function arr(v) { return Array.isArray(v) ? v : []; }

/** Accept a BreathAnew save or a נשימה חדשה backup. Never reads the live app's storage key. */
export function migrate(raw) {
  const base = blank();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base.settings, ...(raw.settings || {}) };
  if (!s.mode) {
    const customPack = (s.packPrice != null && +s.packPrice !== 40) || (s.perPack != null && +s.perPack !== 20);
    if (customPack) s.mode = 'pack';
    else {
      s.mode = 'ryo';
      if (s.cpd == null || +s.cpd === 20) s.cpd = 15;
    }
  }
  for (const k of Object.keys(RYO_EST)) {
    if (!Number.isFinite(+s[k])) s[k] = RYO_EST[k];
  }
  for (const k of Object.keys(PACK_EST)) {
    if (!Number.isFinite(+s[k]) || +s[k] <= 0) s[k] = PACK_EST[k];
  }
  if (!Number.isFinite(+s.mpc) || +s.mpc < 0) s.mpc = 11;
  if (!Number.isFinite(+s.years) || +s.years < 0) s.years = 0;
  else s.years = Math.round(+s.years);
  if (!Number.isFinite(+s.quitAt)) s.quitAt = null;
  if (s.cpd != null && (!Number.isFinite(+s.cpd) || +s.cpd <= 0)) s.cpd = null;
  if (s.cpd != null) s.cpd = +s.cpd;
  s.reasons = arr(s.reasons).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
  s.goalName = String(s.goalName || '').trim();
  s.goalPrice = Number.isFinite(+s.goalPrice) && +s.goalPrice > 0 ? +s.goalPrice : 0;
  s.name = String(s.name || '').trim();
  if (s.gender !== 'm' && s.gender !== 'f' && s.gender !== 'x') s.gender = 'x';
  s.ageOk = !!s.ageOk || !!(raw.onboarded || s.quitAt);
  s.brandId = String(s.brandId || '');
  s.brandLabel = String(s.brandLabel || '').trim();
  s.costSource = String(s.costSource || '');
  s.priceModel = s.priceModel === 'simple' ? 'simple' : '';
  s.lastBackup = Number.isFinite(+s.lastBackup) ? +s.lastBackup : null;
  s.photo = typeof s.photo === 'string' ? s.photo : '';
  if (s.theme !== 'light' && s.theme !== 'dark' && s.theme !== 'auto') {
    s.theme = raw.settings?.theme === 'light' ? 'light' : raw.settings?.theme === 'dark' ? 'dark' : 'auto';
  }
  delete s.kids;
  s.sound = s.sound !== false;
  s.haptics = s.haptics !== false;
  s.celebrate = s.celebrate !== false;
  s.dailyCheckin = s.dailyCheckin !== false;
  s.healthNotifs = s.healthNotifs !== false;
  s.hideDoneHealth = !!s.hideDoneHealth;
  s.investRate = Math.min(0.1, Math.max(0.03, Number.isFinite(+s.investRate) ? +s.investRate : 0.07));
  s.seenStage = typeof s.seenStage === 'string' ? s.seenStage : '';
  s.adsRemoved = !!s.adsRemoved;
  s.checkinHour = Number.isFinite(+s.checkinHour) ? Math.min(23, Math.max(0, Math.round(+s.checkinHour))) : 21;
  return {
    ...base,
    ...raw,
    v: 3,
    onboarded: !!(raw.onboarded || s.quitAt),
    seenJournalWhy: !!raw.seenJournalWhy,
    settings: s,
    cravings: arr(raw.cravings),
    checkins: arr(raw.checkins),
    slips: arr(raw.slips).map((s) => ({
      id: s?.id || uid(),
      t: Number.isFinite(+s?.t) ? +s.t : Date.now(),
      cigs: Math.max(0, Math.round(+s?.cigs || 0)),
      note: String(s?.note || ''),
      triggers: arr(s?.triggers).map((x) => String(x)),
      intensity: s?.intensity ?? null,
      restart: !!s?.restart,
    })),
    attempts: arr(raw.attempts),
    unlocked: { ...(raw.unlocked || {}) },
    healthUnlocked: { ...(raw.healthUnlocked || {}) },
    goalDone: !!raw.goalDone,
    longest: Number.isFinite(+raw.longest) ? +raw.longest : 0,
    shuf: Number.isFinite(+raw.shuf) ? +raw.shuf : 0,
    freezeNow: undefined,
  };
}

function originQuit(st) {
  const starts = (st.attempts || []).map((a) => +a.start).filter(Number.isFinite);
  if (Number.isFinite(+st.settings?.quitAt)) starts.push(+st.settings.quitAt);
  return starts.length ? Math.min(...starts) : null;
}

/** Replay restart slips so quit date, archived runs, home, and body stay in step. */
export function syncSlipClock(st) {
  const origin = originQuit(st);
  if (origin == null) return;
  const restarts = (st.slips || []).filter((s) => s.restart && s.t > origin).sort((a, b) => a.t - b.t);
  if (!restarts.length && !(st.attempts || []).length) return;
  const attempts = [];
  let q = origin;
  for (const s of restarts) {
    attempts.push({ start: q, end: s.t, cpd: st.settings.cpd || 0, ppc: ppcOf(st.settings) });
    st.longest = Math.max(st.longest || 0, s.t - q);
    q = s.t;
  }
  st.attempts = attempts;
  st.settings.quitAt = q;
}

export function applySlip(st, v) {
  const when = Math.min(Date.now(), Number.isFinite(+v.now) ? +v.now : Date.now());
  const slip = {
    id: v.id || uid(), t: when,
    cigs: Math.max(0, Math.round(+v.cigs || 0)),
    note: String(v.note || '').trim(),
    triggers: v.triggers || [],
    intensity: v.intensity ?? null,
    restart: v.mode === 'restart',
  };
  st.slips.push(slip);
  syncSlipClock(st);
  return slip;
}

export function updateSlip(st, id, v) {
  const slip = (st.slips || []).find((s) => s.id === id);
  if (!slip) return null;
  slip.t = Math.min(Date.now(), Number.isFinite(+v.now) ? +v.now : slip.t);
  slip.cigs = Math.max(0, Math.round(+v.cigs || 0));
  slip.note = String(v.note || '').trim();
  slip.triggers = v.triggers || [];
  slip.restart = v.mode === 'restart';
  syncSlipClock(st);
  return slip;
}

export function deleteSlip(st, id) {
  st.slips = (st.slips || []).filter((s) => s.id !== id);
  syncSlipClock(st);
}

export function applyWin(st, v) {
  const entry = {
    id: uid(),
    t: v.now,
    won: true,
    dur: Math.max(0, +v.dur || 0),
    intensity: Number.isFinite(+v.intensity) ? +v.intensity : 5,
    triggers: v.triggers || [],
    note: String(v.note || '').trim(),
  };
  st.cravings.push(entry);
  return entry;
}

export function applyCheckin(st, v) {
  const day = new Date(v.now).toDateString();
  const ex = st.checkins.find((c) => new Date(c.t).toDateString() === day);
  const rec = {
    id: ex?.id || uid(),
    t: ex ? ex.t : v.now,
    mood: v.mood,
    crave: Number.isFinite(+v.crave) ? +v.crave : 0,
    note: String(v.note || '').trim(),
  };
  if (ex) Object.assign(ex, rec);
  else st.checkins.push(rec);
  return rec;
}

// Backup files may carry a BOM or stray whitespace (iOS Files, editors).
export function parseBackup(text) {
  const clean = String(text ?? '').replace(/^\uFEFF/, '').trim();
  const data = JSON.parse(clean);
  if (!data?.settings || data.settings.quitAt == null || !Number.isFinite(+data.settings.quitAt)) throw new Error('bad');
  return data;
}
