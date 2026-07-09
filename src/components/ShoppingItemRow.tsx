import { toggleItemBought, deleteShoppingItem } from '../services/shoppingService';
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
  async function handleToggle() {
    await toggleItemBought(familyId, item, currentUser, displayName);
  }

  async function handleDelete() {
    await deleteShoppingItem(familyId, item.id);
  }

  const emoji = getItemEmoji(item.name);

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        item.bought
          ? 'bg-gray-50 border-gray-100 opacity-60'
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
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

      {/* Emoji */}
      <span className="text-2xl flex-shrink-0 w-8 text-center">{emoji}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
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

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
        aria-label="Obriši"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
