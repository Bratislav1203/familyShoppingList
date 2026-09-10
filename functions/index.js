import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const GH_TOKEN = defineSecret('GH_DISPATCH_TOKEN');

const GH_OWNER = 'Bratislav1203';
const GH_REPO = 'familyShoppingList';

// Callable funkcija: aplikacija je zove da pokrene osvežavanje cena
// za prosleđenu porodicu. Token stoji kao secret na serveru (nije u frontend bundle-u).
export const refreshPrices = onCall(
  { region: 'europe-west1', secrets: [GH_TOKEN] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Moraš biti prijavljen.');
    }

    const familyId = request.data?.familyId;
    if (typeof familyId !== 'string' || !familyId.trim()) {
      throw new HttpsError('invalid-argument', 'Nedostaje familyId.');
    }

    const res = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${GH_TOKEN.value()}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          event_type: 'refresh-prices',
          client_payload: { family_id: familyId },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new HttpsError('internal', `GitHub API ${res.status}: ${text}`);
    }

    return { ok: true };
  }
);
