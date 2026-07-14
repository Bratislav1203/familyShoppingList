import { useState } from 'react';
import type { WatchlistItem } from '../types';
import {
  updateWatchlistItem,
  deleteWatchlistItem,
  type WatchlistItemInput,
} from '../services/watchlistService';
import WatchlistItemForm from './WatchlistItemForm';

interface WatchlistItemRowProps {
  familyId: string;
  watchlistId: string;
  item: WatchlistItem;
}

export default function WatchlistItemRow({ familyId, watchlistId, item }: WatchlistItemRowProps) {
  const [editing, setEditing] = useState(false);
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

  async function handleSave(data: WatchlistItemInput) {
    await updateWatchlistItem(familyId, watchlistId, item.id, data);
    setEditing(false);
  }

  const details: string[] = [];
  if (item.packageSize) details.push(item.packageSize);
  if (item.variant) details.push(item.variant);

  return (
    <>
      <div
        className={`flex items-start gap-3 px-4 py-3 bg-white rounded-xl border transition-colors ${
          item.enabled ? 'border-gray-100' : 'border-gray-100 opacity-50'
        }`}
      >
        {/* Toggle */}
        <button
          onClick={handleToggle}
          className={`mt-0.5 flex-shrink-0 relative w-9 h-5 rounded-full transition-colors ${
            item.enabled ? 'bg-blue-500' : 'bg-gray-200'
          }`}
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
          </div>

          <div className="flex flex-wrap gap-2 mt-1">
            {item.maxPrice != null && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                maks. {item.maxPrice} RSD
              </span>
            )}
            {item.minimumDiscountPercent != null && (
              <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                min. {item.minimumDiscountPercent}% popust
              </span>
            )}
            {(item.maxPrice != null || item.minimumDiscountPercent != null) && (
              <span className="text-xs text-gray-400">
                {item.criteriaMode === 'ANY' ? 'bilo koji' : 'svi uslovi'}
              </span>
            )}
          </div>

          {item.notes && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {editing && (
        <WatchlistItemForm
          initial={item}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </>
  );
}
