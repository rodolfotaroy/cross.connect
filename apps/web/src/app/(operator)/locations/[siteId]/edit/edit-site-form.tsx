'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateSite } from './actions';

interface Props {
  siteId: string;
  defaults: {
    name: string;
    address: string;
    city: string;
    state?: string;
    country: string;
    timezone: string;
    notes?: string;
  };
}

export function EditSiteForm({ siteId, defaults }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const outcome = await updateSite(siteId, {
        name: fd.get('name') as string,
        address: fd.get('address') as string,
        city: fd.get('city') as string,
        state: (fd.get('state') as string) || undefined,
        country: (fd.get('country') as string).toUpperCase(),
        timezone: fd.get('timezone') as string,
        notes: (fd.get('notes') as string) || undefined,
      });
      if (outcome && 'error' in outcome) {
        setError((outcome as { error: string }).error);
        setSaving(false);
        return;
      }
      router.push(`/locations/${siteId}`);
      router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700">Site Name *</label>
        <input name="name" required defaultValue={defaults.name}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input name="address" defaultValue={defaults.address}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">City *</label>
          <input name="city" required defaultValue={defaults.city}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Country (2-char) *</label>
          <input name="country" required maxLength={2} defaultValue={defaults.country}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">State / Province</label>
          <input name="state" defaultValue={defaults.state ?? ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Timezone</label>
          <input name="timezone" defaultValue={defaults.timezone}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea name="notes" rows={3} defaultValue={defaults.notes ?? ''}
          className="mt-1 block w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
