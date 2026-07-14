import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, BrowserRouter } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { useUserFamilies } from './hooks/useUserFamilies';
import { getActiveFamilyId, setActiveFamilyId } from './services/familyService';
import LoadingScreen from './components/LoadingScreen';
import Onboarding from './components/Onboarding';
import FamilySetup from './components/FamilySetup';
import FamilyPage from './pages/FamilyPage';
import FamiliesPage from './pages/FamiliesPage';
import JoinPage from './pages/JoinPage';
import WatchlistRoutePage from './pages/WatchlistRoutePage';
import DealsRoutePage from './pages/DealsRoutePage';
import PublicWatchlistPage from './pages/PublicWatchlistPage';
import PublicDealPage from './pages/PublicDealPage';

function AppRoutes() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const { user, loading: authLoading, error: authError } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);
  const { families, loading: familiesLoading } = useUserFamilies(user?.uid ?? null);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const didBootstrap = useRef(false);

  // Once all data is loaded, do one-time routing decision
  useEffect(() => {
    if (authLoading || profileLoading || familiesLoading) return;
    if (!user) return;

    // Only bootstrap once per session, not on every Firestore update
    if (didBootstrap.current) return;

    const path = window.location.pathname;
    // Don't interfere with /join or /families routes
    if (path.startsWith('/join/') || path.startsWith('/families') || path.startsWith('/family/')) {
      didBootstrap.current = true;
      return;
    }

    // At root "/" — decide where to send user
    if (!profile?.displayName) return; // wait for onboarding render below
    if (families.length === 0) return; // wait for FamilySetup render below

    const stored = getActiveFamilyId();
    const valid = families.find((f) => f.familyId === stored);
    const id = valid ? valid.familyId : families[0].familyId;
    setActiveFamilyId(id);
    setActiveFamilyIdState(id);
    didBootstrap.current = true;
    navigateRef.current(`/family/${id}`, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileLoading, familiesLoading, user, profile, families]);

  // Show loading until auth resolves
  if (authLoading) return <LoadingScreen />;

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-red-500">{authError}</p>
      </div>
    );
  }

  if (!user) return <LoadingScreen />;

  // Onboarding — must happen before anything else
  if (!profileLoading && !profile?.displayName) {
    const path = window.location.pathname;
    // Allow join page to handle its own onboarding
    if (!path.startsWith('/join/')) {
      return <Onboarding uid={user.uid} onComplete={() => { didBootstrap.current = false; }} />;
    }
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          profileLoading || familiesLoading ? (
            <LoadingScreen />
          ) : !profile?.displayName ? (
            <Onboarding uid={user.uid} onComplete={() => { didBootstrap.current = false; }} />
          ) : families.length === 0 ? (
            <FamilySetup
              currentUser={user}
              displayName={profile.displayName}
              onDone={(familyId) => {
                setActiveFamilyId(familyId);
                setActiveFamilyIdState(familyId);
                navigateRef.current(`/family/${familyId}`);
              }}
            />
          ) : (
            <LoadingScreen message="Učitavanje..." />
          )
        }
      />
      <Route path="/families" element={<FamiliesPage />} />
      <Route path="/join/:inviteCode" element={<JoinPage />} />
      <Route
        path="/family/:familyId/watchlist"
        element={
          <WatchlistRoutePage
            globalActiveFamilyId={activeFamilyId}
            setGlobalActiveFamilyId={setActiveFamilyIdState}
          />
        }
      />
      <Route
        path="/family/:familyId/deals"
        element={
          <DealsRoutePage
            globalActiveFamilyId={activeFamilyId}
            setGlobalActiveFamilyId={setActiveFamilyIdState}
          />
        }
      />
      <Route
        path="/family/:familyId"
        element={
          <FamilyPage
            globalActiveFamilyId={activeFamilyId}
            setGlobalActiveFamilyId={setActiveFamilyIdState}
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/watchlist/:token" element={<PublicWatchlistPage />} />
        <Route path="/deal" element={<PublicDealPage />} />
        <Route path="/*" element={<AppRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
