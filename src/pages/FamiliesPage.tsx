import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserFamilies } from '../hooks/useUserFamilies';
import { setActiveFamilyId } from '../services/familyService';
import LoadingScreen from '../components/LoadingScreen';
import AppLayout from '../components/AppLayout';
import CreateFamilyForm from '../components/CreateFamilyForm';
import JoinFamilyForm from '../components/JoinFamilyForm';
import type { UserFamily } from '../types';

type Tab = 'create' | 'join';

export default function FamiliesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'create';
  const [tab, setTab] = useState<Tab>(initialTab);

  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);
  const { families, loading: familiesLoading } = useUserFamilies(user?.uid ?? null);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!familiesLoading && families.length > 0) {
      const stored = localStorage.getItem('activeFamilyId');
      const valid = families.find((f) => f.familyId === stored);
      setActiveFamilyIdState(valid?.familyId ?? families[0].familyId);
    }
  }, [families, familiesLoading]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !profile?.displayName) navigate('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileLoading, user, profile]);

  if (authLoading || profileLoading || familiesLoading) return <LoadingScreen />;
  if (!user || !profile?.displayName) return <LoadingScreen />;

  const displayName = profile.displayName;

  function handleDone(familyId: string) {
    setActiveFamilyId(familyId);
    navigate(`/family/${familyId}`);
  }

  return (
    <AppLayout
      families={families}
      activeFamilyId={activeFamilyId}
      onFamilySwitch={(id) => {
        setActiveFamilyIdState(id);
        navigate(`/family/${id}`);
      }}
      displayName={displayName}
    >
      <div className="max-w-sm mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Porodice</h2>

        {/* Existing families */}
        {families.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Moje porodice
            </p>
            {families.map((f: UserFamily) => (
              <button
                key={f.familyId}
                onClick={() => {
                  setActiveFamilyId(f.familyId);
                  navigate(`/family/${f.familyId}`);
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏠</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{f.familyName}</p>
                    <p className="text-xs text-gray-400 capitalize">{f.role === 'owner' ? 'Vlasnik' : 'Član'}</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
            <button
              onClick={() => setTab('create')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'create'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nova porodica
            </button>
            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'join'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pridruži se
            </button>
          </div>

          {tab === 'create' ? (
            <CreateFamilyForm currentUser={user} onCreated={handleDone} />
          ) : (
            <JoinFamilyForm currentUser={user} displayName={displayName} onJoined={handleDone} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
