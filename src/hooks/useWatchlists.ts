import { useState, useEffect } from 'react';
import { listenWatchlists } from '../services/watchlistService';
import type { Watchlist } from '../types';

export function useWatchlists(familyId: string | null) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setWatchlists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenWatchlists(familyId, (lists) => {
      setWatchlists(lists);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  return { watchlists, loading };
}
