export type FamilyRole = 'owner' | 'member';

export interface UserProfile {
  displayName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  inviteEnabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserFamily {
  familyId: string;
  familyName: string;
  role: FamilyRole;
  joinedAt?: unknown;
}

export interface FamilyMember {
  userId: string;
  displayName: string;
  role: FamilyRole;
  joinedAt?: unknown;
  inviteCodeUsed?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  note?: string;
  bought: boolean;
  addedBy: string;
  addedByName: string;
  boughtBy: string | null;
  boughtByName: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  boughtAt?: unknown | null;
}

export interface Invite {
  code: string;
  familyId: string;
  familyName: string;
  active: boolean;
  createdBy: string;
  createdAt?: unknown;
}
