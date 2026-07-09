import { useState } from 'react';
import { createFamily } from '../services/familyService';
import type { User } from 'firebase/auth';

interface CreateFamilyFormProps {
  currentUser: User;
  onCreated: (familyId: string) => void;
}

export default function CreateFamilyForm({ currentUser, onCreated }: CreateFamilyFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Unesi naziv porodice');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const familyId = await createFamily(name, currentUser);
      onCreated(familyId);
    } catch (err) {
      setError('Došlo je do greške, pokušaj ponovo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Naziv porodice (npr. Lazić kuća)"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        maxLength={60}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-base transition-colors"
      >
        {loading ? 'Kreiram...' : 'Napravi porodicu'}
      </button>
    </form>
  );
}
