import { useState } from 'react';
import { joinFamilyByInviteCode } from '../services/familyService';
import type { User } from 'firebase/auth';

interface JoinFamilyFormProps {
  currentUser: User;
  displayName: string;
  initialCode?: string;
  onJoined: (familyId: string) => void;
}

export default function JoinFamilyForm({
  currentUser,
  displayName,
  initialCode = '',
  onJoined,
}: JoinFamilyFormProps) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError('Unesi invite kod');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const familyId = await joinFamilyByInviteCode(code, currentUser, displayName);
      onJoined(familyId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Došlo je do greške, pokušaj ponovo';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Invite kod (npr. K7M9P2)"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base tracking-widest font-mono uppercase"
        maxLength={10}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-xl text-base transition-colors"
      >
        {loading ? 'Pridružujem...' : 'Pridruži se'}
      </button>
    </form>
  );
}
