import { useState } from 'react';
import { copyToClipboard } from '../utils/clipboard';

interface InviteBoxProps {
  inviteCode: string;
}

export default function InviteBox({ inviteCode }: InviteBoxProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `${window.location.origin}/join/${inviteCode}`;

  async function handleCopyCode() {
    await copyToClipboard(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleCopyLink() {
    await copyToClipboard(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">
        Pozovi u porodicu
      </p>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 font-mono text-lg font-bold tracking-widest text-blue-800 text-center">
          {inviteCode}
        </div>
        <button
          onClick={handleCopyCode}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
            copiedCode
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {copiedCode ? 'Kopirano!' : 'Kopiraj kod'}
        </button>
      </div>
      <button
        onClick={handleCopyLink}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
          copiedLink
            ? 'bg-green-500 text-white'
            : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
        }`}
      >
        {copiedLink ? '✓ Link kopiran!' : '🔗 Kopiraj invite link'}
      </button>
    </div>
  );
}
