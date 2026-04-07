'use client';

import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Clock,
  Settings,
  Server,
  ArrowDownToLine,
  Loader2,
  XCircle,
} from 'lucide-react';

interface Integration {
  name: string;
  key: string;
  configured: boolean;
  envVars: string[];
  description: string;
  dataProvided: string[];
}

interface StatusResponse {
  integrations: Integration[];
  summary: {
    total: number;
    configured: number;
    notConfigured: number;
  };
}

export default function DataPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/status');
      const json = await res.json();
      setStatus(json);
    } catch {
      setStatus(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="p-6 pb-20">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Data Hub</h1>
            <p className="text-sm text-gray-500">
              Integration health, configuration status, and data pipeline management.
            </p>
          </div>
          <button
            onClick={fetchStatus}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && !status && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Checking integrations...</span>
        </div>
      )}

      {status && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Integrations</p>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">{status.summary.total}</p>
            </Card>
            <Card className={status.summary.configured > 0 ? 'border-emerald-500/10' : ''}>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Configured</p>
              <p className="mt-1.5 text-3xl font-bold text-emerald-400">{status.summary.configured}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Not Configured</p>
              <p className="mt-1.5 text-3xl font-bold text-gray-500">{status.summary.notConfigured}</p>
            </Card>
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {status.integrations.map((source) => (
              <Card
                key={source.key}
                className={cn(
                  source.configured ? 'border-emerald-500/10' : 'border-gray-200'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        source.configured ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
                      )}
                    >
                      <Server
                        className={cn(
                          'h-5 w-5',
                          source.configured ? 'text-emerald-400' : 'text-gray-500'
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{source.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {source.configured ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400 font-medium">
                              Configured
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-gray-500" />
                            <span className="text-[10px] text-gray-500 font-medium">
                              Not Configured
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3">{source.description}</p>

                {/* Env vars needed */}
                {source.envVars.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Environment Variables</p>
                    <div className="flex flex-wrap gap-1">
                      {source.envVars.map((v) => (
                        <code
                          key={v}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-mono',
                            source.configured
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-gray-100/80 text-gray-500'
                          )}
                        >
                          {v}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data provided */}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Data Provided</p>
                  <div className="flex flex-wrap gap-1">
                    {source.dataProvided.map((d) => (
                      <span
                        key={d}
                        className="rounded bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-gray-500 border border-gray-200"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {!source.configured && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-3 border border-gray-200 text-center">
                    <a
                      href="/settings"
                      className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Configure in Settings →
                    </a>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Data Architecture - structural, always show */}
          <Card className="mb-8">
            <CardHeader title="Data Architecture" subtitle="How data flows into FunnelAI" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowDownToLine className="h-4 w-4 text-brand-400" />
                  <h4 className="text-sm font-semibold text-gray-900">Ingestion Layer</h4>
                </div>
                <ul className="space-y-2 text-xs text-gray-500">
                  {status.integrations.map((source) => (
                    <li key={source.key} className="flex items-center gap-2">
                      {source.configured ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
                      )}
                      <span className={source.configured ? 'text-gray-700' : 'text-gray-500'}>
                        {source.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4 text-brand-400" />
                  <h4 className="text-sm font-semibold text-gray-900">Processing Layer</h4>
                </div>
                <ul className="space-y-2 text-xs text-gray-500">
                  <li>• Customer identity resolution</li>
                  <li>• Revenue + Gross Profit LTV computation</li>
                  <li>• COGS per-customer tracking</li>
                  <li>• Plan transition flow tracking</li>
                  <li>• Onboarding funnel analysis</li>
                  <li>• Churn signal detection</li>
                  <li>• Payment health & dunning recovery</li>
                </ul>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-brand-400" />
                  <h4 className="text-sm font-semibold text-gray-900">Intelligence Layer</h4>
                </div>
                <ul className="space-y-2 text-xs text-gray-500">
                  <li>• Claude AI daily insight generation</li>
                  <li>• Anomaly detection (churn spikes, LTV drops)</li>
                  <li>• Program impact simulation</li>
                  <li>• Channel quality scoring</li>
                  <li>• Automated recommendations</li>
                  <li>• Board-ready report generation</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
