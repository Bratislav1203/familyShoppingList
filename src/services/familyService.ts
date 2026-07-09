import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { generateInviteCode } from '../utils/generateInviteCode';
import type { Family, UserFamily, FamilyMember } from '../types';

const ACTIVE_FAMILY_KEY = 'activeFamilyId';

export function setActiveFamilyId(familyId: string): void {
  localStorage.setItem(ACTIVE_FAMILY_KEY, familyId);
}

export function getActiveFamilyId(): string | null {
  return localStorage.getItem(ACTIVE_FAMILY_KEY);
}

export async function createFamily(name: string, currentUser: User): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Unesi naziv porodice');

  const inviteCode = generateInviteCode(6);
  const familyRef = doc(collection(db, 'families'));
  const familyId = familyRef.id;

  const batch = writeBatch(db);

  // families/{familyId}
  batch.set(familyRef, {
    name: trimmed,
    createdBy: currentUser.uid,
    inviteCode,
    inviteEnabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // families/{familyId}/members/{uid}
  batch.set(doc(db, 'families', familyId, 'members', currentUser.uid), {
    userId: currentUser.uid,
    displayName: currentUser.displayName ?? '',
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  // users/{uid}/families/{familyId}
  batch.set(doc(db, 'users', currentUser.uid, 'families', familyId), {
    familyId,
    familyName: trimmed,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  // invites/{inviteCode}
  batch.set(doc(db, 'invites', inviteCode), {
    code: inviteCode,
    familyId,
    familyName: trimmed,
    active: true,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  setActiveFamilyId(familyId);
  return familyId;
}

export function listenUserFamilies(
  uid: string,
  callback: (families: UserFamily[]) => void
): () => void {
  return onSnapshot(collection(db, 'users', uid, 'families'), (snap) => {
    const families: UserFamily[] = snap.docs.map((d) => ({
      ...(d.data() as Omit<UserFamily, 'familyId'>),
      familyId: d.id,
    }));
    callback(families);
  });
}

export async function joinFamilyByInviteCode(
  inviteCode: string,
  currentUser: User,
  displayName: string
): Promise<string> {
  const code = inviteCode.trim().toUpperCase();
  const inviteSnap = await getDoc(doc(db, 'invites', code));

  if (!inviteSnap.exists()) throw new Error('Invite kod nije pronađen');

  const invite = inviteSnap.data();
  if (!invite.active) throw new Error('Invite kod više nije aktivan');

  const { familyId, familyName } = invite;

  // Check if already a member
  const memberSnap = await getDoc(doc(db, 'families', familyId, 'members', currentUser.uid));
  if (memberSnap.exists()) {
    setActiveFamilyId(familyId);
    return familyId;
  }

  const batch = writeBatch(db);

  batch.set(doc(db, 'families', familyId, 'members', currentUser.uid), {
    userId: currentUser.uid,
    displayName,
    role: 'member',
    joinedAt: serverTimestamp(),
    inviteCodeUsed: code,
  });

  batch.set(doc(db, 'users', currentUser.uid, 'families', familyId), {
    familyId,
    familyName,
    role: 'member',
    joinedAt: serverTimestamp(),
  });

  await batch.commit();
  setActiveFamilyId(familyId);
  return familyId;
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const snap = await getDoc(doc(db, 'families', familyId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Family, 'id'>) };
}

export function listenFamilyMembers(
  familyId: string,
  callback: (members: FamilyMember[]) => void
): () => void {
  return onSnapshot(collection(db, 'families', familyId, 'members'), (snap) => {
    const members: FamilyMember[] = snap.docs.map((d) => d.data() as FamilyMember);
    callback(members);
  });
}

export async function regenerateInviteCode(familyId: string, createdBy: string): Promise<string> {
  const newCode = generateInviteCode(6);
  const familySnap = await getDoc(doc(db, 'families', familyId));
  if (!familySnap.exists()) throw new Error('Porodica nije pronađena');
  const familyName = familySnap.data().name as string;

  const batch = writeBatch(db);
  batch.update(doc(db, 'families', familyId), { inviteCode: newCode, updatedAt: serverTimestamp() });
  batch.set(doc(db, 'invites', newCode), {
    code: newCode,
    familyId,
    familyName,
    active: true,
    createdBy,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return newCode;
}
