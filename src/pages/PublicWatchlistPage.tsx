import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

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

interface JsonResponse {
  schemaVersion: number;
  generatedAt: string;
  currency: string;
  source: string;
  familyId: string;
  totalItems: number;
  items: WatchlistItemOut[];
}

export default function PublicWatchlistPage() {
  const { token } = useParams<{ token: string }>();
  const [json, setJson] = useState<JsonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Neispravan token');
      return;
    }

    async function load() {
      try {
        // Pronađi porodicu po tokenu
        const familySnap = await getDocs(
          query(
            collection(db, 'families'),
            where('watchlistToken', '==', token),
            limit(1)
          )
        );

        if (familySnap.empty) {
          setError('Not found');
          return;
        }

        const familyId = familySnap.docs[0].id;

        // Učitaj enabled watchliste
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

              const matching: WatchlistItemOut['matching'] = {};
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

        setJson({
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          currency: 'RSD',
          source: 'cenoteka.rs',
          familyId,
          totalItems: items.length,
          items,
        });
      } catch (err) {
        setError(String(err));
      }
    }

    load();
  }, [token]);

  if (error) {
    const out = JSON.stringify({ error }, null, 2);
    return (
      <pre
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'monospace',
          fontSize: 14,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {out}
      </pre>
    );
  }

  if (!json) {
    return (
      <pre style={{ margin: 0, padding: 0, fontFamily: 'monospace', fontSize: 14 }}>
        Loading...
      </pre>
    );
  }

  return (
    <pre
      style={{
        margin: 0,
        padding: 0,
        fontFamily: 'monospace',
        fontSize: 14,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {JSON.stringify(json, null, 2)}
    </pre>
  );
}
