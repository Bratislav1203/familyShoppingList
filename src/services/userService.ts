import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types';

export async function createOrUpdateUserProfile(uid: string, displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error('Unesi ime');

  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await setDoc(ref, { displayName: trimmed, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, {
      displayName: trimmed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function listenUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}
