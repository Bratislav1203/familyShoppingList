import { useState, useEffect } from 'react';
import { listenUserProfile } from '../services/userService';
import type { UserProfile } from '../types';

interface UserProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useUserProfile(uid: string | null): UserProfileState {
  const [state, setState] = useState<UserProfileState>({ profile: null, loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ profile: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = listenUserProfile(uid, (profile) => {
      setState({ profile, loading: false, error: null });
    });
    return unsub;
  }, [uid]);

  return state;
}
