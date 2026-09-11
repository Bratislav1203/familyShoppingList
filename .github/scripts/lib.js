// Čiste funkcije za dnevni cene job. Bez I/O — lako se rezonuje i (kasnije) testira.

export function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Isti princip kao client searchCatalog: sve reči moraju biti u name/brand.
export function searchCatalog(catalog, query, limit = 60) {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (terms.length === 0) return [];
  const out = [];
  for (const p of catalog) {
    const hay = normalize(`${p.name} ${p.brand ?? ''}`);
    if (terms.every((t) => hay.includes(t))) out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

// Normalizacija pakovanja iz naziva (mirror Python parse_package).
// Vraća { value, unit } gde je unit 'kom'|'kg'|'l', ili { value:null, unit:null }.
export function parsePackage(name, unitHint) {
  const text = (name || '').toLowerCase();

  // Multipack sa jedinicom: "4x0.33L" -> 1.32 l, "6x1.5L" -> 9 l, "8x500ml" -> 4 l.
  let m = text.match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(ml|l|kg|g)\b/);
  if (m) {
    const count = Number(m[1]);
    const size = Number(m[2].replace(',', '.'));
    const u = m[3];
    if (u === 'ml') return { value: round4((count * size) / 1000), unit: 'l' };
    if (u === 'l') return { value: round4(count * size), unit: 'l' };
    if (u === 'g') return { value: round4((count * size) / 1000), unit: 'kg' };
    return { value: round4(count * size), unit: 'kg' }; // kg
  }

  // Multipack bez jedinice: "3x100" -> 300 kom.
  m = text.match(/(\d+)\s*[x×]\s*(\d+)\b/);
  if (m) return { value: Number(m[1]) * Number(m[2]), unit: 'kom' };

  m = text.match(/(\d+)\s*\/\s*1\b/);
  if (m) return { value: Number(m[1]), unit: 'kom' };

  m = text.match(/(\d+)\s*(?:kom(?:ada|\.)?|kaps(?:ula|ule|ul)?|pods?)\b/);
  if (m) return { value: Number(m[1]), unit: 'kom' };

  m = text.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (m) return { value: round4(Number(m[1].replace(',', '.')) / 1000), unit: 'l' };

  m = text.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (m) return { value: Number(m[1].replace(',', '.')), unit: 'l' };

  m = text.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (m) return { value: Number(m[1].replace(',', '.')), unit: 'kg' };

  m = text.match(/(\d+(?:[.,]\d+)?)\s*g\b/);
  if (m) return { value: round4(Number(m[1].replace(',', '.')) / 1000), unit: 'kg' };

  const u = (unitHint || '').trim().toLowerCase();
  if (['kom', 'kom.', 'komada', 'ko'].includes(u)) return { value: null, unit: 'kom' };
  if (u === 'kg') return { value: null, unit: 'kg' };
  if (['l', 'lit'].includes(u)) return { value: null, unit: 'l' };

  return { value: null, unit: null };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

export function toNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Državni CSV nosi dva tipa za istu prodavnicu: VAZECI_CENOVNIK (današnji) i
// MESECNI_PRESEK (snimak od 1. u mesecu, star). Za svaku prodavnicu zadrži samo
// važeći; padni na presek samo ako lanac nema važeći. Time cene prate ono što
// prodavnica trenutno naplaćuje (poklapa se sa Cenotekom).
export function preferCurrentPriceList(rows) {
  const isCurrent = (r) => (r.price_list_type || '').toUpperCase().includes('VAZECI');
  const byStore = new Map(); // retailer -> { current: [], monthly: [] }
  for (const r of rows) {
    const store = r.retailer || '';
    if (!byStore.has(store)) byStore.set(store, { current: [], monthly: [] });
    (isCurrent(r) ? byStore.get(store).current : byStore.get(store).monthly).push(r);
  }
  const out = [];
  for (const { current, monthly } of byStore.values()) {
    out.push(...(current.length > 0 ? current : monthly));
  }
  return out;
}

// Iz reda tracked_prices.csv + info o pakovanju izvodi cenovnu ponudu.
export function buildOffer(row, pkg) {
  const regular = toNumber(row.regular_price);
  const discount = toNumber(row.discount_price);

  // Trenutna cena = akcijska ako postoji, inače redovna.
  const currentPrice = discount != null && discount > 0 ? discount : regular;
  if (currentPrice == null) return null;

  const onSale = discount != null && discount > 0 && regular != null && regular > discount;
  const regularPrice = onSale ? regular : null;
  const discountPercent = onSale ? Math.round(((regular - discount) / regular) * 100) : null;

  // Odbaci veleprodajne/transportne pakete pogrešno deklarisane kao komad.
  // Ako izvorni unit_price (RSD po jedinici) implicira mnogo veću količinu od
  // deklarisanog pakovanja (npr. Metro: 2014 RSD / 254 RSD/l = 7.9 l za "0.33l"),
  // cena se ne odnosi na ovaj proizvod — preskoči red.
  const srcUnitPrice = toNumber(row.unit_price);
  if (
    pkg && pkg.value != null && pkg.value > 0 &&
    srcUnitPrice != null && srcUnitPrice > 0
  ) {
    const impliedQty = currentPrice / srcUnitPrice;
    if (impliedQty > pkg.value * 2) return null;
  }

  let unitPrice = null;
  let unitPriceUnit = null;
  // Sami računamo unit price iz pakovanja — kolona `unit` u državnom CSV-u je
  // nekonzistentna (IDEA/Aman šalju 'KOM' za piće, Delhaize 'lit'), pa poređenje
  // "najbolja po jedinici" ispadne besmisleno ako joj verujemo.
  if (pkg && pkg.value != null && pkg.value > 0 && pkg.unit) {
    unitPrice = Math.round((currentPrice / pkg.value) * 100) / 100;
    unitPriceUnit = `RSD/${pkg.unit}`;
  }

  return {
    store: row.retailer || '',
    price: currentPrice,
    regularPrice,
    discount: discountPercent,
    packageValue: pkg ? pkg.value : null,
    packageUnit: pkg ? pkg.unit : null,
    unitPrice,
    unitPriceUnit,
    validUntil: row.discount_end || null,
    priceListDate: row.price_list_date || null,
    priceListType: row.price_list_type || null,
  };
}

// Da li ponuda zadovoljava kriterijume watch itema. Bez prodavnica-filtera —
// prikupljamo iz SVIH lanaca radi poređenja.
export function matchesItem(offer, productName, item) {
  const nameLower = normalize(productName);
  const inc = item.matching?.includeTerms ?? [];
  const exc = item.matching?.excludeTerms ?? [];

  for (const t of inc) if (!nameLower.includes(normalize(t))) return false;
  for (const t of exc) if (nameLower.includes(normalize(t))) return false;

  const maxPrice = item.criteria?.maxPrice;
  const minDisc = item.criteria?.minimumDiscountPercent;
  const mode = item.criteria?.mode ?? 'ANY';

  const priceOk = maxPrice != null ? offer.price <= maxPrice : null;
  const discountOk =
    minDisc != null && offer.discount != null ? offer.discount >= minDisc : null;

  if (mode === 'ALL') {
    if (maxPrice != null && priceOk !== true) return false;
    if (minDisc != null && discountOk !== true) return false;
    return true;
  }
  // ANY
  if (priceOk === true) return true;
  if (discountOk === true) return true;
  if (maxPrice == null && minDisc == null) return true;
  return false;
}
