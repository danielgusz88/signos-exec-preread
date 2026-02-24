'use client';

import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Settings, Key, Database, Server, RefreshCw, CheckCircle2, XCircle, Globe, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ConnectionStatus {
  mode: { status: 'checking' | 'connected' | 'error'; message: string };
  iterable: { status: 'checking' | 'connected' | 'error'; message: string };
  shopify: { status: 'checking' | 'connected' | 'error'; message: string };
}

export default function SettingsPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    mode: { status: 'checking', message: 'Checking connection...' },
    iterable: { status: 'checking', message: 'Checking connection...' },
    shopify: { status: 'checking', message: 'Checking connection...' },
  });

  useEffect(() => {
    async function checkConnections() {
      // Test Mode
      try {
        const modeRes = await fetch('/api/integrations/mode/test');
        const modeData = await modeRes.json();
        setConnectionStatus((prev) => ({
          ...prev,
          mode: modeData.success
            ? { status: 'connected', message: `Workspace: ${modeData.workspace}` }
            : { status: 'error', message: modeData.error || 'Connection failed' },
        }));
      } catch {
        setConnectionStatus((prev) => ({
          ...prev,
          mode: { status: 'error', message: 'API endpoint not available' },
        }));
      }

      // Test Iterable
      try {
        const iterableRes = await fetch('/api/integrations/iterable/test');
        const iterableData = await iterableRes.json();
        setConnectionStatus((prev) => ({
          ...prev,
          iterable: iterableData.success
            ? { status: 'connected', message: `${iterableData.channelCount} channels` }
            : { status: 'error', message: iterableData.error || 'Connection failed' },
        }));
      } catch {
        setConnectionStatus((prev) => ({
          ...prev,
          iterable: { status: 'error', message: 'API endpoint not available' },
        }));
      }

      // Test Shopify
      try {
        const shopifyRes = await fetch('/api/integrations/shopify/test');
        const shopifyData = await shopifyRes.json();
        setConnectionStatus((prev) => ({
          ...prev,
          shopify: shopifyData.success
            ? { status: 'connected', message: `Shop: ${shopifyData.shopName}` }
            : { status: 'error', message: shopifyData.error || 'Connection failed' },
        }));
      } catch {
        setConnectionStatus((prev) => ({
          ...prev,
          shopify: { status: 'error', message: 'API endpoint not available' },
        }));
      }
    }

    checkConnections();
  }, []);

  return (
    <div className="p-6 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-zinc-400">
          Configure integrations, API keys, and data sync preferences.
        </p>
      </div>

      {/* Integration Status */}
      <Card className="mb-8">
        <CardHeader title="Integration Connections" subtitle="API connectivity status — test live connections" />
        <div className="space-y-4">
          {/* Mode */}
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-4 border border-white/[0.04]">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                connectionStatus.mode.status === 'connected' ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
              )}>
                <Server className={cn(
                  'h-5 w-5',
                  connectionStatus.mode.status === 'connected' ? 'text-emerald-400' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Mode Analytics</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {connectionStatus.mode.status === 'checking' && (
                    <RefreshCw className="h-3 w-3 text-zinc-500 animate-spin" />
                  )}
                  {connectionStatus.mode.status === 'connected' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  )}
                  {connectionStatus.mode.status === 'error' && (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span className={cn(
                    'text-[10px] font-medium',
                    connectionStatus.mode.status === 'connected' ? 'text-emerald-400' :
                    connectionStatus.mode.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                  )}>
                    {connectionStatus.mode.message}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">MODE_API_TOKEN, MODE_API_SECRET, MODE_WORKSPACE</span>
            </div>
          </div>

          {/* Iterable */}
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-4 border border-white/[0.04]">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                connectionStatus.iterable.status === 'connected' ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
              )}>
                <Globe className={cn(
                  'h-5 w-5',
                  connectionStatus.iterable.status === 'connected' ? 'text-emerald-400' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Iterable</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {connectionStatus.iterable.status === 'checking' && (
                    <RefreshCw className="h-3 w-3 text-zinc-500 animate-spin" />
                  )}
                  {connectionStatus.iterable.status === 'connected' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  )}
                  {connectionStatus.iterable.status === 'error' && (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span className={cn(
                    'text-[10px] font-medium',
                    connectionStatus.iterable.status === 'connected' ? 'text-emerald-400' :
                    connectionStatus.iterable.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                  )}>
                    {connectionStatus.iterable.message}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">ITERABLE_API_KEY</span>
            </div>
          </div>

          {/* Shopify */}
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-4 border border-white/[0.04]">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                connectionStatus.shopify.status === 'connected' ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
              )}>
                <ShoppingBag className={cn(
                  'h-5 w-5',
                  connectionStatus.shopify.status === 'connected' ? 'text-emerald-400' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Shopify</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {connectionStatus.shopify.status === 'checking' && (
                    <RefreshCw className="h-3 w-3 text-zinc-500 animate-spin" />
                  )}
                  {connectionStatus.shopify.status === 'connected' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  )}
                  {connectionStatus.shopify.status === 'error' && (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span className={cn(
                    'text-[10px] font-medium',
                    connectionStatus.shopify.status === 'connected' ? 'text-emerald-400' :
                    connectionStatus.shopify.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                  )}>
                    {connectionStatus.shopify.message}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE_DOMAIN</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Environment Variables */}
      <Card className="mb-8">
        <CardHeader title="Environment Variables" subtitle="Required env vars — set in .env.local or Netlify dashboard" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Variable</th>
                <th className="py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Service</th>
                <th className="py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Required</th>
                <th className="py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { var: 'DATABASE_URL', service: 'PostgreSQL', required: true, desc: 'Supabase/Neon connection string' },
                { var: 'MODE_API_TOKEN', service: 'Mode', required: true, desc: 'Mode API token (from Settings > API Tokens)' },
                { var: 'MODE_API_SECRET', service: 'Mode', required: true, desc: 'Mode API secret' },
                { var: 'MODE_WORKSPACE', service: 'Mode', required: true, desc: 'Mode workspace slug (e.g., "signos")' },
                { var: 'ITERABLE_API_KEY', service: 'Iterable', required: true, desc: 'Iterable API key (from Settings > API Keys)' },
                { var: 'SHOPIFY_ACCESS_TOKEN', service: 'Shopify', required: true, desc: 'Shopify Admin API access token' },
                { var: 'SHOPIFY_STORE_DOMAIN', service: 'Shopify', required: true, desc: 'Store domain (e.g., signos-inc.myshopify.com)' },
                { var: 'META_ADS_ACCESS_TOKEN', service: 'Meta Ads', required: false, desc: 'Facebook Marketing API token' },
                { var: 'META_ADS_ACCOUNT_ID', service: 'Meta Ads', required: false, desc: 'Ad account ID' },
                { var: 'ANTHROPIC_API_KEY', service: 'Claude AI', required: false, desc: 'For AI insight generation' },
              ].map((envVar) => (
                <tr key={envVar.var} className="border-b border-white/[0.03]">
                  <td className="py-3 text-left">
                    <code className="rounded bg-white/[0.04] px-2 py-0.5 text-xs font-mono text-brand-400">
                      {envVar.var}
                    </code>
                  </td>
                  <td className="py-3 text-left text-zinc-300 text-xs">{envVar.service}</td>
                  <td className="py-3 text-center">
                    {envVar.required ? (
                      <span className="text-red-400 text-xs font-bold">Required</span>
                    ) : (
                      <span className="text-zinc-500 text-xs">Optional</span>
                    )}
                  </td>
                  <td className="py-3 text-left text-zinc-400 text-xs">{envVar.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader title="Database" subtitle="PostgreSQL via Prisma ORM — 25 models" />
        <div className="rounded-lg bg-white/[0.02] p-4 border border-white/[0.04]">
          <p className="text-xs text-zinc-400 mb-3">
            FunnelAI uses its own isolated Prisma schema with 25 models tracking the full customer lifecycle
            from signos.com visit through Shopify purchase, app onboarding, subscription management, and renewal/sustain transitions.
          </p>
          <div className="space-y-2">
            <div className="rounded-md bg-surface-0 p-3 font-mono text-xs text-zinc-300">
              <span className="text-zinc-500"># Generate Prisma client</span><br />
              npx prisma generate<br /><br />
              <span className="text-zinc-500"># Push schema to database</span><br />
              npx prisma db push<br /><br />
              <span className="text-zinc-500"># Seed with mock data (optional)</span><br />
              npx tsx prisma/seed.ts<br /><br />
              <span className="text-zinc-500"># Open Prisma Studio to explore data</span><br />
              npx prisma studio
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
