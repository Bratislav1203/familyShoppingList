import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FamilySwitcher from './FamilySwitcher';
import AddToHomeScreenGuide from './AddToHomeScreenGuide';
import type { UserFamily } from '../types';

interface AppLayoutProps {
  children: ReactNode;
  families: UserFamily[];
  activeFamilyId: string | null;
  onFamilySwitch: (familyId: string) => void;
  displayName: string;
}

export default function AppLayout({
  children,
  families,
  activeFamilyId,
  onFamilySwitch,
  displayName,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);

  const isWatchlist = activeFamilyId
    ? location.pathname === `/family/${activeFamilyId}/watchlist`
    : false;

  const isDeals = activeFamilyId
    ? location.pathname === `/family/${activeFamilyId}/deals`
    : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGuideOpen(true)}
              className="flex-shrink-0"
              aria-label="Kako instalirati aplikaciju"
            >
              <img src="/icon-192.png" alt="logo" className="w-8 h-8 rounded-xl" />
            </button>
            <button
              onClick={() => activeFamilyId && navigate(`/family/${activeFamilyId}`)}
              className="font-bold text-gray-900 text-base"
            >
              Food Corner
            </button>
          </div>

          <div className="flex items-center gap-3">
            {families.length > 0 && (
              <FamilySwitcher
                families={families}
                activeFamilyId={activeFamilyId}
                onSwitch={onFamilySwitch}
              />
            )}
            {activeFamilyId && (
              <button
                onClick={() =>
                  navigate(
                    isWatchlist
                      ? `/family/${activeFamilyId}`
                      : `/family/${activeFamilyId}/watchlist`
                  )
                }
                title="Praćenje cena"
                className={`p-2 rounded-xl transition-colors ${
                  isWatchlist
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
            )}
            {activeFamilyId && (
              <button
                onClick={() =>
                  navigate(
                    isDeals
                      ? `/family/${activeFamilyId}`
                      : `/family/${activeFamilyId}/deals`
                  )
                }
                title="Ponude"
                className={`p-2 rounded-xl transition-colors ${
                  isDeals
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>

      {guideOpen && (
        <AddToHomeScreenGuide onDismiss={() => setGuideOpen(false)} />
      )}
    </div>
  );
}
