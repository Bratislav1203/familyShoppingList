import admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// ─── Firebase init ────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Load watchlist from RTDB ─────────────────────────────────────────────────

const RTDB_URL = `https://family-shopping-list-ed1d8-default-rtdb.europe-west1.firebasedatabase.app/watchlists/${process.env.RTDB_TOKEN}.json`;

async function loadWatchlist() {
  const res = await fetch(RTDB_URL);
  const data = await res.json();
  if (!data || !data.items || data.totalItems === 0) {
    console.log('Watchlist je prazna, nema šta da se proverava.');
    process.exit(0);
  }
  return data;
}

// ─── Search Cenoteka.rs ───────────────────────────────────────────────────────

async function searchCenoteka(item) {
  const query = [item.name, item.brand, item.variant, item.packageSize]
    .filter(Boolean)
    .join(' ');

  const url = `https://cenoteka.rs/pretraga?q=${encodeURIComponent(query)}`;
  console.log(`Tražim: ${query}`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PriceChecker/1.0)',
      'Accept-Language': 'sr-RS,sr;q=0.9',
    },
  });

  if (!res.ok) {
    console.log(`  Cenoteka nije odgovorila (${res.status})`);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const results = [];

  // Svaki rezultat pretrage na Cenoteka.rs
  $('[class*="product"], [class*="offer"], article').each((_, el) => {
    const name = $(el).find('[class*="name"], [class*="title"], h2, h3').first().text().trim();
    const priceText = $(el).find('[class*="price"], [class*="cena"]').first().text().trim();
    const oldPriceText = $(el).find('[class*="old"], [class*="regular"], [class*="stara"]').first().text().trim();
    const storeText = $(el).find('[class*="store"], [class*="retailer"], [class*="shop"]').first().text().trim();
    const link = $(el).find('a').first().attr('href');
    const discountText = $(el).find('[class*="discount"], [class*="popust"], [class*="save"]').first().text().trim();

    if (!name || !priceText) return;

    const price = parseFloat(priceText.replace(/[^\d,\.]/g, '').replace(',', '.'));
    const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,\.]/g, '').replace(',', '.')) : null;
    const discountMatch = discountText.match(/\d+/);
    const discount = discountMatch ? parseInt(discountMatch[0]) : (oldPrice && price ? Math.round((1 - price / oldPrice) * 100) : null);
    const sourceUrl = link ? (link.startsWith('http') ? link : `https://cenoteka.rs${link}`) : null;

    if (isNaN(price)) return;

    results.push({ name, price, oldPrice, discount, store: storeText || null, sourceUrl });
  });

  return results;
}

// ─── Match logic ─────────────────────────────────────────────────────────────

function matchesItem(result, item) {
  const nameLower = result.name.toLowerCase();

  // includeTerms — sve moraju biti prisutne
  if (item.matching?.includeTerms) {
    for (const term of item.matching.includeTerms) {
      if (!nameLower.includes(term.toLowerCase())) return false;
    }
  }

  // excludeTerms — nijedna ne sme biti prisutna
  if (item.matching?.excludeTerms) {
    for (const term of item.matching.excludeTerms) {
      if (nameLower.includes(term.toLowerCase())) return false;
    }
  }

  // Samo Lidl
  if (result.store && !result.store.toLowerCase().includes('lidl')) return false;

  // criteria
  const { maxPrice, minimumDiscountPercent, mode } = item.criteria;
  const priceOk = maxPrice != null ? result.price <= maxPrice : null;
  const discountOk = minimumDiscountPercent != null && result.discount != null
    ? result.discount >= minimumDiscountPercent
    : null;

  if (mode === 'ALL') {
    if (maxPrice != null && !priceOk) return false;
    if (minimumDiscountPercent != null && !discountOk) return false;
    return true;
  } else {
    // ANY
    if (priceOk === true) return true;
    if (discountOk === true) return true;
    // Ako nema ni maxPrice ni minimumDiscountPercent, svaka ponuda prolazi
    if (maxPrice == null && minimumDiscountPercent == null) return true;
    return false;
  }
}

// ─── Save deal to Firestore ───────────────────────────────────────────────────

async function saveDeal(familyId, item, result) {
  const doc = {
    watchlistItemId: item.id,
    itemName: result.name,
    store: result.store || 'Lidl',
    price: result.price,
    foundAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (result.oldPrice) doc.regularPrice = result.oldPrice;
  if (result.discount) doc.discount = result.discount;
  if (result.sourceUrl) doc.sourceUrl = result.sourceUrl;

  await db.collection('families').doc(familyId).collection('deals').add(doc);
  console.log(`  ✓ Upisano: ${result.name} — ${result.price} RSD (${result.discount ?? '?'}% popust)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const watchlist = await loadWatchlist();
  const familyId = watchlist.familyId;
  console.log(`familyId: ${familyId}, proizvoda: ${watchlist.totalItems}`);

  let totalSaved = 0;

  for (const item of watchlist.items) {
    console.log(`\nProizvod: ${item.name} (${item.packageSize ?? ''})`);

    let results;
    try {
      results = await searchCenoteka(item);
    } catch (err) {
      console.log(`  Greška pri pretrazi: ${err.message}`);
      continue;
    }

    console.log(`  Pronađeno rezultata: ${results.length}`);

    for (const result of results) {
      if (matchesItem(result, item)) {
        try {
          await saveDeal(familyId, item, result);
          totalSaved++;
        } catch (err) {
          console.log(`  Greška pri upisu: ${err.message}`);
        }
      }
    }
  }

  console.log(`\nUkupno upisano: ${totalSaved} ponuda`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
