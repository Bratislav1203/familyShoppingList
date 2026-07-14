import { useState } from 'react';
import type { WatchlistItem, CriteriaMode } from '../types';
import type { WatchlistItemInput } from '../services/watchlistService';

interface WatchlistItemFormProps {
  initial?: WatchlistItem;
  onSave: (data: WatchlistItemInput) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: WatchlistItemInput = {
  name: '',
  brand: '',
  variant: '',
  packageSize: '',
  enabled: true,
  maxPrice: null,
  minimumDiscountPercent: null,
  criteriaMode: 'ANY',
  includeTerms: [],
  excludeTerms: [],
  notes: '',
};

function termsToText(terms?: string[]): string {
  return (terms ?? []).join('\n');
}

function textToTerms(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function WatchlistItemForm({ initial, onSave, onCancel }: WatchlistItemFormProps) {
  const [form, setForm] = useState<WatchlistItemInput>(
    initial
      ? {
          name: initial.name,
          brand: initial.brand ?? '',
          variant: initial.variant ?? '',
          packageSize: initial.packageSize ?? '',
          enabled: initial.enabled,
          maxPrice: initial.maxPrice ?? null,
          minimumDiscountPercent: initial.minimumDiscountPercent ?? null,
          criteriaMode: initial.criteriaMode,
          includeTerms: initial.includeTerms ?? [],
          excludeTerms: initial.excludeTerms ?? [],
          notes: initial.notes ?? '',
        }
      : EMPTY
  );
  const [includeText, setIncludeText] = useState(termsToText(form.includeTerms));
  const [excludeText, setExcludeText] = useState(termsToText(form.excludeTerms));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof WatchlistItemInput>(key: K, value: WatchlistItemInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Naziv je obavezan');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        brand: form.brand?.trim() || undefined,
        variant: form.variant?.trim() || undefined,
        packageSize: form.packageSize?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        includeTerms: textToTerms(includeText),
        excludeTerms: textToTerms(excludeText),
      });
    } catch (err) {
      console.error('WatchlistItemForm save error:', err);
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">
            {initial ? 'Izmeni proizvod' : 'Dodaj proizvod'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Naziv */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naziv <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="npr. Jelen pivo"
            />
          </div>

          {/* Brand + Varijanta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brend</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.brand ?? ''}
                onChange={(e) => set('brand', e.target.value)}
                placeholder="npr. Jelen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Varijanta</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.variant ?? ''}
                onChange={(e) => set('variant', e.target.value)}
                placeholder="npr. limenka"
              />
            </div>
          </div>

          {/* Pakovanje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pakovanje</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={form.packageSize ?? ''}
              onChange={(e) => set('packageSize', e.target.value)}
              placeholder="npr. 0.5 l"
            />
          </div>

          {/* Cena + Popust */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maks. cena (RSD)
              </label>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.maxPrice ?? ''}
                onChange={(e) =>
                  set('maxPrice', e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="npr. 70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min. popust (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.minimumDiscountPercent ?? ''}
                onChange={(e) =>
                  set(
                    'minimumDiscountPercent',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                placeholder="npr. 20"
              />
            </div>
          </div>

          {/* Criteria mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Način provere</label>
            <div className="flex gap-3">
              {(['ANY', 'ALL'] as CriteriaMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set('criteriaMode', mode)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.criteriaMode === mode
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'ANY' ? 'Bilo koji uslov' : 'Svi uslovi'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {form.criteriaMode === 'ANY'
                ? 'Obaveštenje kada cena OR popust odgovara'
                : 'Obaveštenje samo kada cena AND popust odgovaraju'}
            </p>
          </div>

          {/* Include terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reči koje moraju biti prisutne
            </label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              value={includeText}
              onChange={(e) => setIncludeText(e.target.value)}
              placeholder={'Jelen\n0.5 l'}
            />
            <p className="mt-0.5 text-xs text-gray-400">Jedna reč/fraza po liniji</p>
          </div>

          {/* Exclude terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reči koje ne smeju biti prisutne
            </label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              value={excludeText}
              onChange={(e) => setExcludeText(e.target.value)}
              placeholder={'bezalkoholno\n0.33 l\n4x0.5 l'}
            />
            <p className="mt-0.5 text-xs text-gray-400">Jedna reč/fraza po liniji</p>
          </div>

          {/* Napomena */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Opciono"
            />
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('enabled', !form.enabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">Prati ovaj proizvod</span>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Čuvam...' : 'Sačuvaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
