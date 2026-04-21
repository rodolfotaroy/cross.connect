'use client';

import { dedicatedXcApi } from '@/lib/api/dedicated-xc';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteXcButton({ id }: { id: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm('Are you sure you want to delete this cross connect? This action cannot be undone.')
    )
      return;
    setLoading(true);
    try {
      await dedicatedXcApi.remove(token, id);
      router.push('/sp/cross-connects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleDelete()}
      disabled={loading}
      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  );
}
