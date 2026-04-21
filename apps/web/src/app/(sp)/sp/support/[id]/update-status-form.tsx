'use client';

import { spSupportApi } from '@/lib/api/sp-support';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function UpdateTicketStatusForm({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;
  const [loading, setLoading] = useState(false);

  async function execute(formData: FormData) {
    const status = formData.get('status') as string;
    if (status === currentStatus) return;
    setLoading(true);
    try {
      await spSupportApi.updateStatus(token, ticketId, { status: status as any });
      router.refresh();
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
      className="flex items-center gap-2"
    >
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? '…' : 'Update Status'}
      </button>
    </form>
  );
}
