'use client';

import Link from 'next/link';
import { ClipboardCheck, Lightbulb, ArrowRight } from 'lucide-react';

export default function AdCreativeHubPage() {
  return (
    <div className="min-h-screen bg-gray-50/80 p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Ad creative</h1>
        <p className="mt-2 text-sm text-gray-500">
          Review and approve creative, or develop and score ad concepts. Choose a tool below.
        </p>

        <div className="mt-8 space-y-4">
          <Link
            href="/ad-review"
            className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 group-hover:text-brand-600">Ad Review</h2>
              <p className="mt-1 text-sm text-gray-500">
                Submit batches, run AI review, and track advisor/team approval.
              </p>
            </div>
            <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </Link>

          <Link
            href="/ad-concepts"
            className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
              <Lightbulb className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 group-hover:text-brand-600">Ad Concepts</h2>
              <p className="mt-1 text-sm text-gray-500">
                Create concept pitches and run Marv analysis on strategy and creative direction.
              </p>
            </div>
            <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </Link>
        </div>
      </div>
    </div>
  );
}
