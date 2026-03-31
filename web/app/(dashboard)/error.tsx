'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isAuthError = error.message.includes('401') || error.message.includes('Unauthorized');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="bg-red-50 border-[0.5px] border-red-200 rounded-lg p-6 max-w-md w-full text-center">
        <p className="text-sm font-semibold text-red-700 mb-1">
          {isAuthError ? 'Session expired' : 'Failed to load page'}
        </p>
        <p className="text-xs text-red-500 mb-4">
          {isAuthError
            ? 'Please sign in again.'
            : error.message || 'Could not reach the API. Is the backend running?'}
        </p>
        <div className="flex gap-2 justify-center">
          {isAuthError ? (
            <a
              href="/login"
              className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800"
            >
              Sign in
            </a>
          ) : (
            <button
              onClick={reset}
              className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
