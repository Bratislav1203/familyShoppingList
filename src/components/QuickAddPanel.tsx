import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from 'firebase/auth';
import { addShoppingItem, deleteShoppingItem } from '../services/shoppingService';
import type { ShoppingItem } from '../types';

export interface QuickItem {
  name: string;
  defaultQuantity?: string;
  emoji: string;
}

export interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: QuickItem[];
}

const icons = {
  hrana: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6h3.5c.8 0 1.5.7 1.5 1.5v.5"/>
      <path d="M18 21v-6"/>
    </svg>
  ),
  meso: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="5.5" cy="5.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
      <path d="M7.5 7.5l9 9"/>
      <circle cx="18.5" cy="5.5" r="2.5"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <path d="M7.5 16.5l9-9"/>
    </svg>
  ),
  voce: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  ),
  pice: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M8 22h8"/>
      <path d="M12 11v11"/>
      <path d="M20 2H4l2 9.5A5 5 0 0 0 11 16h2a5 5 0 0 0 5-4.5L20 2z"/>
    </svg>
  ),
  higijena: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 2c-5.33 8-8 12.17-8 15a8 8 0 0 0 16 0c0-2.83-2.67-7-8-15z"/>
    </svg>
  ),
};

export const CATEGORIES: Category[] = [
  {
    id: 'hrana',
    label: 'Hrana',
    icon: icons.hrana,
    items: [
      { name: 'Hleb', emoji: '🍞' },
      { name: 'Jaja', emoji: '🥚', defaultQuantity: '12 kom' },
      { name: 'Jogurt', emoji: '🥛' },
      { name: 'Mleko', emoji: '🍼', defaultQuantity: '2l' },
      { name: 'Pavlaka', emoji: '🥄' },
      { name: 'Kisela pavlaka', emoji: '🥄' },
      { name: 'Kečap', emoji: '🍅' },
      { name: 'Čips', emoji: '🥔' },
      { name: 'Pomfrit', emoji: '🍟', defaultQuantity: '750g' },
    ],
  },
  {
    id: 'meso',
    label: 'Meso',
    icon: icons.meso,
    items: [
      { name: 'Pile', emoji: '🍗', defaultQuantity: '1kg' },
      { name: 'Mleveno meso', emoji: '🥩', defaultQuantity: '500g' },
      { name: 'Svinjetina', emoji: '🥩', defaultQuantity: '1kg' },
      { name: 'Govedina', emoji: '🥩', defaultQuantity: '500g' },
      { name: 'Pršuta', emoji: '🍖' },
    ],
  },
  {
    id: 'voce-povrce',
    label: 'Voće & Povrće',
    icon: icons.voce,
    items: [
      { name: 'Luk', emoji: '🧅', defaultQuantity: '1kg' },
      { name: 'Kupus', emoji: '🥬' },
      { name: 'Šargarepa', emoji: '🥕', defaultQuantity: '1kg' },
      { name: 'Krompir', emoji: '🥔', defaultQuantity: '2kg' },
      { name: 'Banane', emoji: '🍌', defaultQuantity: '1kg' },
    ],
  },
  {
    id: 'pice',
    label: 'Piće',
    icon: icons.pice,
    items: [
      { name: 'Pivo', emoji: '🍺', defaultQuantity: '6 kom' },
      { name: 'Sprite', emoji: '🥤', defaultQuantity: '1.5l' },
      { name: 'Džin', emoji: '🍸' },
      { name: 'Coca-Cola', emoji: '🥤', defaultQuantity: '1.5l' },
    ],
  },
  {
    id: 'higijena',
    label: 'Higijena',
    icon: icons.higijena,
    items: [
      { name: 'Toalet papir', emoji: '🧻', defaultQuantity: '10 kom' },
      { name: 'Vlažne maramice', emoji: '🧴', defaultQuantity: '1 pak' },
      { name: 'Maramice', emoji: '🤧' },
      { name: 'Sapun', emoji: '🧼' },
      { name: 'Papirni ubrusi', emoji: '🧻' },
    ],
  },
];

interface QuickAddPanelProps {
  familyId: string;
  currentUser: User;
  displayName: string;
  currentItems: ShoppingItem[];
}

export default function QuickAddPanel({
  familyId,
  currentUser,
  displayName,
  currentItems,
}: QuickAddPanelProps) {
  const [openCategory, setOpenCategory] = useState<Category | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function findOnList(name: string): ShoppingItem | undefined {
    return currentItems.find(
      (i) => i.name.toLowerCase() === name.toLowerCase() && !i.bought
    );
  }

  async function handleItemClick(item: QuickItem) {
    const existing = findOnList(item.name);
    if (existing) {
      setBusy(item.name);
      try {
        await deleteShoppingItem(familyId, existing.id);
      } finally {
        setBusy(null);
      }
    } else {
      setBusy(item.name);
      try {
        await addShoppingItem(
          familyId,
          { name: item.name, quantity: item.defaultQuantity ?? '', note: '' },
          currentUser,
          displayName
        );
      } finally {
        setBusy(null);
      }
    }
  }

  return (
    <>
      {/* Category buttons */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setOpenCategory(cat)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-colors whitespace-nowrap"
          >
            <span className="text-gray-500">{cat.icon}</span>
            <span className="text-xs font-medium">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Category modal */}
      {openCategory && createPortal(
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpenCategory(null)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl z-10 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{openCategory.icon}</span>
                <h3 className="text-lg font-bold text-gray-900">{openCategory.label}</h3>
              </div>
              <button
                onClick={() => setOpenCategory(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex flex-wrap gap-2">
              {openCategory.items.map((item) => {
                const onList = !!findOnList(item.name);
                const isBusy = busy === item.name;
                const existing = findOnList(item.name);

                return (
                  <button
                    key={item.name}
                    onClick={() => handleItemClick(item)}
                    disabled={isBusy}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                      onList
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-red-500 hover:border-red-500'
                        : isBusy
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    <span className="text-base">{item.emoji}</span>
                    <span>{item.name}</span>
                    {onList && existing?.quantity && (
                      <span className="text-xs opacity-80 ml-0.5">({existing.quantity})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
