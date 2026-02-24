'use client';

import { cn } from '@/lib/utils';
import { Database, Link2, Key, ArrowRight, AlertCircle, Plug } from 'lucide-react';
import { ReactNode } from 'react';

export interface DataSource {
  name: string;
  description: string;
  envVars: string[];
  status: 'not_configured' | 'configured' | 'connected';
  docsUrl?: string;
}

interface DataSourceRequiredProps {
  title: string;
  description: string;
  sources: DataSource[];
  className?: string;
  compact?: boolean;
}

export function DataSourceRequired({
  title,
  description,
  sources,
  className,
  compact = false,
}: DataSourceRequiredProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-zinc-700/60 bg-white/[0.01] p-5',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800/80">
            <Database className="h-4 w-4 text-zinc-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300">{title}</h4>
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/50"
                >
                  <Plug className="h-2.5 w-2.5" />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-zinc-700/60 bg-white/[0.01] p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/50">
          <Database className="h-5 w-5 text-zinc-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-xl">{description}</p>
        </div>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sources.map((source) => (
          <div
            key={source.name}
            className={cn(
              'rounded-lg p-4 border transition-colors',
              source.status === 'connected'
                ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                : source.status === 'configured'
                ? 'bg-amber-500/[0.03] border-amber-500/20'
                : 'bg-white/[0.01] border-zinc-700/40'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Plug
                  className={cn(
                    'h-3.5 w-3.5',
                    source.status === 'connected'
                      ? 'text-emerald-400'
                      : source.status === 'configured'
                      ? 'text-amber-400'
                      : 'text-zinc-500'
                  )}
                />
                <span className="text-xs font-semibold text-zinc-200">
                  {source.name}
                </span>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  source.status === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : source.status === 'configured'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-zinc-500/10 text-zinc-500'
                )}
              >
                {source.status === 'connected'
                  ? 'CONNECTED'
                  : source.status === 'configured'
                  ? 'CONFIGURED'
                  : 'NOT CONFIGURED'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">{source.description}</p>
            {source.envVars.length > 0 && (
              <div className="flex items-start gap-1.5">
                <Key className="h-3 w-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {source.envVars.map((v) => (
                    <code
                      key={v}
                      className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400"
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Setup Instructions */}
      <div className="mt-4 rounded-lg bg-white/[0.02] p-3 border border-white/[0.03]">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-zinc-500">
            Set the required environment variables in{' '}
            <code className="text-zinc-400">.env.local</code> or your Netlify
            dashboard, then visit{' '}
            <a href="/settings" className="text-brand-400 hover:underline">
              Settings
            </a>{' '}
            to test connections.
          </p>
        </div>
      </div>
    </div>
  );
}

// Convenience: section-level empty state
interface EmptySectionProps {
  title: string;
  integrations: string[];
  className?: string;
}

export function EmptySection({ title, integrations, className }: EmptySectionProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700/50 bg-white/[0.01] py-12 px-6 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-4">
        <Database className="h-5 w-5 text-zinc-500" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-300 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 mb-4 max-w-sm">
        Connect the required integrations to populate this section with real data.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {integrations.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-3 py-1.5 text-[11px] font-medium text-zinc-400 border border-zinc-700/40"
          >
            <Plug className="h-3 w-3" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
