import type { CatalogProduct } from '../types';

let cache: CatalogProduct[] | null = null;
let inflight: Promise<CatalogProduct[]> | null = null;

export function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // ukloni dijakritike
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function loadCatalog(): Promise<CatalogProduct[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch('/catalog.json')
    .then((res) => {
      if (!res.ok) throw new Error(`catalog.json ${res.status}`);
      return res.json();
    })
    .then((data: CatalogProduct[]) => {
      cache = data;
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

// Sinhroni search nad učitanim katalogom. Sve reči query-ja moraju biti prisutne
// u nazivu ili brendu (dijakritik/case-insensitive).
export function searchCatalog(
  catalog: CatalogProduct[],
  query: string,
  limit = 30
): CatalogProduct[] {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (terms.length === 0) return [];

  const scored: { p: CatalogProduct; score: number }[] = [];
  for (const p of catalog) {
    const haystack = normalize(`${p.name} ${p.brand ?? ''}`);
    if (!terms.every((t) => haystack.includes(t))) continue;
    // Kraća imena i tačan redosled reči rangiraju se više.
    const phrase = normalize(query);
    let score = 100 - Math.min(haystack.length, 80);
    if (haystack.includes(phrase)) score += 50;
    scored.push({ p, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.p);
}
