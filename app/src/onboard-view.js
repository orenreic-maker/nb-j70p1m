import { icon } from './icons.js';
import { haptic } from './native.js';
import { st } from './store.js';
import { ui } from './ui-state.js';
import { esc, hebDate, localInputValue, nf } from './calc.js';
import { checkText } from './filter.js';
import {
  GPC, PACK_DEFAULT, RYO_GRAMS_DEFAULT, RYO_PRICE_DEFAULT,
  brandLabel, cigCost, findBrand, pouchSizes, searchBrands,
} from './prices.js';

const spot = (name) => {
  const png = name === 'heart';
  const src = png ? `art/onboard/spot-${name}.png` : `art/onboard/spot-${name}@2x.webp`;
  return `<img class="ob-spot" alt="" src="${src}">`;
};

export function captureOnboard() {
  const read = (id) => document.getElementById(id);
  const name = read('obname');
  if (name) ui.name = name.value;
  const years = read('years');
  if (years) ui.years = years.value;
  const why = read('obwhy');
  if (why) ui.why = why.value;
  const goal = read('obgoal');
  if (goal) ui.goal = goal.value;
  const goalp = read('obgoalp');
  if (goalp) ui.goalPrice = goalp.value;
  const price = read('ob-price');
  if (price) {
    if (price.value !== String(ui.price ?? '')) ui.priceTouched = true;
    ui.price = price.value;
  }
  const custom = read('ob-custom-name');
  if (custom) ui.customBrand = custom.value;
  const q = read('brand-q');
  if (q) ui.brandQuery = q.value;
}

export function obProblems(step = ui.obStep) {
  if (step === 1) {
    if (checkText(ui.name || '', 'name')) return 'name';
    if (!ui.gender || !ui.ageOk) return 'need';
  }
  if (step === 2 && !ui.dateMode) return 'need';
  if (step === 2 && ui.dateMode === 'past' && !ui.dateValue) return 'need';
  if (step === 3 && !ui.habitMode) return 'need';
  if (step === 4 && !(Number(ui.cpd) >= 1)) return 'need';
  if (step === 5) {
    if (checkText(ui.why || '', 'reason')) return 'reason';
    if (checkText(ui.goal || '', 'goal')) return 'goal';
  }
  return '';
}

function money(n, digits) {
  return `<bdi dir="ltr" class="num-ltr">${nf(n, digits)}<span class="shekel"> ₪</span></bdi>`;
}

function fieldError(kind) {
  const msg = kind === 'name' ? checkText(ui.name || '', 'name')
    : kind === 'goal' ? checkText(ui.goal || '', 'goal')
      : kind === 'reason' ? checkText(ui.why || '', 'reason') : '';
  if (!msg) return '';
  return `<p class="ob-err" role="alert">${icon('info', 16, 'var(--c-clay)')}<span>${msg}</span></p>`;
}

function ageLine() {
  if (ui.gender === 'm') return 'אני בן 18 ומעלה';
  if (ui.gender === 'f') return 'אני בת 18 ומעלה';
  if (ui.gender === 'x') return 'אני מעל גיל 18';
  return 'אני בן/בת 18 ומעלה';
}

export function onboardScreen() {
  const step = ui.obStep;
  if (step <= 0) return '';
  const segs = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('');
  const skip = step === 5
    ? '<button class="ob-skip" data-act="ob-skip">דילוג</button>'
    : '<span class="ob-skip"></span>';
  const bodies = [, aboutStep, dateStep, whatStep, howStep, whyStep];
  const label = step === 5 ? 'יוצאים לדרך' : 'המשך';
  const dis = obProblems(step) ? ' dis' : '';
  return `<div class="screen ob">
    <div class="topbar"><button class="iconbtn" data-act="ob-back" aria-label="חזרה">${icon('chevron', 18, 'currentColor', 'transform:scaleX(-1)')}</button><div class="steps">${segs}</div>${skip}</div>
    <div class="ob-body">${bodies[step]()}</div>
    <div class="foot">${step === 5 ? `<p class="ob-lock">${icon('lock', 14, 'currentColor', 1.7)}הכול נשמר רק במכשיר הזה.</p>` : ''}<button class="btn primary${dis}" data-act="ob-next">${label}</button></div>
  </div>`;
}

function aboutStep() {
  const g = ui.gender;
  const chip = (id, label) => `<button type="button" class="ob-chip ${g === id ? 'on' : ''}" data-act="gender" data-g="${id}">${label}</button>`;
  const nameBad = checkText(ui.name || '', 'name') ? ' bad' : '';
  return `<div class="ob-step">
    ${spot('hello')}
    <h1>איך קוראים לך?</h1>
    <label class="ob-lbl" for="obname">שם או כינוי</label>
    <div class="input${nameBad}"><input id="obname" maxlength="40" placeholder="למשל: נועה" value="${esc(ui.name || '')}"></div>
    ${fieldError('name')}
    <p class="ob-hint">ככה נפנה אליך באפליקציה. אפשר גם כינוי.</p>
    <div class="ob-lbl">איך לפנות אליך?</div>
    <div class="ob-chips" role="radiogroup">${chip('m', 'זכר')}${chip('f', 'נקבה')}${chip('x', 'אחר')}</div>
    <p class="ob-hint">״אחר״ – נפנה בלשון כללית.</p>
    <button type="button" class="ob-check ${ui.ageOk ? 'on' : ''}" data-act="age" aria-pressed="${ui.ageOk ? 'true' : 'false'}"><i class="box">${ui.ageOk ? icon('check', 15, 'currentColor', 2.4) : ''}</i><span>${ageLine()}</span></button>
  </div>`;
}

/** Hebrew label with a real datetime-local control covering it, so a tap opens the iOS picker. */
export function dateFieldHtml(id, value) {
  const max = localInputValue(Date.now());
  const safe = value && new Date(value).getTime() > Date.now() ? max : (value || '');
  return `<div class="ob-datefield${safe ? '' : ' empty'}">
    <span class="ob-datetext">${esc(safe ? dateLabel(safe) : 'בוחרים יום ושעה')}</span>
    <input id="${id}" class="ob-datehit" type="datetime-local" enterkeyhint="done" max="${max}" value="${esc(safe)}" aria-label="יום ושעה">
  </div>`;
}

export function applyDateInput(input) {
  if (!input) return '';
  let value = input.value || '';
  const t = new Date(value).getTime();
  if (Number.isFinite(t) && t > Date.now()) {
    value = localInputValue(Date.now());
    input.value = value;
  }
  const text = input.closest('.ob-datefield')?.querySelector('.ob-datetext');
  if (text) text.textContent = value ? dateLabel(value) : 'בוחרים יום ושעה';
  input.closest('.ob-datefield')?.classList.toggle('empty', !value);
  return value;
}

function dateLabel(value) {
  if (!value) return 'בוחרים יום ושעה';
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return 'בוחרים יום ושעה';
  const hm = new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${hebDate(t)} · ${hm}`;
}

function dateStep() {
  const past = ui.dateMode === 'past';
  return `<div class="ob-step">
    ${spot('calendar')}
    <h1>מתי הייתה הסיגריה האחרונה?</h1>
    <p class="ob-sub">מכאן מתחילים לספור.</p>
    <button type="button" class="choice ${ui.dateMode === 'now' ? 'on' : ''}" data-act="date-mode" data-mode="now"><div class="radio"></div><div><div class="h2">עכשיו</div><div class="small">מתחילים לספור מהרגע הזה</div></div></button>
    <button type="button" class="choice ${past ? 'on' : ''}" data-act="date-mode" data-mode="past"><div class="radio"></div><div><div class="h2">כבר הפסקתי</div><div class="small">בוחרים את היום והשעה</div></div></button>
    ${past ? `<label class="ob-lbl" for="qdt">יום ושעה</label>${dateFieldHtml('qdt', ui.dateValue)}<p class="ob-hint">אפשר לשנות בכל רגע בהגדרות.</p>` : ''}
  </div>`;
}

function brandList() {
  const rows = searchBrands(ui.habitMode || 'pack', ui.brandQuery || '');
  const items = rows.map((it) => `<button type="button" data-act="brand" data-id="${esc(it.id)}">${esc(brandLabel(it))}</button>`).join('');
  return `${items}<button type="button" class="other" data-act="brand" data-id="other"><span>מותג אחר</span><small>הזנת מחיר</small></button>`;
}

export function productFields() {
  const mode = ui.habitMode;
  const picked = ui.brandId && ui.brandId !== 'other' ? findBrand(ui.brandId) : null;
  const other = ui.brandId === 'other';
  const priceLabel = mode === 'ryo' ? 'העלות שלך לשקית' : 'העלות שלך לקופסה';
  const sizes = mode === 'ryo' && (picked || other) ? (picked ? pouchSizes(picked) : [30, 40, 50]) : [];
  const grams = ui.pouchGrams || picked?.pouch_grams || sizes[0] || RYO_GRAMS_DEFAULT;
  return `<div class="ob-types">
      <button type="button" class="ob-type ${mode === 'pack' ? 'on' : ''}" data-act="habit" data-mode="pack"><img alt="" src="art/onboard/spot-pack@2x.webp"><span>סיגריות</span></button>
      <button type="button" class="ob-type ${mode === 'ryo' ? 'on' : ''}" data-act="habit" data-mode="ryo"><img alt="" src="art/onboard/spot-pouch@2x.webp"><span>טבק לגלגול</span></button>
    </div>
    ${mode ? `<label class="ob-lbl" for="brand-q">איזה מותג?</label>
      ${picked || other ? `<div class="input ob-picked"><span>${esc(other ? (ui.customBrand || 'מותג אחר') : brandLabel(picked))}</span><button type="button" data-act="brand-clear">החלפה</button></div>` : `<div class="input"><input id="brand-q" placeholder="חיפוש מותג" value="${esc(ui.brandQuery || '')}" autocomplete="off"></div><div class="ob-brands" id="brand-list">${brandList()}</div>`}
      ${other ? `<label class="ob-lbl" for="ob-custom-name">שם המותג <span>לא חובה</span></label><div class="input"><input id="ob-custom-name" value="${esc(ui.customBrand || '')}" placeholder="השם שאתה קורא לו"></div>` : ''}
      ${picked || other ? `<label class="ob-lbl" for="ob-price">${priceLabel}</label><div class="ob-price"><input id="ob-price" class="num-ltr" dir="ltr" inputmode="decimal" value="${esc(ui.price ?? '')}"><span class="shekel">₪</span><button type="button" data-act="price-focus">עריכה</button></div><p class="ob-hint">${other ? 'המחיר ששילמת.' : 'לפי המחיר הממוצע ברשתות. אפשר לתקן לפי מה ששילמת.'}</p>` : ''}
      ${sizes.length ? `<div class="ob-lbl">גודל השקית</div><div class="ob-chips">${sizes.map((n) => `<button type="button" class="ob-chip ${Number(grams) === n ? 'on' : ''}" data-act="pouch" data-g="${n}">${n} גרם</button>`).join('')}</div><p class="ob-hint">ניירות ופילטרים כבר נכללים בחישוב.</p>` : ''}
      <p class="ob-hint">אפשר לשנות את המחירים בהמשך בהגדרות.</p>` : ''}
  `;
}

function whatStep() {
  return `<div class="ob-step"><h1>מה עישנת?</h1>${productFields()}</div>`;
}

export function previewPpc() {
  const mode = ui.habitMode || 'pack';
  const price = ui.price === '' || ui.price == null
    ? (mode === 'ryo' ? RYO_PRICE_DEFAULT : PACK_DEFAULT)
    : parseFloat(ui.price);
  const grams = ui.pouchGrams || (mode === 'ryo' ? RYO_GRAMS_DEFAULT : 20);
  return cigCost({ mode, price, grams });
}

function howStep() {
  const cpd = Number(ui.cpd);
  const has = cpd >= 1;
  const used = has ? cpd : 10;
  const day = previewPpc() * used;
  const year = day * 365;
  const unit = ui.habitMode === 'ryo' ? 'סיגריות מגולגלות ביום, בערך' : 'סיגריות ביום, בערך';
  return `<div class="ob-step">
    <h1>כמה עישנת?</h1>
    <div class="ob-lbl">${unit}</div>
    <div class="ob-stepper">
      <button type="button" class="ob-sbtn" data-step="-1" aria-label="פחות">−</button>
      <button type="button" class="ob-num ${has ? '' : 'empty'}" data-act="cpd-type" data-cpd-num><b>${has ? esc(String(ui.cpd)) : ''}</b><small data-cpd-cap>${ui.cpdTyping ? 'מקלידים מספר' : 'נגיעה במספר כדי להקליד'}</small></button>
      <button type="button" class="ob-sbtn" data-step="1" aria-label="יותר">+</button>
    </div>
    <label class="ob-lbl" for="years">כמה שנים עישנת? <span>לא חובה</span></label>
    <div class="input"><input id="years" class="num-ltr" dir="ltr" inputmode="numeric" placeholder="למשל 12" value="${esc(ui.years || '')}"><span class="unit">שנים</span></div>
    <div class="ob-sum">
      <div><div class="k">זה יוצא בערך</div><div class="n" data-sum-day>${money(day, 2)}</div><div class="k">ביום</div></div>
      <div class="y"><div class="k">ובשנה</div><div class="n" data-sum-year>${money(year, 0)}</div><div class="k">שחוזרים לכיס</div></div>
    </div>
  </div>`;
}

function whyStep() {
  return `<div class="ob-step">
    <h1>בשביל מה?</h1>
    <p class="ob-sub">נזכיר לך את זה ברגע קשה.</p>
    <label class="ob-lbl" for="obwhy">הסיבה שלי</label>
    <div class="input tall ${checkText(ui.why || '', 'reason') ? 'bad' : ''}"><textarea id="obwhy" placeholder="למשל: לנשום בקלות, להיות שם בשביל הילדים">${esc(ui.why || '')}</textarea></div>
    ${fieldError('reason')}
    <button type="button" class="ob-photo" data-act="ob-photo">${spot('heart')}<span class="copy"><b>תמונה שמחזקת</b><small>תופיע במסך הנשימה</small></span><span class="cam">${icon('camera', 18)}${st.settings.photo ? '<i class="got"></i>' : ''}</span></button>
    <input id="obphoto" type="file" accept="image/*" hidden>
    <div class="ob-lbl">ועל מה חוסכים?</div>
    <div class="ob-goal">
      <label for="obgoal">יעד</label>
      <label for="obgoalp">סכום</label>
      <div class="input ${checkText(ui.goal || '', 'goal') ? 'bad' : ''}"><input id="obgoal" placeholder="טיול, מתנה, חוויה" value="${esc(ui.goal || '')}"></div>
      <div class="input"><input id="obgoalp" class="num-ltr" dir="ltr" inputmode="numeric" placeholder="0" value="${esc(ui.goalPrice || '')}"><span class="unit">₪</span></div>
    </div>
    ${fieldError('goal')}
  </div>`;
}

function paintSummary() {
  const cpd = Number(ui.cpd);
  const used = cpd >= 1 ? cpd : 10;
  const day = previewPpc() * used;
  const year = day * 365;
  const d = document.querySelector('[data-sum-day]');
  const y = document.querySelector('[data-sum-year]');
  if (d) d.innerHTML = money(day, 2);
  if (y) y.innerHTML = money(year, 0);
}

function stepCpd(delta) {
  const cur = Number(ui.cpd);
  const next = Number.isFinite(cur) && cur >= 1
    ? Math.max(1, Math.min(80, cur + delta))
    : (delta > 0 ? 11 : 9);
  ui.cpd = next;
  const num = document.querySelector('[data-cpd-num]');
  const digit = num?.querySelector('b');
  if (digit) digit.textContent = String(next);
  num?.classList.remove('empty');
  paintSummary();
  document.querySelector('[data-act="ob-next"]')?.classList.remove('dis');
  if (st.settings.haptics) haptic('light');
}

export function bindOnboard() {
  const root = document.querySelector('.ob-stepper');
  if (!root || root.dataset.bound) return;
  root.dataset.bound = '1';
  root.querySelectorAll('[data-step]').forEach((btn) => {
    let timer = 0;
    const stop = () => { clearTimeout(timer); timer = 0; };
    const arm = (delay) => {
      timer = setTimeout(() => {
        stepCpd(+btn.dataset.step);
        const held = Date.now() - btn._held;
        arm(held > 1500 ? 60 : 120);
      }, delay);
    };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      btn._held = Date.now();
      stepCpd(+btn.dataset.step);
      arm(400);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, stop));
  });
}

export function openCpdInput() {
  const el = document.querySelector('[data-cpd-num]');
  if (!el || el.querySelector('input')) return;
  ui.cpdTyping = true;
  const cap = el.querySelector('[data-cpd-cap]');
  const digit = el.querySelector('b');
  if (cap) cap.textContent = 'מקלידים מספר';
  el.classList.remove('empty');
  if (digit) digit.innerHTML = `<input id="cpd-in" class="num-ltr" dir="ltr" inputmode="numeric" pattern="[0-9]*" value="${ui.cpd ?? ''}">`;
  const input = el.querySelector('input');
  input.focus();
  input.select();
  const commit = () => {
    if (!input.isConnected) return;
    const n = parseInt(input.value, 10);
    ui.cpd = Number.isFinite(n) ? Math.max(1, Math.min(80, n)) : null;
    ui.cpdTyping = false;
    el.classList.toggle('empty', !ui.cpd);
    if (digit) digit.textContent = ui.cpd ? String(ui.cpd) : '';
    if (cap) cap.textContent = 'נגיעה במספר כדי להקליד';
    paintSummary();
    document.querySelector('[data-act="ob-next"]')?.classList.toggle('dis', !ui.cpd);
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  input.addEventListener('blur', commit);
}

export function refreshBrandList() {
  const list = document.getElementById('brand-list');
  if (list) list.innerHTML = brandList();
}

export function habitDraft() {
  const item = ui.brandId && ui.brandId !== 'other' ? findBrand(ui.brandId) : null;
  const mode = ui.habitMode || st.settings.mode || 'pack';
  const price = parseFloat(ui.price);
  return {
    mode,
    brandId: ui.brandId || '',
    brandLabel: ui.brandId === 'other' ? (ui.customBrand || '') : brandLabel(item),
    price: Number.isFinite(price) ? price : (item?.price_ils ?? (mode === 'ryo' ? RYO_PRICE_DEFAULT : PACK_DEFAULT)),
    grams: ui.pouchGrams || item?.pouch_grams || (mode === 'ryo' ? RYO_GRAMS_DEFAULT : 20),
    priceTouched: !!ui.priceTouched,
    gpc: GPC,
  };
}

export function pickBrand(id) {
  ui.brandId = id;
  ui.brandQuery = '';
  ui.priceTouched = false;
  if (id === 'other') {
    ui.price = ui.habitMode === 'ryo' ? String(RYO_PRICE_DEFAULT) : String(PACK_DEFAULT);
    ui.pouchGrams = ui.habitMode === 'ryo' ? RYO_GRAMS_DEFAULT : null;
    ui.customBrand = ui.customBrand || '';
    return;
  }
  const item = findBrand(id);
  ui.price = item ? String(item.price_ils) : '';
  ui.pouchGrams = item?.pouch_grams || null;
  ui.customBrand = '';
}

export { GPC };
