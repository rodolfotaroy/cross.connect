'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSite } from './actions';

export function NewSiteForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const result = await createSite({
        name: fd.get('name') as string,
        code: (fd.get('code') as string).toUpperCase(),
        address: fd.get('address') as string,
        city: fd.get('city') as string,
        country: (fd.get('country') as string).toUpperCase(),
      });
      if ('error' in result) {
        setError((result as { error: string }).error);
        setSaving(false);
        return;
      }
      router.push(`/locations/${(result as { id: string }).id}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Site Name *</label>
        <input
          name="name"
          required
          placeholder="e.g. New York Data Center 1"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Site Code *</label>
        <input
          name="code"
          required
          placeholder="e.g. NYDC1"
          maxLength={20}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-gray-400">Short unique identifier - will be uppercased.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          name="address"
          placeholder="e.g. 123 Main St"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">City *</label>
          <input
            name="city"
            required
            placeholder="e.g. New York"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Country *</label>
          <input
            name="country"
            required
            placeholder="e.g. US"
            maxLength={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-gray-400">2-letter country code.</p>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
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
          {saving ? 'Saving…' : 'Create Site'}
        </button>
      </div>
    </form>
  );
}
