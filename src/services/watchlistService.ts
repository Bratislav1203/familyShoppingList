import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateToken } from '../utils/generateToken';
import type { Watchlist, WatchlistItem, CriteriaMode } from '../types';

// ─── Watchlists ───────────────────────────────────────────────────────────────

export function listenWatchlists(
  familyId: string,
  callback: (lists: Watchlist[]) => void
): () => void {
  return onSnapshot(collection(db, 'families', familyId, 'watchlists'), (snap) => {
    const lists: Watchlist[] = snap.docs.map((d) => ({
      ...(d.data() as Omit<Watchlist, 'id'>),
      id: d.id,
    }));
    callback(lists);
  });
}

export async function createWatchlist(familyId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'families', familyId, 'watchlists'), {
    name: name.trim(),
    enabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWatchlist(
  familyId: string,
  watchlistId: string,
  data: Partial<Pick<Watchlist, 'name' | 'enabled'>>
): Promise<void> {
  await updateDoc(doc(db, 'families', familyId, 'watchlists', watchlistId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWatchlist(familyId: string, watchlistId: string): Promise<void> {
  const itemsSnap = await getDocs(
    collection(db, 'families', familyId, 'watchlists', watchlistId, 'items')
  );
  await Promise.all(itemsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'families', familyId, 'watchlists', watchlistId));
}

// ─── Watchlist items ──────────────────────────────────────────────────────────

export function listenWatchlistItems(
  familyId: string,
  watchlistId: string,
  callback: (items: WatchlistItem[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'families', familyId, 'watchlists', watchlistId, 'items'),
    (snap) => {
      const items: WatchlistItem[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<WatchlistItem, 'id'>),
        id: d.id,
      }));
      callback(items);
    }
  );
}

export interface WatchlistItemInput {
  name: string;
  brand?: string;
  variant?: string;
  packageSize?: string;
  enabled: boolean;
  maxPrice?: number | null;
  minimumDiscountPercent?: number | null;
  criteriaMode: CriteriaMode;
  includeTerms?: string[];
  excludeTerms?: string[];
  notes?: string;
}

export async function createWatchlistItem(
  familyId: string,
  watchlistId: string,
  data: WatchlistItemInput
): Promise<string> {
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  const ref = await addDoc(
    collection(db, 'families', familyId, 'watchlists', watchlistId, 'items'),
    {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return ref.id;
}

export async function updateWatchlistItem(
  familyId: string,
  watchlistId: string,
  itemId: string,
  data: Partial<WatchlistItemInput>
): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await updateDoc(
    doc(db, 'families', familyId, 'watchlists', watchlistId, 'items', itemId),
    { ...clean, updatedAt: serverTimestamp() }
  );
}

export async function deleteWatchlistItem(
  familyId: string,
  watchlistId: string,
  itemId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'families', familyId, 'watchlists', watchlistId, 'items', itemId)
  );
}

// ─── Token ────────────────────────────────────────────────────────────────────

export async function ensureWatchlistToken(familyId: string): Promise<string> {
  const familyRef = doc(db, 'families', familyId);
  const snap = await getDoc(familyRef);
  if (!snap.exists()) throw new Error('Porodica nije pronađena');

  const existing = snap.data().watchlistToken as string | undefined;
  if (existing) return existing;

  const token = generateToken(32);
  await updateDoc(familyRef, { watchlistToken: token, updatedAt: serverTimestamp() });
  return token;
}

export async function regenerateWatchlistToken(familyId: string): Promise<string> {
  const token = generateToken(32);
  await updateDoc(doc(db, 'families', familyId), {
    watchlistToken: token,
    updatedAt: serverTimestamp(),
  });
  return token;
}
