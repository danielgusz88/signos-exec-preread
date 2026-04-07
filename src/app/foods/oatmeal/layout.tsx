import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'Oatmeal With Berries & Honey: Glucose Impact Swings With Metabolic State, Not the Bowl | Signos Data',
  description:
    'Signos CGM data (n=34 meals): oatmeal with berries and honey averaged +19.2 mg/dL, but stable-glucose users averaged +17.0 (3% big spikes) while more volatile users averaged +31.6 (40%). Context beats the label.',
  openGraph: {
    title: 'The Breakfast Where Context Is Everything',
    description:
      'Real CGM data: the same oatmeal meal spiked nearly twice as much for metabolically volatile users vs stable users. GI does not tell this story — our variability engine does.',
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
        'Oatmeal With Berries and Honey: Variability-First Glucose Analysis (Signos CGM Data)',
      description:
        'Aggregated Signos continuous glucose monitor data for oatmeal with berries and honey (n=34 meals, 10 users, breakfast only). Average postprandial spike +19.2 mg/dL; median 22.5 mg/dL (p25 10.1, p75 26.9). Subgroup analysis: CGM-stable users (n=29) averaged +17.0 mg/dL with 3% of meals spiking above 30 mg/dL; moderate-variability users (n=5) averaged +31.6 mg/dL with 40% spiking above 30 mg/dL. Distribution: 44% low (under 20 mg/dL), 50% moderate (20–35 mg/dL), 6% high (over 35 mg/dL).',
      author: {
        '@type': 'Organization',
        name: 'Signos Food Intelligence',
        url: 'https://www.signos.com',
      },
      publisher: { '@type': 'Organization', name: 'Signos', url: 'https://www.signos.com' },
      datePublished: '2026-04-01',
      dateModified: '2026-04-01',
      mainEntityOfPage: { '@type': 'WebPage' },
    },
    {
      '@type': 'NutritionInformation',
      name: 'Oatmeal with berries and honey (composite breakfast)',
      description:
        'Typical preparation as logged by members: oatmeal, mixed berries, honey; exact portions and oat type (rolled vs steel-cut) vary.',
      servingSize: '1 breakfast (as logged)',
    },
    {
      '@type': 'Dataset',
      name: 'Signos Oatmeal With Berries and Honey Glucose Response & Variability Dataset',
      description:
        'Anonymized, aggregated CGM spike data for oatmeal with berries and honey (n=34, 10 users), breakfast-only observations, distribution buckets, comparator breakfasts, and metabolic variability subgroup analysis (stable vs moderate CGM variability).',
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
          name: 'Why does oatmeal spike blood sugar more for some people than others?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'In this Signos dataset, the same oatmeal meal produced very different outcomes depending on baseline metabolic context. Users with stable glucose patterns over the prior days averaged a much smaller spike than users with more volatile glucose, even with identical meal logging categories.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does a moderate glycemic index mean oatmeal is safe for glucose?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A moderate GI (about 55 for oats) describes an average response across populations. Real-world CGM data here showed wide dispersion: 44% of observations had a small spike under 20 mg/dL, while others rose into moderate or high buckets. GI alone does not capture person-to-person variability.',
          },
        },
        {
          '@type': 'Question',
          name: 'How can I eat oatmeal with less glucose impact?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Strategies aligned with member patterns and metabolic common sense: add protein (nuts, Greek yogurt), prefer steel-cut oats for slower digestion, limit honey, and take a short walk after eating. These steps address both the meal composition and post-meal glucose clearance.',
          },
        },
      ],
    },
  ],
};

export default function OatmealLayout({ children }: { children: React.ReactNode }) {
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
