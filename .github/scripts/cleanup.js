import admin from 'firebase-admin';

const RTDB_BASE = 'https://family-shopping-list-ed1d8-default-rtdb.europe-west1.firebasedatabase.app';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: RTDB_BASE,
});
const db = admin.firestore();
const rtdb = admin.database();

async function deleteCollection(colRef) {
  const snap = await colRef.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function main() {
  const families = await db.collection('families').get();
  console.log(`Porodica: ${families.size}`);

  let totalDeals = 0;
  let totalItems = 0;
  let totalLists = 0;

  for (const fam of families.docs) {
    const familyId = fam.id;

    // Deals
    const dealsDeleted = await deleteCollection(
      db.collection('families').doc(familyId).collection('deals')
    );
    totalDeals += dealsDeleted;

    // Watchlists + items
    const lists = await db
      .collection('families')
      .doc(familyId)
      .collection('watchlists')
      .get();
    for (const list of lists.docs) {
      const itemsDeleted = await deleteCollection(list.ref.collection('items'));
      totalItems += itemsDeleted;
      await list.ref.delete();
      totalLists += 1;
    }

    console.log(`  [${familyId}] deals=${dealsDeleted}`);
  }

  // RTDB snapshot (izvor koji job čita) — obriši ceo node.
  await rtdb.ref('watchlists').remove();

  console.log(
    `\nObrisano: ${totalDeals} deals, ${totalLists} lista, ${totalItems} itema. RTDB watchlists očišćen.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
