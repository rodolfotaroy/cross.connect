'use client';

import { orgsApi, type OrganizationDto } from '@/lib/api/organizations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  org: OrganizationDto;
  token: string;
}

const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const inputCls = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

export function EditOrgForm({ org, token }: Props) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [contactEmail, setContactEmail] = useState(org.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(org.contactPhone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await orgsApi.update(token, org.id, {
        name: name || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
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
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg border border-gray-200 px-6 py-5 max-w-lg">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
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
