'use client';

import { Card, CardHeader } from '@/components/ui/card';
import { DataSourceRequired, EmptySection } from '@/components/ui/data-source-required';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';

function getRetentionColor(value: number | null): string {
  if (value === null) return 'bg-transparent text-gray-400';
  if (value >= 85) return 'bg-emerald-500/20 text-emerald-400';
  if (value >= 70) return 'bg-emerald-500/10 text-emerald-300';
  if (value >= 60) return 'bg-yellow-500/10 text-yellow-400';
  if (value >= 50) return 'bg-orange-500/10 text-orange-400';
  return 'bg-red-500/10 text-red-400';
}

export default function CohortsPage() {
  return (
    <div className="p-6 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Cohort Analysis</h1>
        <p className="text-sm text-gray-500">
          Track monthly acquisition cohorts through their lifecycle — identify improving or declining retention trends.
        </p>
      </div>

      {/* Data source requirement */}
      <DataSourceRequired
        title="Cohort Retention Data"
        description="Cohort analysis requires customer acquisition dates from Shopify and monthly retention tracking from Mode Analytics. The retention matrix is built by tracking each monthly cohort through subsequent months."
        className="mb-8"
        sources={[
          {
            name: 'Shopify',
            description: 'Customer acquisition dates and cohort assignment from first order',
            envVars: ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_STORE_DOMAIN'],
            status: 'not_configured',
          },
          {
            name: 'Mode Analytics',
            description: 'Monthly retention rates per cohort, computed via SQL reports',
            envVars: ['MODE_API_TOKEN', 'MODE_API_SECRET', 'MODE_WORKSPACE'],
            status: 'not_configured',
          },
        ]}
      />

      {/* Cohort Table */}
      <EmptySection
        title="Retention Cohort Matrix"
        integrations={['Shopify', 'Mode Analytics']}
        className="mb-8 min-h-[320px]"
      />

      {/* Cohort Insights */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-8">
        <EmptySection
          title="Best Performing Cohort"
          integrations={['Mode Analytics']}
        />
        <EmptySection
          title="Biggest Improvement Window"
          integrations={['Mode Analytics']}
        />
        <Card className="border-brand-500/20">
          <div className="flex items-start gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-brand-400 mt-0.5" />
            <h3 className="text-sm font-semibold text-brand-400">Cohort Intelligence</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-xs text-gray-500 max-w-sm">
              Connect data sources to enable AI-powered cohort intelligence — segment comparisons,
              seasonal patterns, and program impact analysis.
            </p>
          </div>
        </Card>
      </div>

      {/* Retention Heatmap Legend - structural, always show */}
      <Card>
        <CardHeader title="Retention Heatmap Legend" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 rounded bg-emerald-500/20" />
            <span className="text-xs text-gray-500">≥85% (Excellent)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 rounded bg-emerald-500/10" />
            <span className="text-xs text-gray-500">70-84% (Good)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 rounded bg-yellow-500/10" />
            <span className="text-xs text-gray-500">60-69% (Needs attention)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 rounded bg-orange-500/10" />
            <span className="text-xs text-gray-500">50-59% (At risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 rounded bg-red-500/10" />
            <span className="text-xs text-gray-500">&lt;50% (Critical)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
