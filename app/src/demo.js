import { DAY, HOUR, MIN } from './calc.js';
import { blank } from './model.js';

/** In-memory sample for screenshots only. Never written to storage. */
export function demoState() {
  const now = new Date(2026, 10, 18, 11, 23, 3).getTime();
  const quitAt = new Date(2026, 10, 14, 6, 0, 0).getTime();
  const st = blank();
  st.onboarded = true;
  st.seenJournalWhy = true;
  st.freezeNow = now;
  st.settings = {
    ...st.settings,
    name: 'אורן',
    years: 12,
    quitAt,
    mode: 'ryo',
    cpd: 15,
    mpc: 11,
    tobPrice: 120,
    tobGrams: 40,
    gpc: 0.5,
    papPrice: 5,
    papLeaves: 50,
    filPrice: 5,
    filCount: 80,
    reasons: ['לנשום בקלות ולהיות שם בשביל המשפחה.'],
    goalName: 'טיול משפחתי',
    goalPrice: 6000,
    theme: 'auto',
  };
  const moods = [2, 2, 3, 2, 3, 3, 4, 3, 4, 4, 3, 4, 4, 5];
  const crave = [9, 8, 8, 7, 7, 6, 6, 5, 6, 4, 5, 4, 3, 4];
  const hours = [7, 8, 20, 21, 7, 13, 20, 8, 19, 7, 21, 9, 20, 18];
  const trigs = ['coffee', 'stress', 'coffee', 'meal', 'coffee', 'stress', 'social', 'coffee', 'boredom', 'coffee', 'stress', 'meal', 'coffee', 'alcohol'];
  for (let i = 0; i < 14; i++) {
    const t = now - (13 - i) * DAY;
    const d = new Date(t);
    d.setHours(hours[i], 10, 0, 0);
    st.checkins.push({ id: `c${i}`, t: d.getTime(), mood: moods[i], crave: crave[i], note: i === 13 ? 'יום שקט יותר' : '' });
    st.cravings.push({
      id: `w${i}`, t: d.getTime(), won: true, dur: 8 * MIN, intensity: crave[i],
      triggers: [trigs[i]], note: '',
    });
  }
  const at = (d, h, m) => new Date(2026, 10, d, h, m, 0).getTime();
  st.slips.push({ id: 's1', t: at(16, 21, 40), cigs: 2, note: 'בחתונה של יעל', triggers: ['alcohol', 'social'], intensity: null, restart: false });
  st.slips.push({ id: 's2', t: at(18, 8, 30), cigs: 1, note: '', triggers: ['coffee'], intensity: null, restart: false });
  st.healthUnlocked = {};
  return st;
}

export const DEMO_ELAPSED = 4 * DAY + 5 * HOUR + 23 * MIN + 3000;
