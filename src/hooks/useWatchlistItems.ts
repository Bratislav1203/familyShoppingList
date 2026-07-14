import { useState, useEffect } from 'react';
import { listenWatchlistItems } from '../services/watchlistService';
import type { WatchlistItem } from '../types';

export function useWatchlistItems(familyId: string | null, watchlistId: string | null) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !watchlistId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenWatchlistItems(familyId, watchlistId, (its) => {
      setItems(its);
      setLoading(false);
    });
    return unsub;
  }, [familyId, watchlistId]);

  return { items, loading };
}
