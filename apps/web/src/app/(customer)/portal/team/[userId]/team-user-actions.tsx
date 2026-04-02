'use client';

import { orgsApi } from '@/lib/api/organizations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ASSIGNABLE_ROLES = [
  { value: 'customer_admin', label: 'Admin — full team management access' },
  { value: 'customer_orderer', label: 'Orderer — can place and cancel orders' },
  { value: 'customer_viewer', label: 'Viewer — read-only access' },
];

interface Props {
  userId: string;
  currentRole: string;
  isActive: boolean;
  token: string;
}

export function TeamUserActions({ userId, currentRole, isActive, token }: Props) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleRoleChange(newRole: string) {
    if (newRole === role) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await orgsApi.updateUserRole(token, userId, newRole);
      setRole(newRole);
      setSuccess('Role updated.');
      router.refresh();
    } catch {
      setError('Failed to update role.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (isActive) {
        await orgsApi.deactivateUser(token, userId);
      } else {
        await orgsApi.reactivateUser(token, userId);
      }
      setSuccess(isActive ? 'User deactivated.' : 'User reactivated.');
      router.push('/portal/team');
      router.refresh();
    } catch {
      setError('Failed to update user status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Change Role</h2>
        <select
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={role}
          disabled={busy}
          onChange={(e) => handleRoleChange(e.target.value)}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Account Status</h2>
        <p className="text-sm text-gray-500">
          {isActive
            ? "Deactivating removes the member's access immediately."
            : "Reactivating restores the member's access."}
        </p>
        <button
          onClick={handleToggleActive}
          disabled={busy}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {busy ? 'Saving…' : isActive ? 'Deactivate Member' : 'Reactivate Member'}
        </button>
      </div>
    </div>
  );
}
