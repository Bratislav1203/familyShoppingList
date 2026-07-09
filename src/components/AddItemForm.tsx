import { useState, useRef, useEffect } from 'react';
import { addShoppingItem } from '../services/shoppingService';
import type { User } from 'firebase/auth';

interface AddItemFormProps {
  familyId: string;
  currentUser: User;
  displayName: string;
}

export default function AddItemForm({ familyId, currentUser, displayName }: AddItemFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Unesi naziv stavke');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await addShoppingItem(familyId, { name, quantity, note }, currentUser, displayName);
      setName('');
      setQuantity('');
      setNote('');
      setOpen(false);
    } catch {
      setError('Došlo je do greške, pokušaj ponovo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <span className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <span className="text-base">Dodaj stavku...</span>
        </button>
      )}

      {/* Form */}
      {open && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4">
          <div className="flex gap-2 mb-3">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naziv stavke"
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              {loading ? '...' : 'Dodaj'}
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Količina (npr. 2l, 3 kom)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              maxLength={30}
            />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Napomena (opciono)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              maxLength={100}
            />
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            type="button"
            onClick={() => { setOpen(false); setError(''); setName(''); setQuantity(''); setNote(''); }}
            className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Otkaži
          </button>
        </form>
      )}
    </div>
  );
}
