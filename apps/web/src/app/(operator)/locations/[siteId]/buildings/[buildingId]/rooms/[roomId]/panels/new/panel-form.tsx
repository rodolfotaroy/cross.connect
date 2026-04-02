'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PanelFormProps {
  redirectTo: string;
  mountType: 'room' | 'rack';
  onSubmit: (data: {
    name: string;
    code: string;
    panelType: string;
    portCount: number;
    uPosition?: number;
    notes?: string;
    mediaType?: string;
    connectorType?: string;
    alternateTxRx?: boolean;
  }) => Promise<unknown>;
}

export function PanelForm({ redirectTo, mountType, onSubmit }: PanelFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [provisionPorts, setProvisionPorts] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const portCount = parseInt(fd.get('portCount') as string, 10);
    try {
      await onSubmit({
        name: fd.get('name') as string,
        code: (fd.get('code') as string).toUpperCase(),
        panelType: fd.get('panelType') as string,
        portCount,
        uPosition:
          mountType === 'rack' && fd.get('uPosition')
            ? parseInt(fd.get('uPosition') as string, 10)
            : undefined,
        notes: (fd.get('notes') as string) || undefined,
        mediaType: provisionPorts ? (fd.get('mediaType') as string) : undefined,
        connectorType: provisionPorts ? (fd.get('connectorType') as string) : undefined,
        alternateTxRx: provisionPorts ? fd.get('alternateTxRx') === 'on' : undefined,
      });
      router.push(redirectTo);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create panel.');
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Panel Name *</label>
          <input
            name="name"
            required
            placeholder="e.g. ODF-1"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Panel Code *</label>
          <input
            name="code"
            required
            placeholder="e.g. ODF-01"
            maxLength={50}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Panel Type *</label>
          <select
            name="panelType"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="patch_panel">Patch Panel</option>
            <option value="odf">ODF</option>
            <option value="fdf">FDF</option>
            <option value="demarc">Demarc</option>
            <option value="splice_enclosure">Splice Enclosure</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Port Count *</label>
          <input
            name="portCount"
            type="number"
            required
            min={1}
            max={1000}
            placeholder="e.g. 48"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {mountType === 'rack' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">U Position</label>
          <input
            name="uPosition"
            type="number"
            min={1}
            max={200}
            placeholder="e.g. 12 (optional)"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Optional notes…"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Port provisioning */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <input
            id="provisionPorts"
            type="checkbox"
            checked={provisionPorts}
            onChange={(e) => setProvisionPorts(e.target.checked)}
            className="rounded border-gray-300 text-brand-600"
          />
          <label htmlFor="provisionPorts" className="text-sm font-medium text-gray-700">
            Auto-provision ports now
          </label>
        </div>

        {provisionPorts && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Media Type *</label>
              <select
                name="mediaType"
                required={provisionPorts}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="smf">SMF</option>
                <option value="mmf">MMF</option>
                <option value="cat6">CAT6</option>
                <option value="coax">Coax</option>
                <option value="dac">DAC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Connector Type *</label>
              <select
                name="connectorType"
                required={provisionPorts}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="lc">LC</option>
                <option value="sc">SC</option>
                <option value="mtp_mpo">MTP/MPO</option>
                <option value="rj45">RJ45</option>
                <option value="fc">FC</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="alternateTxRx"
                name="alternateTxRx"
                type="checkbox"
                className="rounded border-gray-300 text-brand-600"
              />
              <label htmlFor="alternateTxRx" className="text-sm text-gray-700">
                Alternate TX/RX strands (for fibre)
              </label>
            </div>
          </div>
        )}
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
          {saving ? 'Saving…' : 'Create Panel'}
        </button>
      </div>
    </form>
  );
}
