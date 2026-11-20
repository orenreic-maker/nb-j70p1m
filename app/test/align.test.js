/**
 * Ink alignment for every [data-numline].
 * WebKit, 390×844. Parts that share a line must share an ink baseline
 * within 1px. A centered integer stays within 1px of its axis.
 * Nothing may paint outside the viewport.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { PNG } from 'pngjs';
import { webkit } from 'playwright';

const PORT = 4188;
const OUT = process.env.ALIGN_OUT || '/tmp/align-out';
const CASES = [
  { days: 1, money: '9.5' },
  { days: 20, money: '100.36' },
  { days: 120, money: '12345.67' },
];
const SHOTS = ['home', 'pocket', 'health', 'journal', 'badges', 'settings', 'slip'];

function inkBox(png) {
  const { width, height, data } = png;
  const bg = [data[0], data[1], data[2]];
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 40) continue;
      const dr = data[i] - bg[0];
      const dg = data[i + 1] - bg[1];
      const db = data[i + 2] - bg[2];
      if (dr * dr + dg * dg + db * db < 1400) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { left: minX, right: maxX, top: minY, bottom: maxY, width, height };
}

function waitForServer(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 304) { resolve(); return; }
      } catch { /* not up yet */ }
      if (Date.now() - start > 20000) reject(new Error('preview server did not start'));
      else setTimeout(tick, 200);
    };
    tick();
  });
}

test('number lines share a baseline and stay on their axis', { timeout: 240000 }, async () => {
  mkdirSync(OUT, { recursive: true });
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'ignore',
  });
  const rows = [];
  const crops = [];
  let browser;
  try {
    await waitForServer(`http://127.0.0.1:${PORT}/`);
    browser = await webkit.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    for (const shot of SHOTS) {
      for (const v of CASES) {
        const url = `http://127.0.0.1:${PORT}/?shot=${shot}&theme=light&sat=0&days=${v.days}&money=${v.money}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(120);
        await page.evaluate(() => {
          document.documentElement.classList.add('reduce');
          const sc = document.querySelector('.screen');
          if (sc) sc.scrollTop = 0;
        });
        const lines = page.locator('[data-numline]');
        const n = await lines.count();
        if (shot === 'home' || shot === 'pocket') assert.ok(n > 0, `${shot} has a number line`);
        for (let i = 0; i < n; i += 1) {
          const line = lines.nth(i);
          if (!(await line.isVisible())) continue;
          const meta = await line.evaluate((el) => ({
            kind: el.dataset.numline,
            axis: el.dataset.axis || '',
            text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
          }));
          const parts = line.locator('[data-part]');
          const pc = await parts.count();
          const bottoms = [];
          const partShots = [];
          for (let p = 0; p < pc; p += 1) {
            const part = parts.nth(p);
            const box = await part.boundingBox();
            if (!box || box.width < 1 || box.height < 1) continue;
            const buf = await part.screenshot({ animations: 'disabled' });
            const ink = inkBox(PNG.sync.read(buf));
            if (!ink) continue;
            const dsf = ink.width / box.width;
            const bottom = box.y + (ink.bottom + 1) / dsf;
            const top = box.y + ink.top / dsf;
            const center = box.x + ((ink.left + ink.right) / 2) / dsf;
            const left = box.x + ink.left / dsf;
            const right = box.x + (ink.right + 1) / dsf;
            const name = await part.evaluate((el) => el.dataset.part);
            // Alphabetic baseline, read from a zero-height strut in the line.
            // Round digits overshoot that line by more pixels at larger sizes,
            // so the raw ink bottom is not the baseline. The strut is checked
            // against the raster: the ink must cross it.
            const baseline = await part.evaluate((el) => {
              const s = document.createElement('span');
              s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;overflow:hidden';
              el.appendChild(s);
              const y = s.getBoundingClientRect().top;
              s.remove();
              return y;
            });
            bottoms.push({ name, bottom, top, baseline, center, left, right });
            partShots.push({ name, buf, ink });
            assert.ok(left >= -1, `${shot} ${meta.kind} ${name} starts left of the screen (${left.toFixed(1)})`);
            assert.ok(right <= 391, `${shot} ${meta.kind} ${name} runs past the screen (${right.toFixed(1)})`);
          }
          if (bottoms.length >= 2) {
            const base = bottoms.find((b) => b.name === 'int') || bottoms[0];
            for (const b of bottoms) {
              const d = Math.abs(b.baseline - base.baseline);
              rows.push({ shot, days: v.days, money: v.money, kind: meta.kind, part: b.name, delta: d.toFixed(2), text: meta.text });
              assert.ok(d <= 1, `${shot} d${v.days} ${meta.kind} “${meta.text}” ${b.name} baseline is ${d.toFixed(2)}px off the integer`);
            }
          }
          const int = bottoms.find((b) => b.name === 'int');
          if (int && (meta.axis === 'screen' || meta.axis === 'box' || meta.axis === 'self')) {
            let axis = 195;
            const intBox = await line.locator('[data-part="int"]').first().boundingBox();
            // The centered object is the integer's cell. A leading "1" does not
            // fill its digit box, so the ink's outer edge is not the axis.
            const cellCenter = intBox.x + intBox.width / 2;
            if (meta.axis === 'self') {
              const box = await line.boundingBox();
              axis = box.x + box.width / 2;
            } else if (meta.axis === 'box') {
              const box = await line.evaluate((el) => {
                const host = el.closest('button, .cell, .plant, .wstat, .m') || el.parentElement;
                const r = host.getBoundingClientRect();
                return { x: r.x, w: r.width };
              });
              axis = box.x + box.w / 2;
            }
            const d = Math.abs(cellCenter - axis);
            rows.push({ shot, days: v.days, money: v.money, kind: meta.kind, part: 'axis', delta: d.toFixed(2), text: meta.text });
            assert.ok(d <= 1, `${shot} d${v.days} ${meta.kind} integer cell is ${d.toFixed(2)}px off axis`);
            assert.ok(int.center >= intBox.x - 1 && int.center <= intBox.x + intBox.width + 1, `${shot} integer ink is outside its cell`);
          }
          if (v.days === 20 && v.money === '100.36' && partShots.length) {
            crops.push({ label: `${shot} ${meta.kind} ${meta.text}`, parts: partShots });
          }
        }
      }
    }
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
  }
  const table = ['shot\tdays\tmoney\tkind\tpart\tdelta_px\ttext', ...rows.map((r) => `${r.shot}\t${r.days}\t${r.money}\t${r.kind}\t${r.part}\t${r.delta}\t${r.text}`)];
  writeFileSync(`${OUT}/results.tsv`, `${table.join('\n')}\n`);
  writeContact(crops, `${OUT}/contact.png`);
  assert.ok(rows.length > 10, 'measured more than a handful of compositions');
});

function writeContact(crops, file) {
  const pad = 18;
  const labelH = 36;
  const gap = 24;
  const maxW = 1400;
  let x = pad;
  let y = pad;
  let rowH = 0;
  const placed = [];
  for (const crop of crops) {
    const imgs = crop.parts.map((p) => PNG.sync.read(p.buf));
    const w = imgs.reduce((s, im) => s + im.width, 0) + (imgs.length - 1) * 8;
    const h = Math.max(...imgs.map((im) => im.height));
    if (x + w > maxW) { x = pad; y += rowH + gap; rowH = 0; }
    placed.push({ crop, imgs, x, y, w, h });
    rowH = Math.max(rowH, h + labelH);
    x += w + gap;
  }
  const width = maxW;
  const height = y + rowH + pad;
  const sheet = new PNG({ width, height });
  sheet.data.fill(246);
  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = 246; sheet.data[i + 1] = 239; sheet.data[i + 2] = 227; sheet.data[i + 3] = 255;
  }
  for (const item of placed) {
    let dx = item.x;
    const bottoms = [];
    for (let k = 0; k < item.imgs.length; k += 1) {
      const im = item.imgs[k];
      const ink = item.crop.parts[k].ink;
      blit(sheet, im, dx, item.y + labelH);
      if (ink) bottoms.push({ x: dx, bottom: item.y + labelH + ink.bottom, left: ink.left, right: ink.right });
      dx += im.width + 8;
    }
    for (const b of bottoms) {
      for (let px = b.x + b.left; px <= b.x + b.right; px += 1) {
        const i = ((b.bottom) * sheet.width + px) * 4;
        if (i < 0 || i >= sheet.data.length) continue;
        sheet.data[i] = 196; sheet.data[i + 1] = 50; sheet.data[i + 2] = 40; sheet.data[i + 3] = 255;
      }
    }
  }
  writeFileSync(file, PNG.sync.write(sheet));
}

function blit(dest, src, dx, dy) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const si = (y * src.width + x) * 4;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dest.width || ty >= dest.height) continue;
      const di = (ty * dest.width + tx) * 4;
      const a = src.data[si + 3] / 255;
      if (a === 0) continue;
      for (let c = 0; c < 3; c += 1) dest.data[di + c] = Math.round(src.data[si + c] * a + dest.data[di + c] * (1 - a));
      dest.data[di + 3] = 255;
    }
  }
}
