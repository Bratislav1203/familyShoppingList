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

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string;
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
  recipeIngredients?: RecipeIngredient[];
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

export type WatchType = 'EXACT_PRODUCT' | 'SEARCH_QUERY';

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
  // Praćenje po katalogu. Stari zapisi bez watchType tretiraju se kao EXACT_PRODUCT.
  watchType?: WatchType;
  query?: string;        // originalni search string (SEARCH_QUERY)
  ean?: string;          // EAN iz kataloga (EXACT_PRODUCT)
  catalogName?: string;  // kanonsko ime iz kataloga
  category?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CatalogProduct {
  ean: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  packageValue?: number | null;
  packageUnit?: string | null; // 'kom' | 'kg' | 'l'
  retailers?: string[];
}

export interface Deal {
  id: string;
  watchlistItemId: string;
  familyId?: string;
  catalogEan?: string;
  itemName: string;
  groupName?: string;
  brand?: string;
  store: string;
  price: number;                 // trenutna cena koju korisnik plaća
  regularPrice?: number | null;  // stara cena, samo ako je na akciji
  discount?: number | null;      // % popust
  packageValue?: number | null;
  packageUnit?: string | null;
  unitPrice?: number | null;
  unitPriceUnit?: string | null; // 'RSD/kom' | 'RSD/kg' | 'RSD/l'
  validUntil?: string | null;
  sourceUrl?: string | null;
  fetchRunId?: string;
  fetchedAt?: unknown;
  foundAt?: unknown;
}
