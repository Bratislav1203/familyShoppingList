import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setActiveFamilyId } from '../services/familyService';
import type { UserFamily } from '../types';

interface FamilySwitcherProps {
  families: UserFamily[];
  activeFamilyId: string | null;
  onSwitch: (familyId: string) => void;
}

export default function FamilySwitcher({ families, activeFamilyId, onSwitch }: FamilySwitcherProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const active = families.find((f) => f.familyId === activeFamilyId);

  function handleSelect(familyId: string) {
    setActiveFamilyId(familyId);
    onSwitch(familyId);
    setOpen(false);
    navigate(`/family/${familyId}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors max-w-[200px]"
      >
        <span className="truncate">{active?.familyName ?? 'Izaberi porodicu'}</span>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden">
            {families.map((f) => (
              <button
                key={f.familyId}
                onClick={() => handleSelect(f.familyId)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  f.familyId === activeFamilyId ? 'text-blue-600 font-semibold' : 'text-gray-700'
                }`}
              >
                <span className="truncate">{f.familyName}</span>
                {f.familyId === activeFamilyId && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => { setOpen(false); navigate('/families'); }}
                className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                + Nova porodica
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/families?tab=join'); }}
                className="w-full text-left px-4 py-3 text-sm text-green-600 hover:bg-green-50 transition-colors font-medium"
              >
                + Pridruži se kodom
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
