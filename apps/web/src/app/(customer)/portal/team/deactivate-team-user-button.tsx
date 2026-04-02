'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

export function DeactivateTeamUserButton({
  userId,
  userName,
  token,
}: {
  userId: string;
  userName: string;
  token: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch {
      setError('Failed to remove access. Please try again.');
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-600">Remove access for &ldquo;{userName}&rdquo;?</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {loading ? 'Removing…' : 'Confirm'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        {error && <span className="text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-xs text-red-500 hover:text-red-700">
      Remove access
    </button>
  );
}
