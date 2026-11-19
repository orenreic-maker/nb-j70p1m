import { APP } from './config.js';
import { isNative } from './native.js';

/** Placeholder until the store returns a real price. Not a charged amount. */
export const REMOVE_ADS_PRICE_PLACEHOLDER = '14.90 ₪';

export function priceLabel() {
  return REMOVE_ADS_PRICE_PLACEHOLDER;
}

export async function buyRemoveAds() {
  if (!isNative()) return { ok: false, reason: 'web' };
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    const result = await NativePurchases.purchaseProduct({
      productIdentifier: APP.removeAdsProductId,
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1,
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, reason: 'store', message: e?.message || '' };
  }
}

export async function restoreRemoveAds() {
  if (!isNative()) return { ok: false, reason: 'web' };
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
    await NativePurchases.restorePurchases();
    let owned = false;
    if (typeof NativePurchases.getPurchases === 'function') {
      const res = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
      const list = res?.purchases || res?.products || res || [];
      owned = JSON.stringify(list).includes(APP.removeAdsProductId);
    }
    return { ok: true, owned };
  } catch (e) {
    return { ok: false, reason: 'store', message: e?.message || '' };
  }
}
