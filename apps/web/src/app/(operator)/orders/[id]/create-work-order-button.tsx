'use client';

import { workOrdersApi } from '@/lib/api/work-orders';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const WO_TYPES = [
  { value: 'install', label: 'Install' },
  { value: 'disconnect', label: 'Disconnect' },
  { value: 'reroute', label: 'Reroute' },
  { value: 'repair', label: 'Repair' },
  { value: 'audit_check', label: 'Audit Check' },
] as const;

export function CreateWorkOrderButton({ serviceId, token }: { serviceId: string; token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [woType, setWoType] = useState<string>('install');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const wo = await workOrdersApi.create(token, {
        serviceId,
        woType,
        notes: notes.trim() || undefined,
      });
      router.push(`/work-orders/${wo.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create work order');
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Create Work Order
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-900">New Work Order</p>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Type</label>
        <select
          value={woType}
          onChange={(e) => setWoType(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {WO_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
          placeholder="Optional notes for the technician"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
