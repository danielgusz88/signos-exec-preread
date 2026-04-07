'use client';

import { useEffect } from 'react';

export default function ContentEngineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Content Engine Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 space-y-4">
        <h2 className="text-xl font-bold text-red-600">Ad Factory Error</h2>
        <p className="text-sm text-gray-700">
          A client-side error occurred in the Ad Factory. Details below:
        </p>
        <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 whitespace-pre-wrap overflow-auto max-h-64">
          {error.message}
          {error.stack && (
            <>
              {'\n\n'}
              {error.stack}
            </>
          )}
        </pre>
        {error.digest && (
          <p className="text-xs text-gray-400">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
