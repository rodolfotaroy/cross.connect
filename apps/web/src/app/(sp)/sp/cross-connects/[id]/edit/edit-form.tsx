'use client';

import type { DedicatedXcDto } from '@/lib/api/dedicated-xc';
import { dedicatedXcApi } from '@/lib/api/dedicated-xc';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function EditCrossConnectForm({ xc }: { xc: DedicatedXcDto }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function execute(formData: FormData) {
    const body: any = {};
    const fields = [
      'orderingCompany',
      'circuitId',
      'ticketNumber',
      'cableType',
      'customerType',
      'notes',
    ] as const;
    for (const f of fields) {
      const val = formData.get(f) as string;
      if (val !== '') body[f] = val || null;
    }
    const mrc = formData.get('mrc') as string;
    const nrc = formData.get('nrc') as string;
    if (mrc !== '') body.mrc = mrc ? parseFloat(mrc) : null;
    if (nrc !== '') body.nrc = nrc ? parseFloat(nrc) : null;

    const status = formData.get('status') as string;
    if (status) body.status = status;

    setLoading(true);
    setError('');
    try {
      await dedicatedXcApi.update(token, xc.id, body);
      router.push(`/sp/cross-connects/${xc.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update');
    } finally {
      setLoading(false);
    }
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

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Cross Connect Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status" name="status" tag="select" defaultValue={xc.status}>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="disconnected">Disconnected</option>
            <option value="cancelled">Cancelled</option>
          </Field>
          <Field
            label="Ordering Company"
            name="orderingCompany"
            defaultValue={xc.orderingCompany ?? ''}
          />
          <Field label="Circuit ID" name="circuitId" defaultValue={xc.circuitId ?? ''} />
          <Field label="Ticket Number" name="ticketNumber" defaultValue={xc.ticketNumber ?? ''} />
          <Field label="Cable Type" name="cableType" defaultValue={xc.cableType ?? ''} />
          <Field label="Customer Type" name="customerType" defaultValue={xc.customerType ?? ''} />
          <Field
            label="MRC ($)"
            name="mrc"
            type="number"
            step="0.01"
            min="0"
            defaultValue={xc.mrc ? String(xc.mrc) : ''}
          />
          <Field
            label="NRC ($)"
            name="nrc"
            type="number"
            step="0.01"
            min="0"
            defaultValue={xc.nrc ? String(xc.nrc) : ''}
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
            defaultValue={xc.notes ?? ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        <a
          href={`/sp/cross-connects/${xc.id}`}
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
  tag = 'input',
  type = 'text',
  children,
  ...props
}: {
  label: string;
  name: string;
  tag?: 'input' | 'select';
  type?: string;
  children?: React.ReactNode;
  [k: string]: any;
}) {
  const cls =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500';
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700" htmlFor={name}>
        {label}
      </label>
      {tag === 'select' ? (
        <select id={name} name={name} className={cls} {...props}>
          {children}
        </select>
      ) : (
        <input id={name} name={name} type={type} className={cls} {...props} />
      )}
    </div>
  );
}
