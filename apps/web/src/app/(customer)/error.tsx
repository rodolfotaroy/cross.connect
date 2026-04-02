'use client';

import { useEffect } from 'react';

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-4">
        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && <p className="mt-1 font-mono text-xs text-gray-400">Ref: {error.digest}</p>}
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Try again
      </button>
    </div>
  );
}
