export const MIN = 60e3;
export const HOUR = 36e5;
export const DAY = 864e5;
export const WEEK = 7 * DAY;
export const MONTH = 30.44 * DAY;
export const YEAR = 365.25 * DAY;

/** Israeli retail estimates (Nov 2026). Not a personal product preset. */
export const RYO_EST = {
  tobPrice: 120, tobGrams: 40, gpc: 0.5,
  papPrice: 5, papLeaves: 50, filPrice: 5, filCount: 80,
};
export const PACK_EST = { packPrice: 40, perPack: 20 };

const num = (v) => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};

export function costParts(s = {}) {
  if (s.mode === 'pack') {
    const pack = num(s.packPrice);
    const per = num(s.perPack);
    return { pack: pack > 0 && per > 0 ? pack / per : 0 };
  }
  if (s.priceModel === 'simple') {
    const grams = num(s.tobGrams);
    const price = num(s.tobPrice);
    const tob = price > 0 && grams > 0 ? price / (grams / 0.6) : 0;
    return { tob, kit: 0.11 };
  }
  const tob = num(s.tobPrice) > 0 && num(s.tobGrams) > 0 && num(s.gpc) > 0
    ? (num(s.tobPrice) / num(s.tobGrams)) * num(s.gpc) : 0;
  const pap = num(s.papPrice) > 0 && num(s.papLeaves) > 0 ? num(s.papPrice) / num(s.papLeaves) : 0;
  const fil = num(s.filPrice) > 0 && num(s.filCount) > 0 ? num(s.filPrice) / num(s.filCount) : 0;
  return { tob, pap, fil };
}

export function ppcOf(s) {
  return Object.values(costParts(s)).reduce((a, b) => a + b, 0);
}

/** Illustrative future value: principal compounds, and a monthly deposit is added. Not advice. */
export function futureValue(principal, monthly, annual, years) {
  const a = Math.min(0.1, Math.max(0.03, Number(annual) || 0));
  const y = Math.max(0, Number(years) || 0);
  const r = (1 + a) ** (1 / 12) - 1;
  const n = Math.round(y * 12);
  const grown = Math.max(0, principal) * (1 + a) ** y;
  const ann = r < 1e-8 ? monthly * n : monthly * (((1 + r) ** n - 1) / r);
  return grown + Math.max(0, ann);
}

export function slipsBetween(st, from, to = Infinity, skipRestartAtStart = false) {
  return (st.slips || []).reduce((a, s) => {
    if (skipRestartAtStart && s.restart && s.t <= from) return a;
    if (s.t >= from && s.t <= to) return a + (+s.cigs || 0);
    return a;
  }, 0);
}

export function elapsedAt(st, t) {
  const q = st.settings?.quitAt;
  if (q == null) return 0;
  return Math.max(0, t - q);
}

export function cigsAt(st, t) {
  const q = st.settings?.quitAt;
  const cpd = num(st.settings?.cpd);
  if (q == null || cpd <= 0) return 0;
  return Math.max(0, elapsedAt(st, t) * (cpd / DAY) - slipsBetween(st, q, t, true));
}

export function moneyAt(st, t) {
  return cigsAt(st, t) * ppcOf(st.settings || {});
}

export function attemptStats(st, a) {
  const cpd = num(a.cpd);
  const smoked = Math.max(0, (a.end - a.start) * (cpd / DAY) - slipsBetween(st, a.start, a.end, false));
  return { cigs: smoked, money: smoked * (Number.isFinite(+a.ppc) ? +a.ppc : ppcOf(st.settings || {})) };
}

export function prevCigs(st) {
  return (st.attempts || []).reduce((a, x) => a + attemptStats(st, x).cigs, 0);
}
export function prevMoney(st) {
  return (st.attempts || []).reduce((a, x) => a + attemptStats(st, x).money, 0);
}

export function longestAt(st, t) {
  const cur = elapsedAt(st, t);
  const prev = (st.attempts || []).map((a) => Math.max(0, a.end - a.start));
  return Math.max(st.longest || 0, cur, ...prev, 0);
}

export function wins(st) {
  return (st.cravings || []).filter((c) => c.won).length;
}

export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function checkinStreak(st, t) {
  const days = new Set((st.checkins || []).map((c) => dayKey(c.t)));
  let d = new Date(t);
  d.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(d.getTime()))) d = new Date(d.getTime() - DAY);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n += 1;
    d = new Date(d.getTime() - DAY);
  }
  return n;
}

export function triggerCounts(st, from = -Infinity, to = Infinity) {
  const m = {};
  const add = (t, triggers) => {
    if (t < from || t > to) return;
    for (const id of triggers || []) m[id] = (m[id] || 0) + 1;
  };
  for (const c of st.cravings || []) add(c.t, c.triggers);
  for (const s of st.slips || []) add(s.t, s.triggers);
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export function startOfWeek(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - d.getDay() * DAY;
}

export function nf(n, d = 0) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function ils(n, d = 0) {
  return `${nf(n, d)} ₪`;
}

export function plural(n, one, two, many) {
  n = Math.floor(Math.abs(n));
  if (n === 1) return one;
  if (n === 2 && two) return two;
  return `${nf(n)} ${many}`;
}

export function fmtDur(ms, parts = 2) {
  ms = Math.max(0, ms);
  const u = [
    [YEAR, 'שנה', 'שנתיים', 'שנים'],
    [MONTH, 'חודש', 'חודשיים', 'חודשים'],
    [WEEK, 'שבוע', 'שבועיים', 'שבועות'],
    [DAY, 'יום', 'יומיים', 'ימים'],
    [HOUR, 'שעה', 'שעתיים', 'שעות'],
    [MIN, 'דקה', 'שתי דקות', 'דקות'],
  ];
  const out = [];
  for (const [len, o, tw, m] of u) {
    if (ms >= len && out.length < parts) {
      const n = Math.floor(ms / len);
      out.push(plural(n, o, tw, m));
      ms -= n * len;
    } else if (out.length) break;
  }
  if (!out.length) return 'פחות מדקה';
  return out.reduce((a, x) => a + (/^\d/.test(x) ? ' ו-' : ' ו') + x);
}

export function fmtClock(ms) {
  ms = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(ms / 3600);
  const m = Math.floor(ms / 60) % 60;
  const s = ms % 60;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function fmtLife(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 48 * 60) {
    const h = Math.floor(m / 60);
    return { text: `${h}:${String(m % 60).padStart(2, '0')}`, unit: 'ש׳' };
  }
  return { text: fmtDur(m * MIN, 2), unit: '' };
}

/** One short token so the home row never wraps. */
export function fmtLifeShort(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h < 48) return `${h}:${String(min).padStart(2, '0')}`;
  const d = Math.max(1, Math.round(h / 24));
  return d === 1 ? 'יום' : `${d} ימים`;
}

/** Value for input[type=datetime-local], in local time. */
export function localInputValue(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function hebDate(t) {
  try {
    return new Date(t).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^יום\s+/, '');
  } catch {
    return '';
  }
}

export function greet(t) {
  const h = new Date(t).getHours();
  if (h < 5 || h >= 21) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  return 'ערב טוב';
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

/** Slips in the current count that did not start a new count. */
export function keepSlips(st) {
  const q = st.settings?.quitAt;
  if (q == null) return [];
  return (st.slips || []).filter((s) => !s.restart && s.t > q).sort((a, b) => a.t - b.t);
}

/** Last moment smoke entered the body: the quit date, or the latest kept slip. */
export function lastSmokeAt(st) {
  const kept = keepSlips(st);
  return kept.length ? kept[kept.length - 1].t : st.settings?.quitAt;
}
