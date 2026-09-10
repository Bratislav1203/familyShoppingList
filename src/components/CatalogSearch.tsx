import { useState, useEffect, useRef } from 'react';
import type { CatalogProduct } from '../types';
import { loadCatalog, searchCatalog } from '../services/catalogService';

interface CatalogSearchProps {
  onSelectProduct: (product: CatalogProduct) => void;
  onTrackSearch: (query: string) => void;
}

function pkgLabel(p: CatalogProduct): string {
  if (p.packageValue != null && p.packageUnit) return `${p.packageValue} ${p.packageUnit}`;
  if (p.packageUnit) return p.packageUnit;
  return '';
}

export default function CatalogSearch({ onSelectProduct, onTrackSearch }: CatalogSearchProps) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const catalogRef = useRef<CatalogProduct[] | null>(null);

  useEffect(() => {
    loadCatalog()
      .then((c) => { catalogRef.current = c; })
      .catch((e) => console.error('Katalog nije učitan:', e));
  }, []);

  useEffect(() => {
    const q = searchText.trim();
    if (q.length < 2 || !catalogRef.current) {
      setResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      setResults(searchCatalog(catalogRef.current!, q, 25));
      setSearching(false);
    }, 150);
    return () => clearTimeout(id);
  }, [searchText]);

  const q = searchText.trim();

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
      <label className="block text-sm font-semibold text-gray-900">
        Pretraži proizvod
      </label>
      <div className="relative">
        <svg
          className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="npr. Ariel kapsule, mleko, kafa..."
        />
      </div>

      {q.length >= 2 && (
        <button
          type="button"
          onClick={() => onTrackSearch(q)}
          className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          Prati ovu pretragu „{q}"
        </button>
      )}

      {searching && <p className="text-xs text-gray-400">Pretražujem…</p>}

      {results.length > 0 && (
        <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.ean}
              type="button"
              onClick={() => onSelectProduct(p)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-400">
                {[pkgLabel(p), p.brand, p.category].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}
        </div>
      )}

      {q.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-gray-400">
          Nema rezultata u katalogu — možeš svejedno pratiti ovu pretragu.
        </p>
      )}
    </div>
  );
}
