import { WORDMARK, scene } from './scene.js';
import { cigsAt, hebDate, ils, moneyAt, prevCigs, prevMoney } from './calc.js';

export async function drawCard(st, now, opts) {
  const story = opts.shape !== 'square';
  const W = 1080;
  const H = story ? 1920 : 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  try { await document.fonts.load("700 120px Fredoka"); await document.fonts.load("500 40px Fredoka"); } catch { /* fallback */ }
  g.fillStyle = '#F6EFE3';
  g.fillRect(0, 0, W, H);
  const raw = scene(390, 430, false, Math.min(8, Math.max(1, Math.floor((now - (st.settings.quitAt || now)) / 864e5) || 1)));
  const svg = raw.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const img = await svgToImage(svg, 1080, story ? 760 : 420);
  if (img) g.drawImage(img, 0, 0, W, story ? 760 : 420);
  const days = st.settings.quitAt ? Math.floor(Math.max(0, now - st.settings.quitAt) / 864e5) : 0;
  g.fillStyle = '#2F3A2B';
  g.font = '700 200px Fredoka, sans-serif';
  g.direction = 'rtl';
  g.textAlign = 'right';
  const top = story ? 860 : 500;
  g.fillText(String(days), W - 80, top);
  g.font = "500 54px Fredoka, sans-serif";
  g.fillText('ימים של אוויר נקי', W - 80, top + 70);
  g.font = "400 32px Fredoka, sans-serif";
  g.fillStyle = '#6F7468';
  g.fillText('בלי סיגריה אחת', W - 80, top + 120);
  if (opts.money !== false) {
    const money = moneyAt(st, now) + prevMoney(st);
    const cigs = Math.floor(cigsAt(st, now) + prevCigs(st));
    g.fillStyle = '#2F3A2B';
    g.font = "600 42px Fredoka, sans-serif";
    const y = top + 210;
    g.fillText(ils(money, 0), W - 80, y);
    g.font = "400 28px Fredoka, sans-serif";
    g.fillStyle = '#6F7468';
    g.fillText('נשארו בכיס', W - 80, y + 40);
    g.fillStyle = '#2F3A2B';
    g.font = "600 42px Fredoka, sans-serif";
    g.fillText(String(cigs), W - 420, y);
    g.font = "400 28px Fredoka, sans-serif";
    g.fillStyle = '#6F7468';
    g.fillText('סיגריות שלא נדלקו', W - 420, y + 40);
  }
  if (opts.dots !== false && st.settings.cpd) {
    drawDots(g, 80, (opts.money === false ? top + 180 : top + 300), W - 160, st, now);
  }
  g.fillStyle = '#6F7468';
  g.font = "500 28px Fredoka, sans-serif";
  g.textAlign = 'left';
  g.fillText(WORDMARK, 80, H - 70);
  g.textAlign = 'right';
  g.fillText('מונה גמילה פרטי', W - 80, H - 70);
  if (opts.caption) {
    g.font = "500 36px Fredoka, sans-serif";
    g.fillStyle = '#2F3A2B';
    g.fillText(opts.caption, W - 80, H - 140);
  }
  return c;
}

function drawDots(g, x, y, width, st, now) {
  const cols = Math.min(15, Math.max(5, Math.round(st.settings.cpd) || 15));
  const rows = 7;
  const total = cols * rows;
  const on = Math.min(total, Math.floor(cigsAt(st, now)));
  const gap = width / cols;
  const r = Math.min(16, gap * 0.32);
  for (let i = 0; i < total; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + width - col * gap - gap / 2;
    const cy = y + row * (r * 2 + 10) + r;
    g.beginPath();
    g.arc(cx, cy, r, 0, 7);
    if (i < on) { g.fillStyle = '#6E8768'; g.fill(); }
    else if (i === on) { g.strokeStyle = '#C4623F'; g.lineWidth = 3; g.stroke(); }
    else { g.fillStyle = '#DED3BF'; g.fill(); }
  }
}

function svgToImage(svg, w, h) {
  return new Promise((resolve) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function hebShort(t) {
  return hebDate(t);
}
