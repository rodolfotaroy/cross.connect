'use client';

import { orgsApi } from '@/lib/api/organizations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  orgId: string;
  token: string;
}

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const inputCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

// customer_admin can only assign these roles (cannot self-escalate or create ops users)
const ASSIGNABLE_ROLES = [
  { value: 'customer_orderer', label: 'Orderer — can place and cancel orders' },
  { value: 'customer_viewer', label: 'Viewer — read-only access' },
  { value: 'customer_admin', label: 'Admin — full team management access' },
];

export function InviteTeamMemberForm({ orgId, token }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer_orderer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await orgsApi.createUser(token, orgId, { email, firstName, lastName, password, role });
      router.push('/portal/team');
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create team member. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white px-6 py-5"
    >
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            className={inputCls}
            placeholder="Jane"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            className={inputCls}
            placeholder="Smith"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          className={inputCls}
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>
          Temporary Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          required
          minLength={12}
          className={inputCls}
          placeholder="Min 12 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-400">
          Share this with the new member — they should change it after first login.
        </p>
      </div>

      <div>
        <label className={labelCls}>
          Role <span className="text-red-500">*</span>
        </label>
        <select
          required
          className={inputCls}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create Member'}
        </button>
        <a
          href="/portal/team"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
