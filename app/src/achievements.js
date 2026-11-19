import { DAY, HOUR, WEEK, checkinStreak, cigsAt, longestAt, moneyAt, prevCigs, prevMoney, triggerCounts, wins } from './calc.js';
import { HEALTH } from './health.js';

const A = (id, group, k, v, icon, t, d) => ({ id, group, k, v, icon, t, d });

export const ACH = [
  A('h1', 'time', 'time', HOUR, 'clock', 'שעה ראשונה', 'השעה הראשונה מאחור. הצעד הראשון הוא החד.'),
  A('d1', 'time', 'time', DAY, 'sunrise', '24 שעות', 'יום שלם בלי סיגריה.'),
  A('d3', 'time', 'time', 3 * DAY, 'star', '3 ימים', 'רוב הניקוטין כבר יצא מהגוף. מכאן זה בעיקר הרגל, וגם הרגל אפשר ללמד מחדש.'),
  A('w1', 'time', 'time', WEEK, 'sparkle', 'שבוע', 'שבעה ימים של בחירה חוזרת.'),
  A('w2', 'time', 'time', 2 * WEEK, 'leaf', 'שבועיים', 'אצל הרבה אנשים כאן זה מתחיל להיות קל יותר.'),
  A('m1', 'time', 'time', 30 * DAY, 'calendar', 'חודש', 'זה כבר לא ניסיון חד-פעמי. זו דרך.'),
  A('d100', 'time', 'time', 100 * DAY, 'peak', '100 ימים', 'מספר עגול, והגוף כבר עמוק בתוך השיקום.'),
  A('m6', 'time', 'time', 182 * DAY, 'medal', 'חצי שנה', 'חצי שנה של אוויר נקי.'),
  A('y1', 'time', 'time', 365 * DAY, 'growth', 'שנה', 'שנה שלמה בלי עישון.'),
  A('r100', 'money', 'money', 100, 'money', '100 ₪', 'השטר הראשון שנשאר בכיס.'),
  A('r500', 'money', 'money', 500, 'money', '500 ₪', 'סכום שכבר מרגישים.'),
  A('r1000', 'money', 'money', 1000, 'money', '1,000 ₪', 'אלף שקלים שלא הלכו לעשן.'),
  A('r5000', 'money', 'money', 5000, 'goal', '5,000 ₪', 'סכום של ממש.'),
  A('r10000', 'money', 'money', 10000, 'peak', '10,000 ₪', 'עשרת אלפים שנשארו בכיס.'),
  A('c100', 'cigs', 'cigs', 100, 'no-smoke', '100', 'מאה סיגריות שלא נדלקו.'),
  A('c500', 'cigs', 'cigs', 500, 'no-smoke', '500', 'חמש מאות סיגריות שלא נדלקו.'),
  A('c1000', 'cigs', 'cigs', 1000, 'leaf', '1,000', 'אלף סיגריות שלא נדלקו.'),
  A('c5000', 'cigs', 'cigs', 5000, 'peak', '5,000', 'חמשת אלפים סיגריות שלא נדלקו.'),
  A('k1', 'waves', 'crav', 1, 'wave', 'גל ראשון', 'חשק אחד עבר בלי סיגריה.'),
  A('k10', 'waves', 'crav', 10, 'wave', '10 גלים', 'עשרה חשקים עברו בלי סיגריה.'),
  A('k50', 'waves', 'crav', 50, 'wave', '50 גלים', 'חמישים פעם שהגל עבר.'),
  A('k100', 'waves', 'crav', 100, 'medal', '100 גלים', 'מאה חשקים שעברו בלי סיגריה.'),
  A('log1', 'journal', 'log', 1, 'pen', 'רישום ראשון', 'החשק הראשון נרשם. מכאן רואים אם הוא נחלש.'),
  A('j1', 'journal', 'chk', 1, 'check-in', 'צ׳ק-אין ראשון', 'יום אחד שנבדק. הרצף מתחיל כאן.'),
  A('j7', 'journal', 'chk', 7, 'journal', '7 צ׳ק-אינים', 'שבעה ימים שבהם נשאל איך עבר היום.'),
  A('streak7', 'journal', 'streak', 7, 'calendar', 'רצף של 7', 'שבעה ימים רצופים של צ׳ק-אין.'),
  A('trigTop', 'journal', 'trig', 1, 'sparkle', 'הטריגר הקבוע', 'חשק עבר דווקא בטריגר שחוזר הכי הרבה.'),
];

export const GROUPS = [
  ['time', 'זמן'],
  ['money', 'כסף'],
  ['cigs', 'סיגריות שלא נדלקו'],
  ['waves', 'גלים שעברו'],
  ['journal', 'יומן'],
];

export function achVal(a, st, now) {
  switch (a.k) {
    case 'time': return longestAt(st, now);
    case 'money': return moneyAt(st, now) + prevMoney(st);
    case 'cigs': return cigsAt(st, now) + prevCigs(st);
    case 'crav': return wins(st);
    case 'chk': return st.checkins.length;
    case 'log': return st.cravings.length + st.slips.length;
    case 'streak': return checkinStreak(st, now);
    case 'trig': {
      const top = triggerCounts(st)[0];
      if (!top || top[1] < 3) return 0;
      return st.cravings.some((c) => c.won && (c.triggers || []).includes(top[0])) ? 1 : 0;
    }
    default: return 0;
  }
}

export function syncUnlocks(st, now) {
  const fresh = [];
  const q = st.settings.quitAt;
  if (q) {
    const elapsed = Math.max(0, now - q);
    for (const h of HEALTH) {
      if (elapsed >= h.at && !st.healthUnlocked[h.id]) {
        st.healthUnlocked[h.id] = q + h.at;
        fresh.push({ kind: 'health', item: h });
      }
    }
  }
  for (const a of ACH) {
    if (!st.unlocked[a.id] && achVal(a, st, now) >= a.v) {
      st.unlocked[a.id] = now;
      fresh.push({ kind: 'ach', item: a });
    }
  }
  return fresh;
}
