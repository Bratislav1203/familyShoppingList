import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFamily } from '../services/familyService';
import { clearBoughtItems } from '../services/shoppingService';
import { useShoppingItems } from '../hooks/useShoppingItems';
import type { User } from 'firebase/auth';
import type { Family } from '../types';
import AddItemForm from './AddItemForm';
import QuickAddPanel from './QuickAddPanel';
import ShoppingItemRow from './ShoppingItemRow';
import InviteBox from './InviteBox';
import EmptyState from './EmptyState';
import LoadingScreen from './LoadingScreen';

interface ShoppingListPageProps {
  familyId: string;
  currentUser: User;
  displayName: string;
}

export default function ShoppingListPage({
  familyId,
  currentUser,
  displayName,
}: ShoppingListPageProps) {
  const navigate = useNavigate();
  const [family, setFamily] = useState<Family | null>(null);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { items, loading: itemsLoading } = useShoppingItems(familyId);

  useEffect(() => {
    setFamilyLoading(true);
    getFamily(familyId)
      .then((f) => {
        if (!f) {
          navigate('/');
          return;
        }
        setFamily(f);
      })
      .finally(() => setFamilyLoading(false));
  }, [familyId, navigate]);

  async function handleClearBought() {
    const boughtCount = items.filter((i) => i.bought).length;
    if (boughtCount === 0) return;
    if (!window.confirm(`Obrisati ${boughtCount} kupljenu stavku?`)) return;
    setClearing(true);
    try {
      await clearBoughtItems(familyId);
    } finally {
      setClearing(false);
    }
  }

  if (familyLoading) return <LoadingScreen message="Učitavanje porodice..." />;

  const unbought = items.filter((i) => !i.bought);
  const bought = items.filter((i) => i.bought);

  return (
    <div className="space-y-4">
      {/* Family header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{family?.name}</h2>
          <p className="text-sm text-gray-400">{items.length} stavki</p>
        </div>
        <button
          onClick={() => setShowInvite((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Dodaj člana
        </button>
      </div>

      {/* Invite box */}
      {showInvite && family && <InviteBox inviteCode={family.inviteCode} />}

      {/* Add item form */}
      <AddItemForm familyId={familyId} currentUser={currentUser} displayName={displayName} />

      {/* Quick add categories */}
      <QuickAddPanel familyId={familyId} currentUser={currentUser} displayName={displayName} currentItems={items} />

      {/* List */}
      {itemsLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="Lista je prazna" />
      ) : (
        <div className="space-y-2">
          {unbought.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              familyId={familyId}
              currentUser={currentUser}
              displayName={displayName}
            />
          ))}

          {bought.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">Kupljeno ({bought.length})</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              {bought.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  familyId={familyId}
                  currentUser={currentUser}
                  displayName={displayName}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Clear bought */}
      {bought.length > 0 && (
        <button
          onClick={handleClearBought}
          disabled={clearing}
          className="w-full py-3 mt-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl border border-red-100 transition-colors disabled:opacity-50"
        >
          {clearing ? 'Brišem...' : `Obriši kupljene stavke (${bought.length})`}
        </button>
      )}
    </div>
  );
}
