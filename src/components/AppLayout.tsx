import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import FamilySwitcher from './FamilySwitcher';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => activeFamilyId && navigate(`/family/${activeFamilyId}`)}
            className="flex items-center gap-2"
          >
            <span className="text-xl">🛒</span>
            <span className="font-bold text-gray-900 text-base">Family Shopping</span>
          </button>

          <div className="flex items-center gap-3">
            {families.length > 0 && (
              <FamilySwitcher
                families={families}
                activeFamilyId={activeFamilyId}
                onSwitch={onFamilySwitch}
              />
            )}
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
