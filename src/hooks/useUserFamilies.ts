import { useState, useEffect } from 'react';
import { listenUserFamilies } from '../services/familyService';
import type { UserFamily } from '../types';

interface UserFamiliesState {
  families: UserFamily[];
  loading: boolean;
  error: string | null;
}

export function useUserFamilies(uid: string | null): UserFamiliesState {
  const [state, setState] = useState<UserFamiliesState>({ families: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ families: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = listenUserFamilies(uid, (families) => {
      setState({ families, loading: false, error: null });
    });
    return unsub;
  }, [uid]);

  return state;
}
