import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { ensureAnonymousUser, listenAuthState } from '../services/authService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    let resolved = false;

    const unsub = listenAuthState(async (user) => {
      if (user) {
        resolved = true;
        setState({ user, loading: false, error: null });
      } else if (!resolved) {
        resolved = true;
        try {
          const newUser = await ensureAnonymousUser();
          setState({ user: newUser, loading: false, error: null });
        } catch (err) {
          setState({ user: null, loading: false, error: 'Došlo je do greške, pokušaj ponovo' });
        }
      } else {
        setState({ user: null, loading: false, error: null });
      }
    });

    return unsub;
  }, []);

  return state;
}
