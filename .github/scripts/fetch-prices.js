import admin from 'firebase-admin';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  searchCatalog,
  parsePackage,
  buildOffer,
  matchesItem,
  preferCurrentPriceList,
} from './lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

// ─── Firebase init ──────────────────────────────────────────────────────────

const RTDB_BASE = 'https://family-shopping-list-ed1d8-default-rtdb.europe-west1.firebasedatabase.app';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: RTDB_BASE,
});
const db = admin.firestore();
const rtdb = admin.database();

// Prazno = daily (sve porodice); postavljeno = ručno pokretanje za jednu porodicu.
const FAMILY_ID_FILTER = (process.env.FAMILY_ID_FILTER || '').trim() || null;

async function loadWatchlists() {
  // Čitaj ceo watchlists/ node preko admin SDK-a (zaobilazi RTDB pravila).
  const snap = await rtdb.ref('watchlists').get();
  const data = snap.val();
  if (!data || typeof data !== 'object') {
    console.log('Nema nijedne watchliste u RTDB.');
    process.exit(0);
  }

  const snapshots = Object.values(data).filter(
    (snap) => snap && snap.items && snap.totalItems > 0 && snap.familyId
  );

  const filtered = FAMILY_ID_FILTER
    ? snapshots.filter((s) => s.familyId === FAMILY_ID_FILTER)
    : snapshots;

  if (filtered.length === 0) {
    console.log(
      FAMILY_ID_FILTER
        ? `Porodica ${FAMILY_ID_FILTER} nema aktivnih itema.`
        : 'Nijedna porodica nema aktivnih itema.'
    );
    process.exit(0);
  }
  return filtered;
}

function loadCatalog() {
  const path = join(REPO_ROOT, 'public', 'catalog.json');
  if (!existsSync(path)) {
    throw new Error(`catalog.json nije pronađen na ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ─── Rešavanje EAN-ova po watch itemu ─────────────────────────────────────────

function resolveEans(item, catalog) {
  const byEan = new Map(); // ean -> catalogProduct
  if (item.watchType === 'SEARCH_QUERY') {
    const q = item.query || item.name;
    for (const p of searchCatalog(catalog, q, 80)) byEan.set(p.ean, p);
  } else if (item.ean) {
    const p = catalog.find((c) => c.ean === item.ean);
    byEan.set(item.ean, p || { ean: item.ean, name: item.name });
  } else {
    // Legacy item bez ean/query — tretiraj name kao pretragu.
    for (const p of searchCatalog(catalog, item.name, 40)) byEan.set(p.ean, p);
  }
  return byEan;
}

// ─── CSV parser (tracked_prices.csv, ; separator, utf-8-sig) ───────────────────

function parseTrackedCsv(text) {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((h, i) => { row[h.trim()] = (cells[i] ?? '').trim(); });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// ─── Python tracked mode ───────────────────────────────────────────────────────

function runTrackedPrices(eans) {
  const eansPath = join(REPO_ROOT, 'out', 'tracked_eans.txt');
  writeFileSync(eansPath, [...eans].join('\n'), 'utf-8');

  console.log(`Pozivam builder --mode tracked za ${eans.size} EAN-ova...`);
  const res = spawnSync(
    'python3',
    [
      join(REPO_ROOT, 'familyshopping_catalog_builder.py'),
      '--mode', 'tracked',
      '--tracked-eans', eansPath,
      '--out', join(REPO_ROOT, 'out'),
    ],
    { encoding: 'utf-8', stdio: ['ignore', 'inherit', 'inherit'] }
  );
  if (res.status !== 0) {
    throw new Error(`builder --mode tracked pao (exit ${res.status})`);
  }

  const pricesPath = join(REPO_ROOT, 'out', 'tracked_prices.csv');
  if (!existsSync(pricesPath)) throw new Error('tracked_prices.csv nije generisan');
  return parseTrackedCsv(readFileSync(pricesPath, 'utf-8'));
}

// ─── Upis / brisanje deals ──────────────────────────────────────────────────────

async function replaceDealsForItem(familyId, itemId, deals, fetchRunId) {
  const col = db.collection('families').doc(familyId).collection('deals');

  // Obriši prethodne ponude ovog watch itema (stari run) — zadrži samo najnoviji.
  const old = await col.where('watchlistItemId', '==', itemId).get();
  const batch = db.batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  for (const deal of deals) {
    const ref = col.doc();
    batch.set(ref, {
      ...deal,
      familyId,
      watchlistItemId: itemId,
      fetchRunId,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      foundAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const watchlists = await loadWatchlists();
  const catalog = loadCatalog();
  const fetchRunId = `${new Date().toISOString().slice(0, 10)}_${randomUUID().slice(0, 8)}`;

  console.log(
    `Porodica: ${watchlists.length}${FAMILY_ID_FILTER ? ` (filter: ${FAMILY_ID_FILTER})` : ' (sve)'}, ` +
      `katalog: ${catalog.length} proizvoda`
  );

  // 1) Rezolvuj EAN-ove za svaki (porodica, item) i skupi globalni EAN set.
  //    plan: [{ familyId, itemId, item, eans: Map<ean, product> }]
  const plan = [];
  const allEans = new Set();
  for (const wl of watchlists) {
    for (const item of wl.items) {
      const eans = resolveEans(item, catalog);
      plan.push({ familyId: wl.familyId, itemId: item.id, item, eans });
      for (const e of eans.keys()) allEans.add(e);
    }
  }

  console.log(`Ukupno itema: ${plan.length}, jedinstvenih EAN-ova: ${allEans.size}`);

  if (allEans.size === 0) {
    console.log('Nijedan EAN nije rezolvovan — nema šta da se traži.');
    return;
  }

  // 2) Jedan poziv buildera za SVE EAN-ove svih porodica (skida cenovnike jednom).
  const rows = runTrackedPrices(allEans);
  console.log(`tracked_prices.csv redova: ${rows.length}`);

  // Grupiši cene po EAN-u.
  const pricesByEan = new Map();
  for (const row of rows) {
    if (!row.ean) continue;
    if (!pricesByEan.has(row.ean)) pricesByEan.set(row.ean, []);
    pricesByEan.get(row.ean).push(row);
  }

  // 3) Za svaki (porodica, item) sastavi ponude, matchuj, upiši.
  let totalSaved = 0;
  for (const { familyId, itemId, item, eans } of plan) {
    // Najjeftinija ponuda po prodavnici (isti EAN se u cenovniku javlja
    // više puta — po objektu/formatu prodavnice; nama treba jedna po lancu).
    const bestByStore = new Map(); // store -> deal

    const eansWithPrice = [...eans.keys()].filter((e) => (pricesByEan.get(e) || []).length > 0);
    console.log(
      `  → ${item.name} [${item.watchType || 'EXACT'}]: ${eans.size} EAN, ${eansWithPrice.length} sa cenom`
    );

    for (const [ean, product] of eans) {
      const allRows = pricesByEan.get(ean) || [];
      // Zadrži samo VAZECI_CENOVNIK po prodavnici (fallback na mesečni presek).
      const priceRows = preferCurrentPriceList(allRows);
      for (const row of priceRows) {
        const productName = product?.name || row.merchant_format || item.name;
        const pkg =
          product && product.packageValue != null
            ? { value: product.packageValue, unit: product.packageUnit }
            : parsePackage(productName, row.unit);

        const offer = buildOffer(row, pkg);
        if (!offer) continue;
        if (!matchesItem(offer, productName, item)) continue;

        const deal = {
          catalogEan: ean,
          itemName: productName,
          groupName: item.name,
          brand: product?.brand ?? undefined,
          store: offer.store,
          price: offer.price,
          regularPrice: offer.regularPrice,
          discount: offer.discount,
          packageValue: offer.packageValue,
          packageUnit: offer.packageUnit,
          unitPrice: offer.unitPrice,
          unitPriceUnit: offer.unitPriceUnit,
          validUntil: offer.validUntil,
          priceListDate: offer.priceListDate,
          priceListType: offer.priceListType,
        };

        const prev = bestByStore.get(offer.store);
        if (!prev || deal.price < prev.price) bestByStore.set(offer.store, deal);
      }
    }

    const deals = [...bestByStore.values()];

    // Očisti undefined vrednosti (Firestore ih ne prima).
    const clean = deals.map((d) =>
      Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined))
    );

    await replaceDealsForItem(familyId, itemId, clean, fetchRunId);
    totalSaved += clean.length;
    console.log(`  ✓ [${familyId}] ${item.name}: ${clean.length} ponuda`);
  }

  console.log(`\nUkupno upisano: ${totalSaved} ponuda (run ${fetchRunId})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
