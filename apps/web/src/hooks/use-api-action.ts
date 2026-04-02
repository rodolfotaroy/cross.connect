'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

export function useApiAction(token: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function apiPatch(path: string, body: object): Promise<void> {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        Array.isArray(data?.message)
          ? data.message.join(', ')
          : (data?.message ?? 'Request failed'),
      );
    }
  }

  async function act(fn: () => Promise<unknown>, label: string): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await fn();
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  return { act, apiPatch, busy, error, setError };
}
