import words from './data/content-filter.json' with { type: 'json' };
import { brandNames } from './prices.js';

const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'l' };
const PRE = new Set([...'הובלמשכ']);
const ALLOW = new Set(words.allow.map((w) => normalize(w)));
const twins = (s) => [s, s.replace(/ן/g, 'נ'), s.replace(/נ/g, 'ן')];
const WHOLE = new Set(words.heWhole.flatMap((w) => twins(normalize(w).replace(/\s/g, ''))));
const PREFIX = words.hePrefix.map((w) => normalize(w).replace(/\s/g, ''));
const PHRASES = words.phrases.map((w) => normalize(w));
const STRONG = words.enStrong.map((w) => w.toLowerCase());
const SHORT = new Set(words.enWord.map((w) => w.toLowerCase()));

const MESSAGES = {
  name: 'השם הזה לא יעבור אצלנו. אפשר לבחור שם או כינוי אחר?',
  goal: 'לזה לא נחסוך. אולי משהו שיעשה טוב? טיול, מתנה, חוויה.',
  reason: 'אולי ננסח את זה אחרת? הסיבה תופיע ברגעים קשים.',
};

export function normalize(raw) {
  let s = String(raw || '').normalize('NFKC').toLowerCase();
  s = s.replace(/[\u0591-\u05C7]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  s = [...s].map((ch) => FINALS[ch] || LEET[ch] || ch).join('');
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  s = s.replace(/(.)\1{2,}/g, '$1');
  return s.replace(/\s+/g, ' ').trim();
}

function stripPrefix(tok) {
  let t = tok;
  while (t.length > 2 && PRE.has(t[0])) t = t.slice(1);
  return t;
}

function hebrewHit(token, next) {
  if (!token || ALLOW.has(token)) return false;
  const bare = token.replace(/[יו]/g, '');
  const forms = [token, bare, stripPrefix(token), stripPrefix(bare)];
  for (const f of forms) {
    if (!f) continue;
    if (WHOLE.has(f)) {
      if (f === 'כוס' && next) return false;
      return true;
    }
  }
  const stripped = stripPrefix(bare || token);
  if (stripped.length >= 3 && !['כוס', 'תחת', 'ביצים', 'סם', 'קוק'].includes(stripped)) {
    if (PREFIX.some((root) => root.length >= 3 && stripped.startsWith(root))) return true;
  }
  return false;
}

function englishHit(text, tokens) {
  const blob = text.replace(/\s/g, '');
  if (ALLOW.has(blob) || tokens.every((t) => ALLOW.has(t))) return false;
  for (const w of STRONG) {
    if (!blob.includes(w)) continue;
    if (tokens.some((t) => t.includes(w) && !ALLOW.has(t))) return true;
    if (tokens.every((t) => t.length <= 2)) return true;
  }
  return tokens.some((t) => SHORT.has(t));
}

/** Returns an inline message, or null when the text is fine. */
export function checkText(raw, kind = 'name') {
  const norm = normalize(raw);
  if (!norm) return null;
  if (ALLOW.has(norm)) return null;
  const tokens = norm.split(' ').filter(Boolean);
  if (tokens.every((t) => ALLOW.has(t))) return null;
  const flat = norm.replace(/\s/g, '');
  if (PHRASES.some((p) => norm.includes(p) || flat.includes(p.replace(/\s/g, '')))) return MESSAGES[kind] || MESSAGES.name;
  if (hebrewHit(flat, '') || hebrewHit(flat.replace(/[יו]/g, ''), '')) return MESSAGES[kind] || MESSAGES.name;
  for (let i = 0; i < tokens.length; i++) {
    if (hebrewHit(tokens[i], tokens[i + 1])) return MESSAGES[kind] || MESSAGES.name;
  }
  if (englishHit(norm, tokens)) return MESSAGES[kind] || MESSAGES.name;
  if (kind === 'goal') {
    const extra = new Set([...words.goalExtra.map((w) => normalize(w).replace(/\s/g, '')), ...brandNames()]);
    const hit = tokens.some((t) => extra.has(t) || extra.has(stripPrefix(t)));
    if (hit || [...extra].some((b) => b.length >= 4 && flat.includes(b))) return MESSAGES.goal;
  }
  return null;
}
