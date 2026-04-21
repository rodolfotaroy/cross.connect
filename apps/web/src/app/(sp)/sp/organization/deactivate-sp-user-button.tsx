'use client';

import { spTeamApi } from '@/lib/api/sp-team';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeactivateSpUserButton({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (isActive && !confirm('Deactivate this user? They will lose portal access immediately.'))
      return;
    setLoading(true);
    try {
      if (isActive) {
        await spTeamApi.deactivate(token, userId);
      } else {
        await spTeamApi.reactivate(token, userId);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      className={`text-sm font-medium disabled:opacity-50 ${isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
    >
      {loading ? '…' : isActive ? 'Deactivate' : 'Reactivate'}
    </button>
  );
}
