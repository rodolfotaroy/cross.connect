'use client';

import { dedicatedXcApi } from '@/lib/api/dedicated-xc';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Hop {
  room: string;
  rack: string;
  device: string;
  port: string;
}

export function NewCrossConnectForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;

  const [hops, setHops] = useState<Hop[]>([{ room: '', rack: '', device: '', port: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function execute(formData: FormData) {
    const hopPayload = hops.map((h, i) => ({
      hopNumber: i + 1,
      room: h.room || undefined,
      rack: h.rack || undefined,
      device: h.device || undefined,
      port: h.port || undefined,
    }));

    const body: any = {
      orderingCompany: (formData.get('orderingCompany') as string) || undefined,
      circuitId: (formData.get('circuitId') as string) || undefined,
      ticketNumber: (formData.get('ticketNumber') as string) || undefined,
      cableType: (formData.get('cableType') as string) || undefined,
      customerType: (formData.get('customerType') as string) || undefined,
      mrc: formData.get('mrc') ? String(parseFloat(formData.get('mrc') as string)) : undefined,
      nrc: formData.get('nrc') ? String(parseFloat(formData.get('nrc') as string)) : undefined,
      notes: (formData.get('notes') as string) || undefined,
      hops: hopPayload,
    };

    setLoading(true);
    setError('');
    try {
      const xc = await dedicatedXcApi.create(token, body);
      router.push(`/sp/cross-connects/${xc.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create cross connect');
    } finally {
      setLoading(false);
    }
  }

  function addHop() {
    setHops((prev) => [...prev, { room: '', rack: '', device: '', port: '' }]);
  }

  function removeHop(index: number) {
    setHops((prev) => prev.filter((_, i) => i !== index));
  }

  function updateHop(index: number, field: keyof Hop, value: string) {
    setHops((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void execute(new FormData(e.currentTarget));
      }}
      className="space-y-8"
    >
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Core fields */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Cross Connect Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ordering Company" name="orderingCompany" />
          <Field label="Circuit ID" name="circuitId" />
          <Field label="Ticket Number" name="ticketNumber" />
          <Field label="Cable Type" name="cableType" />
          <Field label="Customer Type" name="customerType" />
          <Field
            label="MRC (¥)"
            name="mrc"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*(\.[0-9]{0,2})?"
          />
          <Field
            label="NRC (¥)"
            name="nrc"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*(\.[0-9]{0,2})?"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
      </section>

      {/* Hops */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Hops</h2>
        <div className="mb-4">
          <button
            type="button"
            onClick={addHop}
            className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            Add Hop
          </button>
        </div>
        <div className="space-y-6">
          {hops.map((hop, i) => (
            <div key={i} className="rounded-md border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-500">Hop {i + 1}</span>
                {hops.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHop(i)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HopField label="Room" value={hop.room} onChange={(v) => updateHop(i, 'room', v)} />
                <HopField label="Rack" value={hop.rack} onChange={(v) => updateHop(i, 'rack', v)} />
                <HopField
                  label="Rack Unit"
                  value={hop.device}
                  onChange={(v) => updateHop(i, 'device', v)}
                />
                <HopField label="Port" value={hop.port} onChange={(v) => updateHop(i, 'port', v)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create Cross Connect'}
        </button>
        <a
          href="/sp/cross-connects"
          className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  [k: string]: any;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
        {...props}
      />
    </div>
  );
}

function HopField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm"
      />
    </div>
  );
}
