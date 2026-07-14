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

export interface Watchlist {
  id: string;
  name: string;
  enabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CriteriaMode = 'ANY' | 'ALL';

export interface WatchlistItem {
  id: string;
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
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Deal {
  id: string;
  watchlistItemId: string;
  itemName: string;
  groupName?: string;
  store: string;
  price: number;
  regularPrice?: number | null;
  discount?: number | null;
  validUntil?: string | null;
  sourceUrl?: string | null;
  foundAt?: unknown;
}
