import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toggleItemBought, deleteShoppingItem, updateShoppingItem } from '../services/shoppingService';
import type { ShoppingItem } from '../types';
import type { User } from 'firebase/auth';
import { getItemEmoji } from '../utils/itemEmoji';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  familyId: string;
  currentUser: User;
  displayName: string;
}

export default function ShoppingItemRow({
  item,
  familyId,
  currentUser,
  displayName,
}: ShoppingItemRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [note, setNote] = useState(item.note ?? '');
  const [saving, setSaving] = useState(false);

  const emoji = getItemEmoji(item.name);

  async function handleToggle() {
    await toggleItemBought(familyId, item, currentUser, displayName);
  }

  async function handleDelete() {
    await deleteShoppingItem(familyId, item.id);
  }

  function openEdit() {
    setQuantity(item.quantity);
    setNote(item.note ?? '');
    setEditOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateShoppingItem(familyId, item.id, { quantity, note });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
          item.bought
            ? 'bg-gray-50 border-gray-100 opacity-60'
            : 'bg-white border-gray-100 shadow-sm'
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            item.bought
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-blue-400'
          }`}
          aria-label={item.bought ? 'Označi kao nekupljeno' : 'Označi kao kupljeno'}
        >
          {item.bought && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Clickable middle — emoji + content */}
        <button
          onClick={openEdit}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
        >
          <span className="text-2xl flex-shrink-0 w-8 text-center">{emoji}</span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`font-medium text-base ${item.bought ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {item.name}
              </span>
              {item.quantity && (
                <span className={`text-sm ${item.bought ? 'text-gray-400' : 'text-gray-500'}`}>
                  — {item.quantity}
                </span>
              )}
            </div>
            {item.note && (
              <p className="text-xs text-gray-400 mt-0.5 italic">{item.note}</p>
            )}
            <div className="flex flex-wrap gap-x-3 mt-0.5">
              <span className="text-xs text-gray-400">Dodao: {item.addedByName}</span>
              {item.bought && item.boughtByName && (
                <span className="text-xs text-green-500">Kupio: {item.boughtByName}</span>
              )}
            </div>
          </div>
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
          aria-label="Obriši"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Edit modal */}
      {editOpen && createPortal(
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4"
          onClick={() => setEditOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-xs bg-white rounded-2xl shadow-xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <span className="text-2xl">{emoji}</span>
              <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Količina</label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="npr. 2l, 3 kom..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Napomena</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Opciono..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition-colors"
                >
                  {saving ? '...' : 'Sačuvaj'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
