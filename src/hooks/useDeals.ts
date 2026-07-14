import { useState, useEffect } from 'react';
import { listenDeals } from '../services/dealService';
import type { Deal } from '../types';

export function useDeals(familyId: string | null) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setDeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenDeals(familyId, (d) => {
      setDeals(d);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  return { deals, loading };
}
