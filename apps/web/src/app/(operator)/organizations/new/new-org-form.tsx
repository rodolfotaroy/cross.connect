'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createOrganization } from './actions';

export function NewOrgForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const org = await createOrganization({
        name: fd.get('name') as string,
        code: (fd.get('code') as string).toUpperCase(),
        orgType: fd.get('orgType') as string,
        contactEmail: (fd.get('contactEmail') as string) || undefined,
        contactPhone: (fd.get('contactPhone') as string) || undefined,
        notes: (fd.get('notes') as string) || undefined,
      });
      router.push(`/organizations/${org.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create organization.');
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Organization Name *</label>
        <input
          name="name"
          required
          minLength={2}
          maxLength={200}
          placeholder="e.g. Acme Telecom"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Code *</label>
          <input
            name="code"
            required
            minLength={2}
            maxLength={20}
            placeholder="e.g. ACME"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-gray-400">Uppercase letters, numbers, - or _ only</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Type *</label>
          <select
            name="orgType"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select type...</option>
            <option value="customer">Customer</option>
            <option value="carrier">Carrier</option>
            <option value="cloud_provider">Cloud Provider</option>
            <option value="exchange">Exchange</option>
            <option value="operator">Operator</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Email</label>
          <input
            name="contactEmail"
            type="email"
            placeholder="admin@example.com"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
          <input
            name="contactPhone"
            type="tel"
            placeholder="+1 555 000 0000"
            maxLength={30}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="Optional notes..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Create Organization'}
        </button>
      </div>
    </form>
  );
}
