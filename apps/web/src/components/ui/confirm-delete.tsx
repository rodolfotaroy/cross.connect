'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface Props {
  action: () => Promise<{ error?: string } | void>;
  entityName: string;
  redirectTo: string;
  /** Warning shown below the confirm buttons. Useful for cascade-guard info. */
  warning?: string;
}

/**
 * Inline soft-delete confirmation widget.
 * Renders a "Deactivate" button; on click shows an inline confirm row.
 * Calls `action` (a bound server action) on confirm, then redirects.
 */
export function ConfirmDelete({ action, entityName, redirectTo, warning }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    setError('');
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Deactivate
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-700">Deactivate this {entityName}?</span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? 'Deactivating…' : 'Yes, Deactivate'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      {warning && <p className="text-xs text-gray-400">{warning}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
