import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../src');
const bad = [];
const rules = [
  { re: /text-align:\s*(left|right)/, why: 'use start or end' },
  { re: /margin-(left|right)/, why: 'use margin-inline' },
  { re: /padding-(left|right)/, why: 'use padding-inline' },
  { re: /direction:\s*ltr/, why: 'only .num-ltr may set direction' },
];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (/\.(css|js)$/.test(name)) scan(file);
  }
}

function scan(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('.num-ltr') || line.includes('bdi')) return;
    for (const rule of rules) {
      if (rule.re.test(line)) bad.push(`${path.relative(root, file)}:${i + 1} ${rule.why}: ${line.trim()}`);
    }
  });
}

walk(root);
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
console.log('rtl lint ok');
