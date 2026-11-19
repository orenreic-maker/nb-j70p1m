import { DAY, HOUR, MIN, WEEK } from './calc.js';

const NHS = 'https://www.nhs.uk/better-health/quit-smoking/ready-to-quit-smoking/what-could-happen-when-you-quit-smoking/';
const NICE = 'https://cks.nice.org.uk/topics/smoking-cessation/background-information/benefits-of-stopping-smoking/';
const CDC = 'https://www.cdc.gov/tobacco/about/benefits-of-quitting.html';
const CDCV = 'https://www.cdc.gov/tobacco/about/cigarettes-and-cardiovascular-disease.html';
const WHY = 'https://www.nhs.uk/better-health/quit-smoking/why-quit-smoking/';
const NCI = 'https://smokefree.gov/challenges-when-quitting/nicotine-withdrawal';
const BEN = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2946180/';

const m = (id, system, at, icon, when, title, source, url) => ({ id, system, at, icon, when, title, source, url });
const Y = 365.25 * DAY;

export const SYSTEMS = [
  { id: 'all', label: 'הכול', icon: 'body' },
  { id: 'heart', label: 'לב ומחזור', icon: 'heart' },
  { id: 'lungs', label: 'ריאות ונשימה', icon: 'lungs' },
  { id: 'senses', label: 'טעם וריח', icon: 'nose' },
  { id: 'energy', label: 'אנרגיה ושינה', icon: 'sunrise' },
  { id: 'skin', label: 'עור ושיניים', icon: 'skin' },
  { id: 'risk', label: 'סיכון למחלות', icon: 'shield' },
  { id: 'nicotine', label: 'גמילה מניקוטין', icon: 'wave' },
];

/** General estimates from public-health sources. Not medical advice. */
export const HEALTH = [
  m('air-20m', 'lungs', 20 * MIN, 'shield', '20 דקות', 'עשן חדש מפסיק להגיע לאוויר שמסביב.', 'NHS', WHY),
  m('h-20m', 'heart', 20 * MIN, 'heart', '20 דקות', 'הדופק מתחיל לחזור לקצב רגיל יותר.', 'NHS · CDC', NHS),
  m('n-2h', 'nicotine', 2 * HOUR, 'brain', 'שעתיים', 'רמת הניקוטין בדם יורדת בערך בחצי. זה בערך זמן מחצית החיים של ניקוטין.', 'Benowitz 2010', BEN),
  m('h-8h', 'heart', 8 * HOUR, 'drop', '8 שעות', 'רמות החמצן מתאוששות, והפחמן החד-חמצני בדם יורד בערך בחצי.', 'NHS · NICE', NHS),
  m('n-24h', 'nicotine', 24 * HOUR, 'brain', '24 שעות', 'לפי CDC, רמת הניקוטין בדם יורדת לאפס.', 'CDC', CDC),
  m('h-48h', 'heart', 48 * HOUR, 'drop', '48 שעות', 'רמת הפחמן החד-חמצני מגיעה לרמה של מי שלא מעשנים.', 'NHS', NHS),
  m('l-48h', 'lungs', 48 * HOUR, 'lungs', '48 שעות', 'הריאות מתחילות להתנקות מליחה.', 'NHS', NHS),
  m('s-48h', 'senses', 48 * HOUR, 'nose', '48 שעות', 'חוש הטעם וחוש הריח מתחילים להשתפר.', 'NHS · NICE', NHS),
  m('k-48h', 'skin', 48 * HOUR, 'tooth', '48 שעות', 'עשן חדש מפסיק להצטבר על השיניים. כתמים ישנים לא נעלמים מעצמם.', 'NHS', NHS),
  m('l-72h', 'lungs', 72 * HOUR, 'lungs', '72 שעות', 'דרכי הנשימה מתחילות להירגע, והנשימה יכולה להרגיש קלה יותר.', 'NHS', NHS),
  m('e-72h', 'energy', 72 * HOUR, 'sunrise', '72 שעות', 'רמת האנרגיה נוטה לעלות.', 'NHS', NHS),
  m('n-72h', 'nicotine', 72 * HOUR, 'wave', '72 שעות', 'בימים הראשונים החשק, חוסר השקט וקושי בריכוז לרוב בשיאם.', 'NCI Smokefree.gov', NCI),
  m('l-1w', 'lungs', 7 * DAY, 'breath', 'שבוע', 'שיעול או ליחה יכולים להתגבר לזמן קצר בזמן שהריאות מתנקות. זה חולף.', 'NHS', NHS),
  m('e-1w', 'energy', 7 * DAY, 'moon', 'שבוע', 'השינה יכולה להיות קופצנית בשבוע הראשון. זה חלק מהגמילה, לא סיבה לחזור לעשן.', 'NCI Smokefree.gov', NCI),
  m('n-1w', 'nicotine', 7 * DAY, 'wave', 'שבוע', 'אצל רוב האנשים שיא תסמיני הגמילה הוא בשבוע הראשון, ואז הם נחלשים.', 'NCI Smokefree.gov', NCI),
  m('s-2w', 'senses', 14 * DAY, 'nose', 'שבועיים', 'השיפור בטעם ובריח שהתחיל סביב 48 שעות ממשיך בשבועות הראשונים.', 'NHS', NHS),
  m('h-2w', 'heart', 14 * DAY, 'walk', 'שבועיים', 'זרימת הדם מתחילה להשתפר. הדם מגיע טוב יותר אל הלב ואל השרירים.', 'NHS · NICE', NHS),
  m('k-2w', 'skin', 14 * DAY, 'skin', 'שבועיים', 'עם שיפור זרימת הדם, העור מקבל יותר חמצן. השינוי במראה הדרגתי.', 'NHS', NHS),
  m('n-2w', 'nicotine', 14 * DAY, 'wave', 'שבועיים', 'תסמיני הגמילה החדים נחלשים אצל רוב האנשים. חשק קצר עדיין יכול להופיע.', 'NCI Smokefree.gov', NCI),
  m('h-4w', 'heart', 28 * DAY, 'pulse', '4 שבועות', 'סמני דלקת בדם יורדים, ורמת ה-HDL (הכולסטרול הטוב) נוטה להשתפר.', 'CDC', CDCV),
  m('k-4w', 'skin', 28 * DAY, 'tooth', '4 שבועות', 'זרימת דם טובה יותר מגיעה גם לחניכיים. אין הצטברות חדשה של עשן.', 'NHS', NHS),
  m('e-4w', 'energy', 28 * DAY, 'moon', '4 שבועות', 'אצל רוב האנשים תסמיני הגמילה החדים, כולל שינה קופצנית, חולפים בתוך שבועיים עד ארבעה.', 'NCI Smokefree.gov', NCI),
  m('n-4w', 'nicotine', 28 * DAY, 'check', '4 שבועות', 'החשק עדיין מגיע, אבל אצל רוב האנשים הוא קצר יותר מאשר בשבוע הראשון.', 'NCI Smokefree.gov', NCI),
  m('h-6w', 'heart', 6 * WEEK, 'walk', '6 שבועות', 'אמצע חלון השיפור של זרימת הדם (שבועיים עד 12). הליכה נוטה להיות קלה יותר.', 'NHS', NHS),
  m('h-12w', 'heart', 12 * WEEK, 'heart', '12 שבועות', 'סוף החלון המוקדם: הדם זורם טוב יותר אל הלב ואל השרירים.', 'NHS', NHS),
  m('l-3m', 'lungs', 91 * DAY, 'lungs', '3 חודשים', 'שיעול, צפצופים וקוצר נשימה נוטים לפחות, ותפקוד הריאות יכול לעלות בעד כ-10%.', 'NHS', NHS),
  m('e-3m', 'energy', 91 * DAY, 'sunrise', '3 חודשים', 'עם נשימה קלה יותר, לפעילות יומיומית יש יותר אוויר.', 'NHS', NHS),
  m('e-mood', 'energy', 91 * DAY, 'brain', '3 חודשים', 'עם הזמן מצב הרוח נוטה להתייצב. עישון לא מרגיע לטווח ארוך, והפסקה יכולה להפחית חרדה.', 'NHS', WHY),
  m('l-6m', 'lungs', 182 * DAY, 'leaf', '6 חודשים', 'אמצע החלון של 3 עד 9 חודשים: השיעול וקוצר הנשימה ממשיכים לפחות.', 'NHS', NHS),
  m('l-9m', 'lungs', 274 * DAY, 'leaf', '9 חודשים', 'סוף חלון ה-NHS: תפקודי הנשימה השתפרו אצל רוב האנשים, והצפצופים פחתו.', 'NHS', NHS),
  m('l-12m', 'lungs', Y, 'lungs', 'שנה', 'בתוך שנה, שיעול וקוצר נשימה פוחתים לעומת המשך עישון.', 'CDC', CDC),
  m('h-1y', 'heart', Y, 'heart', 'שנה', 'לפי NHS הסיכון להתקף לב נמוך בערך בחצי לעומת המשך עישון. לפי CDC הירידה חדה בשנה עד שנתיים הראשונות.', 'NHS · CDC', CDC),
  m('r-years', 'risk', Y, 'life', 'שנה', 'הפסקה יכולה להוסיף שנות חיים, עד כעשור אצל חלק מהאנשים, תלוי בגיל ובמשך העישון.', 'CDC', CDC),
  m('r-fert', 'risk', Y, 'life', 'שנה', 'הפסקה משפרת תוצאי בריאות שקשורים לפוריות ולהריון. ההיקף תלוי בגיל ובמצב הבריאותי.', 'CDC', CDC),
  m('r-copd', 'risk', Y, 'lungs', 'שנה', 'גם למי שכבר חיים עם מחלת ריאות, הפסקה מועילה לעומת המשך עישון.', 'CDC', CDC),
  m('h-2y', 'heart', 2 * Y, 'pulse', 'שנתיים', 'לפי CDC, הסיכון להתקף לב יורד בחדות במהלך השנה-שנתיים הראשונות.', 'CDC', CDCV),
  m('h-3y', 'heart', 3 * Y, 'heart', '3 שנים', 'מתחיל החלון שבו הסיכון העודף למחלת לב כלילית יורד בערך בחצי (3 עד 6 שנים).', 'CDC', CDC),
  m('r-5y-ca', 'risk', 5 * Y, 'ribbon', '5 שנים', 'הסיכון העודף לסרטן הפה, הגרון ותיבת הקול מתחיל לרדת, בחלון של 5 עד 10 שנים.', 'CDC', CDC),
  m('r-5y-st', 'risk', 5 * Y, 'brain', '5 שנים', 'הסיכון לשבץ מתחיל לרדת, בחלון של 5 עד 10 שנים.', 'CDC', CDC),
  m('r-5y-aaa', 'risk', 5 * Y, 'pulse', '5 שנים', 'הסיכון למפרצת של אבי העורקים יורד ככל שעובר זמן מההפסקה.', 'CDC', CDCV),
  m('r-5y-may', 'risk', 5 * Y, 'shield', '5 שנים', 'יש עדויות שהסיכון לפרפור פרוזדורים, אי-ספיקת לב ומחלת עורקים היקפית עשוי לרדת. זו אפשרות, לא הבטחה.', 'CDC', CDCV),
  m('h-6y', 'heart', 6 * Y, 'heart', '6 שנים', 'הסיכון העודף למחלת לב כלילית יורד בערך בחצי לעומת המשך עישון.', 'CDC', CDC),
  m('r-10y-lung', 'risk', 10 * Y, 'lungs', '10 שנים', 'הסיכון העודף לסרטן ריאה יורד בערך בחצי בחלון של 10 עד 15 שנים.', 'CDC', CDC),
  m('r-10y-oth', 'risk', 10 * Y, 'ribbon', '10 שנים', 'הסיכון לסרטן שלפוחית השתן, הוושט והכליה יורד.', 'CDC', CDC),
  m('r-10y-st', 'risk', 10 * Y, 'brain', '10 שנים', 'בסוף החלון של 5 עד 10 שנים, הסיכון לשבץ נמוך יותר מאשר בהמשך עישון.', 'CDC', CDC),
  m('h-15y', 'heart', 15 * Y, 'heart', '15 שנים', 'הסיכון למחלת לב כלילית מתקרב לזה של מי שלא עישנו מעולם.', 'CDC · NICE', CDC),
  m('r-15y-lung', 'risk', 15 * Y, 'lungs', '15 שנים', 'סוף החלון של 10 עד 15 שנים: הסיכון העודף לסרטן ריאה נמוך בערך בחצי לעומת המשך עישון.', 'CDC', CDC),
  m('r-20y-m', 'risk', 20 * Y, 'ribbon', '20 שנה', 'הסיכון לסרטן הפה, הגרון, תיבת הקול והלבלב מתקרב לזה של מי שלא עישנו.', 'CDC', CDC),
  m('r-20y-c', 'risk', 20 * Y, 'shield', '20 שנה', 'הסיכון העודף לסרטן צוואר הרחם יורד בכמחצית. רלוונטי למי שיש צוואר רחם.', 'CDC', CDC),
].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

export function withState(elapsed) {
  const items = HEALTH.map((h) => ({ ...h }));
  let nextAt = null;
  let prev = 0;
  for (const h of items) {
    if (elapsed >= h.at) {
      h.status = 'done';
      h.pct = 1;
      prev = h.at;
    } else if (nextAt === null || h.at === nextAt) {
      h.status = 'now';
      nextAt = h.at;
      h.pct = h.at > prev ? Math.max(0, Math.min(1, (elapsed - prev) / (h.at - prev))) : 0;
      h.prev = prev;
    } else {
      h.status = 'next';
      h.pct = 0;
    }
  }
  return items;
}

/** Steps up to 72 hours describe nicotine and carbon monoxide leaving the body, so a slip restarts them. */
export const RESTARTS = new Set(HEALTH.filter((h) => h.at <= 72 * HOUR).map((h) => h.id));

export function withSlips(sinceQuit, sinceSmoke) {
  const items = HEALTH.map((h) => ({ ...h, cont: RESTARTS.has(h.id) }));
  for (const cont of [true, false]) {
    const e = cont ? sinceSmoke : sinceQuit;
    let nextAt = null;
    let prev = 0;
    for (const h of items.filter((x) => x.cont === cont)) {
      if (e >= h.at) {
        h.status = 'done';
        h.pct = 1;
        prev = h.at;
        h.e = e;
      } else if (nextAt === null || h.at === nextAt) {
        h.status = 'now';
        nextAt = h.at;
        h.pct = h.at > prev ? Math.max(0, Math.min(1, (e - prev) / (h.at - prev))) : 0;
        h.e = e;
      } else {
        h.status = 'next';
        h.pct = 0;
        h.e = e;
      }
      if (cont && h.status !== 'done' && sinceQuit >= h.at && sinceQuit !== sinceSmoke) h.again = true;
    }
  }
  return items;
}

export function healthSummary(elapsed) {
  const items = withState(elapsed);
  const done = items.filter((i) => i.status === 'done');
  const now = items.filter((i) => i.status === 'now');
  return {
    items,
    done,
    now,
    latest: done.slice(-2),
    next: now[0] || null,
    doneCount: done.length,
    total: items.length,
  };
}
