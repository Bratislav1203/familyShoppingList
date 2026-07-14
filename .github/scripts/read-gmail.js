import { google } from 'googleapis';
import admin from 'firebase-admin';

// ─── Firebase init ────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Gmail OAuth2 client ──────────────────────────────────────────────────────

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ─── Find today's email from GPT ─────────────────────────────────────────────

async function findTodaysEmail() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `subject:"Jutarnji pregled ponuda" after:${dateStr}`,
    maxResults: 1,
  });

  const messages = res.data.messages;
  if (!messages || messages.length === 0) {
    console.log('Nema emaila za danas.');
    process.exit(0);
  }

  return messages[0].id;
}

// ─── Get email body ───────────────────────────────────────────────────────────

async function getEmailBody(messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const msg = res.data;
  const parts = msg.payload.parts || [msg.payload];

  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }

  // fallback: pokušaj direktno body
  if (msg.payload.body?.data) {
    return Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
  }

  throw new Error('Nije moguće pročitati telo emaila');
}

// ─── Parse deals from email body ─────────────────────────────────────────────

function parseDeals(body) {
  const familyIdMatch = body.match(/FAMILY_ID:\s*(\S+)/);
  if (!familyIdMatch) throw new Error('FAMILY_ID nije pronađen u emailu');
  const familyId = familyIdMatch[1].trim();

  const deals = [];
  const blocks = body.split('---PONUDA---').slice(1);

  for (const block of blocks) {
    const end = block.indexOf('---KRAJ---');
    const content = end !== -1 ? block.substring(0, end) : block;

    const get = (key) => {
      const m = content.match(new RegExp(`${key}:\\s*(.+)`));
      return m ? m[1].trim() : null;
    };

    const itemId = get('ITEM_ID');
    const itemName = get('NAZIV');
    const store = get('PRODAVNICA');
    const priceRaw = get('CENA');

    if (!itemId || !itemName || !store || !priceRaw) {
      console.log('Preskačem nepotpunu ponudu:', content.trim().slice(0, 80));
      continue;
    }

    const price = parseFloat(priceRaw.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(price)) {
      console.log(`Nevažeća cena za ${itemName}: ${priceRaw}`);
      continue;
    }

    const deal = { watchlistItemId: itemId, itemName, store, price };

    const regularPriceRaw = get('REGULARNA_CENA');
    if (regularPriceRaw) {
      const rp = parseFloat(regularPriceRaw.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(rp)) deal.regularPrice = rp;
    }

    const discountRaw = get('POPUST');
    if (discountRaw) {
      const d = parseInt(discountRaw.replace(/[^\d]/g, ''));
      if (!isNaN(d)) deal.discount = d;
    }

    const sourceUrl = get('URL');
    if (sourceUrl) deal.sourceUrl = sourceUrl;

    deals.push({ familyId, deal });
  }

  return deals;
}

// ─── Clear existing deals ─────────────────────────────────────────────────────

async function clearDeals(familyId) {
  const snap = await db.collection('families').doc(familyId).collection('deals').get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Obrisano ${snap.size} starih ponuda.`);
}

// ─── Save deals to Firestore ──────────────────────────────────────────────────

async function saveDeal(familyId, deal) {
  const doc = {
    ...deal,
    foundAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('families').doc(familyId).collection('deals').add(doc);
  console.log(`  ✓ Upisano: ${deal.itemName} — ${deal.price} RSD`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Tražim email sa ponudama...');

  const messageId = await findTodaysEmail();
  console.log(`Pronađen email: ${messageId}`);

  const body = await getEmailBody(messageId);
  console.log('Email pročitan, parsiram ponude...');

  const entries = parseDeals(body);
  console.log(`Pronađeno ${entries.length} ponuda`);

  if (entries.length > 0) {
    await clearDeals(entries[0].familyId);
  }

  for (const { familyId, deal } of entries) {
    try {
      await saveDeal(familyId, deal);
    } catch (err) {
      console.log(`  Greška pri upisu: ${err.message}`);
    }
  }

  console.log(`\nGotovo. Upisano ${entries.length} ponuda.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
