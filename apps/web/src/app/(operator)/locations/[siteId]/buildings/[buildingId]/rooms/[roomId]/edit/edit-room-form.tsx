'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateRoom } from './actions';

const ROOM_TYPES = ['standard', 'mmr', 'telco_closet', 'common_area'] as const;

interface Props {
  siteId: string;
  buildingId: string;
  roomId: string;
  defaults: { name: string; roomType: string; floor?: string; notes?: string };
}

export function EditRoomForm({ siteId, buildingId, roomId, defaults }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const outcome = await updateRoom(siteId, buildingId, roomId, {
        name: fd.get('name') as string,
        roomType: fd.get('roomType') as string,
        floor: (fd.get('floor') as string) || undefined,
        notes: (fd.get('notes') as string) || undefined,
      });
      if (outcome && 'error' in outcome) {
        setError((outcome as { error: string }).error);
        setSaving(false);
        return;
      }
      router.push(`/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`);
      router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700">Room Name *</label>
        <input name="name" required defaultValue={defaults.name}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Room Type *</label>
          <select name="roomType" required defaultValue={defaults.roomType}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Floor</label>
          <input name="floor" defaultValue={defaults.floor ?? ''}
            placeholder="e.g. 1, B1, M"
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
