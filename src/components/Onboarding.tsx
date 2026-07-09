import { useState } from 'react';
import { createOrUpdateUserProfile } from '../services/userService';

interface OnboardingProps {
  uid: string;
  onComplete: () => void;
}

export default function Onboarding({ uid, onComplete }: OnboardingProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Unesi ime');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createOrUpdateUserProfile(uid, name);
      onComplete();
    } catch (err) {
      setError('Došlo je do greške, pokušaj ponovo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-4xl mb-6 text-center">👋</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Dobrodošao!</h1>
        <p className="text-gray-500 text-center mb-8">Kako da te zovemo?</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tvoje ime ili nadimak"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            autoFocus
            maxLength={50}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-base transition-colors"
          >
            {loading ? 'Snimam...' : 'Nastavi'}
          </button>
        </form>
      </div>
    </div>
  );
}
