import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:4173/';
const out = process.argv[3] || '/tmp/shots';
await mkdir(out, { recursive: true });

const shots = [
  ['01-welcome', 'shot=welcome'],
  ['02-date', 'shot=date'],
  ['03-habit', 'shot=habit'],
  ['04-cost', 'shot=cost'],
  ['05-why', 'shot=why'],
  ['10-home-light', 'shot=home&theme=light'],
  ['11-home-dark', 'shot=home&theme=dark'],
  ['12-sos-light', 'shot=sos&theme=light'],
  ['13-sos-dark', 'shot=sos&theme=dark'],
  ['20-health', 'shot=health&theme=light'],
  ['20-health-dark', 'shot=health&theme=dark'],
  ['21-badges', 'shot=badges&theme=light'],
  ['21-badges-dark', 'shot=badges&theme=dark'],
  ['22-unlock', 'shot=unlock'],
  ['23-stats', 'shot=stats&theme=light'],
  ['23-stats-dark', 'shot=stats&theme=dark'],
  ['30-journal', 'shot=journal&theme=light'],
  ['30-journal-dark', 'shot=journal&theme=dark'],
  ['30-history', 'shot=history&theme=light'],
  ['31-slip', 'shot=slip&theme=light'],
  ['32-slipdone', 'shot=slipdone&theme=light'],
  ['33-insight', 'shot=insight&theme=light'],
  ['34-checkin', 'shot=checkin&theme=light'],
  ['40-settings', 'shot=settings&theme=light'],
  ['40-settings-dark', 'shot=settings&theme=dark'],
  ['41-settings-more', 'shot=settings2&theme=light'],
  ['51-share', 'shot=share&theme=light'],
  ['52-week', 'shot=week&theme=light'],
];

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});

const errors = [];
for (const [name, query] of shots) {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  page.on('pageerror', (err) => errors.push(`${name}: ${err.message}`));
  await page.goto(`${base}?${query}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  await page.close();
  console.log(name);
}
await browser.close();
if (errors.length) {
  console.log('PAGE ERRORS');
  console.log(errors.join('\n'));
  process.exitCode = 1;
}
