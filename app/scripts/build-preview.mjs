import { build } from 'vite';
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '..');
const dest = path.join(repoRoot, 'preview');

await build({
  root: appRoot,
  base: './',
  build: { outDir: path.join(appRoot, 'dist'), emptyOutDir: true },
});

await rm(dest, { recursive: true, force: true });
await cp(path.join(appRoot, 'dist'), dest, { recursive: true });
console.log('BreathAnew preview written to preview/ (relative paths). The live root app was not modified.');
