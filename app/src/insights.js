import { DAY, cigsAt, moneyAt, startOfWeek, triggerCounts, wins } from './calc.js';
import { HEALTH } from './health.js';
import { triggerById } from './copy.js';

function avg(arr) {
  const vals = arr.map((c) => c.intensity).filter((n) => Number.isFinite(+n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + (+b), 0) / vals.length;
}

export function insightFor(st, entry) {
  const quit = st.settings.quitAt || entry.t;
  const hour = new Date(entry.t).getHours();
  const all = [...(st.cravings || []), ...(st.slips || [])];
  const earlyEnd = quit + 7 * DAY;
  const recentStart = entry.t - 7 * DAY;
  const inHour = (from, to) => all.filter((c) => c.t >= from && c.t < to && c.id !== entry.id && new Date(c.t).getHours() === hour);
  const early = avg(inHour(quit, earlyEnd));
  const recent = avg(inHour(recentStart, entry.t + 1));
  const nEarly = inHour(quit, earlyEnd).length;
  const nRecent = inHour(recentStart, entry.t + 1).length;
  let body;
  if (early && recent && nEarly >= 3 && nRecent >= 2 && recent < early * 0.9) {
    const pct = Math.round((1 - recent / early) * 100);
    body = `חשקים סביב ${String(hour).padStart(2, '0')}:00 ירדו בערך ב-${pct}% מאז השבוע הראשון.`;
  } else if ((entry.triggers || []).length) {
    const tip = triggerById(entry.triggers[0]);
    const top = triggerCounts(st)[0];
    if (top && top[0] === entry.triggers[0] && top[1] >= 2) {
      body = `${tip?.label || 'הטריגר'} הוא מה שחוזר הכי הרבה. ${tip?.tip || ''}`.trim();
    } else body = tip?.tip || 'הגל נרשם. אחרי כמה ימים רואים אם הוא נחלש.';
  } else if (wins(st) >= 2) {
    body = `גל מספר ${wins(st)} עבר. רישום חשק מראה אם הוא נחלש ומתקצר.`;
  } else body = 'הגל נרשם. אחרי כמה ימים יופיע כאן אם החשק נחלש ומתקצר.';
  return { title: 'גל נוסף עבר', wins: wins(st), body };
}

export function weekStats(st, now) {
  const start = startOfWeek(now);
  const prev = start - 7 * DAY;
  const inR = (t, a, b) => t >= a && t < b;
  const beaten = (st.cravings || []).filter((c) => c.won && inR(c.t, start, now + 1));
  const prevBeaten = (st.cravings || []).filter((c) => c.won && inR(c.t, prev, start));
  const inten = (list) => {
    const v = list.map((c) => c.intensity).filter((n) => Number.isFinite(+n));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const top = triggerCounts(st, start, now + 1)[0];
  const reached = HEALTH.filter((h) => {
    const ts = st.healthUnlocked?.[h.id];
    return ts && inR(ts, start, now + 1);
  });
  return {
    start,
    beaten: beaten.length,
    prevBeaten: prevBeaten.length,
    avg: inten(beaten),
    prevAvg: inten(prevBeaten),
    trend: trendText(inten(beaten), inten(prevBeaten), beaten.length, prevBeaten.length),
    top,
    reached,
    saved: Math.max(0, moneyAt(st, now) - moneyAt(st, start)),
    cigs: Math.max(0, cigsAt(st, now) - cigsAt(st, start)),
  };
}

function trendText(a, b, n, pn) {
  if (a == null || b == null || pn < 2 || n < 1) return 'עוד אין מספיק רישומים להשוואה.';
  if (a < b - 0.3) return 'עוצמת החשק השבוע נמוכה יותר מהשבוע הקודם.';
  if (a > b + 0.3) return 'השבוע החשק היה חזק יותר. זה מידע, לא כישלון.';
  return 'עוצמת החשק דומה לשבוע הקודם.';
}
