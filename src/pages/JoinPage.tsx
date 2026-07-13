import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { joinFamilyByInviteCode, setActiveFamilyId } from '../services/familyService';
import LoadingScreen from '../components/LoadingScreen';
import Onboarding from '../components/Onboarding';

const PENDING_INVITE_KEY = 'pendingInviteCode';

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);
  const [status, setStatus] = useState<'idle' | 'joining' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const didJoin = useRef(false);

  // Save invite code for after onboarding
  useEffect(() => {
    if (inviteCode) {
      localStorage.setItem(PENDING_INVITE_KEY, inviteCode);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !profile?.displayName) return;
    if (didJoin.current) return;

    const code = inviteCode ?? localStorage.getItem(PENDING_INVITE_KEY);
    if (!code) {
      navigate('/');
      return;
    }

    didJoin.current = true;
    void doJoin(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileLoading, user, profile]);

  async function doJoin(code: string) {
    if (!user || !profile?.displayName) return;
    setStatus('joining');
    try {
      const familyId = await joinFamilyByInviteCode(code, user, profile.displayName);
      localStorage.removeItem(PENDING_INVITE_KEY);
      setActiveFamilyId(familyId);
      navigate(`/family/${familyId}`, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Došlo je do greške, pokušaj ponovo';
      setErrorMsg(msg);
      setStatus('error');
      didJoin.current = false;
    }
  }

  if (authLoading || profileLoading || status === 'joining') {
    return <LoadingScreen message="Pridružujem te porodici..." />;
  }

  if (!user) return <LoadingScreen />;

  // Need onboarding first — profile listener will update and trigger join via useEffect
  if (!profile?.displayName) {
    return (
      <Onboarding
        uid={user.uid}
        onComplete={() => {/* profile listener updates, useEffect will trigger join */}}
      />
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Greška</h2>
          <p className="text-red-500 mb-6">{errorMsg}</p>
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

  return <LoadingScreen message="Obrađujem..." />;
}
