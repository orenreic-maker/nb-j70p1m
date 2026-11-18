import { webkit } from '/tmp/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = 'http://127.0.0.1:4173/';
const out = '/opt/cursor/artifacts/breathanew-home';
await mkdir(out, { recursive: true });

const shots = [
  ['home-390-light', 390, 844, 'shot=home&theme=light'],
  ['home-390-dark', 390, 844, 'shot=home&theme=dark'],
  ['home-375-light', 375, 667, 'shot=home&theme=light'],
  ['home-375-dark', 375, 667, 'shot=home&theme=dark'],
  ['stats-390-light', 390, 844, 'shot=stats&theme=light'],
  ['settings-390-light', 390, 844, 'shot=settings&theme=light'],
];

const browser = await webkit.launch();
const problems = [];
for (const [name, width, height, query] of shots) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(`${base}?${query}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200);
  const report = await page.evaluate(() => {
    const shekels = [...document.querySelectorAll('.shekel')].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { text: el.textContent, w: r.width, h: r.height, font: cs.fontFamily, display: cs.display };
    });
    const money = document.querySelector('.money-main')?.innerText || '';
    return { shekels, money, hasChar: document.body.innerText.includes('₪') };
  });
  const tiny = report.shekels.filter((s) => s.w < 4 || s.h < 4);
  if (!report.hasChar || tiny.length) {
    problems.push(`${name}: shekel missing or zero-size ${JSON.stringify(report).slice(0, 500)}`);
  }
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  if (errors.length) problems.push(`${name} js: ${errors.join('; ')}`);
  console.log(name, 'shekels', report.shekels.length, 'money', report.money.replace(/\n/g, ' | '));
  await page.close();
}
await browser.close();
if (problems.length) {
  console.log('PROBLEMS');
  console.log(problems.join('\n'));
  process.exit(1);
}
