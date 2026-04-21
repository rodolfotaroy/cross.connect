'use client';

import { spSupportApi } from '@/lib/api/sp-support';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NewTicketForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function execute(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      const ticket = await spSupportApi.createTicket(token, {
        subject: formData.get('subject') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as any,
        priority: formData.get('priority') as any,
      });
      router.push(`/sp/support/${ticket.id}`);
    } catch (e: any) {
      const errors = e?.body?.errors;
      if (errors) {
        const msgs = Object.entries(errors)
          .flatMap(([field, errs]) => (errs as string[]).map((m) => `${field}: ${m}`))
          .join('; ');
        setError(msgs || e?.message || 'Validation failed');
      } else {
        setError(e?.message ?? 'Failed to submit ticket');
      }
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
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6"
    >
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="subject">
            Subject *
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            minLength={5}
            maxLength={300}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="category">
            Category *
          </label>
          <select
            id="category"
            name="category"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="issue">Issue</option>
            <option value="suggestion">Suggestion</option>
            <option value="billing">Billing</option>
            <option value="access">Access</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="priority">
            Priority *
          </label>
          <select
            id="priority"
            name="priority"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="description">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={10}
            maxLength={10000}
            rows={6}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit Ticket'}
        </button>
        <a
          href="/sp/support"
          className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
