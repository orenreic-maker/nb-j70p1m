import data from './data/prices-il.json' with { type: 'json' };

export const PACK_DEFAULT = data.defaults.cigarette_pack_price_ils;
export const RYO_PRICE_DEFAULT = data.defaults.ryo_pouch.price_ils;
export const RYO_GRAMS_DEFAULT = data.defaults.ryo_pouch.grams;
export const KIT_ILS = data.defaults.kit_ils;
export const GPC = data.defaults.grams_per_cigarette;

const fold = (s) => String(s || '').toLowerCase().replace(/[\u0591-\u05C7'׳״"\s\-_.]/g, '');

export function brandLabel(it) {
  if (!it) return '';
  return `${it.brand_he || ''} ${it.variant_he || ''}`.replace(/\s+/g, ' ').trim();
}

export function catalog(mode) {
  const list = mode === 'ryo' ? data.rolling_tobacco : data.cigarettes;
  return [...list].sort((a, b) => brandLabel(a).localeCompare(brandLabel(b), 'he'));
}

export function findBrand(id) {
  return [...data.cigarettes, ...data.rolling_tobacco].find((it) => it.id === id) || null;
}

export function pouchVariant(id, grams) {
  const item = findBrand(id);
  if (!item) return null;
  return data.rolling_tobacco.find((it) => it.brand === item.brand && it.pouch_grams === grams) || item;
}

export function searchBrands(mode, query) {
  const q = fold(query);
  return catalog(mode).filter((it) => {
    if (!q) return true;
    return fold(`${it.brand_he}${it.variant_he}${it.brand}${it.variant}`).includes(q);
  });
}

export function pouchSizes(item) {
  if (!item) return [30, 40, 50];
  const sizes = data.rolling_tobacco
    .filter((it) => it.brand === item.brand)
    .map((it) => it.pouch_grams)
    .filter((n) => Number.isFinite(n));
  return [...new Set(sizes)].sort((a, b) => a - b);
}

export function cigCost({ mode, price, grams } = {}) {
  if (mode === 'ryo') {
    const g = Number(grams) > 0 ? Number(grams) : RYO_GRAMS_DEFAULT;
    const p = Number.isFinite(+price) ? +price : RYO_PRICE_DEFAULT;
    return p / (g / GPC) + KIT_ILS;
  }
  const p = Number.isFinite(+price) ? +price : PACK_DEFAULT;
  return p / 20;
}

export function brandNames() {
  const names = new Set();
  for (const it of [...data.cigarettes, ...data.rolling_tobacco]) {
    for (const part of [it.brand_he, it.brand]) {
      const n = fold(part);
      if (n.length >= 3) names.add(n);
    }
  }
  return [...names];
}

/** Write the picked product onto settings. Papers and filters stay inside the rolling formula. */
export function applyProduct(s, draft) {
  const mode = draft.mode === 'ryo' ? 'ryo' : 'pack';
  s.mode = mode;
  s.perPack = 20;
  s.gpc = GPC;
  s.priceModel = 'simple';
  s.brandId = draft.brandId && draft.brandId !== 'other' ? draft.brandId : '';
  s.brandLabel = (draft.brandLabel || '').trim();
  const touched = !!draft.priceTouched;
  s.costSource = s.brandId && !touched ? `brand:${s.brandId}` : 'custom';
  const price = Number(draft.price);
  if (mode === 'pack') {
    s.packPrice = Number.isFinite(price) && price > 0 ? price : PACK_DEFAULT;
  } else {
    s.tobPrice = Number.isFinite(price) && price > 0 ? price : RYO_PRICE_DEFAULT;
    s.tobGrams = Number(draft.grams) > 0 ? Number(draft.grams) : RYO_GRAMS_DEFAULT;
    s.papPrice = 0;
    s.filPrice = 0;
  }
}
