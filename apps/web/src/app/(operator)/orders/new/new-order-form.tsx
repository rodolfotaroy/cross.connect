'use client';

import type { OrganizationDto } from '@/lib/api/organizations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createDraftOrder } from './actions';

interface Props {
  organizations: OrganizationDto[];
}

type FormState = {
  serviceType: string;
  mediaType: string;
  speedGbps: string;
  isTemporary: boolean;
  requestedActiveAt: string;
  requestedExpiresAt: string;
  customerReference: string;
  notes: string;
  // A-side
  aEndpointType: string;
  aOrganizationId: string;
  aDemarcDescription: string;
  // Z-side
  zEndpointType: string;
  zOrganizationId: string;
  zDemarcDescription: string;
};

export function NewOrderForm({ organizations }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    serviceType: 'customer_to_carrier',
    mediaType: 'smf',
    speedGbps: '',
    isTemporary: false,
    requestedActiveAt: '',
    requestedExpiresAt: '',
    customerReference: '',
    notes: '',
    aEndpointType: 'customer',
    aOrganizationId: '',
    aDemarcDescription: '',
    zEndpointType: 'carrier',
    zOrganizationId: '',
    zDemarcDescription: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const errs: Record<string, string> = {};
    if (!form.serviceType) errs.serviceType = 'Required';
    if (!form.mediaType) errs.mediaType = 'Required';
    if (form.isTemporary && !form.requestedExpiresAt) {
      errs.requestedExpiresAt = 'Required for temporary cross-connects';
    }
    if (!form.aEndpointType) errs.aEndpointType = 'Required';
    if (!form.zEndpointType) errs.zEndpointType = 'Required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        serviceType: form.serviceType as any,
        mediaType: form.mediaType as any,
        speedGbps: form.speedGbps || null,
        isTemporary: form.isTemporary,
        requestedActiveAt: form.requestedActiveAt
          ? new Date(form.requestedActiveAt).toISOString()
          : null,
        requestedExpiresAt: form.requestedExpiresAt
          ? new Date(form.requestedExpiresAt).toISOString()
          : null,
        customerReference: form.customerReference || null,
        notes: form.notes || null,
        aSide: {
          endpointType: form.aEndpointType as any,
          organizationId: form.aOrganizationId || undefined,
          demarcDescription: form.aDemarcDescription || undefined,
        },
        zSide: {
          endpointType: form.zEndpointType as any,
          organizationId: form.zOrganizationId || undefined,
          demarcDescription: form.zDemarcDescription || undefined,
        },
      };

      const order = await createDraftOrder(payload);
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setErrors({ form: err?.message ?? 'Failed to create order. Please try again.' });
      setSubmitting(false);
    }
  }

  const inputClass = (field: string) =>
    `block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
      errors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'
    }`;

  const nonOperatorOrgs = organizations.filter((o) => o.orgType !== 'operator' && o.isActive);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors.form && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      {/* Service details */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Service Details</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.serviceType}
              onChange={set('serviceType')}
              className={inputClass('serviceType')}
            >
              <option value="customer_to_carrier">Customer → Carrier</option>
              <option value="customer_to_customer">Customer → Customer</option>
              <option value="customer_to_cloud">Customer → Cloud</option>
              <option value="exchange">Exchange</option>
            </select>
            {errors.serviceType && (
              <p className="mt-1 text-xs text-red-500">{errors.serviceType}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Media Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.mediaType}
              onChange={set('mediaType')}
              className={inputClass('mediaType')}
            >
              <option value="smf">SMF (Single-mode Fibre)</option>
              <option value="mmf">MMF (Multi-mode Fibre)</option>
              <option value="cat6">Cat6 Copper</option>
              <option value="coax">Coax</option>
              <option value="dac">DAC (Direct Attach Copper)</option>
            </select>
            {errors.mediaType && <p className="mt-1 text-xs text-red-500">{errors.mediaType}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Speed (Gbps)</label>
            <input
              type="text"
              placeholder="e.g. 1, 10, 100"
              value={form.speedGbps}
              onChange={set('speedGbps')}
              className={inputClass('speedGbps')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Customer Reference
            </label>
            <input
              type="text"
              placeholder="Your internal ticket or PO number"
              value={form.customerReference}
              onChange={set('customerReference')}
              className={inputClass('customerReference')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Requested Active Date
            </label>
            <input
              type="datetime-local"
              value={form.requestedActiveAt}
              onChange={set('requestedActiveAt')}
              className={inputClass('requestedActiveAt')}
            />
          </div>

          <div className="flex items-start gap-3 pt-7">
            <input
              id="isTemporary"
              type="checkbox"
              checked={form.isTemporary}
              onChange={set('isTemporary')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600"
            />
            <label htmlFor="isTemporary" className="text-sm text-gray-700">
              <span className="font-medium">Temporary cross-connect</span>
              <span className="block text-gray-500 text-xs">Requires an expiry date</span>
            </label>
          </div>

          {form.isTemporary && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.requestedExpiresAt}
                onChange={set('requestedExpiresAt')}
                className={inputClass('requestedExpiresAt')}
              />
              {errors.requestedExpiresAt && (
                <p className="mt-1 text-xs text-red-500">{errors.requestedExpiresAt}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Endpoint sections */}
      {(['a', 'z'] as const).map((side) => {
        const prefix = side === 'a' ? 'a' : 'z';
        const label = side === 'a' ? 'A-Side (Source)' : 'Z-Side (Destination)';
        const endpointTypeField = `${prefix}EndpointType` as keyof FormState;
        const orgField = `${prefix}OrganizationId` as keyof FormState;
        const demarcField = `${prefix}DemarcDescription` as keyof FormState;

        return (
          <section key={side} className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">{label}</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Endpoint Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form[endpointTypeField] as string}
                  onChange={set(endpointTypeField)}
                  className={inputClass(String(endpointTypeField))}
                >
                  <option value="customer">Customer</option>
                  <option value="carrier">Carrier</option>
                  <option value="cloud_onramp">Cloud On-Ramp</option>
                  <option value="exchange">Exchange</option>
                  <option value="internal">Internal</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Organization
                </label>
                <select
                  value={form[orgField] as string}
                  onChange={set(orgField)}
                  className={inputClass(String(orgField))}
                >
                  <option value="">— Select if applicable —</option>
                  {nonOperatorOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.orgType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Demarc Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suite 400, Room 12, Panel B Port 3"
                  value={form[demarcField] as string}
                  onChange={set(demarcField)}
                  className={inputClass(String(demarcField))}
                />
              </div>
            </div>
          </section>
        );
      })}

      {/* Notes */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Additional Notes</h2>
        </div>
        <div className="px-6 py-5">
          <textarea
            rows={4}
            placeholder="Any additional requirements or context for this request…"
            value={form.notes}
            onChange={set('notes')}
            className={`${inputClass('notes')} resize-none`}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <a
          href="/orders"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Draft Order'}
        </button>
      </div>
    </form>
  );
}
