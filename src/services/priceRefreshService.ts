import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

// Poziva Cloud Function (refreshPrices) koja pokreće GitHub Actions workflow.
// Token stoji na serveru kao secret — nije u frontend bundle-u.
const callRefresh = httpsCallable<{ familyId: string }, { ok: boolean }>(
  functions,
  'refreshPrices'
);

export async function triggerPriceRefresh(familyId: string): Promise<void> {
  await callRefresh({ familyId });
}

// Dugme je uvek dostupno — provera prijave se radi na serveru.
export const priceRefreshEnabled = true;
