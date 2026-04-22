'use client';

import { orgsApi, type OrganizationDto } from '@/lib/api/organizations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  org: OrganizationDto;
  token: string;
}

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const inputCls =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

export function EditOrgForm({ org, token }: Props) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [code, setCode] = useState(org.code);
  const [orgType, setOrgType] = useState(org.orgType);
  const [contactEmail, setContactEmail] = useState(org.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(org.contactPhone ?? '');
  const [notes, setNotes] = useState(org.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await orgsApi.update(token, org.id, {
        name: name || undefined,
        code: code || undefined,
        orgType: orgType || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        notes: notes || undefined,
      });
      router.push(`/organizations/${org.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-white rounded-lg border border-gray-200 px-6 py-5 max-w-lg"
    >
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className={labelCls}>Organisation Name</label>
        <input
          type="text"
          required
          maxLength={200}
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Code</label>
          <input
            type="text"
            required
            maxLength={20}
            className={inputCls}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <p className="mt-1 text-xs text-gray-500">Uppercase letters, numbers, - or _ only</p>
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select
            required
            className={inputCls}
            value={orgType}
            onChange={(e) => setOrgType(e.target.value as typeof orgType)}
          >
            <option value="customer">Customer (Cross Connect)</option>
            <option value="carrier">Carrier</option>
            <option value="cloud_provider">Cloud Provider</option>
            <option value="exchange">Exchange</option>
            <option value="operator">Operator</option>
            <option value="service_partner">Service Partner (SP)</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Contact Email</label>
        <input
          type="email"
          className={inputCls}
          placeholder="Optional"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Contact Phone</label>
        <input
          type="text"
          className={inputCls}
          placeholder="Optional"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          rows={3}
          className={inputCls}
          placeholder="Optional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
