import { useState } from 'react';
import type { Watchlist } from '../types';
import {
  updateWatchlist,
  deleteWatchlist,
  createWatchlistItem,
  type WatchlistItemInput,
} from '../services/watchlistService';
import { useWatchlistItems } from '../hooks/useWatchlistItems';
import WatchlistItemRow from './WatchlistItemRow';
import WatchlistItemForm from './WatchlistItemForm';

interface WatchlistCardProps {
  familyId: string;
  watchlist: Watchlist;
}

export default function WatchlistCard({ familyId, watchlist }: WatchlistCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(watchlist.name);
  const [deleting, setDeleting] = useState(false);

  const { items } = useWatchlistItems(familyId, watchlist.id);

  async function handleToggleEnabled() {
    await updateWatchlist(familyId, watchlist.id, { enabled: !watchlist.enabled });
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== watchlist.name) {
      await updateWatchlist(familyId, watchlist.id, { name: trimmed });
    }
    setEditingName(false);
  }

  async function handleDelete() {
    if (!window.confirm(`Obrisati listu „${watchlist.name}" i sve njene proizvode?`)) return;
    setDeleting(true);
    try {
      await deleteWatchlist(familyId, watchlist.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddItem(data: WatchlistItemInput) {
    try {
      await createWatchlistItem(familyId, watchlist.id, data);
      setAddingItem(false);
    } catch (err) {
      console.error('handleAddItem error:', err);
      throw err;
    }
  }

  const enabledCount = items.filter((i) => i.enabled).length;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${watchlist.enabled ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
        {/* Enable toggle */}
        <button
          onClick={handleToggleEnabled}
          className={`flex-shrink-0 relative w-10 h-6 rounded-full transition-colors ${
            watchlist.enabled ? 'bg-blue-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              watchlist.enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              className="w-full text-sm font-semibold text-gray-900 border-b border-blue-300 outline-none bg-transparent"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') { setNameInput(watchlist.name); setEditingName(false); }
              }}
            />
          ) : (
            <button
              onClick={() => { setNameInput(watchlist.name); setEditingName(true); }}
              className="text-sm font-semibold text-gray-900 text-left hover:text-blue-600 transition-colors"
            >
              {watchlist.name}
            </button>
          )}
          <p className="text-xs text-gray-400">
            {enabledCount} od {items.length} {items.length === 1 ? 'proizvod' : 'proizvoda'}
          </p>
        </div>

        {/* Collapse + delete */}
        <div className="flex gap-1">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Items */}
      {expanded && (
        <div className="p-3 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">Nema proizvoda u listi</p>
          )}
          {items.map((item) => (
            <WatchlistItemRow
              key={item.id}
              familyId={familyId}
              watchlistId={watchlist.id}
              item={item}
            />
          ))}

          <button
            onClick={() => setAddingItem(true)}
            className="w-full py-2.5 border border-dashed border-blue-200 rounded-xl text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dodaj proizvod
          </button>
        </div>
      )}

      {addingItem && (
        <WatchlistItemForm
          onSave={handleAddItem}
          onCancel={() => setAddingItem(false)}
        />
      )}
    </div>
  );
}
