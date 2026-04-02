'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBuilding } from './actions';

export function NewBuildingForm({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const floorsRaw = fd.get('floors') as string;
    const outcome = await createBuilding(siteId, {
        name: fd.get('name') as string,
        code: (fd.get('code') as string).toUpperCase(),
        floors: floorsRaw ? parseInt(floorsRaw, 10) : undefined,
      });
      if ('error' in outcome) {
        setError((outcome as { error: string }).error);
        setSaving(false);
        return;
      }
      router.push(`/locations/${siteId}`);
      router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Building Name *</label>
        <input
          name="name"
          required
          placeholder="e.g. Building A"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Building Code *</label>
        <input
          name="code"
          required
          placeholder="e.g. BLDG-A"
          maxLength={20}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Number of Floors</label>
        <input
          name="floors"
          type="number"
          min={1}
          max={200}
          placeholder="e.g. 4"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
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
          {saving ? 'Saving…' : 'Add Building'}
        </button>
      </div>
    </form>
  );
}
