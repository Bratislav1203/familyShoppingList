import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserFamilies } from '../hooks/useUserFamilies';
import { setActiveFamilyId } from '../services/familyService';
import LoadingScreen from '../components/LoadingScreen';
import AppLayout from '../components/AppLayout';
import WatchlistPage from '../components/WatchlistPage';

interface WatchlistRoutePageProps {
  globalActiveFamilyId: string | null;
  setGlobalActiveFamilyId: (id: string) => void;
}

export default function WatchlistRoutePage({
  globalActiveFamilyId,
  setGlobalActiveFamilyId,
}: WatchlistRoutePageProps) {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);
  const { families, loading: familiesLoading } = useUserFamilies(user?.uid ?? null);

  const activeFamilyId = familyId ?? globalActiveFamilyId;

  useEffect(() => {
    if (familyId) {
      setActiveFamilyId(familyId);
      setGlobalActiveFamilyId(familyId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  if (authLoading || profileLoading || familiesLoading) return <LoadingScreen />;
  if (!user || !profile?.displayName) return <LoadingScreen />;

  const isMember = families.some((f) => f.familyId === familyId);
  if (families.length > 0 && !isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nema pristupa</h2>
          <p className="text-gray-500 mb-6">Nemaš pristup ovoj porodici</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
          >
            Idi na početnu
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      families={families}
      activeFamilyId={activeFamilyId}
      onFamilySwitch={(id) => {
        setGlobalActiveFamilyId(id);
        navigate(`/family/${id}/watchlist`);
      }}
      displayName={profile.displayName}
    >
      <WatchlistPage familyId={familyId!} />
    </AppLayout>
  );
}
