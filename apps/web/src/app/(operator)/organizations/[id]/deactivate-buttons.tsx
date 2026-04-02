'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

export function DeactivateUserButton({
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
      setError('Failed to deactivate. Please try again.');
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-600">Deactivate &ldquo;{userName}&rdquo;?</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {loading ? 'Deactivating…' : 'Confirm'}
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
      Deactivate
    </button>
  );
}

export function DeactivateOrgButton({
  orgId,
  orgName,
  token,
}: {
  orgId: string;
  orgName: string;
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
      const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.push('/organizations');
    } catch {
      setError('Failed to deactivate. Please try again.');
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">
          Deactivate &ldquo;{orgName}&rdquo;? All users will lose access.
        </span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {loading ? 'Deactivating…' : 'Confirm'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        {error && <span className="text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={loading}
      className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      Deactivate Org
    </button>
  );
}
