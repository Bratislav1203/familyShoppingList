import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export async function ensureAnonymousUser(): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function listenAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
