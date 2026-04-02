'use client';

import { orgsApi } from '@/lib/api/organizations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  orgId: string;
  orgName: string;
  token: string;
}

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const inputCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

const ROLES = [
  { value: 'customer_admin', label: 'Customer Admin' },
  { value: 'customer_orderer', label: 'Customer Orderer' },
  { value: 'customer_viewer', label: 'Customer Viewer' },
  { value: 'ops_technician', label: 'Ops Technician' },
  { value: 'ops_manager', label: 'Ops Manager' },
];

export function AddUserForm({ orgId, orgName, token }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer_admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await orgsApi.createUser(token, orgId, { email, firstName, lastName, password, role });
      router.push(`/organizations/${orgId}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create user');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-white rounded-lg border border-gray-200 px-6 py-5 max-w-lg"
    >
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
        Adding user to: <span className="font-medium text-gray-900">{orgName}</span>
      </div>

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
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>
          Password <span className="text-red-500">*</span>
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
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
