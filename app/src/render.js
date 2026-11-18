import { icon } from './icons.js';
import { BREATH } from './breath.js';
import { scene, wordmark, WORDMARK } from './scene.js';
import { livingScene, stageFor } from './living.js';
import { hasSpot, spot, tabIcon } from './art.js';
import { now, save, st } from './store.js';
import { ui } from './ui-state.js';
import {
  DAY, MONTH, YEAR, cigsAt, costParts, esc, fmtClock, fmtDur, futureValue, hebDate,
  ils, moneyAt, nf, ppcOf, prevMoney, triggerCounts, checkinStreak, longestAt,
} from './calc.js';
import { HEALTH, SYSTEMS, healthSummary, withState } from './health.js';
import { ACH, GROUPS, achVal } from './achievements.js';
import { MESSAGES, TRIGGERS, TIPS, triggerById } from './copy.js';
import { insightFor, weekStats } from './insights.js';
import { showPlaceholder } from './ads.js';
import { priceLabel } from './purchases.js';
import { isNative } from './native.js';
import { APP } from './config.js';

const $app = () => document.getElementById('app');

export function theme() {
  const t = st.settings?.theme || 'auto';
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Currency mark stays outside the ticking digits so a live update cannot erase it. */
function moneyFig(amount, digits = 0, live = '') {
  if (amount == null || !Number.isFinite(amount)) return '<span class="ils">—</span>';
  const n = nf(amount, digits);
  const num = live ? `<span data-live="${live}">${n}</span>` : n;
  return `<span class="ils"><bdi dir="ltr">${num}<span class="shekel">₪</span></bdi></span>`;
}

function nav(active) {
  const items = [['home', 'היום'], ['health', 'הגוף'], ['pocket', 'הכיס'], ['journal', 'יומן'], ['settings', 'הגדרות']];
  return `<nav class="tab">${items.map(([r, l]) => {
    const on = active === r;
    const art = r === 'pocket'
      ? `<img class="tabart jar" src="art/spots/spot-jar.webp" width="40" height="40" alt="">`
      : tabIcon(r, on);
    return `<button data-act="go" data-go="${r}" class="${on ? 'on' : ''}${r === 'pocket' ? ' mid' : ''}">${art}<span>${l}</span></button>`;
  }).join('')}</nav>`;
}

function ad(route) {
  if (!showPlaceholder(st, route)) return '';
  return `<div class="ad" style="margin-top:14px"><b>מודעה</b>באנר 320×50</div>`;
}

function toast() {
  return ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '';
}

function screen(body, tab) {
  return `${body}${cheer()}${tab ? nav(tab) : ''}${overlay()}${toast()}`;
}

function cheer() {
  const item = ui.cheer;
  if (!item) return '';
  const title = item.kind === 'ach' ? item.item.t : item.item.when;
  const face = hasSpot(item.item.icon) ? spot(item.item.icon, 36) : spot('medal', 36);
  return `<div class="cheer" role="status">${face}<span>${esc(title)}</span></div>`;
}

let lastRoute = '';
let introFrame = 0;

export function render() {
  cancelAnimationFrame(introFrame);
  const dark = theme() === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = dark ? '#151B17' : '#F6EFE3';
  document.documentElement.classList.toggle('reduce', !st.settings?.celebrate || matchMedia('(prefers-reduced-motion: reduce)').matches);
  const enterHealth = ui.route === 'health' && lastRoute !== 'health';
  lastRoute = ui.route;
  $app().innerHTML = view();
  const sc = $app().querySelector('[data-scroll]');
  if (sc && ui.scroll) sc.scrollTop = ui.scroll;
  if (ui.route === 'home' || ui.route === 'pocket') {
    for (const el of document.querySelectorAll('[data-roll]')) rollInto(el, el.textContent);
  }
  if (ui.route === 'home') {
    bindLiving();
    noteStage();
  }
  if (enterHealth) introFrame = requestAnimationFrame(() => runHealthIntro());
}

/** Vertical digit strip. The shekel mark is never inside this node. */
function rollInto(node, str) {
  const s = String(str);
  const reduce = document.documentElement.classList.contains('reduce');
  if (reduce) {
    if (node.textContent !== s) node.textContent = s;
    node._s = s;
    node._c = null;
    return;
  }
  const ch = [...s];
  const isD = (c) => c >= '0' && c <= '9';
  const prev = node._s == null ? null : [...node._s];
  const rebuild = !prev || !node._c || prev.length !== ch.length || ch.some((c, i) => isD(c) !== isD(prev[i]) || (!isD(c) && c !== prev[i]));
  if (rebuild) {
    node.textContent = '';
    node._c = ch.map((c) => {
      if (!isD(c) || reduce) {
        const t = document.createElement('span');
        t.className = isD(c) ? 'dg flat' : 'pch';
        t.textContent = c;
        node.appendChild(t);
        return null;
      }
      const d = document.createElement('span');
      d.className = 'dg';
      const s = document.createElement('span');
      s.className = 'strip';
      s.innerHTML = '0123456789'.split('').map((n) => `<span>${n}</span>`).join('');
      d.appendChild(s);
      node.appendChild(d);
      return s;
    });
  }
  if (!reduce) {
    ch.forEach((c, i) => {
      const s = node._c?.[i];
      if (s) s.style.transform = `translateY(${-(+c) * 10}%)`;
    });
  }
  node._s = s;
}

let sceneScroll = null;

function bindLiving() {
  const screen = document.querySelector('.screen.home');
  const live = document.querySelector('.living');
  if (!screen || !live) return;
  if (sceneScroll) screen.removeEventListener('scroll', sceneScroll);
  if (!bindLiving.vis) {
    bindLiving.vis = true;
    document.addEventListener('visibilitychange', () => {
      document.documentElement.classList.toggle('scene-off', document.hidden);
    });
  }
  sceneScroll = () => {
    if (document.documentElement.classList.contains('reduce')) return;
    const y = Math.max(-10, Math.min(16, screen.scrollTop * 0.05));
    live.style.setProperty('--py', `${y}px`);
  };
  screen.addEventListener('scroll', sceneScroll, { passive: true });
}

function noteStage() {
  const live = document.querySelector('.living');
  const id = live?.dataset.stage;
  if (!id || !st.settings) return;
  const prev = st.settings.seenStage;
  if (prev === id) return;
  st.settings.seenStage = id;
  save();
  if (prev) live.classList.add('arrive');
}

function moneySplit(amount) {
  if (amount == null || !Number.isFinite(amount)) return { whole: '—', agorot: '' };
  const s = nf(Math.max(0, amount), 2);
  const i = s.lastIndexOf('.');
  if (i < 0) return { whole: s, agorot: '' };
  return { whole: s.slice(0, i), agorot: s.slice(i) };
}

function lifeParts(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return { n: String(m), a: 'דקות חיים', b: 'שחזרו' };
  const h = Math.floor(m / 60);
  if (h < 48) return { n: `${h}:${String(m % 60).padStart(2, '0')}`, a: 'שעות חיים', b: 'שחזרו' };
  const d = Math.max(1, Math.round(h / 24));
  if (d === 1) return { n: '1', a: 'יום חיים', b: 'שחזר' };
  return { n: String(d), a: 'ימי חיים', b: 'שחזרו' };
}

/** A short pass along milestones already reached, then rest on the one in progress. */
function runHealthIntro() {
  const screen = document.querySelector('#app .screen.health');
  const nowEl = document.querySelector('.tl .it.now') || document.querySelector('.tl .it.done:last-of-type');
  const reduce = document.documentElement.classList.contains('reduce');
  const place = (el) => {
    if (!el || !screen) return 0;
    const a = el.getBoundingClientRect();
    const b = screen.getBoundingClientRect();
    return a.top - b.top + screen.scrollTop;
  };
  const settle = () => {
    if (!nowEl || !screen) return;
    screen.scrollTop = Math.max(0, place(nowEl) - screen.clientHeight * 0.32);
  };
  if (reduce || !screen) { settle(); return; }
  const done = [...document.querySelectorAll('.tl .it.done')];
  const rail = document.querySelector('.tl .rail');
  if (!done.length) { settle(); return; }
  const tl = document.querySelector('.tl');
  tl.classList.add('arm');
  const tlBox = tl.getBoundingClientRect();
  const mid = (el) => {
    const b = el.getBoundingClientRect();
    return b.top - tlBox.top + b.height / 2;
  };
  const from = mid(done[0].querySelector('.nd'));
  const to = mid(done[done.length - 1].querySelector('.nd'));
  tl.style.setProperty('--rail-top', `${from}px`);
  const dest = Math.max(0, place(nowEl) - screen.clientHeight * 0.32);
  const hold = 200;
  const travel = 1000;
  const t0 = performance.now();
  const step = (t) => {
    const p = t - t0 < hold ? 0 : Math.min(1, (t - t0 - hold) / travel);
    const n = Math.round(p * done.length);
    done.forEach((el, i) => el.classList.toggle('lit', i < n));
    if (rail) rail.style.height = `${Math.max(0, (to - from) * p)}px`;
    screen.scrollTop = dest * p;
    if (p < 1) introFrame = requestAnimationFrame(step);
    else screen.scrollTop = dest;
  };
  introFrame = requestAnimationFrame(step);
}

function view() {
  switch (ui.route) {
    case 'onboard': return onboard();
    case 'sos': return sos();
    case 'health': return screen(health(), 'health');
    case 'badges':
    case 'pocket': return screen(pocket(), 'pocket');
    case 'stats': return screen(stats(), 'home');
    case 'journal': return screen(journal(), 'journal');
    case 'settings': return screen(settings(), 'settings');
    case 'share': return share();
    case 'week': return week();
    case 'slipdone': return slipDone();
    default: return screen(home(), 'home');
  }
}

function home() {
  const t = now();
  const q = st.settings.quitAt;
  const elapsed = q ? Math.max(0, t - q) : 0;
  const days = Math.floor(elapsed / DAY);
  const dark = theme() === 'dark';
  const stones = days <= 0 ? 1 : Math.min(8, days);
  const sum = q ? healthSummary(elapsed) : null;
  const next = sum?.next;
  const latest = sum?.done?.length ? sum.done[sum.done.length - 1] : null;
  const has = !!(q && st.settings.cpd);
  const money = has ? moneyAt(st, t) : null;
  const parts = moneySplit(money);
  const cigs = has ? Math.floor(cigsAt(st, t)) : null;
  const life = lifeParts((has ? cigsAt(st, t) : 0) * (st.settings.mpc || 11));
  const goal = st.settings.goalPrice || 0;
  const have = (money || 0) + prevMoney(st);
  const gp = goal ? Math.min(1, have / goal) : 0;
  const stage = stageFor(days);
  const scene = livingScene(days, dark);
  const wide = parts.whole.length > 4 ? ' long' : '';
  const dayA = days === 1 ? 'יום' : 'ימים';
  const cigA = cigs === 1 ? 'סיגריה' : 'סיגריות';
  const healthLine = next
    ? `<button class="slim" data-act="go" data-go="health">${ring(next.pct || 0)}<span class="col"><span class="one">${esc(next.title)}</span><span class="sub">בעוד ${fmtDur(Math.max(0, next.at - elapsed), 1)}</span></span><i class="slimbar" aria-hidden="true"><b style="width:${Math.max(4, Math.round((next.pct || 0) * 100))}%"></b></i></button>`
    : `<button class="slim" data-act="go" data-go="health">${ring(1)}<span class="col"><span class="one">${latest ? esc(latest.title) : 'הגוף'}</span></span></button>`;
  const goalLine = goal
    ? `<button class="slim" data-act="editor" data-ed="goal">${spot('jar', 36)}<span class="col"><span class="one">${esc(st.settings.goalName || 'יעד חיסכון')}</span><span class="sub">${moneyFig(have, 0)} מתוך ${moneyFig(goal, 0)}</span></span><i class="slimbar${gp > 0 && gp < 0.08 ? ' seed' : ''}" aria-hidden="true"><b style="width:${(Math.max(gp * 100, gp > 0 ? 6 : 0)).toFixed(1)}%"></b></i></button>`
    : `<button class="slim" data-act="editor" data-ed="goal">${spot('goal', 36)}<span class="one">יעד חיסכון</span></button>`;
  return `<div class="home screen">
    <header class="home-hero">
      <div class="home-art living${dark ? ' dark' : ''}" data-stage="${stage.id}">${scene.html}</div>
      <div class="stage-tag">יום ${days} · ${stage.label}</div>
      <div class="brandrow">${wordmark(15, dark)}<button class="iconbtn" style="background:transparent" data-act="go" data-go="share" aria-label="שיתוף">${spot('share', 28) || icon('share', 20)}</button></div>
      <button class="pocket" data-act="go" data-go="pocket">
        <div class="fig${wide}" dir="ltr">
          <bdi dir="ltr" class="main" data-roll="money">${parts.whole}</bdi>
          <bdi dir="ltr" class="agorot" data-roll="agorot">${parts.agorot}</bdi>
          <span class="shekel">₪</span>
        </div>
        <div class="k">נשארו בכיס</div>
      </button>
    </header>
    <div class="home-body">
      <div class="meters">
        <button class="m" data-act="go" data-go="pocket"><bdi dir="ltr" class="num" data-roll="days">${days}</bdi><div class="u"><span data-live="daysa">${dayA}</span><span>בלי עישון</span></div><bdi dir="ltr" class="clk" data-roll="clock">${q ? fmtClock(elapsed % DAY) : '00:00:00'}</bdi></button>
        <button class="m" data-act="go" data-go="pocket"><bdi dir="ltr" class="num${String(cigs ?? '').length > 3 ? ' long' : ''}" data-roll="cigs">${cigs == null ? '—' : nf(cigs, 0)}</bdi><div class="u"><span data-live="ciga">${cigA}</span><span>שלא עישנת</span></div></button>
        <button class="m" data-act="go" data-go="pocket"><bdi dir="ltr" class="num${life.n.length > 4 ? ' long' : ''}" data-roll="life">${life.n}</bdi><div class="u"><span data-live="lifea">${life.a}</span><span data-live="lifeb">${life.b}</span></div></button>
      </div>
      ${healthLine}
      ${goalLine}
      <div class="home-foot">
      <button class="sos" data-act="sos"><span class="w">${spot('breath', 36)}</span><span class="sos-copy"><span class="t1">נושמים יחד</span><span class="t2">עשר דקות, והגל עובר</span></span>${icon('chevron', 18, 'currentColor', 'margin-inline-start:auto;opacity:.7')}</button>
      <div class="linkrow">
        <button class="btn text" data-act="win">${icon('check', 16)}רישום חשק</button>
        <button class="btn text" data-act="open-checkin">${icon('check-in', 16)}איך עבר היום</button>
        <button class="btn text" data-act="slip">${icon('slip', 16)}רגע קשה</button>
      </div>
      ${ad('home')}
      </div>
    </div>
  </div>`;
}

const WORTH = [
  { name: 'ארוחה משפחתית', price: 250, art: 'jar' },
  { name: 'מיכל דלק', price: 400, art: 'goal' },
  { name: 'יום כיף', price: 800, art: 'sprout' },
  { name: 'סוף שבוע', price: 2000, art: 'medal' },
  { name: 'חופשה', price: 6000, art: 'share' },
];

function unitsOf(cigs) {
  const s = st.settings;
  if (s.mode === 'pack') return { n: cigs / Math.max(1, s.perPack || 20), label: 'קופסאות' };
  return { n: cigs * (s.gpc || 0.5) / Math.max(1, s.tobGrams || 40), label: 'שקיות' };
}

function savedNow(t) {
  const has = !!(st.settings.quitAt && st.settings.cpd);
  return has ? moneyAt(st, t) + prevMoney(st) : 0;
}

function monthlyRate() {
  return (st.settings.cpd || 0) * ppcOf(st.settings) * (MONTH / DAY);
}

function investRate() {
  const r = +st.settings.investRate;
  return Math.min(0.1, Math.max(0.03, Number.isFinite(r) ? r : 0.07));
}

function badgeRow(groups) {
  const items = ACH.filter((a) => groups.includes(a.group));
  return `<div class="badgelets">${items.map((a) => {
    const on = !!st.unlocked[a.id];
    return `<button class="badgelet ${on ? 'on' : ''}" data-act="ach" data-id="${a.id}">${spot('medal', 40)}<span>${esc(a.t)}</span></button>`;
  }).join('')}</div>`;
}

function pocket() {
  const t = now();
  const has = !!(st.settings.quitAt && st.settings.cpd);
  const money = has ? moneyAt(st, t) : null;
  const parts = moneySplit(money);
  const cigs = has ? Math.floor(cigsAt(st, t)) : 0;
  const units = unitsOf(cigs);
  const day = (st.settings.cpd || 0) * ppcOf(st.settings);
  const saved = savedNow(t);
  const rate = investRate();
  const monthly = monthlyRate();
  const years = [1, 5, 10, 20];
  const fvs = years.map((y) => futureValue(saved, monthly, rate, y));
  const max = Math.max(1, ...fvs);
  const goal = st.settings.goalPrice || 0;
  const gp = goal ? Math.min(1, saved / goal) : 0;
  const wide = parts.whole.length > 4 ? ' long' : '';
  const days = st.settings.quitAt ? Math.floor(Math.max(0, t - st.settings.quitAt) / DAY) : 0;
  const dark = theme() === 'dark';
  const scene = livingScene(days, dark);
  return `<div class="screen money-screen">
    <header class="pk-top">
      <div class="living pk-scene${dark ? ' dark' : ''}" aria-hidden="true">${scene.html}</div>
      <div class="pk-over">
        ${spot('sprout', 52)}
        <div class="fig${wide}" dir="ltr">
          <bdi dir="ltr" class="main" data-roll="money">${parts.whole}</bdi>
          <bdi dir="ltr" class="agorot" data-roll="agorot">${parts.agorot}</bdi>
          <span class="shekel">₪</span>
        </div>
        <div class="k">נשארו בכיס</div>
        <div class="pk-sub"><bdi dir="ltr" data-roll="cigs">${nf(cigs, 0)}</bdi> סיגריות שלא נדלקו · <bdi dir="ltr">${nf(units.n, 1)}</bdi> ${units.label}</div>
      </div>
    </header>
    <div class="pk-sec">
      <div class="h2">בקצב הנוכחי</div>
      <div class="rates">${[
        ['ליום', day],
        ['לשבוע', day * 7],
        ['לחודש', day * MONTH / DAY],
        ['לשנה', day * YEAR / DAY],
      ].map(([l, n]) => `<div class="cell"><span class="lbl">${l}</span><bdi dir="ltr" class="amt">${moneyFig(n, n >= 100 ? 0 : 1)}</bdi></div>`).join('')}</div>
    </div>
    <div class="pk-sec">
      <div class="h2">מה זה שווה</div>
      ${goal ? `<button class="slim goal" data-act="editor" data-ed="goal">${spot('jar', 40)}<span class="col"><span class="one">${esc(st.settings.goalName || 'יעד חיסכון')}</span><span class="sub">${moneyFig(saved, 0)} מתוך ${moneyFig(goal, 0)}</span></span><i class="slimbar${gp > 0 && gp < 0.08 ? ' seed' : ''}"><b style="width:${(Math.max(gp * 100, gp > 0 ? 6 : 0)).toFixed(1)}%"></b></i></button>` : `<button class="slim" data-act="editor" data-ed="goal">${spot('goal', 40)}<span class="one">בחרו יעד חיסכון</span></button>`}
      ${WORTH.map((w) => {
        const p = Math.min(1, saved / w.price);
        const times = saved / w.price;
        const note = times >= 1 ? `<div class="sub">${nf(times, times >= 10 ? 0 : 1)} פעמים</div>` : '';
        return `<div class="worth">${spot(w.art, 44)}<div class="col"><div class="top"><span class="one">${w.name}</span><bdi dir="ltr" class="amt">${moneyFig(w.price, 0)}</bdi></div><i class="slimbar"><b style="width:${Math.max(p * 100, p > 0 ? 4 : 0).toFixed(1)}%"></b></i>${note}</div></div>`;
      }).join('')}
    </div>
    <div class="pk-sec">
      <div class="h2">אילו השקעת</div>
      <p class="small">כל חודש, הסכום שנחסך מושקע במדד רחב. המספר למטה גדל עם מה שנחסך עכשיו.</p>
      <label class="invest"><span>תשואה שנתית משוערת <b id="investV">${Math.round(rate * 100)}%</b></span><input id="invest" type="range" min="3" max="10" step="1" value="${Math.round(rate * 100)}"></label>
      <div class="proj"><div class="k">בעוד 10 שנים</div><div class="fig" dir="ltr"><bdi dir="ltr" class="main" data-roll="proj">${nf(fvs[2], 0)}</bdi><span class="shekel">₪</span></div></div>
      <div class="invbars">${fvs.map((v, i) => `<div><i class="${years[i] === 10 ? 'hot' : ''}" style="height:${Math.max(8, Math.round((v / max) * 96))}px"></i><b>${years[i] === 1 ? 'שנה' : `${years[i]} שנים`}</b><span><bdi dir="ltr">${moneyFig(v, 0)}</bdi></span></div>`).join('')}</div>
      <p class="disc">להמחשה בלבד, אינו ייעוץ השקעות. תשואות עבר אינן מבטיחות תשואות עתידיות.</p>
    </div>
    <div class="pk-sec">
      <div class="h2">הישגי כיס</div>
      ${badgeRow(['money', 'cigs'])}
    </div>
  </div>`;
}

function weekBars(t) {
  const cells = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(t);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const n = st.cravings.filter((c) => new Date(c.t).toDateString() === key).length;
    cells.push({ n, today: i === 0 });
  }
  if (cells.every((c) => c.n === 0)) {
    return `<div class="week-empty">${spot('empty', 72)}<p>אחרי החשק הראשון יופיע כאן השבוע.</p></div>`;
  }
  const max = Math.max(1, ...cells.map((c) => c.n));
  return `<div class="wbars" aria-hidden="true">${cells.map((c) => `<i class="${c.today ? 'now' : ''} ${c.n ? 'on' : ''}" style="height:${6 + Math.round((c.n / max) * 22)}px"></i>`).join('')}</div>`;
}

function ring(p) {
  const c = 2 * Math.PI * 14;
  const dash = Math.max(0.4, c * (p || 0));
  return `<svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="var(--c-bg)" stroke="var(--c-mist)" stroke-width="3"/><circle cx="17" cy="17" r="14" fill="none" stroke="var(--c-hill)" stroke-width="3" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 17 17)"/></svg>`;
}

function sos() {
  const dark = theme() === 'dark';
  const top = dark ? '#1A2420' : '#DDE6DE';
  const on = dark ? '#151B17' : '#2F3A2B';
  const cols = dark ? ['#8FA88A', '#8FA88A', '#A9C2A1'] : ['#94A88C', '#94A88C', '#6E8768'];
  const mode = ui.breathMode;
  const phases = mode === 'box'
    ? [['שאיפה', '4'], ['החזקה', '4'], ['נשיפה', '4'], ['החזקה', '4']]
    : [['שאיפה', '4'], ['החזקה', '7'], ['נשיפה', '8']];
  const reason = (st.settings.reasons || [])[0];
  const photo = st.settings.photo
    ? `<div class="ph"><img alt="" src="${st.settings.photo}"></div>`
    : `<div class="ph">${icon('quote', 22, 'var(--c-hill)')}</div>`;
  return `<div class="sos-screen screen" style="--sos-top:${top};--sos-on:${on}">
    <div class="topbar"><div><div class="h1">הגל הזה יעבור</div><p class="lead" style="margin-top:6px">עוקבים אחרי הצורה. כשהיא גדלה — שואפים.</p></div>
      <button class="iconbtn" data-act="sos-close" aria-label="סגירה">${icon('close', 16)}</button></div>
    <div class="wrap" style="margin-top:14px"><div class="seg" role="tablist">
      <button data-act="breath" data-mode="478" class="${mode === '478' ? 'on' : ''}">4-7-8 מרגיעה</button>
      <button data-act="breath" data-mode="box" class="${mode === 'box' ? 'on' : ''}">קופסה 4-4-4-4</button>
    </div></div>
    <div class="stage" aria-hidden="true"><svg viewBox="0 0 340 340"><g class="blobs"><path d="${BREATH.b1}" fill="${cols[0]}" opacity=".22"/><path d="${BREATH.b2}" fill="${cols[1]}" opacity=".45"/><path d="${BREATH.b3}" fill="${cols[2]}"/></g></svg>
      <div class="mid"><div class="ph" data-live="phase">שאיפה</div><div class="c" data-live="phaseleft">עוד 4 שניות</div></div></div>
    <div class="stp">${phases.map(([n, s], i) => `<span data-phase="${i}" class="${i === 0 ? 'on' : ''}">${n} · ${s}</span>`).join('')}</div>
    <div class="wrap"><div class="timer" style="margin-top:12px"><div style="display:flex;justify-content:space-between"><div class="ltr" data-live="sosclock" style="font:500 30px/1 var(--f-text)">10:00</div><div class="small">דקות שנשארו לגל</div></div>
      <svg width="100%" height="28" viewBox="0 0 334 28" style="margin-top:6px"><polyline points="${BREATH.wave}" fill="none" stroke="var(--c-line)" stroke-width="2"/><polyline data-live="wave" points="${BREATH.wave}" fill="none" stroke="var(--c-clay)" stroke-width="2.4" stroke-dasharray="0 2000"/></svg></div>
      ${reason ? `<div class="why">${photo}<div><div class="eyebrow" style="color:var(--c-clay)">הסיבה שלנו</div><div style="font:400 14.5px/1.4 var(--f-text);margin-top:3px">${esc(reason)}</div></div></div>` : ''}
      <div class="why">${icon('drop', 22, 'var(--c-clay)')}<div class="small" data-live="tip">${esc(TIPS[0])}</div></div>
    </div>
    <div class="sos-foot"><button class="btn primary" data-act="sos-won" style="width:100%">${icon('growth', 20)}עברנו את זה</button>
      <button class="btn text" data-act="sos-slip" style="margin:10px auto 0">נרשם רגע קשה</button></div>
  </div>`;
}

function health() {
  const t = now();
  const elapsed = st.settings.quitAt ? Math.max(0, t - st.settings.quitAt) : 0;
  const all = withState(elapsed);
  const sum = healthSummary(elapsed);
  const list = all.filter((h) => ui.healthFilter === 'all' || h.system === ui.healthFilter);
  const done = list.filter((h) => h.status === 'done');
  const rest = list.filter((h) => h.status !== 'done');
  const hidden = !!st.settings.hideDoneHealth;
  const showDone = hidden ? [] : done;
  const next = sum.next;
  const latest = sum.latest[sum.latest.length - 1];
  const fold = done.length
    ? `<button class="fold" data-act="hpast">${hidden ? `הצגת ${done.length} שלבים שהושגו` : 'הסתרת שלבים שהושגו'}</button>`
    : '';
  return `<div class="screen health">
    <div class="appbar"><div class="ttl">הגוף מתאושש</div><div class="eyebrow" style="text-align:left">${sum.doneCount} מתוך ${sum.total}<br>שלבים</div></div>
    <p class="lead" style="padding:4px var(--gutter) 0">מה קורה בגוף מאז הסיגריה האחרונה. הערכות כלליות, לא ייעוץ רפואי.</p>
    <div class="sum"><div class="eyebrow">מה קורה בגוף עכשיו</div>
      <div class="h2" style="font-size:16px;margin-top:6px">${next ? esc(next.title) : latest ? esc(latest.title) : 'המונה עוד לא התחיל.'}</div>
      ${next ? `<div class="small" style="margin-top:6px">התחנה הבאה · ${esc(next.when)} · בעוד ${fmtDur(Math.max(0, next.at - elapsed), 1)}</div><div class="pb" style="margin-top:10px"><i style="width:${Math.round((next.pct || 0) * 100)}%"></i></div>` : `<div class="small" style="margin-top:6px">כל התחנות שבמאגר כבר מאחור.</div>`}
    </div>
    <div class="pk-sec tight"><div class="h2">הישגים</div>${badgeRow(['time'])}</div>
    <div class="filters">${SYSTEMS.map((s) => `<button data-act="hfilter" data-id="${s.id}" class="${ui.healthFilter === s.id ? 'on' : ''}">${s.label}</button>`).join('')}</div>
    <div class="pad">${fold}
      <div class="tl"><i class="rail" aria-hidden="true"></i>${showDone.map(healthItem).join('')}${rest.map(healthItem).join('')}</div>
      ${ad('health')}
    </div>
  </div>`;
}

function healthItem(h) {
  const done = h.status === 'done';
  const q = st.settings.quitAt;
  const ts = done && q ? q + h.at : null;
  const got = ts ? hebDate(ts) : '';
  const node = done
    ? `<div class="nd done">${icon('check', 14, 'var(--c-bg)', 2.2)}</div>`
    : h.status === 'now'
      ? `<div class="nd now">${ring(h.pct || 0)}</div>`
      : `<div class="nd next"></div>`;
  const ic = h.status === 'next' ? 'var(--c-ink-3)' : 'var(--c-clay)';
  const mark = h.status === 'now' ? '<b class="tag">עכשיו</b>' : done ? '<b class="tag got">הושג</b>' : '';
  const glyph = hasSpot(h.icon) ? spot(h.icon, 28) : icon(h.icon, 16, ic);
  return `<div class="it ${h.status}">${node}<div class="tx"><div class="w">${glyph}<span>${esc(h.when)}</span>${mark}</div><div class="t">${esc(h.title)}</div>${got ? `<div class="gotwhen">הושג · ${esc(got)}</div>` : ''}<button class="srcbtn" data-act="link" data-url="${esc(h.url)}">מקור: ${esc(h.source)}</button>${h.status === 'now' ? `<div class="pb"><i style="width:${Math.round((h.pct || 0) * 100)}%"></i></div>` : ''}</div></div>`;
}

function badges() {
  const t = now();
  const got = ACH.filter((a) => st.unlocked[a.id]).length;
  const next = ACH.find((a) => !st.unlocked[a.id]);
  const bar = ACH.map((a) => `<i class="${st.unlocked[a.id] ? 'on' : ''}"></i>`).join('');
  const sections = GROUPS.map(([k, label]) => {
    const items = ACH.filter((a) => a.group === k);
    return `<div class="sec">${label}</div><div class="mg">${items.map((a) => {
      const on = !!st.unlocked[a.id];
      const p = Math.max(0, Math.min(1, achVal(a, st, t) / a.v));
      const status = on ? 'got' : p > 0.02 ? 'next' : 'lock';
      return `<button class="cell" data-act="ach" data-id="${a.id}">${medal(a.icon, status, p, 54)}<div class="lb ${status}">${esc(a.t)}</div></button>`;
    }).join('')}</div>`;
  }).join('');
  return `<div class="screen"><div class="appbar"><div class="ttl">צמיחה</div><button class="iconbtn" data-act="go" data-go="share" aria-label="שיתוף">${icon('share', 18)}</button></div>
    <div style="display:flex;justify-content:space-between;padding:8px var(--gutter) 0"><div><span style="font:600 30px/1 var(--f-text)">${got}</span><span class="small"> מתוך ${ACH.length} הישגים</span></div>${next ? `<div class="small">הבא: <b style="color:var(--c-ink)">${esc(next.t)}</b></div>` : ''}</div>
    <div class="bar">${bar}</div><div class="pad">${sections}${ad('badges')}</div></div>`;
}

function medal(ic, status, p, size) {
  const col = status === 'got' ? '#2F3A2B' : status === 'next' ? 'var(--c-ink)' : 'var(--c-ink-3)';
  let ringSvg = '';
  if (status === 'next') {
    const r = size / 2 - 3;
    const c = 2 * Math.PI * r;
    ringSvg = `<svg width="${size}" height="${size}" style="position:absolute;inset:0;transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--c-clay)" stroke-width="3" stroke-dasharray="${(c * p).toFixed(1)} 999" stroke-linecap="round"/></svg>`;
  }
  const face = spot('medal', Math.round(size * 0.86));
  return `<div class="medal ${status}" style="width:${size}px;height:${size}px">${ringSvg}${face}</div>`;
}

function unlockView(item) {
  const ach = item.kind === 'ach';
  const title = ach ? item.item.t : item.item.when;
  const body = ach ? item.item.d : `${item.item.title} הערכה כללית, לא ייעוץ רפואי.`;
  const idx = ach ? ACH.findIndex((a) => a.id === item.item.id) + 1 : HEALTH.findIndex((h) => h.id === item.item.id) + 1;
  const total = ach ? ACH.length : HEALTH.length;
  const label = ach ? 'הישג חדש' : 'תחנה בגוף';
  const glyph = hasSpot(item.item.icon) ? spot(item.item.icon, 88) : icon(item.item.icon, 68, '#2F3A2B', 1.5);
  return `<div class="unlock screen"><div class="rays"></div><div class="c"><div class="m">${glyph}</div>
    <div class="e">${label} · ${idx} מתוך ${total}</div><div class="t">${esc(title)}</div><div class="d">${esc(body)}</div></div>
    <div class="foot"><button class="btn cream" data-act="unlock-ok">ממשיכים</button><button class="btn line" data-act="go" data-go="share">${icon('share', 18, '#F6EFE3')}שיתוף ההישג</button></div></div>`;
}

function stats() {
  const t = now();
  const cpd = Math.round(st.settings.cpd || 0);
  const cols = Math.min(20, Math.max(5, cpd || 15));
  const rows = 7;
  const total = cols * rows;
  const smoked = Math.floor(cigsAt(st, t));
  let dots = '';
  for (let i = 0; i < total; i++) dots += `<i class="${i < smoked ? 'on' : i === smoked ? 'now' : ''}"></i>`;
  const per = ppcOf(st.settings);
  const day = (st.settings.cpd || 0) * per;
  const have = moneyAt(st, t) + prevMoney(st);
  const goal = st.settings.goalPrice || 0;
  const gp = goal ? Math.min(1, have / goal) : 0;
  const cmp = [{ n: 'קפה בחוץ', p: 16 }, { n: 'כרטיס קולנוע', p: 48 }, { n: 'ארוחה בחוץ', p: 80 }, { n: 'נעלי ספורט', p: 450 }]
    .map((c) => ({ ...c, q: have / c.p })).filter((c) => c.q >= 1).slice(0, 3);
  const mode = st.settings.mode === 'pack' ? 'סיגריות בקופסה' : 'טבק לגלגול';
  return `<div class="screen"><div class="appbar"><div style="display:flex;align-items:center;gap:10px"><button class="iconbtn" data-act="go" data-go="home" aria-label="חזרה">${icon('chevron', 16, 'currentColor', 1.7)}</button><div class="ttl">המספרים</div></div><button class="iconbtn" data-act="go" data-go="share" aria-label="שיתוף">${icon('share', 18)}</button></div>
    <div class="pad">
      <div style="padding:8px 0 14px;border-bottom:1px solid var(--c-line)"><div style="display:flex;justify-content:space-between"><div class="h2" style="font-size:15.5px">כל נקודה היא סיגריה שלא נדלקה</div><div class="small ltr">${Math.min(smoked, total)}/${total}</div></div>
        <div class="dots" style="grid-template-columns:repeat(${cols},1fr);margin-top:12px">${dots}</div>
        <div class="small" style="display:flex;justify-content:space-between;margin-top:10px"><span>שורה לכל יום · ${cpd || '—'} ביום</span></div>
      </div>
      <div class="moneyline"><div><div class="eyebrow">נחסך עד עכשיו</div><div class="ils-display" style="margin-top:6px">${moneyFig(moneyAt(st, t), 2)}</div></div><div class="small" style="text-align:left">${moneyFig(per, 2)} לסיגריה<br>${mode}</div></div>
      <div class="led"><div><div class="v">${moneyFig(day, 2)}</div><div class="k">ביום</div></div><div><div class="v">${moneyFig(day * MONTH / DAY, 0)}</div><div class="k">בחודש</div></div><div><div class="v">${moneyFig(day * YEAR / DAY, 0)}</div><div class="k">בשנה</div></div></div>
      ${goal ? `<div style="padding:14px 0;border-bottom:1px solid var(--c-line)"><div style="display:flex;justify-content:space-between;align-items:center">${icon('goal', 18, 'var(--c-clay)')}<span style="flex:1;margin-inline-start:8px">${esc(st.settings.goalName || 'יעד חיסכון')}</span><span class="small"><b style="color:var(--c-ink)">${moneyFig(have, 0)}</b> מתוך ${moneyFig(goal, 0)}</span></div><div class="gb"><i style="width:${(gp * 100).toFixed(1)}%"></i></div></div>` : `<button class="row" data-act="editor" data-ed="goal"><div class="t">אפשר להגדיר יעד חיסכון</div>${icon('chevron', 16, 'var(--c-ink-3)')}</button>`}
      ${cmp.map((c) => `<div style="display:flex;justify-content:space-between;padding:9px 0"><span>${c.n}</span><b>${nf(c.q, c.q >= 10 ? 0 : 1)}</b></div>`).join('')}
      ${prevMoney(st) > 0 ? `<p class="small">כולל רצפים קודמים: ${ils(have, 0)}. השיא: ${fmtDur(longestAt(st, t), 2)}.</p>` : ''}
      ${ad('stats')}
    </div></div>`;
}

function journal() {
  const t = now();
  const tab = ui.journalTab;
  const streak = checkinStreak(st, t);
  const moods = [1, 2, 3, 4, 5].map((k) => `<button class="md ${ui.checkinMood === k ? 'on' : ''}" data-act="mood" data-m="${k}" aria-label="מצב רוח ${k}">${icon('mood-' + k, 30, 'currentColor', 1.5)}</button>`).join('');
  const why = st.seenJournalWhy ? '' : `<div class="sum" style="margin-bottom:8px"><div class="h2" style="font-size:16px">למה יומן</div><p class="small" style="margin-top:6px">רישום חשק מראה שהוא נחלש ומתקצר. כל רישום מחזיר תובנה, לא רשימת מטלות.</p><button class="btn text" data-act="why-ok">הבנתי</button></div>`;
  return `<div class="screen"><div class="appbar"><div class="ttl">יומן</div><div class="seg"><button data-act="jtab" data-tab="today" class="${tab === 'today' ? 'on' : ''}">היום</button><button data-act="jtab" data-tab="history" class="${tab === 'history' ? 'on' : ''}">היסטוריה</button></div></div>
    <div class="pad">${why}${tab === 'today' ? journalToday(t, streak, moods) : journalHistory()}</div></div>`;
}

function journalToday(t, streak, moods) {
  const today = st.checkins.find((c) => new Date(c.t).toDateString() === new Date(t).toDateString());
  const crave = today?.crave ?? 4;
  const wk = weekStats(st, t);
  const top = triggerCounts(st).slice(0, 4);
  const max = top[0]?.[1] || 1;
  const hours = Array(24).fill(0);
  for (const c of [...st.cravings, ...st.slips]) hours[new Date(c.t).getHours()] += 1;
  const hmax = Math.max(1, ...hours);
  const bars = hours.map((h) => `<i class="${h >= hmax && h > 0 ? 'hi' : ''}" style="height:${Math.max(4, (h / hmax) * 46)}px"></i>`).join('');
  const chart = moodChart();
  const tip = wk.top ? triggerById(wk.top[0]) : null;
  return `${streak ? `<div class="small">רצף צ׳ק-אין: <b style="color:var(--c-ink)">${streak}</b> ${streak === 1 ? 'יום' : 'ימים'}</div>` : ''}
    <div style="padding:12px 0;border-bottom:1px solid var(--c-line)"><div class="h2" style="font-size:16px">איך עבר היום</div><div class="mds" id="moods">${moods}</div>
      <div class="sl" style="margin-top:16px"><div style="display:flex;justify-content:space-between"><span class="eyebrow">עוצמת החשק היום</span><span id="craveV" style="font:600 14px/1 var(--f-text)">${crave} מתוך 10</span></div><div class="tr"><input id="crave" type="range" min="0" max="10" value="${crave}"><div class="th" style="inset-inline-end:${crave * 10}%"></div></div></div>
      <div style="display:flex;gap:10px;margin-top:14px"><input class="input" id="cnote" placeholder="מילה על היום (לא חובה)" value="${esc(today?.note || '')}"><button class="btn primary" data-act="checkin" style="height:48px;padding:0 18px">שמירה</button></div>
    </div>
    <button class="row" data-act="win"><div class="ib">${icon('wave', 19)}</div><div class="t">חשק עבר עכשיו<small>נגיעה אחת. אפשר לדייק אחר כך</small></div>${icon('chevron', 16, 'var(--c-ink-3)')}</button>
    <div class="pk-sec" style="padding-top:8px"><div class="h2" style="font-size:15px">הישגים</div>${badgeRow(['waves', 'journal'])}</div>
    <div style="padding:14px 0;border-bottom:1px solid var(--c-line)"><div class="h2" style="font-size:15px">השבוע שלך</div><div class="k" style="margin-top:8px">חשק בשבוע</div>${weekBars(t)}<p class="small" style="margin-top:6px">${wk.beaten} גלים עברו · ${moneyFig(wk.saved, 0)} נחסכו · ${wk.reached.length} תחנות בגוף</p><p class="small">${esc(wk.trend)}${tip ? ' ' + esc(tip.tip) : ''}</p><button class="btn text" data-act="go" data-go="week">כרטיס השבוע</button></div>
    <div style="padding:14px 0;border-bottom:1px solid var(--c-line)"><div class="h2" style="font-size:15px">מצב רוח וחשק · 14 יום</div><div style="margin-top:8px">${chart}</div></div>
    <div style="padding:14px 0"><div style="display:flex;justify-content:space-between"><div class="h2" style="font-size:15px">מתי החשק מגיע</div></div><div class="hb">${bars}</div><div class="small" style="display:flex;justify-content:space-between;margin-top:4px"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div></div>
    ${top.length ? `<div class="h2" style="font-size:15px">טריגרים שחוזרים</div>${top.map(([id, n]) => `<div style="margin-top:10px"><div class="small">${esc(triggerById(id)?.label || id)} · ${n}</div><div class="trigbar"><i style="width:${Math.round(n / max * 100)}%"></i></div></div>`).join('')}` : `<p class="small">אחרי כמה חשקים שנרשמו, הדפוס יופיע כאן.</p>`}
    ${ad('journal')}`;
}

function moodChart() {
  const rows = st.checkins.slice(-14);
  if (rows.length < 2) return `<p class="small">אחרי שני צ׳ק-אינים יופיע כאן קו.</p>`;
  const W = 320; const H = 110;
  const x = (i) => (rows.length === 1 ? W / 2 : (i * W) / (rows.length - 1));
  const y = (v, max) => H - 10 - (v / max) * (H - 24);
  const mood = rows.map((c, i) => `${x(i).toFixed(1)},${y(c.mood, 5).toFixed(1)}`).join(' ');
  const cr = rows.map((c, i) => `${x(i).toFixed(1)},${y(c.crave, 10).toFixed(1)}`).join(' ');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" role="img"><polyline points="${cr}" fill="none" stroke="var(--c-clay)" stroke-width="2.2"/><polyline points="${mood}" fill="none" stroke="var(--c-hill)" stroke-width="2.2"/></svg><div class="small" style="display:flex;gap:12px;margin-top:6px"><span>מצב רוח</span><span>חשק</span></div>`;
}

function journalHistory() {
  const ev = [
    ...st.checkins.map((c) => ({ t: c.t, icon: 'mood-' + (c.mood || 3), h: `צ׳ק-אין · חשק ${c.crave}/10`, n: c.note })),
    ...st.cravings.filter((c) => c.won).map((c) => ({ t: c.t, icon: 'wave', h: `חשק עבר${c.intensity != null ? ` · ${c.intensity}/10` : ''}`, n: (c.triggers || []).map((id) => triggerById(id)?.label).filter(Boolean).join(', ') })),
    ...st.slips.map((s) => ({ t: s.t, icon: 'slip', h: `רגע קשה${s.cigs ? ` · ${s.cigs}` : ''}${s.restart ? ' · ספירה חדשה' : ' · אותו תאריך'}`, n: s.note })),
  ].sort((a, b) => b.t - a.t).slice(0, 60);
  if (!ev.length) return `<p class="lead" style="margin-top:12px">עוד אין רשומות. חשק שנרשם חוזר כתובנה.</p>`;
  return `<ul style="padding:0;margin:8px 0 0">${ev.map((x) => `<li class="hist"><span>${icon(x.icon, 22, 'var(--c-clay)')}</span><div><div>${esc(x.h)}</div>${x.n ? `<div class="small">${esc(x.n)}</div>` : ''}<div class="small">${esc(new Date(x.t).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }))}</div></div></li>`).join('')}</ul>`;
}

function settings() {
  const s = st.settings;
  const when = s.quitAt ? hebDate(s.quitAt) : 'עוד לא נבחר';
  const mode = s.mode === 'pack' ? 'סיגריות בקופסה' : s.mode === 'ryo' ? 'טבק לגלגול' : 'עוד לא נבחר';
  return `<div class="screen" data-scroll><div class="appbar"><div class="ttl">הגדרות</div></div><div class="pad">
    <div class="pro">${icon('ad-off', 30, 'var(--c-hill)')}<div style="flex:1"><div class="h2" style="font-size:15.5px">${s.adsRemoved ? 'בלי פרסומות' : 'בלי פרסומות'}</div><div class="small">${s.adsRemoved ? 'הרכישה פעילה במכשיר הזה' : 'תשלום חד-פעמי · כל הכלים נשארים בחינם'}</div></div>${s.adsRemoved ? '' : `<button class="btn primary" data-act="buy" style="height:42px;padding:0 14px">${priceLabel()}</button>`}</div>
    <div class="sec">הגמילה שלנו</div>
    ${row('calendar', 'תאריך ההפסקה', when, 'date')}
    ${row('pouch', 'מה עישנו', mode, 'cost')}
    ${row('no-smoke', 'סיגריות ביום', s.cpd ?? '—', 'cpd')}
    ${row('money', 'עלות לסיגריה', s.mode ? ils(ppcOf(s), 2) : '—', 'cost')}
    ${row('goal', 'יעד חיסכון', s.goalPrice ? ils(s.goalPrice, 0) : '—', 'goal')}
    ${row('quote', 'הסיבות והתמונה', String((s.reasons || []).length + (s.photo ? 1 : 0)), 'why')}
    <div class="sec">תצוגה ותחושה</div>
    <div class="row" style="flex-wrap:wrap"><div class="ib">${spot('moon', 32)}</div><div class="t">מראה</div><div class="seg" style="width:100%;margin-top:8px;display:flex"><button data-act="theme" data-theme="light" class="${s.theme === 'light' ? 'on' : ''}" style="flex:1">בהיר</button><button data-act="theme" data-theme="auto" class="${s.theme === 'auto' ? 'on' : ''}" style="flex:1">אוטומטי</button><button data-act="theme" data-theme="dark" class="${s.theme === 'dark' ? 'on' : ''}" style="flex:1">כהה</button></div></div>
    ${toggle('sound', 'sound', 'צלילים', s.sound)}
    ${toggle('vibrate', 'haptics', 'רטט', s.haptics)}
    ${toggle('sparkle', 'celebrate', 'חגיגות והנפשות', s.celebrate, 'מכבד גם את הפחתת התנועה במכשיר')}
    <div class="sec">תזכורות</div>
    ${toggle('bell', 'dailyCheckin', 'צ׳ק-אין יומי', s.dailyCheckin, isNative() ? `בכל ערב ב-${String(s.checkinHour).padStart(2, '0')}:00` : 'באפליקציה המותקנת. בדפדפן אין התראה כשהכרטיסייה סגורה')}
    ${toggle('heart', 'healthNotifs', 'תחנות בגוף', s.healthNotifs, isNative() ? 'כשתחנה נפתחת' : 'זמין באפליקציה המותקנת')}
    <div class="sec">גיבוי</div>
    ${row('export', 'ייצוא גיבוי', '', 'export', 'קובץ אחד, נשלח דרך תפריט השיתוף')}
    ${row('import', 'שחזור מגיבוי', '', 'import')}
    <div class="sec">עזרה ומידע</div>
    ${row('care', 'ליווי בקופות החולים', '', 'hmo', 'סדנאות גמילה ותרופות בסבסוד')}
    ${row('info', 'אודות ומידע רפואי', '', 'about', 'המידע כללי ואינו מחליף ייעוץ רפואי')}
    ${row('shield', 'מדיניות פרטיות', '', 'privacy', 'הנתונים נשמרים רק במכשיר')}
    ${row('restart', 'שחזור רכישה', '', 'restore')}
    ${row('trash', 'מחיקת כל הנתונים', '', 'reset', '', 'var(--c-clay)')}
    <div style="display:flex;justify-content:center;margin-top:18px">${wordmark(14, theme() === 'dark')}</div>
    <div class="small" style="text-align:center;margin:6px 0 12px">${WORDMARK} · 1.0${APP.adsEnabled ? '' : ''}</div>
  </div></div>`;
}

function row(ic, title, value, act, sub = '', color = '') {
  const style = color ? ` style="color:${color}"` : '';
  return `<button class="row" data-act="set" data-set="${act}"><div class="ib"${style}>${icon(ic, 19)}</div><div class="t"${style}>${title}${sub ? `<small>${sub}</small>` : ''}</div>${value ? `<span class="v">${esc(value)}</span>` : ''}${icon('chevron', 16, 'var(--c-ink-3)')}</button>`;
}
function toggle(ic, key, title, on, sub = '') {
  return `<button class="row" data-act="toggle" data-key="${key}"><div class="ib">${icon(ic, 19)}</div><div class="t">${title}${sub ? `<small>${sub}</small>` : ''}</div><div class="tg ${on ? 'on' : ''}"></div></button>`;
}

function share() {
  return `<div class="screen"><div class="appbar"><div style="display:flex;align-items:center;gap:10px"><button class="iconbtn" data-act="back" aria-label="סגירה">${icon('close', 16)}</button><div class="ttl">שיתוף</div></div>${spot('share', 22)}
    <div class="seg"><button data-act="shape" data-shape="story" class="${ui.shareShape === 'story' ? 'on' : ''}">סטורי</button><button data-act="shape" data-shape="square" class="${ui.shareShape === 'square' ? 'on' : ''}">ריבוע</button></div></div>
    <div class="share-prev ${ui.shareShape === 'square' ? 'sq' : ''}"><canvas id="card"></canvas></div>
    <div class="pad"><button class="row" data-act="sharetoggle" data-key="shareMoney"><div class="t">להציג סכום חיסכון</div><div class="tg ${ui.shareMoney ? 'on' : ''}"></div></button>
      <button class="row" data-act="sharetoggle" data-key="shareDots"><div class="t">רשת הנקודות<small>כל נקודה היא סיגריה שלא נדלקה</small></div><div class="tg ${ui.shareDots ? 'on' : ''}"></div></button>
      <p class="small" style="display:flex;gap:8px;align-items:center;margin-top:8px">${icon('lock', 16, 'var(--c-ink-3)')}בלי שם ובלי תאריך. רק המספרים.</p>
      <button class="btn primary" data-act="share-go" style="width:100%;margin-top:16px">${icon('share', 18)}שיתוף התמונה</button></div></div>`;
}

function week() {
  const w = weekStats(st, now());
  const tip = w.top ? triggerById(w.top[0]) : null;
  return `<div class="screen"><div class="appbar"><button class="iconbtn" data-act="back" aria-label="חזרה">${icon('chevron', 16)}</button><div class="ttl">השבוע שלך</div></div>
    <div class="pad"><div class="sum"><div class="eyebrow">כרטיס שאפשר לשתף</div><div class="h1" style="margin-top:8px">${w.beaten} גלים</div><p class="lead">${esc(w.trend)}</p>
      <div class="led" style="margin-top:8px"><div><div class="v">${moneyFig(w.saved, 0)}</div><div class="k">נחסכו</div></div><div><div class="v">${w.reached.length}</div><div class="k">תחנות בגוף</div></div><div><div class="v">${tip ? esc(tip.label) : '—'}</div><div class="k">טריגר חוזר</div></div></div>
      ${tip ? `<p class="small" style="margin-top:10px">${esc(tip.tip)}</p>` : ''}</div>
      <button class="btn primary" data-act="week-share" style="width:100%;margin-top:18px">${icon('share', 18)}שיתוף הכרטיס</button></div></div>`;
}

function slipDone() {
  const dark = theme() === 'dark';
  const days = st.settings.quitAt ? Math.floor((now() - st.settings.quitAt) / DAY) : 0;
  return `<div class="screen"><div style="height:280px">${scene(390, 320, dark, Math.min(8, Math.max(1, days)))}</div>
    <div style="margin-top:-28px;background:var(--c-bg);border-radius:30px 30px 0 0;padding:28px var(--gutter) 24px;min-height:50%"><div class="eyebrow" style="color:var(--c-hill)">נשמר</div><div class="h-display" style="margin-top:8px">השביל לא נמחק</div>
      <p class="lead" style="margin-top:10px">כל השעות בלי עישון עדיין קרו. מעידה היא נתון, לא מחיקה.</p>
      <div class="led"><div><div class="v">${days}</div><div class="k">ימים ברצף הנוכחי</div></div><div><div class="v">${moneyFig(moneyAt(st, now()), 0)}</div><div class="k">נחסכו ברצף</div></div><div><div class="v">${Object.keys(st.unlocked).length}</div><div class="k">הישגים נשמרו</div></div></div>
      <button class="btn primary" data-act="go" data-go="home" style="width:100%;margin-top:18px">חזרה להיום</button>
      <button class="btn ghost" data-act="sos" style="width:100%;margin-top:10px">${spot('breath', 22)}לנשום עכשיו</button>
    </div></div>`;
}

function onboard() {
  const step = ui.obStep;
  const dots = [0, 1, 2, 3].map((i) => `<i class="${i < step - 1 ? 'done' : i === step - 1 ? 'on' : ''}"></i>`).join('');
  const top = step === 0 ? '' : `<div class="topbar"><button class="iconbtn" data-act="ob-back" style="visibility:${step ? 'visible' : 'hidden'}" aria-label="חזרה">${icon('chevron', 18, 'currentColor', 'transform:scaleX(-1)')}</button><div class="steps">${dots}</div><button class="small" data-act="ob-skip">דילוג</button></div>`;
  const body = [obWelcome, obDate, obHabit, obCost, obWhy][step]();
  const label = step === 0 ? 'מתחילים' : step === 4 ? 'יוצאים לדרך' : 'המשך';
  const dis = obBlocked(step) ? ' dis' : '';
  return `<div class="screen ob">${top}<div class="grow">${body}</div><div class="foot"><button class="btn primary${dis}" data-act="ob-next">${label}</button>${step === 0 ? '<div class="note small">יש גיבוי מהעבר? <button data-act="import" style="text-decoration:underline">ייבוא נתונים</button></div>' : ''}</div></div>`;
}

function obBlocked(step) {
  if (step === 1 && !ui.dateMode) return true;
  if (step === 1 && ui.dateMode === 'past' && !ui.dateValue) return true;
  if (step === 2 && (!ui.habitMode || !ui.cpd)) return true;
  return false;
}

function obWelcome() {
  return `<div style="position:relative"><div class="welcome-scene"><img class="ob-hero" src="art/spots/onboarding-hero.webp" alt=""></div><div style="position:absolute;top:calc(8px + env(safe-area-inset-top));left:var(--gutter);right:var(--gutter);display:flex;justify-content:flex-start">${wordmark(18, false)}</div></div>
    <div class="welcome-sheet"><div class="h-display">כל נשימה<br>היא התחלה</div><p class="lead" style="margin-top:12px">מונה גמילה פרטי: זמן, כסף ובריאות. בלי חשבון ובלי שרת. הכול נשאר במכשיר. רישום חשק מראה שהוא נחלש ומתקצר.</p></div>`;
}
function obDate() {
  const past = ui.dateMode === 'past';
  return `<div class="q" style="padding:12px var(--gutter) 0"><div class="eyebrow">שלב 1 מתוך 4</div><div class="h1">מתי הייתה הסיגריה האחרונה?</div><p class="lead">מכאן מתחיל המונה. אפשר לשנות בכל רגע בהגדרות.</p>
    <button class="choice ${ui.dateMode === 'now' ? 'on' : ''}" data-act="date-mode" data-mode="now" style="margin-top:18px"><div class="radio"></div>${icon('sunrise', 26, 'var(--c-clay)')}<div><div class="h2" style="font-size:16px">עכשיו</div><div class="small">מתחילים לספור מהרגע הזה</div></div></button>
    <button class="choice ${past ? 'on' : ''}" data-act="date-mode" data-mode="past" style="margin-top:10px"><div class="radio"></div>${icon('calendar', 26, 'var(--c-clay)')}<div><div class="h2" style="font-size:16px">כבר הפסקנו</div><div class="small">בוחרים תאריך ושעה</div></div></button>
    ${past ? `<div class="field"><label for="qdt">תאריך ושעה</label><div class="input focus"><input id="qdt" type="datetime-local" value="${esc(ui.dateValue || '')}"></div></div>` : ''}
  </div>`;
}
function obHabit() {
  return `<div class="q" style="padding:12px var(--gutter) 0"><div class="eyebrow">שלב 2 מתוך 4</div><div class="h1">איך נראה ההרגל?</div><p class="lead">כדי לחשב כמה כסף וזמן חוזרים.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px">
      <button class="choice ${ui.habitMode === 'pack' ? 'on' : ''}" data-act="habit" data-mode="pack" style="flex-direction:column;align-items:flex-start">${icon('pack', 28, 'var(--c-clay)')}<div><div class="h2" style="font-size:16px">סיגריות בקופסה</div><div class="small">מחיר לקופסה</div></div></button>
      <button class="choice ${ui.habitMode === 'ryo' ? 'on' : ''}" data-act="habit" data-mode="ryo" style="flex-direction:column;align-items:flex-start">${icon('pouch', 28, 'var(--c-clay)')}<div><div class="h2" style="font-size:16px">טבק לגלגול</div><div class="small">טבק, ניירות ופילטרים</div></div></button>
    </div>
    <div class="field"><label>כמה סיגריות ביום, בערך?</label><div class="stepper"><button class="iconbtn" data-act="cpd" data-d="-1" style="width:54px;height:54px;border-radius:16px">${icon('minus', 18)}</button><div class="input ${ui.cpd ? '' : 'empty'}" style="justify-content:center">${ui.cpd || 'למשל 10'}</div><button class="iconbtn" data-act="cpd" data-d="1" style="width:54px;height:54px;border-radius:16px">${icon('plus', 18)}</button></div></div>
    <div class="field"><label>כמה שנים עישנו? <span style="color:var(--c-ink-3)">· לא חובה</span></label><div class="input"><input id="years" inputmode="numeric" placeholder="למשל 12" value="${esc(ui.years || '')}"></div></div>
    ${obBlocked(2) ? '<p class="small" style="margin-top:10px">בוחרים סוג ומספר כדי להמשיך</p>' : ''}
  </div>`;
}
function obCost() {
  const mode = ui.habitMode || 'ryo';
  const p = costParts({ ...st.settings, mode, ...readCostDraft() });
  const total = Object.values(p).reduce((a, b) => a + b, 0);
  const fields = mode === 'pack'
    ? [['packPrice', 'מחיר קופסה', '₪', '40'], ['perPack', 'סיגריות בקופסה', 'יח׳', '20']]
    : [['tobPrice', 'מחיר שקית טבק', '₪', '120'], ['tobGrams', 'גרם בשקית', 'גרם', '40'], ['gpc', 'טבק לסיגריה', 'גרם', '0.5'], ['papPrice', 'חבילת ניירות', '₪', '5'], ['papLeaves', 'ניירות בחבילה', 'יח׳', '50'], ['filPrice', 'שקית פילטרים', '₪', '5'], ['filCount', 'פילטרים בשקית', 'יח׳', '80']];
  return `<div class="q" style="padding:12px var(--gutter) 80px"><div class="eyebrow">שלב 3 מתוך 4 · ${mode === 'pack' ? 'סיגריות בקופסה' : 'טבק לגלגול'}</div><div class="h1">כמה זה עלה?</div>
    <p class="lead">הערכה לפי מחירים נפוצים בישראל, 2026. כדאי לעדכן לפי הקנייה. אין כאן מותג קבוע.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px">${fields.map(([k, l, u, ph]) => `<div class="field" style="margin-top:10px"><label>${l}</label><div class="input"><input data-cost="${k}" inputmode="decimal" placeholder="${ph}" value="${esc(ui.cost?.[k] ?? ph)}"><span class="unit">${u}</span></div></div>`).join('')}</div>
    <div style="margin-top:16px;padding:14px 0;border-top:1px solid var(--c-line);display:flex;justify-content:space-between;align-items:baseline"><div><div class="eyebrow">עלות לסיגריה</div><div class="small">${mode === 'pack' ? 'מחיר קופסה לחלק לכמות' : `טבק ${ils(p.tob || 0, 2)} · ניירות ${p.pap ? ils(p.pap, 2) : '—'} · פילטר ${p.fil ? ils(p.fil, 2) : '—'}`}</div></div><div class="ils-display">${moneyFig(total, 2)}</div></div>
    <p class="small">בלי פילטר או בלי נייר? מאפסים את המחיר.</p>
  </div>`;
}
function readCostDraft() {
  const o = {};
  document.querySelectorAll('[data-cost]').forEach((el) => { o[el.dataset.cost] = el.value; });
  return Object.keys(o).length ? o : (ui.cost || {});
}
function obWhy() {
  return `<div class="q" style="padding:12px var(--gutter) 0"><div class="eyebrow">שלב 4 מתוך 4 · הכול לא חובה</div><div class="h1">מה יחזיק אותנו?</div>
    <p class="lead">ברגע קשה נזכיר את זה. רישום חשק אחר כך מראה שהוא נחלש ומתקצר. אפשר לדלג.</p>
    <div class="field"><label>איך לפנות בברכה?</label><div class="input"><input id="obname" placeholder="שם או כינוי" value="${esc(ui.name || '')}"></div></div>
    <div class="field"><label>בשביל מה מפסיקים?</label><div class="input" style="height:84px;align-items:flex-start"><textarea id="obwhy" placeholder="למשל: לנשום בקלות, להיות שם בשביל המשפחה"></textarea></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label>יעד חיסכון</label><div class="input"><input id="obgoal" placeholder="טיול, מתנה…"></div></div><div class="field"><label>סכום</label><div class="input"><input id="obgoalp" inputmode="numeric" placeholder="0"><span class="unit">₪</span></div></div></div>
    <label class="row" style="margin-top:8px">${icon('camera', 22, 'var(--c-clay)')}<div class="t">תמונה שמחזקת<small>תופיע במסך הנשימה</small></div><input id="obphoto" type="file" accept="image/*" hidden><span>${icon('plus', 18, 'var(--c-ink-2)')}</span></label>
    <div class="small" style="display:flex;gap:8px;align-items:center;margin-top:8px">${icon('shield', 18, 'var(--c-hill)')}הכול נשמר רק במכשיר הזה. אין חשבון ואין שרת.</div>
  </div>`;
}

function overlay() {
  if (ui.overlay === 'slip') return slipSheet();
  if (ui.overlay === 'insight') return insightSheet();
  if (ui.overlay === 'checkin') return checkinSheet();
  if (ui.overlay === 'about') return aboutSheet();
  if (ui.overlay === 'hmo') return hmoSheet();
  if (ui.editor) return editorSheet();
  return '';
}

function slipSheet() {
  const chips = TRIGGERS.map((t) => `<button data-act="slip-trig" data-id="${t.id}" class="${ui.slipTriggers.includes(t.id) ? 'on' : ''}">${t.label}</button>`).join('');
  return `<div class="dim" data-act="overlay-off"></div><div class="panel"><div class="grab"></div>
    <div style="display:flex;gap:12px;align-items:center">${spot('slip', 48)}<div class="h1">רגע קשה. זה קורה.</div></div>
    <p class="lead" style="margin-top:8px">מעידה היא נתון, לא כישלון. שום דבר ממה שהושג לא נמחק.</p>
    <div class="field"><label>כמה סיגריות?</label><div class="stepper"><button class="iconbtn" data-act="slip-n" data-d="-1">${icon('minus', 16)}</button><div class="n">${ui.slipCigs}</div><button class="iconbtn" data-act="slip-n" data-d="1">${icon('plus', 16)}</button></div></div>
    <div class="field"><label>מה היה סביב זה?</label><div class="chips">${chips}</div></div>
    <div class="field"><label>מילה (לא חובה)</label><div class="input"><input id="slipnote" value="${esc(ui.slipNote || '')}"></div></div>
    <button class="choice ${ui.slipMode === 'keep' ? 'on' : ''}" data-act="slip-mode" data-mode="keep" style="margin-top:12px"><div class="radio"></div><div><div class="h2" style="font-size:15px">ממשיכים מאותו תאריך</div><div class="small">הסיגריות יורדות מהספירה. המונה ממשיך.</div></div></button>
    <button class="choice ${ui.slipMode === 'restart' ? 'on' : ''}" data-act="slip-mode" data-mode="restart" style="margin-top:8px"><div class="radio"></div><div><div class="h2" style="font-size:15px">מתחילים ספירה חדשה</div><div class="small">הרצף הקודם נשמר כשיא, יחד עם ההישגים.</div></div></button>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn ghost" data-act="overlay-off" style="flex:.6">ביטול</button><button class="btn primary" data-act="slip-save" style="flex:1">שמירה</button></div>
  </div>`;
}

function insightSheet() {
  const entry = st.cravings.find((c) => c.id === ui.insightId) || st.cravings.at(-1);
  if (!entry) return '';
  const info = insightFor(st, entry);
  const chips = TRIGGERS.map((t) => `<button data-act="log-trig" data-id="${t.id}" class="${(entry.triggers || []).includes(t.id) ? 'on' : ''}">${t.label}</button>`).join('');
  const inten = entry.intensity ?? 5;
  return `<div class="dim" data-act="insight-close"></div><div class="panel"><div class="grab"></div>
    <div class="eyebrow" style="color:var(--c-hill)">גל מספר ${info.wins}</div>
    <div class="h1" style="margin-top:6px">${esc(info.title)}</div>
    <p class="lead" style="margin-top:8px">${esc(info.body)}</p>
    <div class="sl" style="margin-top:14px"><div style="display:flex;justify-content:space-between"><span class="eyebrow">עוצמה</span><b>${inten}/10</b></div><div class="tr"><input id="logint" type="range" min="0" max="10" value="${inten}"><div class="th" style="inset-inline-end:${inten * 10}%"></div></div></div>
    <div class="chips" style="margin-top:12px">${chips}</div>
    <div class="field"><div class="input"><input id="lognote" placeholder="מילה (לא חובה)" value="${esc(entry.note || '')}"></div></div>
    <button class="btn primary" data-act="insight-close" style="width:100%;margin-top:12px">הבנתי</button>
    <button class="btn text" data-act="undo-win" style="margin:8px auto 0">ביטול הרישום</button>
  </div>`;
}

function checkinSheet() {
  const streak = checkinStreak(st, now());
  const moods = [1, 2, 3, 4, 5].map((k) => `<button class="md" data-act="checkin-tap" data-m="${k}">${icon('mood-' + k, 30)}</button>`).join('');
  return `<div class="dim" data-act="overlay-off"></div><div class="panel" style="top:28vh"><div class="grab"></div>
    <div class="h1">איך עבר היום</div><p class="lead">נגיעה אחת. הרצף נשמר, ואפשר לראות אם הימים נעשים קלים יותר.</p>
    <div class="mds">${moods}</div>
    <p class="small" style="margin-top:14px;text-align:center">רצף נוכחי: ${streak}</p></div>`;
}

function aboutSheet() {
  return `<div class="dim" data-act="overlay-off"></div><div class="panel"><div class="grab"></div><div class="h1">אודות</div>
    <p class="lead" style="margin-top:8px">${WORDMARK} הוא מונה גמילה פרטי. המידע הבריאותי כללי, לפי גופי בריאות ציבוריים (WHO, CDC, NHS, NICE, NCI). הוא לא ייעוץ רפואי ולא מחליף רופא או קופת חולים.</p>
    <p class="small" style="margin-top:8px">"כ-11 דקות חיים לסיגריה" היא הערכה נפוצה בלבד, ואפשר לשנות אותה.</p>
    <p class="small" style="margin-top:8px">לקריאה נוספת: American Cancer Society, American Lung Association.</p>
    ${isNative() ? '' : '<p class="small" style="margin-top:8px">זו גרסת דפדפן. תזכורות, רטט מלא ורכישת הסרת פרסומות זמינים באפליקציה המותקנת. פרסומות לא מוצגות כאן.</p>'}
    <button class="btn primary" data-act="overlay-off" style="width:100%;margin-top:16px">סגירה</button></div>`;
}
function hmoSheet() {
  const rows = [['כללית', 'לשאול על סדנאות גמילה וטיפול תרופתי'], ['מכבי', 'לשאול על סדנאות גמילה וטיפול תרופתי'], ['מאוחדת', 'לשאול על סדנאות גמילה וטיפול תרופתי'], ['לאומית', 'לשאול על סדנאות גמילה וטיפול תרופתי']];
  return `<div class="dim" data-act="overlay-off"></div><div class="panel"><div class="grab"></div><div class="h1">ליווי בקופות</div>
    <p class="lead">קופות החולים מציעות סדנאות גמילה ותרופות בסבסוד. זה לא במקום הליווי שלהן.</p>
    ${rows.map(([n, s]) => `<div class="row"><div class="ib">${icon('care', 18)}</div><div class="t">${n}<small>${s}</small></div></div>`).join('')}
    <p class="small">פונים לקופה ומבקשים שירותי גמילה מעישון. אפשר גם לפנות למוקד של משרד הבריאות.</p>
    <button class="btn primary" data-act="overlay-off" style="width:100%;margin-top:12px">סגירה</button></div>`;
}

function editorSheet() {
  const ed = ui.editor;
  let inner = '';
  if (ed === 'date') inner = `<div class="h1">תאריך ההפסקה</div><div class="field"><div class="input"><input id="edit-date" type="datetime-local" value="${toLocal(st.settings.quitAt || now())}"></div></div>`;
  if (ed === 'cpd') inner = `<div class="h1">סיגריות ביום</div><div class="field"><div class="input"><input id="edit-cpd" inputmode="decimal" value="${esc(st.settings.cpd ?? '')}"></div></div><div class="field"><label>דקות חיים לסיגריה (הערכה)</label><div class="input"><input id="edit-mpc" inputmode="numeric" value="${st.settings.mpc}"></div></div>`;
  if (ed === 'goal') inner = `<div class="h1">יעד חיסכון</div><div class="field"><div class="input"><input id="edit-goal" placeholder="שם היעד" value="${esc(st.settings.goalName || '')}"></div></div><div class="field"><div class="input"><input id="edit-goalp" inputmode="numeric" placeholder="סכום" value="${st.settings.goalPrice || ''}"><span class="unit">₪</span></div></div>`;
  if (ed === 'why') inner = `<div class="h1">סיבות</div><div class="field"><div class="input" style="height:100px"><textarea id="edit-why">${esc((st.settings.reasons || []).join('\n'))}</textarea></div></div><label class="row">תמונה<input id="edit-photo" type="file" accept="image/*" hidden></label>${st.settings.photo ? '<button class="btn text" data-act="clear-photo">הסרת התמונה</button>' : ''}`;
  if (ed === 'cost') inner = costEditor();
  return `<div class="dim" data-act="overlay-off"></div><div class="panel"><div class="grab"></div>${inner}<button class="btn primary" data-act="editor-save" style="width:100%;margin-top:16px">שמירה</button></div>`;
}

function costEditor() {
  const s = st.settings;
  const mode = s.mode || 'ryo';
  const f = (k, l, u) => `<div class="field"><label>${l}</label><div class="input"><input data-cost="${k}" value="${esc(s[k] ?? '')}"><span class="unit">${u}</span></div></div>`;
  return `<div class="h1">עלות</div><div class="seg" style="margin:10px 0"><button data-act="setmode" data-mode="ryo" class="${mode === 'ryo' ? 'on' : ''}">טבק לגלגול</button><button data-act="setmode" data-mode="pack" class="${mode === 'pack' ? 'on' : ''}">קופסה</button></div>
    ${mode === 'pack' ? f('packPrice', 'מחיר קופסה', '₪') + f('perPack', 'סיגריות בקופסה', 'יח׳') : f('tobPrice', 'מחיר שקית', '₪') + f('tobGrams', 'גרם בשקית', 'גרם') + f('gpc', 'גרם לסיגריה', 'גרם') + f('papPrice', 'ניירות', '₪') + f('papLeaves', 'כמות ניירות', 'יח׳') + f('filPrice', 'פילטרים', '₪') + f('filCount', 'כמות פילטרים', 'יח׳')}`;
}

function toLocal(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function livePatch() {
  const t = now();
  const q = st.settings.quitAt;
  const elapsed = q ? Math.max(0, t - q) : 0;
  const has = !!(q && st.settings.cpd);
  const money = has ? moneyAt(st, t) : null;
  const parts = moneySplit(money);
  const cigsN = has ? Math.floor(cigsAt(st, t)) : null;
  const life = lifeParts((has ? cigsAt(st, t) : 0) * (st.settings.mpc || 11));
  const days = Math.floor(elapsed / DAY);
  const rolls = {
    money: parts.whole,
    agorot: parts.agorot,
    days: String(days),
    clock: q ? fmtClock(elapsed % DAY) : '00:00:00',
    cigs: cigsN == null ? '—' : nf(cigsN, 0),
    proj: nf(futureValue(savedNow(t), monthlyRate(), investRate(), 10), 0),
    life: life.n,
    daysa: days === 1 ? 'יום' : 'ימים',
    ciga: cigsN === 1 ? 'סיגריה' : 'סיגריות',
    lifea: life.a,
    lifeb: life.b,
  };
  for (const el of document.querySelectorAll('[data-roll]')) {
    const next = rolls[el.dataset.roll];
    if (next != null) rollInto(el, next);
  }
  for (const el of document.querySelectorAll('[data-live]')) {
    const next = rolls[el.dataset.live];
    if (next == null || el.children.length) continue;
    if (el.textContent !== next) el.textContent = next;
  }
}

export { MESSAGES };
