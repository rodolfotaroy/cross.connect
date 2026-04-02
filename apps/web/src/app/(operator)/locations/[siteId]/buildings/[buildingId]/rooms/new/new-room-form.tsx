'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createRoom } from './actions';

export function NewRoomForm({
  buildingId,
  redirectTo,
}: {
  buildingId: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const outcome = await createRoom(buildingId, {
        name: fd.get('name') as string,
        code: (fd.get('code') as string).toUpperCase(),
        roomType: fd.get('roomType') as string,
        floor: (fd.get('floor') as string) || undefined,
        notes: (fd.get('notes') as string) || undefined,
      });
      if ('error' in outcome) {
        setError((outcome as { error: string }).error);
        setSaving(false);
        return;
      }
      router.push(redirectTo);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Room Name *</label>
        <input
          name="name"
          required
          placeholder="e.g. Main Meet Room"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Room Code *</label>
        <input
          name="code"
          required
          placeholder="e.g. MMR-1"
          maxLength={50}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Room Type *</label>
        <select
          name="roomType"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="mmr">MMR (Main Meet Room)</option>
          <option value="telco_closet">Telco Closet</option>
          <option value="standard">Standard</option>
          <option value="common_area">Common Area</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Floor</label>
        <input
          name="floor"
          placeholder="e.g. 2, Ground, B1"
          maxLength={20}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Optional notes…"
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
          {saving ? 'Saving…' : 'Create Room'}
        </button>
      </div>
    </form>
  );
}
