import { useState, useMemo } from 'react';
import { useDeals } from '../hooks/useDeals';
import { deleteAllDeals } from '../services/dealService';
import type { Deal } from '../types';

interface DealsPageProps {
  familyId: string;
}

function toMillis(val: unknown): number {
  if (!val) return 0;
  try {
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return (val as { toDate(): Date }).toDate().getTime();
    }
    return new Date(val as string).getTime();
  } catch {
    return 0;
  }
}

function formatDateTime(val: unknown): string {
  if (!val) return '';
  try {
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return (val as { toDate(): Date }).toDate().toLocaleString('sr-Latn-RS', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    }
    return new Date(val as string).toLocaleString('sr-Latn-RS');
  } catch {
    return String(val);
  }
}

function fmtPrice(n: number): string {
  return n.toLocaleString('sr-Latn-RS', { maximumFractionDigits: 2 });
}

function fmtUnit(deal: Deal): string | null {
  if (deal.unitPrice == null || !deal.unitPriceUnit) return null;
  return `${fmtPrice(deal.unitPrice)} ${deal.unitPriceUnit}`;
}

// Zadrži samo ponude iz najnovijeg fetch run-a (izbegava prikaz starih cena).
function latestRunDeals(deals: Deal[]): Deal[] {
  if (deals.length === 0) return [];
  const byRun = new Map<string, Deal[]>();
  for (const d of deals) {
    const key = d.fetchRunId ?? '__legacy__';
    if (!byRun.has(key)) byRun.set(key, []);
    byRun.get(key)!.push(d);
  }
  // Najnoviji run = onaj sa najvećim fetchedAt/foundAt.
  let best: Deal[] = [];
  let bestTime = -1;
  for (const group of byRun.values()) {
    const t = Math.max(...group.map((d) => toMillis(d.fetchedAt ?? d.foundAt)));
    if (t > bestTime) { bestTime = t; best = group; }
  }
  return best;
}

function DealRow({ deal, badges }: { deal: Deal; badges: string[] }) {
  const unit = fmtUnit(deal);
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-700 font-medium flex-1 min-w-0">{deal.itemName}</p>
        {badges.length > 0 && (
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {badges.map((b) => (
              <span key={b} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                b === 'Najniža cena' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
              }`}>{b}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-lg font-bold text-green-600">{fmtPrice(deal.price)} RSD</span>
        {deal.regularPrice != null && (
          <span className="text-xs text-gray-400 line-through">{fmtPrice(deal.regularPrice)} RSD</span>
        )}
        {deal.discount != null && (
          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
            -{deal.discount}%
          </span>
        )}
        {unit && <span className="text-xs text-indigo-600 font-medium">{unit}</span>}
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
        <span className="font-medium text-gray-500">{deal.store}</span>
        {deal.packageValue != null && deal.packageUnit && (
          <span>{deal.packageValue} {deal.packageUnit}</span>
        )}
        {deal.validUntil && <span>Važi do: {deal.validUntil}</span>}
        {(deal.fetchedAt ?? deal.foundAt) != null && (
          <span>Osveženo: {formatDateTime(deal.fetchedAt ?? deal.foundAt)}</span>
        )}
        {deal.sourceUrl && (
          <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 hover:underline">
            Izvor →
          </a>
        )}
      </div>
    </div>
  );
}

function DealGroup({ groupName, deals }: { groupName: string; deals: Deal[] }) {
  const [expanded, setExpanded] = useState(false);

  const current = latestRunDeals(deals);
  const sorted = [...current].sort((a, b) => a.price - b.price);

  // Najniža ukupna cena i najbolja cena po jedinici (unutar iste jedinice).
  const cheapestId = sorted.length > 0 ? sorted[0].id : null;
  let bestUnitId: string | null = null;
  {
    const withUnit = current.filter((d) => d.unitPrice != null && d.unitPriceUnit);
    // Poredimo unit price samo unutar dominantne jedinice (npr. sve RSD/kom).
    const byUnit = new Map<string, Deal[]>();
    for (const d of withUnit) {
      const u = d.unitPriceUnit!;
      if (!byUnit.has(u)) byUnit.set(u, []);
      byUnit.get(u)!.push(d);
    }
    let bestUnitVal = Infinity;
    for (const group of byUnit.values()) {
      for (const d of group) {
        if (d.unitPrice! < bestUnitVal) { bestUnitVal = d.unitPrice!; bestUnitId = d.id; }
      }
    }
  }

  const best = sorted[0];
  const showBestUnit = bestUnitId != null && bestUnitId !== cheapestId;

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
              {current.length} {current.length === 1 ? 'ponuda' : 'ponude'} · po prodavnici
              {best && <> · od {fmtPrice(best.price)} RSD</>}
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
          {sorted.map((deal) => {
            const badges: string[] = [];
            if (deal.id === cheapestId) badges.push('Najniža cena');
            if (showBestUnit && deal.id === bestUnitId) badges.push('Najbolja po jedinici');
            return <DealRow key={deal.id} deal={deal} badges={badges} />;
          })}
        </div>
      )}
    </div>
  );
}

export default function DealsPage({ familyId }: DealsPageProps) {
  const { deals, loading } = useDeals(familyId);
  const [clearingAll, setClearingAll] = useState(false);

  const storageKey = `dealsHiddenStores:${familyId}`;
  const [hiddenStores, setHiddenStores] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  function toggleStore(store: string) {
    setHiddenStores((prev) => {
      const next = new Set(prev);
      if (next.has(store)) next.delete(store);
      else next.add(store);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Sve prodavnice koje se pojavljuju u trenutnim ponudama (za dugmiće filtera).
  const allStores = useMemo(
    () => [...new Set(deals.map((d) => d.store).filter(Boolean))].sort(),
    [deals]
  );

  const visibleDeals = deals.filter((d) => !hiddenStores.has(d.store));

  async function handleClearAll() {
    if (!window.confirm(`Obrisati svih ${deals.length} ponuda?`)) return;
    setClearingAll(true);
    try {
      await deleteAllDeals(familyId);
    } finally {
      setClearingAll(false);
    }
  }

  const groups = visibleDeals.reduce<Record<string, Deal[]>>((acc, deal) => {
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
            Najbolje cene iz zvaničnih cenovnika prodavnica
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

      {/* Filter po prodavnici */}
      {allStores.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allStores.map((store) => {
            const active = !hiddenStores.has(store);
            return (
              <button
                key={store}
                onClick={() => toggleStore(store)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                }`}
              >
                {store}
              </button>
            );
          })}
        </div>
      )}

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
          <p className="text-xs mt-1">Dnevni job će ih dodati kada pronađe cene</p>
        </div>
      ) : groupEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm font-medium">Nema ponuda za odabrane prodavnice</p>
          <p className="text-xs mt-1">Uključi neku prodavnicu iznad</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupEntries.map((group) => (
            <DealGroup key={group.deals[0].watchlistItemId} groupName={group.name} deals={group.deals} />
          ))}
        </div>
      )}
    </div>
  );
}
