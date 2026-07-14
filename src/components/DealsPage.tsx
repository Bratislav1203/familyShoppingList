import { useState } from 'react';
import { useDeals } from '../hooks/useDeals';
import { deleteDeal, deleteAllDeals } from '../services/dealService';
import type { Deal } from '../types';

interface DealsPageProps {
  familyId: string;
}

function formatDate(val: unknown): string {
  if (!val) return '';
  try {
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return (val as { toDate(): Date }).toDate().toLocaleDateString('sr-Latn-RS');
    }
    return new Date(val as string).toLocaleDateString('sr-Latn-RS');
  } catch {
    return String(val);
  }
}

function DealCard({ deal, familyId }: { deal: Deal; familyId: string }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Obrisati ponudu za „${deal.itemName}"?`)) return;
    setDeleting(true);
    try {
      await deleteDeal(familyId, deal.id);
    } finally {
      setDeleting(false);
    }
  }

  const discount = deal.discount != null ? Number(deal.discount) : null;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-700 font-medium flex-1 min-w-0">{deal.itemName}</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-lg font-bold text-green-600">{deal.price} RSD</span>
        {deal.regularPrice != null && (
          <span className="text-xs text-gray-400 line-through">{deal.regularPrice} RSD</span>
        )}
        {discount != null && (
          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
            -{discount}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
        <span>{deal.store}</span>
        {deal.validUntil && <span>Važi do: {deal.validUntil}</span>}
        {deal.foundAt != null && <span>{formatDate(deal.foundAt)}</span>}
        {deal.sourceUrl && (
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 hover:underline"
          >
            Cenoteka.rs →
          </a>
        )}
      </div>
    </div>
  );
}

function DealGroup({ groupName, deals, familyId }: { groupName: string; deals: Deal[]; familyId: string }) {
  const [expanded, setExpanded] = useState(true);
  const best = deals.reduce((a, b) => a.price < b.price ? a : b);
  const discount = best.discount != null ? Number(best.discount) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-left min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{groupName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {deals.length} {deals.length === 1 ? 'ponuda' : 'ponude'} · od {best.price} RSD
              {discount != null && (
                <span className="ml-1.5 text-orange-600 font-medium">-{discount}%</span>
              )}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} familyId={familyId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DealsPage({ familyId }: DealsPageProps) {
  const { deals, loading } = useDeals(familyId);
  const [clearingAll, setClearingAll] = useState(false);

  async function handleClearAll() {
    if (!window.confirm(`Obrisati svih ${deals.length} ponuda?`)) return;
    setClearingAll(true);
    try {
      await deleteAllDeals(familyId);
    } finally {
      setClearingAll(false);
    }
  }

  // Group by watchlistItemId, use first deal's itemName as group label
  const groups = deals.reduce<Record<string, Deal[]>>((acc, deal) => {
    const key = deal.watchlistItemId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(deal);
    return acc;
  }, {});

  const groupEntries = Object.entries(groups).map(([, items]) => ({
    name: items[0].groupName ?? items[0].itemName,
    deals: items,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ponude</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Ponude koje je ChatGPT pronašao na Cenoteka.rs
          </p>
        </div>
        {deals.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearingAll}
            className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-40"
          >
            {clearingAll ? 'Brišem...' : 'Obriši sve'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          <p className="text-sm font-medium">Još nema pronađenih ponuda</p>
          <p className="text-xs mt-1">ChatGPT će ih dodati kada pronađe odgovarajuću akciju</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupEntries.map((group) => (
            <DealGroup key={group.deals[0].watchlistItemId} groupName={group.name} deals={group.deals} familyId={familyId} />
          ))}
        </div>
      )}
    </div>
  );
}
