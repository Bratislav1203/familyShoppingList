import { useState } from 'react';
import { createPortal } from 'react-dom';

type Platform = 'iphone-safari' | 'android-chrome';

const DISMISSED_KEY = 'addToHomeScreenGuideDismissed';

export function useAddToHomeScreenGuide() {
  const [open, setOpen] = useState(false);

  function show() {
    setOpen(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
  }

  return { open, show, dismiss };
}

interface AddToHomeScreenGuideProps {
  onDismiss: () => void;
}

export default function AddToHomeScreenGuide({ onDismiss }: AddToHomeScreenGuideProps) {
  const [platform, setPlatform] = useState<Platform>('iphone-safari');

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl z-10 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-gray-900">Dodaj na početni ekran</h2>
            <button
              onClick={onDismiss}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Koristi aplikaciju kao da je instalirana — bez otvaranja browsera svaki put.
          </p>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-2 px-5 pt-4">
          <button
            onClick={() => setPlatform('iphone-safari')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              platform === 'iphone-safari'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>🍎</span> iPhone
          </button>
          <button
            onClick={() => setPlatform('android-chrome')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              platform === 'android-chrome'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>🤖</span> Android
          </button>
        </div>

        {/* Steps */}
        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {platform === 'iphone-safari' ? (
            <>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Safari · iPhone / iPad</p>
              {[
                { n: 1, text: 'Otvori aplikaciju u Safari browseru.' },
                { n: 2, text: 'Dodirni dugme za deljenje — kvadrat sa strelicom nagore, na dnu ekrana.' },
                { n: 3, text: 'Skroluj nadole i izaberi "Add to Home Screen" / "Dodaj na početni ekran".' },
                { n: 4, text: 'Potvrdi dodirom na "Add" / "Dodaj" u gornjem desnom uglu.' },
                { n: 5, text: 'Ikonica aplikacije se pojavljuje na početnom ekranu.' },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <p className="text-sm text-gray-700 pt-0.5">{text}</p>
                </div>
              ))}
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Napomena:</span> Ako ne vidiš opciju "Add to Home Screen", skroluj niže u Share meniju ili idi na "Edit Actions" i dodaj tu opciju.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Chrome · Android</p>
              {[
                { n: 1, text: 'Otvori aplikaciju u Chrome browseru.' },
                { n: 2, text: 'Dodirni meni sa tri tačke (⋮) u gornjem desnom uglu.' },
                { n: 3, text: 'Izaberi "Add to Home screen" / "Dodaj na početni ekran".' },
                { n: 4, text: 'Potvrdi dodirom na "Add" / "Dodaj".' },
                { n: 5, text: 'Ikonica aplikacije se pojavljuje na početnom ekranu.' },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <p className="text-sm text-gray-700 pt-0.5">{text}</p>
                </div>
              ))}
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Napomena:</span> Chrome može prikazati i "Install app" — to je ista stvar, samo izaberi tu opciju.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Razumem
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
