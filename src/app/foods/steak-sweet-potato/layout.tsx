import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Steak with Sweet Potato: The Dinner Trap & Glucose Spikes | Signos Data',
  description:
    'Signos CGM data: steak with sweet potato (n=37) averaged +31.2 mg/dL at dinner—62% spiked above 30. Evening timing, sweet potato glycemic load, and insulin resistance explain why this “clean” meal ranked worst among dinners we tested.',
  openGraph: {
    title: 'The Dinner Trap: Why Steak + Sweet Potato Hits Harder Than You Think',
    description:
      'Real CGM data from Signos: evening meals spike harder across all foods—and this protein-forward dinner still topped our dinner rankings. See timing data, distributions, and what actually moves the needle.',
    type: 'article',
    siteName: 'Signos Food Intelligence',
    publishedTime: '2026-04-01',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline:
        'Steak with Sweet Potato at Dinner: Highest Average Glucose Spike Among Signos Dinner Meals Tested (CGM Data)',
      description:
        'Aggregated Signos continuous glucose monitor data for steak with sweet potato meals (n=37, 9 users), all eaten in the evening, shows an average postprandial glucose rise of +31.2 mg/dL with 62% of observations exceeding a 30 mg/dL spike. Distribution: 22% low response (&lt;20 mg/dL), 22% moderate (20–35 mg/dL), 57% high (&gt;35 mg/dL). Median 36.4 mg/dL (p25 23.0, p75 39.9). Cross-dataset time-of-day analysis across all foods shows evening meals average +29.4 mg/dL versus +21.6 mg/dL in the morning. CGM variability subgroups: stable users (n=34) averaged +29.3 mg/dL (59% spiking); volatile users (n=3) averaged +52.5 mg/dL (100% spiking).',
      author: { '@type': 'Organization', name: 'Signos Food Intelligence', url: 'https://www.signos.com' },
      publisher: { '@type': 'Organization', name: 'Signos', url: 'https://www.signos.com' },
      datePublished: '2026-04-01',
      dateModified: '2026-04-01',
      mainEntityOfPage: { '@type': 'WebPage' },
    },
    {
      '@type': 'NutritionInformation',
      name: 'Steak with sweet potato (typical composite dinner)',
      description:
        'Typical steak with sweet potato as logged by members: grilled or pan-seared beef with baked or roasted sweet potato; sides and preparation vary.',
      servingSize: '1 meal (as logged)',
    },
    {
      '@type': 'Dataset',
      name: 'Signos Steak with Sweet Potato Evening Dinner Glucose Response Dataset',
      description:
        'Anonymized, aggregated continuous glucose monitor (CGM) spike data from Signos members for steak with sweet potato meals (n=37, 9 users), evening-only timing, distribution buckets (low, moderate, high), comparator dinner foods (salmon with rice, burrito bowl, fish tacos, chicken stir-fry with noodles, pasta with marinara), cross-dataset time-of-day aggregates (morning, midday, afternoon, evening), and CGM variability subgroup analysis (stable vs volatile users).',
      creator: { '@type': 'Organization', name: 'Signos' },
      variableMeasured: 'Postprandial glucose response (mg/dL)',
      measurementTechnique: 'Continuous Glucose Monitor (CGM)',
      datePublished: '2026-04-01',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Why does dinner affect blood sugar more than breakfast?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Across Signos aggregated data for all foods, evening meals averaged a higher glucose rise (+29.4 mg/dL) than morning meals (+21.6 mg/dL), with a higher share of meals spiking above 30 mg/dL (53% vs 22%). Circadian shifts in insulin sensitivity and typical meal composition both contribute—dinner is not metabolically identical to breakfast.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does eating dinner earlier improve glucose response?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Earlier eating windows often align with better insulin sensitivity earlier in the day. While individual CGM data varies, many members see smaller post-meal rises when they shift calories earlier or avoid very late heavy carb loads. Pair timing changes with movement after the meal for additive benefit.',
          },
        },
        {
          '@type': 'Question',
          name: 'If I eat the same food at lunch instead of dinner, will my spike be lower?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Not always—but in aggregate Signos data, midday and afternoon windows showed lower average rises than evening for all foods combined. Personal response still dominates: use CGM to compare the same meal at different times for you, not only population averages.',
          },
        },
      ],
    },
  ],
};

export default function SteakSweetPotatoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:-ml-64 -mt-14 lg:-mt-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
