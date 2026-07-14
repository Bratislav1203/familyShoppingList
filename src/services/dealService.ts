import {
  collection,
  onSnapshot,
  deleteDoc,
  getDocs,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Deal } from '../types';

export function listenDeals(
  familyId: string,
  callback: (deals: Deal[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'families', familyId, 'deals'),
      orderBy('foundAt', 'desc')
    ),
    (snap) => {
      const deals: Deal[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Deal, 'id'>),
        id: d.id,
      }));
      callback(deals);
    }
  );
}

export async function deleteDeal(familyId: string, dealId: string): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId, 'deals', dealId));
}

export async function deleteAllDeals(familyId: string): Promise<void> {
  const snap = await getDocs(collection(db, 'families', familyId, 'deals'));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
