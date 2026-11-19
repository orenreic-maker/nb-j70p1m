import { icon } from './icons.js';
import { BREATH, KINDS, KIND_ORDER, LIMITS, PRESETS, currentBreath, cycleOf, longHolds, patternText, problems, toRunner } from './breath.js';
import { mark, scene, wordmark, WORDMARK } from './scene.js';
import { livingScene, stageFor } from './living.js';
import { hasSpot, spot, tabIcon } from './art.js';
import { now, save, st } from './store.js';
import { ui } from './ui-state.js';
import {
  DAY, MONTH, YEAR, cigsAt, esc, fmtClock, fmtDur, futureValue, greet, hebDate,
  ils, keepSlips, lastSmokeAt, moneyAt, nf, ppcOf, prevMoney, triggerCounts, checkinStreak, longestAt,
} from './calc.js';
import { HEALTH, SYSTEMS, withSlips } from './health.js';
import { ACH, GROUPS, achVal } from './achievements.js';
import { MESSAGES, TRIGGERS, TIPS, g, triggerById } from './copy.js';
import { bindOnboard, dateFieldHtml, onboardScreen, productFields } from './onboard-view.js';
import { checkText } from './filter.js';
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
  return `<span class="ils"><bdi dir="ltr">${num}<span class="shekel"> ₪</span></bdi></span>`;
}
function shekelHtml(n, d = 0) { return moneyFig(n, d); }

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
  return `<div class="cheer" role="status">${face}<span>${esc(g('כל הכבוד, אתה בדרך', 'כל הכבוד, את בדרך', 'כל הכבוד, ממשיכים בדרך'))} · ${esc(title)}</span></div>`;
}

let lastRoute = '';
let introFrame = 0;

export function render() {
  cancelAnimationFrame(introFrame);
  const app = $app();
  const sameRoute = lastRoute === ui.route;
  const prev = app.querySelector('[data-scroll]') || app.querySelector('.screen');
  const kept = sameRoute && prev ? prev.scrollTop : 0;
  const dark = theme() === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = dark ? '#151B17' : '#F6EFE3';
  document.documentElement.classList.toggle('reduce', !st.settings?.celebrate || matchMedia('(prefers-reduced-motion: reduce)').matches);
  const enterHealth = ui.route === 'health' && lastRoute !== 'health';
  lastRoute = ui.route;
  app.innerHTML = view();
  const sc = app.querySelector('[data-scroll]') || app.querySelector('.screen');
  if (sc) {
    const top = sameRoute ? kept : (ui.scroll || 0);
    if (top) sc.scrollTop = top;
  }
  if (ui.route === 'home' || ui.route === 'pocket') {
    for (const el of document.querySelectorAll('[data-roll]')) rollInto(el, el.textContent);
  }
  if (ui.route === 'home') {
    bindLiving();
    noteStage();
  }
  if (enterHealth) introFrame = requestAnimationFrame(() => runHealthIntro());
  if (ui.route === 'onboard' && ui.obStep === 0) startWelcomeTease();
  else stopWelcomeTease();
  if (ui.route === 'onboard') bindOnboard();
  if (ui.route === 'breathedit') bindPhaseDrag();
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

/** d3–d6 from the integer digits only, so the font can shrink without moving the axis. */
function digitClass(whole) {
  const n = String(whole).replace(/\D/g, '').length;
  if (n >= 6) return ' d6';
  if (n >= 5) return ' d5';
  if (n >= 4) return ' d4';
  return ' d3';
}

/** The integer is the only in-flow box. Shekel and agorot hang off its trailing side. */
function moneyCluster(whole, agorot) {
  return `<div class="fig num-ltr${digitClass(whole)}"><span class="anchor"><bdi dir="ltr" class="main" data-roll="money">${whole}</bdi><span class="tails"><bdi dir="ltr" class="agorot" data-roll="agorot">${agorot}</bdi><span class="shekel">₪</span></span></span></div>`;
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
    case 'onboard': return `${onboard()}${toast()}`;
    case 'sos': return `${sos()}${overlay()}${toast()}`;
    case 'health': return screen(health(), 'health');
    case 'badges': return screen(badges(), 'pocket');
    case 'pocket': return screen(pocket(), 'pocket');
    case 'stats': return screen(stats(), 'home');
    case 'journal': return screen(journal(), 'journal');
    case 'settings': return screen(settings(), 'settings');
    case 'share': return share();
    case 'week': return week();
    case 'slipdone': return slipDone();
    case 'breathedit': return `${breathEditor()}${breathMenu()}${breathDelete()}${toast()}`;
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
  const kept = keepSlips(st);
  const sinceSmoke = q ? Math.max(0, t - lastSmokeAt(st)) : 0;
  const hs = q ? withSlips(elapsed, sinceSmoke) : [];
  const nowSteps = hs.filter((h) => h.status === 'now').sort((a, b) => (a.at - a.e) - (b.at - b.e));
  const doneSteps = hs.filter((h) => h.status === 'done');
  const next = q ? nowSteps[0] : null;
  const latest = doneSteps.length ? doneSteps[doneSteps.length - 1] : null;
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
  const dayA = days === 1 ? 'יום' : 'ימים';
  const cigA = cigs === 1 ? 'סיגריה' : 'סיגריות';
  const healthLine = next
    ? `<button class="slim" data-act="go" data-go="health">${ring(next.pct || 0)}<span class="col"><span class="one">${esc(next.title)}</span><span class="sub">בעוד ${fmtDur(Math.max(0, next.at - (next.e ?? elapsed)), 1)}</span></span><i class="slimbar" aria-hidden="true"><b style="width:${Math.max(4, Math.round((next.pct || 0) * 100))}%"></b></i></button>`
    : `<button class="slim" data-act="go" data-go="health">${ring(1)}<span class="col"><span class="one">${latest ? esc(latest.title) : 'הגוף'}</span></span></button>`;
  const goalLine = goal
    ? `<button class="slim" data-act="editor" data-ed="goal">${spot('jar', 36)}<span class="col"><span class="one">${esc(st.settings.goalName || 'יעד חיסכון')}</span><span class="sub">${moneyFig(have, 0)} מתוך ${moneyFig(goal, 0)}</span></span><i class="slimbar${gp > 0 && gp < 0.08 ? ' seed' : ''}" aria-hidden="true"><b style="width:${(Math.max(gp * 100, gp > 0 ? 6 : 0)).toFixed(1)}%"></b></i></button>`
    : `<button class="slim" data-act="editor" data-ed="goal">${spot('goal', 36)}<span class="one">יעד חיסכון</span></button>`;
  const keptCigs = kept.reduce((a, x) => a + (+x.cigs || 0), 0);
  const slipLine = kept.length
    ? `<button class="slim" data-act="open-slips">${spot('sprout', 36)}<span class="col"><span class="one">${fmtDur(sinceSmoke, 2)} מאז הסיגריה האחרונה</span><span class="sub">${keptCigs === 1 ? 'סיגריה אחת' : `${nf(keptCigs, 0)} סיגריות`} מאז ההפסקה · ${kept.length === 1 ? 'מעידה אחת' : `${kept.length} מעידות`} ביומן</span></span>${icon('chevron', 16, 'var(--c-ink-3)')}</button>`
    : '';
  return `<div class="home screen">
    <header class="home-hero">
      <div class="home-art living${dark ? ' dark' : ''}" data-stage="${stage.id}">${scene.html}</div>
      <div class="stage-tag">יום ${days} · ${stage.label}</div>
      <div class="brandrow">${wordmark(15, dark)}<button class="iconbtn" style="background:transparent" data-act="go" data-go="share" aria-label="שיתוף">${spot('share', 28) || icon('share', 20)}</button></div>
      <button class="pocket" data-act="go" data-go="pocket">
        ${moneyCluster(parts.whole, parts.agorot)}
        <div class="k">נשארו בכיס</div>
      </button>
    </header>
    <div class="home-body">
      ${st.settings.name ? `<p class="hello">${esc(greet(t))}, ${esc(st.settings.name)}</p>` : ''}
      <div class="meters">
        <button class="m" data-act="go" data-go="pocket"><bdi dir="ltr" class="num" data-roll="days">${days}</bdi><div class="u"><span data-live="daysa">${dayA}</span><span>${kept.length ? 'מאז ההפסקה' : 'בלי עישון'}</span></div><bdi dir="ltr" class="clk" data-roll="clock">${q ? fmtClock(elapsed % DAY) : '00:00:00'}</bdi></button>
        <button class="m" data-act="go" data-go="pocket"><bdi dir="ltr" class="num${String(cigs ?? '').length > 3 ? ' long' : ''}" data-roll="cigs">${cigs == null ? '—' : nf(cigs, 0)}</bdi><div class="u"><span data-live="ciga">${cigA}</span><span>שלא עישנת</span></div></button>
        <button class="m" data-act="go" data-go="pocket"><bdi dir="ltr" class="num${life.n.length > 4 ? ' long' : ''}" data-roll="life">${life.n}</bdi><div class="u"><span data-live="lifea">${life.a}</span><span data-live="lifeb">${life.b}</span></div></button>
      </div>
      ${slipLine}
      ${healthLine}
      ${goalLine}
      <div class="home-foot">
      <button class="sos" data-act="sos"><span class="w">${spot('breath', 36)}</span><span class="sos-copy"><span class="t1">נושמים יחד</span><span class="t2">עשר דקות, והגל עובר</span></span>${icon('chevron', 18, 'currentColor', 'margin-inline-start:auto;opacity:.7')}</button>
      <div class="acts">
        <button data-act="win">${icon('wave', 22, 'var(--c-hill)')}<span>רישום חשק</span></button>
        <button data-act="open-checkin">${icon('check-in', 22, 'var(--c-hill)')}<span>איך עבר היום</span></button>
        <button data-act="slip" class="sl">${icon('slip', 22, 'var(--c-clay)')}<span>רישום מעידה</span></button>
      </div>
      ${ad('home')}
      </div>
    </div>
  </div>`;
}

const WORTH = [
  { name: 'ארוחה משפחתית', price: 250, art: 'spot-meal' },
  { name: 'מיכל דלק', price: 400, art: 'spot-fuel' },
  { name: 'יום כיף לילדים', price: 800, art: 'spot-funday' },
  { name: 'סוף שבוע', price: 2000, art: 'spot-getaway' },
  { name: 'חופשה', price: 6000, art: 'spot-vacation' },
];
const GROWTH_RATE = 0.07;

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

function badgeRow(groups) {
  const items = ACH.filter((a) => groups.includes(a.group));
  return `<div class="badgelets">${items.map((a) => {
    const on = !!st.unlocked[a.id];
    return `<button class="badgelet ${on ? 'on' : ''}" data-act="ach" data-id="${a.id}">${spot('medal', 40)}<span>${esc(a.t)}</span></button>`;
  }).join('')}</div>`;
}

function rateText(n) {
  return n < 100 ? nf(n, 1) : nf(Math.round(n), 0);
}

function hourText(day) {
  const h = day / 24;
  if (h < 10) return nf(h, 2);
  if (h < 100) return nf(h, 1);
  return nf(Math.round(h), 0);
}

function timesPhrase(times) {
  const k = Math.floor(times);
  if (k <= 0) return '';
  if (k === 1) return 'כבר פעם אחת';
  if (k === 2) return 'כבר פעמיים';
  return `כבר ${k} פעמים`;
}

function arcRing(size, p, done) {
  const sw = 3;
  const r = (size - sw) / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, p || 0));
  const dash = done ? c : c * clamped;
  const col = done ? 'var(--c-hill)' : 'var(--c-apricot)';
  const mid = size / 2;
  return `<svg class="arc" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="var(--c-line)" stroke-width="${sw}"/><circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${(c - dash).toFixed(2)}" transform="rotate(-90 ${mid} ${mid})"/></svg>`;
}

function pocketSpot(name, size) {
  const base = `art/pocket/spots/${name}.webp`;
  const x2 = `art/pocket/spots/${name}@2x.webp`;
  return `<img class="spot" alt="" width="${size}" height="${size}" src="${base}" srcset="${base} 1x, ${x2} 2x">`;
}

/** Dedicated jar + olive sapling. Canvas px in hero.json, divided by 3. */
function pocketStage() {
  const layers = [
    ['sky day', '00-sky', 0, 0, 1170, 1080],
    ['sky dusk', '00-sky-dusk', 0, 0, 1170, 1080],
    ['glow sun', '10-sun-glow', 245, 20, 680, 680],
    ['sun', '11-sun-disc', 415, 190, 340, 340],
    ['cloud a', '20-cloud-2', 70, 150, 220, 161],
    ['cloud b', '20-cloud-3', 960, 330, 160, 129],
    ['bird a', '25-bird-1', 300, 110, 54, 60],
    ['bird b', '25-bird-2', 232, 165, 40, 37],
    ['hills', '30-hills', 0, 0, 1170, 1080],
    ['jar', '40-jar', 445, 135, 279, 600],
  ];
  return `<div class="pk-stage" aria-hidden="true">${layers.map(([cls, file, x, y, w, h]) => `<img class="ly ${cls}" alt="" src="art/pocket/hero/${file}.webp" style="left:${x / 3}px;top:${y / 3}px;width:${w / 3}px;height:${h / 3}px">`).join('')}</div>`;
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
  const monthly = monthlyRate();
  const horizon = [5, 10, 20].includes(ui.horizon) ? ui.horizon : 10;
  const big = futureValue(saved, monthly, GROWTH_RATE, horizon);
  const goal = st.settings.goalPrice || 0;
  const gp = goal ? saved / goal : 0;
  const projText = nf(big, 0);
  const moneyAch = ACH.filter((a) => a.group === 'money');
  const earned = moneyAch.filter((a) => st.unlocked[a.id]).length;
  const nextId = moneyAch.find((a) => !st.unlocked[a.id])?.id;
  const rates = [
    ['ליום', day],
    ['לשבוע', day * 7],
    ['לחודש', day * MONTH / DAY],
    ['לשנה', day * YEAR / DAY],
  ];
  const plants = [
    [5, 'growth-1', 64],
    [10, 'growth-2', 86],
    [20, 'growth-3', 104],
  ];
  const goalCard = goal
    ? `<button class="gcard" data-act="editor" data-ed="goal">${pocketSpot('spot-goal-jar', 64)}<span class="gmid"><span class="gname">${esc(st.settings.goalName || 'יעד חיסכון')}</span><span class="gbar"><i style="width:${Math.min(100, gp * 100).toFixed(1)}%"></i></span><span class="gsub">${shekelHtml(Math.floor(saved), 0)} מתוך ${shekelHtml(goal, 0)}</span></span><bdi dir="ltr" class="gpct">${Math.round(gp * 100)}%</bdi></button>`
    : `<button class="gcard empty" data-act="editor" data-ed="goal">${pocketSpot('spot-goal-jar', 64)}<span class="gname">בחרו יעד חיסכון</span></button>`;
  return `<div class="screen money-screen">
    <header class="pk-hero">
      ${pocketStage()}
      <h1 class="pk-title">הכיס</h1>
      <div class="pk-money">
        ${moneyCluster(parts.whole, parts.agorot)}
        <p class="pk-hour">נשארו בכיס · <span class="hot">עוד <bdi dir="ltr"><span data-live="hour">${hourText(day)}</span><span class="shekel">₪</span></bdi> בכל שעה</span></p>
      </div>
    </header>
    <p class="facts"><bdi dir="ltr" class="n" data-roll="cigs">${nf(cigs, 0)}</bdi> סיגריות שלא נדלקו • <bdi dir="ltr" class="n" data-live="pouches">${nf(units.n, 1)}</bdi> ${units.label === 'קופסאות' ? 'קופסאות' : 'שקיות טבק'}</p>
    <div class="rates">${rates.map(([label, n], i) => `<div class="cell"><span class="lbl">${label}</span><bdi dir="ltr" class="amt"><span data-live="rate${i}">${rateText(n)}</span><span class="shekel">₪</span></bdi></div>`).join('')}</div>
    <div class="pk-block">
      <div class="pk-hd"><h2>הישגי כיס</h2><div class="aside">${earned} מתוך ${moneyAch.length} · <button data-act="go" data-go="badges">כל ההישגים</button></div></div>
      <div class="pk-medals">${moneyAch.map((a) => {
        const on = !!st.unlocked[a.id];
        const p = Math.max(0, Math.min(1, achVal(a, st, t) / a.v));
        const status = on ? 'got' : a.id === nextId ? 'next' : 'lock';
        return `<button class="pk-medal ${status}" data-act="ach" data-id="${a.id}"><span class="box">${status === 'next' ? arcRing(58, p, false) : ''}${spot('medal', 46)}</span><span class="lab">${shekelHtml(a.v, 0)}</span></button>`;
      }).join('')}</div>
      <div class="pk-hd"><h2>מה זה שווה</h2><button class="edit" data-act="editor" data-ed="goal">עריכה</button></div>
      ${goalCard}
      ${WORTH.map((w) => {
        const p = Math.min(1, saved / w.price);
        const reached = saved >= w.price;
        const sub = reached
          ? `${shekelHtml(w.price, 0)} · ${timesPhrase(saved / w.price)}`
          : `${shekelHtml(w.price, 0)} · עוד ${shekelHtml(Math.max(0, w.price - saved), 0)}`;
        const stat = reached
          ? `<span class="ok" aria-label="הושג"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg></span>`
          : `<bdi dir="ltr">${Math.round(p * 100)}%</bdi>`;
        return `<div class="wrow"><div class="wring">${arcRing(64, p, reached)}${pocketSpot(w.art, 50)}</div><div class="wmeta"><div class="t">${w.name}</div><div class="s${reached ? ' got' : ''}">${sub}</div></div><div class="wstat">${stat}</div></div>`;
      }).join('')}
      <div class="pk-hd"><h2>אם זה היה מושקע</h2></div>
      <div class="grow-wrap"><div class="pk-grow num-ltr"><span class="anchor"><bdi dir="ltr" class="main" data-roll="proj">${projText}</bdi><span class="tails"><span class="shekel">₪</span></span></span></div></div>
      <p class="grow-cap">בעוד ${horizon} שנים, אם כל חודש נכנס למדד רחב</p>
      <div class="plants">${plants.map(([y, art, h]) => {
        const v = futureValue(saved, monthly, GROWTH_RATE, y);
        return `<button class="plant${y === horizon ? ' on' : ''}" data-act="horizon" data-y="${y}"><img alt="" src="art/pocket/spots/${art}.webp" style="height:${h}px"><span class="y">${y} שנים</span><span class="v"><bdi dir="ltr"><span data-live="fv${y}">${nf(v, 0)}</span><span class="shekel">₪</span></bdi></span></button>`;
      }).join('')}</div>
      <p class="note">בהנחת תשואה של כ-7% בשנה, הממוצע ההיסטורי של מדדים רחבים. להמחשה בלבד, לא ייעוץ השקעות.</p>
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
  const ex = currentBreath(st);
  const run = toRunner(ex);
  const sp = ui.shotPhase || { i: 0, left: run[0]?.[1] || 4, clock: '10:00' };
  const scale = run[sp.i]?.[2] ?? 1;
  const reason = (st.settings.reasons || [])[0];
  const photo = st.settings.photo
    ? `<div class="ph"><img alt="" src="${st.settings.photo}"></div>`
    : `<div class="ph">${icon('quote', 22, 'var(--c-hill)')}</div>`;
  return `<div class="sos-screen screen" style="--sos-top:${top};--sos-on:${on}">
    <div class="topbar"><div><div class="h1">${esc(g('אתה חזק מהגל הזה', 'את חזקה מהגל הזה', 'הגל הזה יעבור'))}</div><p class="lead" style="margin-top:6px">${esc(g('מוכן?', 'מוכנה?', 'מתחילים?'))} עוקבים אחרי הצורה. כשהיא גדלה — שואפים.</p></div>
      <button class="iconbtn" data-act="sos-close" aria-label="סגירה">${icon('close', 16)}</button></div>
    <div class="wrap" style="margin-top:14px"><button class="bx-chip" data-act="breaths">${icon('breath', 18, 'var(--c-hill)')}<span class="n">${esc(ex.name)}</span><span class="p">${patternText(ex)}</span><span class="ch">החלפה</span></button></div>
    <div class="stage" aria-hidden="true"><svg viewBox="0 0 340 340"><g class="blobs" style="transform:scale(${scale})"><path d="${BREATH.b1}" fill="${cols[0]}" opacity=".22"/><path d="${BREATH.b2}" fill="${cols[1]}" opacity=".45"/><path d="${BREATH.b3}" fill="${cols[2]}"/></g></svg>
      <div class="mid"><div class="ph" data-live="phase">${esc(run[sp.i]?.[0] || 'שאיפה')}</div><div class="c" data-live="phaseleft">${sp.left === 1 ? 'עוד שנייה' : `עוד ${sp.left} שניות`}</div></div></div>
    <div class="stp">${run.map(([n, s], i) => `<span data-phase="${i}" class="${i === sp.i ? 'on' : ''}">${n} · ${s}</span>`).join('')}</div>
    <div class="wrap"><div class="timer" style="margin-top:12px"><div style="display:flex;justify-content:space-between"><div class="num-ltr" data-live="sosclock" style="font:500 30px/1 var(--f-text)">${esc(sp.clock)}</div><div class="small">דקות שנשארו לגל</div></div>
      <svg class="sos-wave" width="100%" height="28" viewBox="0 0 334 28"><polyline points="${BREATH.wave}" fill="none" stroke="var(--c-line)" stroke-width="2"/><polyline data-live="wave" points="${BREATH.wave}" fill="none" stroke="var(--c-clay)" stroke-width="2.4" stroke-dasharray="${ui.shotPhase ? Math.round((1 - ((+sp.clock.split(':')[0] * 60) + +sp.clock.split(':')[1]) / 600) * 334) : 0} 2000"/></svg></div>
      ${reason ? `<div class="why">${photo}<div><div class="eyebrow" style="color:var(--c-clay)">הסיבה שלי</div><div style="font:400 14.5px/1.4 var(--f-text);margin-top:3px">${esc(reason)}</div></div></div>` : ''}
      <div class="why">${icon('drop', 22, 'var(--c-clay)')}<div class="small" data-live="tip">${esc(TIPS[0])}</div></div>
    </div>
    <div class="sos-foot"><button class="btn primary" data-act="sos-won" style="width:100%">${icon('growth', 20)}עברתי את זה</button>
      <button class="btn text" data-act="sos-slip" style="margin:10px auto 0">בכל זאת עישנתי · רישום מעידה</button></div>
  </div>`;
}

function health() {
  const t = now();
  const q = st.settings.quitAt;
  const elapsed = q ? Math.max(0, t - q) : 0;
  const kept = keepSlips(st);
  const smokeAt = q ? lastSmokeAt(st) : 0;
  const all = withSlips(elapsed, q ? Math.max(0, t - smokeAt) : 0);
  const nowItems = all.filter((h) => h.status === 'now').sort((a, b) => (a.at - a.e) - (b.at - b.e));
  const doneAll = all.filter((h) => h.status === 'done');
  const sum = { next: nowItems[0] || null, doneCount: doneAll.length, total: all.length };
  const list = all.filter((h) => ui.healthFilter === 'all' || h.system === ui.healthFilter);
  const done = list.filter((h) => h.status === 'done');
  const rest = list.filter((h) => h.status !== 'done');
  const hidden = !!st.settings.hideDoneHealth;
  const showDone = hidden ? [] : done;
  const next = sum.next;
  const latest = doneAll[doneAll.length - 1];
  const whenTxt = smokeAt ? new Date(smokeAt).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const slipNote = kept.length
    ? `<button class="slipnote" data-act="open-slips">${spot('sprout', 30)}<span><b>מעידה ב־${esc(whenTxt)}</b>. שלבי 72 השעות הראשונות נבנים מחדש ממנה. השלבים הארוכים ממשיכים מיום ההפסקה.</span></button>`
    : '';
  const fold = done.length
    ? `<button class="fold" data-act="hpast">${hidden ? `הצגת ${done.length} שלבים שהושגו` : 'הסתרת שלבים שהושגו'}</button>`
    : '';
  return `<div class="screen health">
    <div class="appbar"><div class="ttl">הגוף מתאושש</div><div class="eyebrow" style="text-align:end">${sum.doneCount} מתוך ${sum.total}<br>שלבים</div></div>
    <p class="lead" style="padding:4px var(--gutter) 0">מה קורה בגוף מאז הסיגריה האחרונה. הערכות כלליות, לא ייעוץ רפואי.</p>
    ${slipNote}<div class="sum"><div class="eyebrow">מה קורה בגוף עכשיו</div>
      <div class="h2" style="font-size:16px;margin-top:6px">${next ? esc(next.title) : latest ? esc(latest.title) : 'המונה עוד לא התחיל.'}</div>
      ${next ? `<div class="small" style="margin-top:6px">התחנה הבאה · ${esc(next.when)}${next.cont && kept.length ? ' מהמעידה' : ''} · בעוד ${fmtDur(Math.max(0, next.at - next.e), 1)}</div><div class="pb" style="margin-top:10px"><i style="width:${Math.round((next.pct || 0) * 100)}%"></i></div>` : `<div class="small" style="margin-top:6px">כל התחנות שבמאגר כבר מאחור.</div>`}
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
  const smoke = q ? lastSmokeAt(st) : q;
  const base = h.cont ? smoke : q;
  const ts = done && base != null ? base + h.at : null;
  const got = ts ? hebDate(ts) : '';
  const again = !!h.again;
  const first = again && q ? `${new Date(q + h.at).getDate()}.${new Date(q + h.at).getMonth() + 1}` : '';
  const regained = done && h.cont && q && smoke > q && q + h.at < smoke;
  const node = done
    ? `<div class="nd done">${icon('check', 14, 'var(--c-bg)', 2.2)}</div>`
    : h.status === 'now'
      ? `<div class="nd now">${ring(h.pct || 0)}</div>`
      : `<div class="nd next"></div>`;
  const ic = h.status === 'next' ? 'var(--c-ink-3)' : 'var(--c-clay)';
  const mark = `${h.status === 'now' ? '<b class="tag">עכשיו</b>' : done ? '<b class="tag got">הושג</b>' : ''}${again ? '<b class="tag re">נבנה מחדש</b>' : ''}`;
  const glyph = hasSpot(h.icon) ? spot(h.icon, 28) : icon(h.icon, 16, ic);
  return `<div class="it ${h.status}">${node}<div class="tx"><div class="w">${glyph}<span>${esc(h.when)}</span>${mark}</div><div class="t">${esc(h.title)}</div>${got ? `<div class="gotwhen">${regained ? 'הושג שוב' : 'הושג'} · ${esc(got)}</div>` : ''}${first ? `<div class="gotwhen re">הושג לראשונה ב־${esc(first)} · נבנה שוב מהמעידה</div>` : ''}<button class="srcbtn" data-act="link" data-url="${esc(h.url)}">מקור: ${esc(h.source)}</button>${h.status === 'now' ? `<div class="pb"><i style="width:${Math.round((h.pct || 0) * 100)}%"></i></div>` : ''}</div></div>`;
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
      <div class="moneyline"><div><div class="eyebrow">נחסך עד עכשיו</div><div class="ils-display" style="margin-top:6px">${moneyFig(moneyAt(st, t), 2)}</div></div><div class="small" style="text-align:end">${moneyFig(per, 2)} לסיגריה<br>${mode}</div></div>
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
    <button class="row" data-act="open-slips"><div class="ib">${icon('slip', 19, 'var(--c-clay)')}</div><div class="t">מעידות<small>רישום, עריכה ומחיקה</small></div>${icon('chevron', 16, 'var(--c-ink-3)')}</button>
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
  const f = ui.histFilter || 'all';
  const fmt = (t) => new Date(t).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  const ev = [
    ...(f === 'all' || f === 'chk' ? st.checkins.map((c) => ({ t: c.t, icon: 'mood-' + (c.mood || 3), h: `צ׳ק-אין · חשק ${c.crave}/10`, n: c.note })) : []),
    ...(f === 'all' || f === 'crav' ? st.cravings.filter((c) => c.won).map((c) => ({ t: c.t, icon: 'wave', h: `חשק עבר${c.intensity != null ? ` · ${c.intensity}/10` : ''}`, n: (c.triggers || []).map((id) => triggerById(id)?.label).filter(Boolean).join(', ') })) : []),
    ...(f === 'all' || f === 'slip' ? st.slips.map((s) => ({
      id: s.id, t: s.t, slip: true, icon: 'slip',
      h: +s.cigs === 1 ? 'סיגריה אחת' : `${s.cigs} סיגריות`,
      mode: s.restart ? 'ספירה חדשה' : 'ממשיכים לספור',
      tr: (s.triggers || []).map((id) => triggerById(id)?.label).filter(Boolean),
      n: s.note,
      cost: (+s.cigs || 0) * ppcOf(st.settings),
      min: (+s.cigs || 0) * (st.settings.mpc || 11),
    })) : []),
  ].sort((a, b) => b.t - a.t).slice(0, 80);
  const chips = [['all', 'הכול'], ['slip', 'מעידות'], ['crav', 'חשקים'], ['chk', 'צ׳ק-אין']]
    .map(([id, l]) => `<button data-act="hist-f" data-id="${id}" class="${f === id ? 'on' : ''}">${l}</button>`).join('');
  let head = '';
  if (f === 'slip') {
    const q = st.settings.quitAt;
    const t = now();
    const sl = st.slips.filter((x) => !q || x.t >= q);
    const cigs = sl.reduce((a, x) => a + (+x.cigs || 0), 0);
    const nDays = q ? Math.max(1, Math.floor((t - q) / DAY) + 1) : 0;
    const day0 = new Date(q || t);
    day0.setHours(0, 0, 0, 0);
    const dots = [];
    for (let i = 0; i < Math.min(nDays, 14); i++) {
      const d0 = day0.getTime() + (nDays > 14 ? nDays - 14 + i : i) * DAY;
      const has = sl.some((x) => x.t >= d0 && x.t < d0 + DAY);
      const d = new Date(d0);
      dots.push(`<span class="dd ${has ? 'on' : ''}"><i></i><em>${d.getDate()}.${d.getMonth() + 1}</em></span>`);
    }
    const clean = nDays - new Set(sl.map((x) => new Date(x.t).toDateString())).size;
    head = `<button class="slip-add" data-act="slip-add">${icon('plus', 18, 'var(--c-ink)')}<span>רישום מעידה</span></button>
      <div class="sum slsum"><div class="eyebrow">מאז ההפסקה</div>
      <div class="h2" style="font-size:16px;margin-top:6px">${Math.max(0, clean)} מתוך ${nDays} ימים בלי אף סיגריה</div>
      <div class="ddrow">${dots.join('')}</div>
      <div class="led"><div><div class="v">${sl.length}</div><div class="k">מעידות</div></div><div><div class="v">${cigs}</div><div class="k">סיגריות</div></div><div><div class="v">${moneyFig(cigs * ppcOf(st.settings), 2)}</div><div class="k">ירד מהחיסכון</div></div></div>
      <div class="small" style="margin-top:10px">מעידה לא מוחקת ימים. היא עוזרת לראות מתי ולמה זה קורה.</div></div>`;
  }
  const list = ev.length
    ? `<ul class="hl">${ev.map((x) => `<li class="hist${x.slip ? ' sl' : ''}"><span class="sx-ic">${icon(x.icon, 20, x.slip ? 'var(--c-clay)' : 'var(--c-hill)')}</span><div class="sx-b"><div class="sx-t">${esc(x.h)}${x.mode ? `<b class="tag ${x.mode === 'ספירה חדשה' ? '' : 'soft'}">${esc(x.mode)}</b>` : ''}</div>${x.tr?.length ? `<div class="sx-tr">${x.tr.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}${x.n ? `<div class="small">${esc(x.n)}</div>` : ''}${x.slip ? `<div class="small">ירדו ${moneyFig(x.cost, 2)} ו־${nf(x.min, 0)} דקות</div>` : ''}<div class="sx-d">${esc(fmt(x.t))}</div></div>${x.slip ? `<div class="sx-tools"><button data-act="slip-edit" data-id="${esc(x.id)}">עריכה</button><button data-act="slip-ask-del" data-id="${esc(x.id)}" aria-label="מחיקה">${icon('trash', 16, 'var(--c-clay)')}</button></div>` : ''}</li>`).join('')}</ul>`
    : `<p class="lead" style="margin-top:12px">עוד אין רשומות. חשק שנרשם חוזר כתובנה.</p>`;
  let pat = '';
  if (f === 'slip' && st.slips.length) {
    const c = {};
    for (const x of st.slips) for (const id of x.triggers || []) c[id] = (c[id] || 0) + 1;
    const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => triggerById(id)?.label).filter(Boolean);
    const eve = st.slips.filter((x) => new Date(x.t).getHours() >= 18).length;
    pat = `<div class="why sx-pat">${spot('journal', 34)}<div><div class="eyebrow" style="color:var(--c-hill)">מה חוזר במעידות</div><div style="font:400 14px/1.45 var(--f-text);margin-top:4px">${top.length ? `הכי הרבה סביב ${top.join(', ')}.` : ''} ${eve ? `${eve === 1 ? 'מעידה אחת' : `${eve} מעידות`} מתוך ${st.slips.length} ${eve === 1 ? 'הייתה' : 'היו'} בערב.` : ''}</div><div class="small" style="margin-top:4px">לפני ערב כזה, אפשר לפתוח תרגיל נשימה מראש.</div></div></div>`;
  }
  return `<div class="hfil">${chips}</div>${head}${list}${pat}`;
}

function settings() {
  const s = st.settings;
  const whenShort = s.quitAt
    ? new Date(s.quitAt).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'short' }).replace(/^יום\s+/, '')
    : 'עוד לא נבחר';
  const mode = s.mode === 'pack' ? 'סיגריות בקופסה' : s.mode === 'ryo' ? 'טבק לגלגול' : 'עוד לא נבחר';
  const gender = s.gender === 'm' ? 'זכר' : s.gender === 'f' ? 'נקבה' : 'אחר';
  const cost = s.mode ? `${nf(ppcOf(s), 2)} ₪ לסיגריה` : '—';
  const goal = s.goalName ? `${s.goalName}${s.goalPrice ? ` · ${nf(s.goalPrice, 0)} ₪` : ''}` : '—';
  const why = (s.reasons || [])[0] ? 'סיבה ותמונה' : (s.photo ? 'תמונה' : '—');
  const backed = s.lastBackup
    ? `גובה ב-${new Date(s.lastBackup).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}`
    : 'עוד לא גובה';
  const hour = `${String(s.checkinHour).padStart(2, '0')}:00`;
  const webNote = isNative() ? '' : '<p class="set-note">ההתראות פועלות באפליקציה המותקנת.</p>';
  return `<div class="screen set" data-scroll>
    <header class="set-head"><h1>הגדרות</h1><button type="button" class="set-lock" data-act="scroll-data">${icon('lock', 14, 'currentColor', 1.7)}<span>אין חשבון · הכול נשמר במכשיר הזה</span></button></header>
    <div class="pad">
      <section class="set-group">${setHead('sprout', 'ההרגל שלי', true)}
        <div class="set-list">
          ${srow('שם או כינוי', 'ככה נפנה אליך', s.name || '—', 'name')}
          ${srow('איך לפנות אליך', 'זכר, נקבה, או לשון כללית', gender, 'gender')}
          ${srow('יום ההפסקה', 'מכאן נספרים הזמן, הכסף והבריאות', whenShort, 'date')}
          ${srow('מה עישנתי', 'קובע איך מחושב המחיר', s.brandLabel || mode, 'cost')}
          ${srow('כמה ביום', 'מספר הסיגריות ביום, בערך', s.cpd ?? '—', 'cpd')}
          ${srow('כמה זה עלה', s.mode === 'pack' ? 'מחיר הקופסה' : 'מחיר הטבק, הניירות והפילטרים', cost, 'cost')}
          ${srow('יעד חיסכון', 'על מה חוסכים, ובכמה', goal, 'goal')}
          ${srow('הסיבות שלי', 'מוצגות ברגע קשה, עם התמונה', why, 'why')}
          ${srow('תרגיל הנשימה', 'נפתח בכל נושמים יחד', currentBreath(st).name, 'breaths')}
        </div>
      </section>
      <section class="set-group">${setHead('bell', 'תזכורות')}
        <div class="set-list">
          ${stoggle('dailyCheckin', 'צ׳ק-אין יומי', 'שאלה קצרה כל ערב: איך עבר היום?', s.dailyCheckin)}
          <button type="button" class="set-when ${s.dailyCheckin ? '' : 'hide'}" data-reveal="dailyCheckin" data-act="set" data-set="checkin">כל ערב ב-${hour} · שינוי</button>
          ${stoggle('healthNotifs', 'התראה על שלב החלמה חדש', 'למשל: ״הריאות מתחילות להתנקות״', s.healthNotifs)}
        </div>
        ${webNote}
      </section>
      <section class="set-group">${setHead('daynight', 'מראה ותחושה')}
        <div class="set-list">
          <div class="srow stack"><span class="tx"><span class="t">ערכת צבעים</span><span class="h">״אוטומטי״ עובר לכהה לפי המכשיר</span></span>
            <div class="seg"><button data-act="theme" data-theme="light" class="${s.theme === 'light' ? 'on' : ''}">בהיר</button><button data-act="theme" data-theme="auto" class="${s.theme === 'auto' ? 'on' : ''}">אוטומטי</button><button data-act="theme" data-theme="dark" class="${s.theme === 'dark' ? 'on' : ''}">כהה</button></div>
          </div>
          ${stoggle('sound', 'צלילים', 'צליל עדין בהישג ובסוף תרגיל נשימה', s.sound)}
          ${stoggle('haptics', 'רטט', 'רטט קל בתרגיל הנשימה ובלחיצות', s.haptics)}
          ${stoggle('celebrate', 'חגיגות והנפשות', 'קונפטי ותנועה עדינה בהישגים', s.celebrate)}
        </div>
      </section>
      <section class="set-group" id="your-data">${setHead('device', 'הנתונים שלך')}
        <div class="set-card"><span class="badge">${icon('lock', 16, 'var(--c-hill)')}</span><div><div class="t">אין חשבון – הכול שמור רק במכשיר הזה</div><p>אין התחברות ואין שרת, ולכן גם אין ״התנתקות״. כדי לעבור מכשיר: ייצוא גיבוי כאן, ושחזור במכשיר החדש.</p></div></div>
        <div class="set-list">
          ${srow('ייצוא גיבוי', 'קובץ אחד עם כל הנתונים', backed, 'export')}
          ${srow('שחזור מגיבוי', 'מחליף את הנתונים שבמכשיר', '', 'import')}
        </div>
        <div class="set-danger"><button type="button" class="btn danger" data-act="set" data-set="wipe">${icon('trash', 18, 'currentColor')}להתחיל מחדש ולמחוק הכול</button><p>מוחק לצמיתות את כל הנתונים מהמכשיר. כדאי לייצא גיבוי קודם.</p></div>
      </section>
      <section class="set-group">${setHead('noads', 'בלי פרסומות')}
        <button type="button" class="set-buy" data-act="buy"><span><b>${s.adsRemoved ? 'בלי פרסומות · פעיל במכשיר הזה' : 'להסיר את הפרסומות'}</b><small>${s.adsRemoved ? 'התשלום כבר נשמר במכשיר' : 'חד-פעמי. כל הכלים נשארים בחינם.'}</small></span>${s.adsRemoved ? '' : `<em><bdi dir="ltr">${esc(priceLabel())}</bdi></em>`}</button>
        <div class="set-list">${srow('כבר קניתי – שחזור רכישה', 'למכשיר חדש או אחרי התקנה מחדש', '', 'restore')}</div>
      </section>
      <section class="set-group">${setHead('help', 'עזרה ומידע')}
        <div class="set-list">
          ${srow('ליווי בקופות החולים', 'סדנאות גמילה ותרופות בסבסוד, לפי הקופה', '', 'hmo')}
          ${srow('אודות ומידע רפואי', 'מאיפה המידע, ולמה זו הערכה כללית', '', 'about')}
          ${srow('מדיניות פרטיות', 'מה נשמר ואיפה. בקיצור: רק אצלך', '', 'privacy')}
        </div>
      </section>
      <footer class="set-foot">${wordmark(14, theme() === 'dark')}<div class="small">גרסה 1.0</div></footer>
    </div>
  </div>`;
}

function setHead(name, title, sprout = false) {
  const img = sprout
    ? spot('sprout', 40)
    : `<img class="set-spot" alt="" src="art/settings/spot-${name}@2x.webp">`;
  return `<div class="set-gh">${img}<h2>${title}</h2></div>`;
}
function srow(title, hint, value, act) {
  const shown = esc(String(value ?? '')).replace(/(\d[\d,.]*)\s*₪/g, '<bdi dir="ltr">$1 ₪</bdi>');
  const v = value ? `<span class="v">${shown}</span>` : '';
  return `<button class="srow" data-act="set" data-set="${act}"><span class="tx"><span class="t">${title}</span><span class="h">${hint}</span></span>${v}${icon('chevron', 14, 'var(--c-ink-3)')}</button>`;
}
function stoggle(key, title, hint, on) {
  return `<button class="srow" data-act="toggle" data-key="${key}"><span class="tx"><span class="t">${title}</span><span class="h">${hint}</span></span><span class="tg ${on ? 'on' : ''}"></span></button>`;
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
  const t = now();
  const q = st.settings.quitAt;
  const days = q ? Math.floor((t - q) / DAY) : 0;
  const last = st.slips.at(-1) || { cigs: 1, triggers: [], restart: false };
  const per = ppcOf(st.settings);
  const mins = (+last.cigs || 0) * (st.settings.mpc || 11);
  const trig = (last.triggers || []).map(triggerById).filter(Boolean)[0];
  const row = (k, v) => `<div class="dl"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const kept = !last.restart;
  return `<div class="screen sd"><div class="sd-art">${scene(390, 320, dark, Math.min(8, Math.max(1, days)))}</div>
    <div class="sd-body"><div class="eyebrow" style="color:var(--c-hill)">נרשם</div><div class="h-display" style="margin-top:6px">השביל לא נמחק</div>
      <p class="lead" style="margin-top:8px">${kept ? `${days} ימים מאז ההפסקה נשארים. מעידה היא נתון, לא מחיקה.` : 'ספירה חדשה מהמעידה. הרצף הקודם נשמר, וההישגים נשארו.'}</p>
      <div class="dlist">
        ${row('ירד מהחיסכון', moneyFig((+last.cigs || 0) * per, 2))}
        ${row('ירד מהזמן שחזר', `${nf(mins, 0)} דקות`)}
        ${row(kept ? 'שלבי 72 השעות הראשונות' : 'כל שלבי הגוף', kept ? 'מתחילים מחדש' : 'מתחילים מאפס')}
      </div>
      ${kept ? `<div class="kept">${icon('check', 15, 'var(--c-hill)', 2)}<span>נשארו כמו שהיו: ${days} ימים, ${Object.keys(st.unlocked).length} הישגים, והשלבים הארוכים בגוף.</span></div>` : ''}
      ${trig ? `<div class="why sd-tip">${icon('drop', 20, 'var(--c-clay)')}<div><div class="eyebrow" style="color:var(--c-clay)">לפעם הבאה · ${esc(trig.label)}</div><div class="small" style="margin-top:3px">${esc(trig.tip)}</div></div></div>` : ''}
      <button class="btn primary" data-act="go" data-go="home" style="width:100%;margin-top:16px">חזרה להיום</button>
      <button class="btn ghost" data-act="sos" style="width:100%;margin-top:10px">${spot('breath', 22)}לנשום עכשיו</button>
    </div></div>`;
}

function onboard() {
  if (ui.obStep <= 0) return obWelcome();
  return onboardScreen();
}

function obWelcome() {
  const dark = theme() === 'dark';
  const art = (name) => `<img class="wl-art ${name === 'day' ? 'day' : 'dusk'}" alt="" width="390" height="904" src="art/welcome-${name}@2x.webp" srcset="art/welcome-${name}@2x.webp 2x, art/welcome-${name}@3x.webp 3x">`;
  return `<div class="screen wl">
    ${art('day')}${art('dusk')}
    <div class="wl-mist" aria-hidden="true"></div>
    <div class="wl-brand">${mark(23, dark)}<span class="wm">${WORDMARK}</span></div>
    <div class="wl-hook">
      <h1>נושמים<br>מחדש</h1>
      <p class="wl-sub">כל נשימה בלי עישון: כסף בכיס, <br>וגוף שמתחדש.</p>
    </div>
    <div class="wl-bottom">
      <div class="wl-points">
        <div class="cell">${spot('jar', 54)}<div class="t">הכיס</div><div class="d"><div class="line"><bdi dir="ltr" class="amt"><span data-tease>0</span><span class="shekel">₪</span></bdi> בשנה</div><div>על קופסה ביום</div></div></div>
        <div class="cell">${spot('lungs', 54)}<div class="t">הגוף</div><div class="d">ציר החלמה,<br>שלב אחרי שלב</div></div>
        <div class="cell">${spot('breath', 54)}<div class="t">רגע קשה</div><div class="d">נשימה מודרכת<br>עד שהגל עובר</div></div>
      </div>
      <button class="wl-cta" data-act="ob-next">בואו נתחיל</button>
      <p class="wl-import">יש לי גיבוי – <button data-act="import">ייבוא נתונים</button></p>
      <p class="wl-priv">${icon('lock', 13, 'currentColor', 1.7)}בלי חשבון, הכול נשאר אצלך</p>
    </div>
  </div>`;
}

const TEASE_TARGET = 13140;
let teaseFrame = 0;
let teaseTick = 0;
function stopWelcomeTease() {
  cancelAnimationFrame(teaseFrame);
  clearInterval(teaseTick);
  teaseFrame = 0;
  teaseTick = 0;
}
function startWelcomeTease() {
  stopWelcomeTease();
  const el = document.querySelector('[data-tease]');
  if (!el) return;
  const reduce = document.documentElement.classList.contains('reduce');
  const paint = (n) => {
    const node = document.querySelector('[data-tease]');
    if (node) node.textContent = nf(n, 0);
  };
  if (reduce) { paint(TEASE_TARGET); return; }
  const t0 = performance.now();
  const ease = (t) => 1 - (1 - t) ** 3;
  const run = (t) => {
    const p = Math.min(1, (t - t0) / 1400);
    paint(Math.round(ease(p) * TEASE_TARGET));
    if (p < 1) teaseFrame = requestAnimationFrame(run);
    else {
      let n = TEASE_TARGET;
      teaseTick = setInterval(() => {
        n += 1;
        if (!document.querySelector('[data-tease]')) { stopWelcomeTease(); return; }
        paint(n);
      }, 4000);
    }
  };
  teaseFrame = requestAnimationFrame(run);
}
function overlay() {
  if (ui.overlay === 'breaths') return breathSheet();
  if (ui.overlay === 'slip') return slipSheet();
  if (ui.overlay === 'slipdel') return slipDeleteSheet();
  if (ui.overlay === 'insight') return insightSheet();
  if (ui.overlay === 'checkin') return checkinSheet();
  if (ui.overlay === 'about') return aboutSheet();
  if (ui.overlay === 'hmo') return hmoSheet();
  if (ui.overlay === 'wipe') return wipeSheet();
  if (ui.editor) return editorSheet();
  return '';
}

function slipSheet() {
  const chips = TRIGGERS.map((t) => `<button data-act="slip-trig" data-id="${t.id}" class="${ui.slipTriggers.includes(t.id) ? 'on' : ''}">${t.label}</button>`).join('');
  const per = ppcOf(st.settings);
  const n = ui.slipCigs;
  const mins = n * (st.settings.mpc || 11);
  const keep = ui.slipMode !== 'restart';
  const editing = !!ui.slipEditId;
  return `<div class="dim" data-act="overlay-off"></div><div class="panel slp"><div class="grab"></div>
    <div class="slp-hd">${spot('slip', 44)}<div><div class="h1">${editing ? 'עריכת מעידה' : 'רישום מעידה'}</div><p class="lead">${esc(g('אתה עדיין בדרך', 'את עדיין בדרך', 'עדיין בדרך'))}. רושמים, וממשיכים מכאן.</p></div></div>
    <div class="slp-two">
      <div class="field"><label>כמה סיגריות?</label><div class="stepper sm"><button class="iconbtn" data-act="slip-n" data-d="-1" aria-label="אחת פחות">${icon('minus', 15)}</button><div class="n">${n}</div><button class="iconbtn" data-act="slip-n" data-d="1" aria-label="עוד אחת">${icon('plus', 15)}</button></div></div>
      <div class="field"><label for="slip-when">מתי?</label>${dateFieldHtml('slip-when', ui.slipWhen)}</div>
    </div>
    <div class="field"><label>מה היה סביב זה? (לא חובה)</label><div class="chips">${chips}</div></div>
    <div class="field"><label for="slipnote">מילה לעצמך (לא חובה)</label><div class="input"><input id="slipnote" value="${esc(ui.slipNote || '')}" placeholder="למשל: בחתונה, עם חברים"></div></div>
    <div class="field" style="margin-bottom:0"><label>ומה עם הספירה?</label></div>
    <button class="choice ${keep ? 'on' : ''}" data-act="slip-mode" data-mode="keep"><div class="radio"></div><div><div class="h2" style="font-size:15px">ממשיכים לספור <b class="tag soft">מומלץ</b></div><div class="small">הימים וההישגים נשארים. שלבי הגוף של 72 השעות הראשונות מתחילים מחדש.</div></div></button>
    <button class="choice ${!keep ? 'on' : ''}" data-act="slip-mode" data-mode="restart"><div class="radio"></div><div><div class="h2" style="font-size:15px">ספירה חדשה מהמעידה</div><div class="small">מתחילים מאפס. הרצף הקודם נשמר כשיא, וההישגים נשארים.</div></div></button>
    <div class="slp-off">${icon('money', 16, 'var(--c-ink-2)')}<span>יירדו מהחיסכון <b>${moneyFig(n * per, 2)}</b>, ומהזמן שחזר <b>${nf(mins, 0)} דקות</b>.</span></div>
    <div style="display:flex;gap:10px;margin-top:14px"><button class="btn ghost" data-act="overlay-off" style="flex:.6">ביטול</button><button class="btn primary" data-act="slip-save" style="flex:1">${editing ? 'שמירת השינוי' : 'שמירה'}</button></div>
  </div>`;
}

function slipDeleteSheet() {
  return `<div class="dim" data-act="overlay-off"></div><div class="panel"><div class="grab"></div>
    <div class="h1">למחוק את המעידה?</div>
    <p class="lead" style="margin-top:8px">הספירה, הכסף והשלבים בגוף יחושבו מחדש בלי הרשומה הזו.</p>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn ghost" data-act="overlay-off" style="flex:.6">ביטול</button><button class="btn danger" data-act="slip-del-yes" style="flex:1">למחוק</button></div>
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
  const s = st.settings;
  let inner = '';
  if (ed === 'date') {
    const t = s.quitAt || now();
    inner = `<div class="h1">יום ההפסקה</div><p class="lead">${esc(hebDate(Math.min(t, now())))}</p><div class="field"><label for="edit-date">יום ושעה</label>${dateFieldHtml('edit-date', toLocal(Math.min(t, now())))}</div>`;
  }
  if (ed === 'cpd') inner = `<div class="h1">כמה ביום</div><div class="field"><div class="input"><input id="edit-cpd" class="num-ltr" dir="ltr" inputmode="numeric" value="${esc(s.cpd ?? '')}"></div></div><div class="field"><label>דקות חיים לסיגריה (הערכה)</label><div class="input"><input id="edit-mpc" class="num-ltr" dir="ltr" inputmode="numeric" value="${s.mpc}"></div></div>`;
  if (ed === 'goal') inner = `<div class="h1">יעד חיסכון</div><div class="field"><div class="input ${checkText(ui.goal || s.goalName || '', 'goal') ? 'bad' : ''}"><input id="edit-goal" placeholder="טיול, מתנה, חוויה" value="${esc(s.goalName || '')}"></div></div><p class="ob-err" data-filter="goal" hidden></p><div class="field"><div class="input"><input id="edit-goalp" class="num-ltr" dir="ltr" inputmode="numeric" placeholder="סכום" value="${s.goalPrice || ''}"><span class="unit">₪</span></div></div>`;
  if (ed === 'why') inner = `<div class="h1">הסיבות שלי</div><div class="field"><div class="input" style="height:100px"><textarea id="edit-why">${esc((s.reasons || []).join('\n'))}</textarea></div></div><p class="ob-err" data-filter="reason" hidden></p><label class="row">תמונה<input id="edit-photo" type="file" accept="image/*" hidden></label>${s.photo ? '<button class="btn text" data-act="clear-photo">הסרת התמונה</button>' : ''}`;
  if (ed === 'name') inner = `<div class="h1">שם או כינוי</div><div class="field"><div class="input"><input id="edit-name" maxlength="40" value="${esc(s.name || '')}" placeholder="למשל: נועה"></div></div><p class="ob-err" data-filter="name" hidden></p>`;
  if (ed === 'gender') inner = `<div class="h1">איך לפנות אליך?</div><div class="ob-chips">${[['m', 'זכר'], ['f', 'נקבה'], ['x', 'אחר']].map(([id, label]) => `<button type="button" class="ob-chip ${s.gender === id ? 'on' : ''}" data-act="gender" data-g="${id}">${label}</button>`).join('')}</div>`;
  if (ed === 'checkin') inner = `<div class="h1">שעת הצ׳ק-אין</div><div class="field"><div class="input"><input id="edit-hour" class="num-ltr" dir="ltr" type="time" value="${String(s.checkinHour).padStart(2, '0')}:00"></div></div>`;
  if (ed === 'cost') inner = `<div class="h1">מה עישנתי</div>${productFields()}`;
  return `<div class="dim" data-act="overlay-off"></div><div class="panel"><div class="grab"></div>${inner}<button class="btn primary" data-act="editor-save" style="width:100%;margin-top:16px">שמירה</button></div>`;
}

function wipeSheet() {
  return `<div class="dim" data-act="overlay-off"></div><div class="panel wipe">
    <div class="h1">למחוק הכול ולהתחיל מחדש?</div>
    <p class="lead">יימחקו מהמכשיר: יום ההפסקה, הכסף שנחסך, ההישגים, היומן והסיבות. אין עותק בשרת, ולכן אי אפשר לשחזר בלי קובץ גיבוי.</p>
    <button class="btn primary" data-act="set" data-set="export" style="width:100%;margin-top:16px">קודם לייצא גיבוי</button>
    <button class="btn danger" data-act="wipe-go" style="width:100%;margin-top:10px">למחוק בכל זאת</button>
    <button class="btn text" data-act="overlay-off" style="margin:8px auto 0">ביטול</button>
  </div>`;
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
    proj: nf(futureValue(savedNow(t), monthlyRate(), GROWTH_RATE, [5, 10, 20].includes(ui.horizon) ? ui.horizon : 10), 0),
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
  const dayRate = (st.settings.cpd || 0) * ppcOf(st.settings);
  rolls.hour = hourText(dayRate);
  rolls.pouches = nf(unitsOf(cigsN || 0).n, 1);
  const rateVals = [dayRate, dayRate * 7, dayRate * MONTH / DAY, dayRate * YEAR / DAY];
  rateVals.forEach((n, i) => { rolls[`rate${i}`] = rateText(n); });
  [5, 10, 20].forEach((y) => {
    rolls[`fv${y}`] = nf(futureValue(savedNow(t), monthlyRate(), GROWTH_RATE, y), 0);
  });
  for (const el of document.querySelectorAll('[data-live]')) {
    const next = rolls[el.dataset.live];
    if (next == null || el.children.length) continue;
    if (el.textContent !== next) el.textContent = next;
  }
  maybeCoin(money);
}

let coinWhole = null;
let coinAt = 0;
function maybeCoin(money) {
  if (ui.route !== 'pocket' || money == null) {
    coinWhole = money == null ? null : Math.floor(money);
    return;
  }
  const whole = Math.floor(money);
  const reduce = document.documentElement.classList.contains('reduce');
  if (coinWhole != null && whole > coinWhole && !reduce && Date.now() - coinAt > 4000) {
    coinAt = Date.now();
    const stage = document.querySelector('.pk-stage');
    if (stage) {
      const img = document.createElement('img');
      img.src = `art/pocket/hero/50-coin-${1 + Math.floor(Math.random() * 4)}.webp`;
      img.className = 'coin';
      img.alt = '';
      stage.appendChild(img);
      setTimeout(() => img.remove(), 950);
    }
  }
  coinWhole = whole;
}

const KCOL = { in: 'var(--c-hill)', hold: 'var(--c-apricot)', out: 'var(--c-sage)', empty: 'var(--c-clay)' };

function cycleBar(ex, labels = false) {
  const segs = (ex.phases || []).map((p, i) => `<i data-seg="${i}" style="flex:${p.s};background:${KCOL[p.k]}">${labels ? `<em>${p.s}</em>` : ''}</i>`).join('');
  return `<span class="bx-bar${labels ? ' big' : ''}">${segs}</span>`;
}

function breathRow(ex, mine) {
  const on = (st.settings.breathId || 'calm478') === ex.id;
  return `<div class="bx-row ${on ? 'on' : ''}"><button class="bx-pick" data-act="breath-pick" data-id="${esc(ex.id)}"><span class="radio"></span><span class="bx-tx"><span class="t">${esc(ex.name)}</span><span class="d">${esc(ex.note || `${ex.phases.length} שלבים · ${patternText(ex)}`)}</span>${cycleBar(ex)}</span><span class="bx-len"><b>${cycleOf(ex)}</b><small>שניות</small></span></button>
    <button class="bx-side" data-act="breath-edit" data-id="${esc(ex.id)}" data-copy="${mine ? '0' : '1'}" aria-label="${mine ? 'עריכה' : 'עותק לעריכה'}">${icon(mine ? 'pen' : 'plus', 16, 'var(--c-ink-2)')}</button></div>`;
}

function breathSheet() {
  const mine = st.breaths || [];
  const full = mine.length >= LIMITS.mine;
  return `<div class="dim" data-act="overlay-off"></div><div class="panel bx-sheet"><div class="grab"></div>
    <div class="h1">איזה תרגיל?</div>
    <p class="lead" style="margin-top:4px">התרגיל שנבחר ייפתח מעכשיו בכל ״נושמים יחד״.</p>
    <div class="bx-h">התרגילים שלי</div>
    ${mine.map((e) => breathRow(e, true)).join('') || '<p class="small">עוד אין תרגיל משלך.</p>'}
    <button class="bx-new" data-act="breath-new" ${full ? 'disabled' : ''}>${icon('plus', 18, 'var(--c-hill)')}תרגיל חדש</button>
    <div class="bx-h">מוכנים</div>
    ${PRESETS.map((e) => breathRow(e, false)).join('')}
    <p class="small" style="margin-top:12px">בסימן + אפשר לקחת תרגיל מוכן ולשנות אותו לפי הקצב שלך.</p>
  </div>`;
}

function breathEditor() {
  const ex = ui.breathEdit || { id: '', name: '', phases: [] };
  const total = cycleOf(ex);
  const perMin = total ? 60 / total : 0;
  const bad = problems(ex);
  const full = ex.phases.length >= LIMITS.phases;
  const rows = ex.phases.map((p, i) => `<li class="bx-ph" data-i="${i}">
      <span class="grip" data-i="${i}" aria-hidden="true"><i></i><i></i><i></i></span>
      <button class="mv" data-act="ph-move" data-i="${i}" data-d="-1" aria-label="הזזה למעלה" ${i === 0 ? 'disabled' : ''}></button>
      <button class="mv" data-act="ph-move" data-i="${i}" data-d="1" aria-label="הזזה למטה" ${i === ex.phases.length - 1 ? 'disabled' : ''}></button>
      <span class="dot" style="background:${KCOL[p.k]}"></span>
      <button class="kind" data-act="ph-kind" data-i="${i}">${KINDS[p.k].label}${icon('chev-down', 12, 'var(--c-ink-2)')}</button>
      <span class="st"><button class="iconbtn" data-act="ph-s" data-i="${i}" data-d="-1" aria-label="פחות" ${p.s <= LIMITS.min ? 'disabled' : ''}>${icon('minus', 14)}</button><b>${p.s}</b><button class="iconbtn" data-act="ph-s" data-i="${i}" data-d="1" aria-label="יותר" ${p.s >= LIMITS.max ? 'disabled' : ''}>${icon('plus', 14)}</button><small>שנ׳</small></span>
      <button class="rm" data-act="ph-rm" data-i="${i}" aria-label="הסרת השלב">${icon('close', 14, 'var(--c-ink-3)')}</button>
    </li>`).join('');
  return `<div class="screen bx-ed-screen" data-scroll><div class="appbar"><div style="display:flex;align-items:center;gap:10px"><button class="iconbtn" data-act="breath-back" aria-label="חזרה">${icon('chevron', 16, 'currentColor', 1.7)}</button><div class="ttl">${ex.id ? 'עריכת תרגיל' : 'תרגיל חדש'}</div></div></div>
    <div class="pad">
      <div class="field" style="margin-top:4px"><label for="bx-name">שם התרגיל</label><div class="input"><input id="bx-name" value="${esc(ex.name)}" maxlength="${LIMITS.name}"></div></div>
      <div class="bx-prev">
        <div class="bx-prev-hd"><span class="eyebrow">מחזור אחד</span><span class="bx-tot"><b>${total}</b> שניות · ${perMin >= 1 ? `בערך ${nf(perMin, 0)} נשימות בדקה` : 'פחות מנשימה בדקה'}</span></div>
        ${cycleBar(ex, true)}
        <p class="bx-try-line" data-try hidden></p>
        <div class="bx-leg">${[...new Set(ex.phases.map((p) => p.k))].map((k) => `<span><i style="background:${KCOL[k]}"></i>${KINDS[k].label}</span>`).join('')}</div>
        <button class="btn ghost bx-try" data-act="breath-try">${spot('breath', 22)}לנסות מחזור אחד</button>
      </div>
      <div class="bx-h" style="margin-top:18px">השלבים, לפי הסדר <span class="small">${ex.phases.length} מתוך ${LIMITS.phases}</span></div>
      <ol class="bx-list">${rows}</ol>
      <button class="bx-new" data-act="ph-menu" ${full ? 'disabled' : ''}>${icon('plus', 18, 'var(--c-hill)')}הוספת שלב</button>
      ${longHolds(ex) ? `<div class="why bx-safe">${icon('info', 20, 'var(--c-clay)')}<div class="small">החזקה ארוכה יכולה לגרום לסחרחורת. אם זה קורה, חוזרים לנשימה רגילה. בהריון, או עם מחלת לב או ריאה, כדאי להתייעץ עם רופא לפני החזקות ארוכות.</div></div>` : ''}
      ${bad.length ? `<p class="small bx-bad">${bad[0]}.</p>` : ''}
      <button class="btn primary${bad.length ? ' dis' : ''}" data-act="breath-save" style="width:100%;margin-top:16px">שמירה ובחירה לנשימה</button>
      ${ex.id && (st.breaths || []).some((b) => b.id === ex.id) ? `<button class="btn text bx-del" data-act="breath-del">מחיקת התרגיל</button>` : ''}
    </div></div>`;
}

function breathMenu() {
  if (!ui.breathMenu) return '';
  return `<div class="dim" data-act="menu-off"></div><div class="panel bx-menu"><div class="grab"></div><div class="h2" style="font-size:17px">איזה שלב להוסיף?</div>
      ${KIND_ORDER.map((k) => `<button class="bx-kind" data-act="ph-add" data-k="${k}"><span class="dot" style="background:${KCOL[k]}"></span><span><b>${KINDS[k].label}</b><small>${KINDS[k].hint}</small></span><em>4 שנ׳</em></button>`).join('')}
      <p class="small" style="margin-top:10px">השלב החדש נוסף בסוף. אפשר לגרור אותו למקום אחר.</p></div>`;
}

function breathDelete() {
  if (ui.overlay !== 'breathdel') return '';
  return `<div class="dim" data-act="menu-off"></div><div class="panel"><div class="grab"></div>
    <div class="h1">למחוק את התרגיל?</div>
    <p class="lead" style="margin-top:8px">הוא יימחק מהמכשיר. אם זה התרגיל שנבחר, נושמים יחד יחזור אל 4-7-8.</p>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn ghost" data-act="menu-off" style="flex:.6">ביטול</button><button class="btn danger" data-act="breath-del-yes" style="flex:1">למחוק</button></div>
  </div>`;
}

function bindPhaseDrag() {
  const list = document.querySelector('.bx-list');
  if (!list || list.dataset.bound) return;
  list.dataset.bound = '1';
  list.querySelectorAll('.grip').forEach((grip) => {
    grip.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      const from = +grip.dataset.i;
      const startY = e.clientY;
      let moved = false;
      const move = (ev) => {
        if (Math.abs(ev.clientY - startY) > 12) moved = true;
        const row = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.bx-ph');
        list.querySelectorAll('.bx-ph').forEach((el) => el.classList.toggle('drag-over', el === row));
      };
      const up = (ev) => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        if (!moved || !ui.breathEdit) return;
        const row = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.bx-ph');
        const to = row ? +row.dataset.i : from;
        if (to === from || !Number.isFinite(to)) return;
        const phases = ui.breathEdit.phases;
        const [item] = phases.splice(from, 1);
        phases.splice(to, 0, item);
        const name = document.getElementById('bx-name');
        if (name) ui.breathEdit.name = name.value.slice(0, LIMITS.name);
        render();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
  });
}

export { MESSAGES };
