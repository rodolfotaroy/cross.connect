'use client';

import { opSupportApi } from '@/lib/api/op-support';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export function OpAddCommentForm({ ticketId }: { ticketId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;
  const ref = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function execute(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      await opSupportApi.addComment(token, ticketId, { body: formData.get('body') as string });
      if (ref.current) ref.current.value = '';
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to post comment');
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
      className="space-y-3"
    >
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <textarea
        ref={ref}
        name="body"
        required
        rows={4}
        placeholder="Type your comment…"
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Posting…' : 'Post Comment'}
      </button>
    </form>
  );
}
