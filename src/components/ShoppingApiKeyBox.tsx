import { useState, useEffect } from 'react';
import { copyToClipboard } from '../utils/clipboard';
import { getOrCreateShoppingApiKey, regenerateShoppingApiKey } from '../services/familyService';

interface Props {
  familyId: string;
}

export default function ShoppingApiKeyBox({ familyId }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    getOrCreateShoppingApiKey(familyId)
      .then(setApiKey)
      .finally(() => setLoading(false));
  }, [familyId]);

  async function handleCopy() {
    if (!apiKey) return;
    await copyToClipboard(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!window.confirm('Stari key će prestati da radi. Regenerisati?')) return;
    setRegenerating(true);
    try {
      const newKey = await regenerateShoppingApiKey(familyId);
      setApiKey(newKey);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
        KuvaJ — API ključ za kupovinu
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Unesi ovaj ključ u KuvaJ aplikaciji da bi slanje sastojaka na listu radilo.
      </p>

      {loading ? (
        <div className="h-10 bg-green-100 rounded-lg animate-pulse" />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 font-mono text-sm font-bold tracking-widest text-green-800 text-center overflow-hidden text-ellipsis">
              {apiKey}
            </div>
            <button
              onClick={handleCopy}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {copied ? '✓' : 'Kopiraj'}
            </button>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
          >
            {regenerating ? 'Regenerišem...' : '↺ Regeneriši ključ'}
          </button>
        </>
      )}
    </div>
  );
}
