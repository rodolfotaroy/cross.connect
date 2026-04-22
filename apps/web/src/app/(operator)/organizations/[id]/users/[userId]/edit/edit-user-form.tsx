'use client';

import { orgsApi } from '@/lib/api/organizations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UserDto } from '@/lib/api/organizations';

interface Props {
  orgId: string;
  orgType: string;
  user: UserDto;
  token: string;
}

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const inputCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

const CUSTOMER_ROLES = [
  { value: 'customer_admin', label: 'Customer Admin' },
  { value: 'customer_orderer', label: 'Customer Orderer' },
  { value: 'customer_viewer', label: 'Customer Viewer' },
  { value: 'ops_technician', label: 'Ops Technician' },
  { value: 'ops_manager', label: 'Ops Manager' },
];

const SP_ROLES = [
  { value: 'sp_admin', label: 'SP Admin' },
  { value: 'sp_ops', label: 'SP Operations' },
  { value: 'sp_viewer', label: 'SP Viewer' },
  { value: 'sp_report', label: 'SP Reports' },
];

export function EditUserForm({ orgId, orgType, user, token }: Props) {
  const router = useRouter();
  const isSp = orgType === 'service_partner';
  const ROLES = isSp ? SP_ROLES : CUSTOMER_ROLES;

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role as string);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await orgsApi.updateUser(token, user.id, { firstName, lastName, email, role });
      router.push(`/organizations/${orgId}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update user');
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
          maxLength={255}
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          {busy ? 'Saving…' : 'Save Changes'}
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
