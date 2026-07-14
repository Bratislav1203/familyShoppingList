import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function PublicDealPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function save() {
      const familyId = params.get('familyId');
      const watchlistItemId = params.get('watchlistItemId');
      const itemName = params.get('itemName');
      const store = params.get('store');
      const priceRaw = params.get('price');

      if (!familyId || !watchlistItemId || !itemName || !store || !priceRaw) {
        setMessage('Nedostaju obavezni parametri: familyId, watchlistItemId, itemName, store, price');
        setStatus('error');
        return;
      }

      const price = Number(priceRaw);
      if (isNaN(price)) {
        setMessage('Parametar price mora biti broj');
        setStatus('error');
        return;
      }

      const doc: Record<string, unknown> = {
        watchlistItemId,
        itemName,
        store,
        price,
        foundAt: serverTimestamp(),
      };

      const regularPrice = params.get('regularPrice');
      if (regularPrice) doc.regularPrice = Number(regularPrice);

      const discount = params.get('discount');
      if (discount) doc.discount = Number(discount);

      const validUntil = params.get('validUntil');
      if (validUntil) doc.validUntil = validUntil;

      const sourceUrl = params.get('sourceUrl');
      if (sourceUrl) doc.sourceUrl = sourceUrl;

      try {
        await addDoc(collection(db, 'families', familyId, 'deals'), doc);
        setMessage('ok');
        setStatus('ok');
      } catch (err) {
        setMessage(String(err));
        setStatus('error');
      }
    }

    save();
  }, []);

  const result = status === 'loading'
    ? { status: 'loading' }
    : status === 'ok'
    ? { status: 'ok', message: 'Deal saved' }
    : { status: 'error', message };

  return (
    <pre style={{ margin: 0, padding: 0, fontFamily: 'monospace', fontSize: 14 }}>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
