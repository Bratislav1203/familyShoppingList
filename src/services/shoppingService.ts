import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import type { ShoppingItem } from '../types';

export function listenShoppingItems(
  familyId: string,
  callback: (items: ShoppingItem[]) => void
): () => void {
  const q = query(
    collection(db, 'families', familyId, 'items'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const items: ShoppingItem[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ShoppingItem, 'id'>),
    }));
    // Sort: unbought first, then bought; within each group preserve createdAt order
    items.sort((a, b) => {
      if (a.bought === b.bought) return 0;
      return a.bought ? 1 : -1;
    });
    callback(items);
  });
}

export async function addShoppingItem(
  familyId: string,
  data: { name: string; quantity: string; note?: string },
  currentUser: User,
  displayName: string
): Promise<void> {
  const trimmed = data.name.trim();
  if (!trimmed) throw new Error('Unesi naziv stavke');

  await addDoc(collection(db, 'families', familyId, 'items'), {
    name: trimmed,
    quantity: data.quantity.trim(),
    note: data.note?.trim() ?? '',
    bought: false,
    addedBy: currentUser.uid,
    addedByName: displayName,
    boughtBy: null,
    boughtByName: null,
    boughtAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleItemBought(
  familyId: string,
  item: ShoppingItem,
  currentUser: User,
  displayName: string
): Promise<void> {
  const ref = doc(db, 'families', familyId, 'items', item.id);
  if (!item.bought) {
    await updateDoc(ref, {
      bought: true,
      boughtBy: currentUser.uid,
      boughtByName: displayName,
      boughtAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      bought: false,
      boughtBy: null,
      boughtByName: null,
      boughtAt: null,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function deleteShoppingItem(familyId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId, 'items', itemId));
}

export async function clearBoughtItems(familyId: string): Promise<void> {
  const q = query(collection(db, 'families', familyId, 'items'), where('bought', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
