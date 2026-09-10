import { useState } from 'react';
import type { WatchlistItem } from '../types';
import {
  updateWatchlistItem,
  deleteWatchlistItem,
} from '../services/watchlistService';

interface WatchlistItemRowProps {
  familyId: string;
  watchlistId: string;
  item: WatchlistItem;
}

export default function WatchlistItemRow({ familyId, watchlistId, item }: WatchlistItemRowProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleToggle() {
    await updateWatchlistItem(familyId, watchlistId, item.id, { enabled: !item.enabled });
  }

  async function handleDelete() {
    if (!window.confirm(`Obrisati „${item.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteWatchlistItem(familyId, watchlistId, item.id);
    } finally {
      setDeleting(false);
    }
  }

  const details: string[] = [];
  if (item.packageSize) details.push(item.packageSize);
  if (item.variant) details.push(item.variant);
  const isSearch = item.watchType === 'SEARCH_QUERY';

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 bg-white rounded-xl border transition-colors ${
        item.enabled ? 'border-gray-100' : 'border-gray-100 opacity-50'
      }`}
    >
      {/* Toggle prati/ne prati */}
      <button
        onClick={handleToggle}
        className={`mt-0.5 flex-shrink-0 relative w-9 h-5 rounded-full transition-colors ${
          item.enabled ? 'bg-blue-500' : 'bg-gray-200'
        }`}
        title={item.enabled ? 'Prati se' : 'Ne prati se'}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            item.enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{item.name}</span>
          {details.length > 0 && (
            <span className="text-xs text-gray-400">{details.join(' · ')}</span>
          )}
          {isSearch && (
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
              pretraga
            </span>
          )}
        </div>
      </div>

      {/* Brisanje */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
