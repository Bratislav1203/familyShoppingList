import { useState, useEffect, useRef } from 'react';
import { useWatchlists } from '../hooks/useWatchlists';
import { createWatchlist, ensureWatchlistToken, regenerateWatchlistToken } from '../services/watchlistService';
import { publishWatchlistSnapshot } from '../services/rtdbSyncService';
import WatchlistCard from './WatchlistCard';
import { copyToClipboard } from '../utils/clipboard';

interface WatchlistPageProps {
  familyId: string;
}

export default function WatchlistPage({ familyId }: WatchlistPageProps) {
  const { watchlists, loading } = useWatchlists(familyId);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Keep token in a ref so the sync effect can read the latest value
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  useEffect(() => {
    setTokenLoading(true);
    ensureWatchlistToken(familyId)
      .then(setToken)
      .finally(() => setTokenLoading(false));
  }, [familyId]);

  // Sync to RTDB whenever watchlists change and token is ready
  useEffect(() => {
    if (!token || loading) return;
    publishWatchlistSnapshot(familyId, token).catch(console.error);
  }, [watchlists, token, loading, familyId]);

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createWatchlist(familyId, name);
      setNewListName('');
      setCreatingList(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyUrl() {
    if (!token) return;
    const url = rtdbUrl(token);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('Generisati novi token? Stari URL više neće raditi.')) return;
    setRegenerating(true);
    try {
      const t = await regenerateWatchlistToken(familyId);
      setToken(t);
    } finally {
      setRegenerating(false);
    }
  }

  function rtdbUrl(t: string) {
    return `https://family-shopping-list-ed1d8-default-rtdb.europe-west1.firebasedatabase.app/watchlists/${t}.json`;
  }

  const apiUrl = token ? rtdbUrl(token) : '';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Praćenje cena</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Dodaj proizvode i uslove — ChatGPT će ih naći na Cenoteka.rs
        </p>
      </div>

      {/* API URL box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-blue-900">ChatGPT URL</p>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-40"
          >
            {regenerating ? 'Generiše...' : 'Novi token'}
          </button>
        </div>

        {tokenLoading ? (
          <div className="h-8 bg-blue-100 rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-blue-800 bg-white/70 rounded-lg px-3 py-2 break-all">
              {apiUrl}
            </code>
            <button
              onClick={handleCopyUrl}
              className="flex-shrink-0 p-2 rounded-lg bg-white/70 hover:bg-white text-blue-600 transition-colors"
              title="Kopiraj URL"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        )}

        <p className="text-xs text-blue-600">
          Ovaj URL daje ChatGPT-u uvid u tvoje aktivne proizvode. Čuvaj ga kao lozinku.
        </p>
      </div>

      {/* Watchlists */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {watchlists.map((wl) => (
            <WatchlistCard key={wl.id} familyId={familyId} watchlist={wl} />
          ))}
        </div>
      )}

      {/* New list form / button */}
      {creatingList ? (
        <form onSubmit={handleCreateList} className="bg-white border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Nova lista</p>
          <input
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="npr. Piće, Hrana, Tehnika..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setCreatingList(false); setNewListName(''); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={saving || !newListName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Čuvam...' : 'Napravi'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setCreatingList(true)}
          className="w-full py-3 border border-dashed border-gray-300 rounded-2xl text-gray-500 text-sm font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova lista
        </button>
      )}
    </div>
  );
}
