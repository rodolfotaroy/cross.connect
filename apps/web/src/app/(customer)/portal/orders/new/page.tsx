'use client';

import { ordersApi } from '@/lib/api/cross-connects';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SERVICE_TYPES = [
  { value: 'customer_to_carrier', label: 'Customer → Carrier' },
  { value: 'customer_to_customer', label: 'Customer → Customer' },
  { value: 'customer_to_cloud', label: 'Customer → Cloud' },
  { value: 'exchange', label: 'Exchange' },
];

const MEDIA_TYPES = [
  { value: 'smf', label: 'SMF (Single-Mode Fibre)' },
  { value: 'mmf', label: 'MMF (Multi-Mode Fibre)' },
  { value: 'cat6', label: 'CAT6 (Copper)' },
  { value: 'coax', label: 'Coax' },
  { value: 'dac', label: 'DAC (Direct Attach Copper)' },
];

const ENDPOINT_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'carrier', label: 'Carrier' },
  { value: 'cloud_onramp', label: 'Cloud On-Ramp' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'internal', label: 'Internal' },
];

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const inputCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
const selectCls = inputCls;

interface EndpointForm {
  endpointType: string;
  loaNumber: string;
  cfaNumber: string;
  demarcDescription: string;
}

interface EndpointSectionProps {
  side: 'a' | 'z';
  data: EndpointForm;
  onChange: (field: keyof EndpointForm, value: string) => void;
}

function EndpointSection({ side, data, onChange }: EndpointSectionProps) {
  const label = side === 'a' ? 'A-Side (Your Equipment)' : 'Z-Side (Remote / Carrier)';
  const id = (field: string) => `${side}-${field}`;
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4 space-y-3">
      <legend className="px-1 text-sm font-semibold text-gray-700">{label}</legend>
      <div>
        <label htmlFor={id('endpointType')} className={labelCls}>
          Endpoint Type
        </label>
        <select
          id={id('endpointType')}
          className={selectCls}
          value={data.endpointType}
          onChange={(e) => onChange('endpointType', e.target.value)}
        >
          {ENDPOINT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('loaNumber')} className={labelCls}>
            LOA Number
          </label>
          <input
            id={id('loaNumber')}
            type="text"
            className={inputCls}
            placeholder="Optional"
            value={data.loaNumber}
            onChange={(e) => onChange('loaNumber', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={id('cfaNumber')} className={labelCls}>
            CFA Number
          </label>
          <input
            id={id('cfaNumber')}
            type="text"
            className={inputCls}
            placeholder="Optional"
            value={data.cfaNumber}
            onChange={(e) => onChange('cfaNumber', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor={id('demarcDescription')} className={labelCls}>
          Demarc Description
        </label>
        <input
          id={id('demarcDescription')}
          type="text"
          className={inputCls}
          placeholder="e.g. Rack 12, Panel A, Port 4"
          value={data.demarcDescription}
          onChange={(e) => onChange('demarcDescription', e.target.value)}
        />
      </div>
    </fieldset>
  );
}

const emptyEndpoint = (): EndpointForm => ({
  endpointType: 'customer',
  loaNumber: '',
  cfaNumber: '',
  demarcDescription: '',
});

export default function NewOrderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role as string | undefined;

  // Guard: viewer cannot place orders
  if (session && !['customer_admin', 'customer_orderer'].includes(role ?? '')) {
    router.replace('/portal/orders');
    return null;
  }

  const [serviceType, setServiceType] = useState('customer_to_carrier');
  const [mediaType, setMediaType] = useState('smf');
  const [speedGbps, setSpeedGbps] = useState('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [requestedActiveAt, setRequestedActiveAt] = useState('');
  const [requestedExpiresAt, setRequestedExpiresAt] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [notes, setNotes] = useState('');
  const [aSide, setASide] = useState<EndpointForm>({
    ...emptyEndpoint(),
    endpointType: 'customer',
  });
  const [zSide, setZSide] = useState<EndpointForm>({ ...emptyEndpoint(), endpointType: 'carrier' });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const token = (session?.user as any)?.accessToken;
    if (!token) {
      setError('Not authenticated');
      return;
    }

    if (isTemporary && !requestedExpiresAt) {
      setError('Expiry date is required for temporary cross-connects');
      return;
    }

    const body: Record<string, unknown> = {
      serviceType,
      mediaType,
      isTemporary,
      aSide: {
        endpointType: aSide.endpointType,
        ...(aSide.loaNumber && { loaNumber: aSide.loaNumber }),
        ...(aSide.cfaNumber && { cfaNumber: aSide.cfaNumber }),
        ...(aSide.demarcDescription && { demarcDescription: aSide.demarcDescription }),
      },
      zSide: {
        endpointType: zSide.endpointType,
        ...(zSide.loaNumber && { loaNumber: zSide.loaNumber }),
        ...(zSide.cfaNumber && { cfaNumber: zSide.cfaNumber }),
        ...(zSide.demarcDescription && { demarcDescription: zSide.demarcDescription }),
      },
    };
    if (speedGbps) body.speedGbps = speedGbps;
    if (customerReference) body.customerReference = customerReference;
    if (notes) body.notes = notes;
    if (requestedActiveAt) body.requestedActiveAt = new Date(requestedActiveAt).toISOString();
    if (requestedExpiresAt) body.requestedExpiresAt = new Date(requestedExpiresAt).toISOString();

    setBusy(true);
    try {
      await ordersApi.create(token, body as any);
      router.push('/portal/orders');
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Request Cross-Connect</h1>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        {/* Service details */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Service Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                className={selectCls}
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Media Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                className={selectCls}
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
              >
                {MEDIA_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Speed (Gbps)</label>
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. 10, 100"
                value={speedGbps}
                pattern="^\d+(\.\d+)?$"
                onChange={(e) => setSpeedGbps(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Your Reference</label>
              <input
                type="text"
                maxLength={100}
                className={inputCls}
                placeholder="Your internal ticket / reference"
                value={customerReference}
                onChange={(e) => setCustomerReference(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Timing */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Timing</h2>
          <div className="flex items-center gap-2">
            <input
              id="isTemporary"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
              checked={isTemporary}
              onChange={(e) => setIsTemporary(e.target.checked)}
            />
            <label htmlFor="isTemporary" className="text-sm text-gray-700">
              Temporary cross-connect (has an expiry date)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Requested Active Date</label>
              <input
                type="date"
                className={inputCls}
                value={requestedActiveAt}
                onChange={(e) => setRequestedActiveAt(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>
                Expiry Date {isTemporary && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                className={inputCls}
                required={isTemporary}
                value={requestedExpiresAt}
                onChange={(e) => setRequestedExpiresAt(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Endpoints</h2>
          <EndpointSection
            side="a"
            data={aSide}
            onChange={(f, v) => setASide((p) => ({ ...p, [f]: v }))}
          />
          <EndpointSection
            side="z"
            data={zSide}
            onChange={(f, v) => setZSide((p) => ({ ...p, [f]: v }))}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            rows={3}
            maxLength={2000}
            className={inputCls}
            placeholder="Any additional details for the ops team..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
