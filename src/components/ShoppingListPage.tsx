import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFamily } from '../services/familyService';
import { clearBoughtItems, addRecipeItem } from '../services/shoppingService';
import { useShoppingItems } from '../hooks/useShoppingItems';
import type { User } from 'firebase/auth';
import type { Family, RecipeIngredient } from '../types';
import AddItemForm from './AddItemForm';
import QuickAddPanel from './QuickAddPanel';
import ShoppingItemRow from './ShoppingItemRow';
import InviteBox from './InviteBox';
import ShoppingApiKeyBox from './ShoppingApiKeyBox';
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
  const [showApiKey, setShowApiKey] = useState(false);
  const [showRecipeImport, setShowRecipeImport] = useState(false);
  const [recipeJson, setRecipeJson] = useState('');
  const [importingRecipe, setImportingRecipe] = useState(false);
  const [recipeResult, setRecipeResult] = useState<string | null>(null);

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

  async function handleRecipeImport() {
    if (!recipeJson.trim()) return;
    setImportingRecipe(true);
    setRecipeResult(null);
    try {
      const data = JSON.parse(recipeJson);
      if (!data.meal?.name) throw new Error('Neispravan format');
      const ings: RecipeIngredient[] = (data.ingredients ?? []).map((ing: { name: string; quantity: number | null; unit: string }) => ({
        name: ing.name,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? '',
      }));
      await addRecipeItem(familyId, data.meal.name, ings, currentUser, displayName);
      setRecipeResult(`✓ "${data.meal.name}" dodano na listu!`);
      setRecipeJson('');
      setTimeout(() => { setShowRecipeImport(false); setRecipeResult(null); }, 2000);
    } catch {
      setRecipeResult('Neispravan JSON — kopiraj iz KuvaJ app');
    } finally {
      setImportingRecipe(false);
    }
  }

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
        <button
          onClick={() => setShowApiKey((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-xl transition-colors"
          title="KuvaJ integracija"
        >
          🍳
        </button>
        <button
          onClick={() => { setShowRecipeImport(s => !s); setRecipeResult(null); }}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
            showRecipeImport ? 'bg-orange-100 text-orange-700' : 'bg-orange-50 hover:bg-orange-100 text-orange-600'
          }`}
          title="Uvezi recept iz KuvaJ"
        >
          📋
        </button>
      </div>

      {/* Recipe import panel */}
      {showRecipeImport && (
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 space-y-3">
          <p className="text-xs text-orange-700 font-medium">Nalepi JSON iz KuvaJ app (Kopiraj JSON na jelu):</p>
          <textarea
            value={recipeJson}
            onChange={e => setRecipeJson(e.target.value)}
            placeholder='{ "meal": { "name": "..." }, "ingredients": [...] }'
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-orange-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-white"
          />
          {recipeResult && (
            <p className={`text-sm font-medium ${recipeResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {recipeResult}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowRecipeImport(false); setRecipeJson(''); setRecipeResult(null); }}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500"
            >
              Otkaži
            </button>
            <button
              onClick={handleRecipeImport}
              disabled={importingRecipe || !recipeJson.trim()}
              className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white text-sm font-medium"
            >
              {importingRecipe ? 'Dodajem...' : 'Dodaj na listu'}
            </button>
          </div>
        </div>
      )}

      {/* Invite box */}
      {showInvite && family && <InviteBox inviteCode={family.inviteCode} />}

      {/* KuvaJ API key box */}
      {showApiKey && <ShoppingApiKeyBox familyId={familyId} />}

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
