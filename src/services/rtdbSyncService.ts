import { ref, set } from 'firebase/database';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { rtdb, db } from '../lib/firebase';

interface WatchlistItemOut {
  id: string;
  listId: string;
  listName: string;
  name: string;
  brand?: string;
  variant?: string;
  packageSize?: string;
  enabled: boolean;
  criteria: {
    mode: string;
    maxPrice?: number;
    minimumDiscountPercent?: number;
  };
  matching?: {
    includeTerms?: string[];
    excludeTerms?: string[];
  };
  notes?: string;
}

export async function publishWatchlistSnapshot(
  familyId: string,
  token: string
): Promise<void> {
  const watchlistsSnap = await getDocs(
    query(
      collection(db, 'families', familyId, 'watchlists'),
      where('enabled', '==', true)
    )
  );

  const items: WatchlistItemOut[] = [];

  await Promise.all(
    watchlistsSnap.docs.map(async (wlDoc) => {
      const wl = wlDoc.data();
      const itemsSnap = await getDocs(
        query(
          collection(db, 'families', familyId, 'watchlists', wlDoc.id, 'items'),
          where('enabled', '==', true)
        )
      );

      itemsSnap.docs.forEach((d) => {
        const it = d.data();

        const criteria: WatchlistItemOut['criteria'] = {
          mode: it.criteriaMode ?? 'ANY',
        };
        if (it.maxPrice != null) criteria.maxPrice = it.maxPrice;
        if (it.minimumDiscountPercent != null)
          criteria.minimumDiscountPercent = it.minimumDiscountPercent;

        const matching: NonNullable<WatchlistItemOut['matching']> = {};
        if (it.includeTerms?.length) matching.includeTerms = it.includeTerms;
        if (it.excludeTerms?.length) matching.excludeTerms = it.excludeTerms;

        const out: WatchlistItemOut = {
          id: d.id,
          listId: wlDoc.id,
          listName: wl.name,
          name: it.name,
          enabled: true,
          criteria,
        };
        if (it.brand) out.brand = it.brand;
        if (it.variant) out.variant = it.variant;
        if (it.packageSize) out.packageSize = it.packageSize;
        if (Object.keys(matching).length) out.matching = matching;
        if (it.notes) out.notes = it.notes;

        items.push(out);
      });
    })
  );

  const snapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    currency: 'RSD',
    source: 'cenoteka.rs',
    familyId,
    totalItems: items.length,
    items,
  };

  await set(ref(rtdb, `watchlists/${token}`), snapshot);
}
