import { useState } from 'react';
import type { User } from 'firebase/auth';
import CreateFamilyForm from './CreateFamilyForm';
import JoinFamilyForm from './JoinFamilyForm';

interface FamilySetupProps {
  currentUser: User;
  displayName: string;
  onDone: (familyId: string) => void;
}

type Tab = 'create' | 'join';

export default function FamilySetup({ currentUser, displayName, onDone }: FamilySetupProps) {
  const [tab, setTab] = useState<Tab>('create');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-4xl mb-6 text-center">🏠</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Porodična lista</h1>
        <p className="text-gray-500 text-center mb-8">
          Napravi novu ili se pridruži postojećoj porodici
        </p>

        {/* Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
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
          <CreateFamilyForm currentUser={currentUser} onCreated={onDone} />
        ) : (
          <JoinFamilyForm currentUser={currentUser} displayName={displayName} onJoined={onDone} />
        )}
      </div>
    </div>
  );
}
