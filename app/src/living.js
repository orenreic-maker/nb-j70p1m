import { CANVAS, SCENES } from './scene-data.js';

const STAGES = [
  { id: 'haze', max: 2, label: 'אוויר ראשון' },
  { id: 'first-light', max: 13, label: 'אור ראשון' },
  { id: 'clearing', max: 59, label: 'השמיים מתבהרים' },
  { id: 'blooming', max: 179, label: 'הנבטה מוריקה' },
  { id: 'full-bloom', max: Infinity, label: 'פריחה מלאה' },
];

export function stageFor(days) {
  return STAGES.find((s) => days <= s.max) || STAGES[STAGES.length - 1];
}

function animClass(role, i) {
  if (role === 'sun-glow') return 'breathe';
  if (role === 'sun') return 'bob';
  if (role === 'cloud') return i % 2 ? 'drift-l' : 'drift';
  if (role === 'bird') return 'glide';
  if (role === 'butterfly') return 'flutter';
  if (role === 'tree' || role === 'flowers-fg') return 'sway';
  if (role === 'near-hills') return 'sway-soft';
  return '';
}

export function livingScene(days, dark, opt = {}) {
  const stage = stageFor(Math.max(0, days));
  const layers = (SCENES[stage.id] || []).filter((l) => !(opt.omit || []).includes(l.role));
  const W = CANVAS.w;
  const H = CANVAS.h;
  let clouds = 0;
  let birds = 0;
  const html = layers.map((l, i) => {
    const file = dark && l.file.endsWith('/00-sky.webp') ? l.file.replace('/00-sky.webp', '/00-sky-dusk.webp') : l.file;
    const full = !l.w;
    const box = full
      ? 'inset:0'
      : `left:${(l.x / W) * 100}%;top:${(l.y / H) * 100}%;width:${(l.w / W) * 100}%;height:${(l.h / H) * 100}%`;
    const kind = l.role === 'cloud' ? clouds++ : l.role === 'bird' ? birds++ : i;
    const motion = animClass(l.role, kind);
    const sky = l.role === 'sky' ? ' sky' : '';
    const sun = l.role === 'sun' || l.role === 'sun-glow' ? ' sun' : '';
    const delay = (kind % 5) * 0.6;
    return `<div class="ly${sky}${sun}" style="${box};z-index:${l.z};--d:${l.depth}"><img class="${motion}" src="art/${file}" alt="" draggable="false" decoding="async" style="opacity:${l.opacity};animation-delay:${delay}s"></div>`;
  }).join('');
  const c = opt.center;
  const center = c ? `<div class="ly center" style="left:${(c.x / W) * 100}%;top:${(c.y / H) * 100}%;width:${(c.w / W) * 100}%;height:${(c.w / W) * (W / H) * 100}%;z-index:${c.z || 26}"><img class="sway-soft" src="${c.src}" alt="" draggable="false"></div>` : '';
  return { stage, html: `<div class="stack" aria-hidden="true">${html}${center}</div>` };
}
