import { useState, useEffect } from 'react';
import { useWatchlists } from '../hooks/useWatchlists';
import {
  createWatchlist,
  createWatchlistItem,
  type WatchlistItemInput,
} from '../services/watchlistService';
import { publishWatchlistSnapshot } from '../services/rtdbSyncService';
import { triggerPriceRefresh, priceRefreshEnabled } from '../services/priceRefreshService';
import { normalize, loadCatalog } from '../services/catalogService';
import WatchlistCard from './WatchlistCard';
import CatalogSearch from './CatalogSearch';
import type { CatalogProduct } from '../types';

interface WatchlistPageProps {
  familyId: string;
}

const DEFAULT_LIST_NAME = 'Moji proizvodi';

function pkgLabel(p: CatalogProduct): string {
  if (p.packageValue != null && p.packageUnit) return `${p.packageValue} ${p.packageUnit}`;
  if (p.packageUnit) return p.packageUnit;
  return '';
}

export default function WatchlistPage({ familyId }: WatchlistPageProps) {
  const { watchlists, loading } = useWatchlists(familyId);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  // Sync to RTDB whenever watchlists change (keyed by familyId).
  useEffect(() => {
    if (loading) return;
    publishWatchlistSnapshot(familyId).catch(console.error);
  }, [watchlists, loading, familyId]);

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createWatchlist(familyId, name);
      setNewListName('');
      setCreatingList(false);
    } catch (err) {
      console.error('createWatchlist failed:', err);
      alert(`Greška pri pravljenju liste: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  // Reši listu (prva postojeća ili nova podrazumevana), pa upiši item.
  async function addItem(data: WatchlistItemInput, label: string) {
    let listId = watchlists[0]?.id;
    if (!listId) {
      listId = await createWatchlist(familyId, DEFAULT_LIST_NAME);
    }
    await createWatchlistItem(familyId, listId, data);
    setAddMsg(`Dodato: ${label}`);
    setTimeout(() => setAddMsg(null), 3000);
  }

  async function handleSelectProduct(p: CatalogProduct) {
    // Isti proizvod se kod raznih lanaca vodi pod raznim EAN-om — prati sve iz grupe.
    let eans = [p.ean];
    if (p.groupKey) {
      const catalog = await loadCatalog();
      const group = catalog
        .filter((c) => c.groupKey === p.groupKey)
        .map((c) => c.ean);
      if (group.length > 0) eans = [...new Set([p.ean, ...group])];
    }
    await addItem(
      {
        name: p.name,
        catalogName: p.name,
        brand: p.brand ?? undefined,
        category: p.category ?? undefined,
        packageSize: pkgLabel(p) || undefined,
        watchType: 'EXACT_PRODUCT',
        ean: p.ean,
        eans,
        groupKey: p.groupKey,
        enabled: true,
        criteriaMode: 'ANY',
      },
      p.name
    );
  }

  async function handleTrackSearch(query: string) {
    const includeTerms = normalize(query).split(' ').filter(Boolean);
    await addItem(
      {
        name: query,
        watchType: 'SEARCH_QUERY',
        query,
        enabled: true,
        criteriaMode: 'ANY',
        includeTerms,
      },
      `„${query}"`
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      await triggerPriceRefresh(familyId);
      setRefreshMsg('Pokrenuto! Cene će se osvežiti za koji minut.');
    } catch (err) {
      setRefreshMsg(`Greška: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 6000);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Praćenje cena</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Dodaj proizvode i uslove — cene se svako jutro osvežavaju iz zvaničnih cenovnika prodavnica
        </p>
      </div>

      {/* Ručno osvežavanje cena */}
      {priceRefreshEnabled && (
        <div className="space-y-1.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Pokrećem...' : 'Osveži cene sada'}
          </button>
          {refreshMsg && (
            <p className={`text-xs text-center ${refreshMsg.startsWith('Greška') ? 'text-red-600' : 'text-green-600'}`}>
              {refreshMsg}
            </p>
          )}
        </div>
      )}

      {/* Search iz kataloga — glavni ulaz za dodavanje */}
      <CatalogSearch
        onSelectProduct={handleSelectProduct}
        onTrackSearch={handleTrackSearch}
      />
      {addMsg && (
        <p className="text-xs text-center text-green-600 font-medium">{addMsg}</p>
      )}

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
