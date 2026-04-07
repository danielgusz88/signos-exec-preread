import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'Apple + Almond Butter & Blood Sugar: 91% of CGM Users Barely Spike (n=35) | Signos Food Intelligence',
  description:
    'Signos CGM data (n=35, 12 users): apple with almond butter averaged +7.2 mg/dL with a median of only +4.4 mg/dL. 91% stayed under 20 mg/dL. See snack rankings and why trail mix surprised us.',
  openGraph: {
    title: 'The Quietest Snack in Our Glucose Data',
    description:
      'Real CGM data: apple + almond butter averaged +7.2 mg/dL. 91% of observations barely registered. See how it ranks against other snacks.',
    type: 'article',
    siteName: 'Signos Food Intelligence',
    publishedTime: '2026-04-03',
    images: [
      {
        url: '/images/foods/apple-almond-butter-hero.jpg',
        width: 1200,
        height: 800,
        alt: 'Sliced apple with a bowl of almond butter on a white plate',
      },
    ],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline:
        'Apple + Almond Butter & Blood Sugar: The Quietest Snack in Signos CGM Data',
      description:
        'Aggregated Signos continuous glucose monitor data for apple with almond butter (n=35 observations, 12 users, afternoon snacks only). Average postprandial glucose rise +7.2 mg/dL; median +4.4 mg/dL (p25 2.3, p75 7.1). Distribution: 91% low (under 20 mg/dL), 3% moderate (20–35 mg/dL), 6% high (over 35 mg/dL). Snack ranking: trail mix +6.2, apple + almond butter +7.2, mixed nuts +8.2, protein bar +10.1, cheese + crackers +11.7.',
      author: {
        '@type': 'Organization',
        name: 'Signos Research Team',
        url: 'https://www.signos.com',
      },
      publisher: { '@type': 'Organization', name: 'Signos', url: 'https://www.signos.com' },
      datePublished: '2026-04-03',
      dateModified: '2026-04-05',
      mainEntityOfPage: { '@type': 'WebPage' },
    },
    {
      '@type': 'NutritionInformation',
      name: 'Apple with almond butter (typical afternoon snack)',
      description:
        'Fresh apple slices with natural almond butter as logged by Signos members. Portion and variety vary; analysis reflects real-world composite snacks.',
      servingSize: '1 snack (as logged)',
    },
    {
      '@type': 'Dataset',
      name: 'Signos Apple With Almond Butter Glucose Response Dataset',
      description:
        'Anonymized, aggregated CGM spike data from Signos members for apple with almond butter snacks (n=35, 12 users), afternoon-only timing. Includes distribution buckets, comparator snacks, and CGM variability subgroup.',
      creator: { '@type': 'Organization', name: 'Signos' },
      variableMeasured: 'Postprandial glucose response (mg/dL)',
      measurementTechnique: 'Continuous Glucose Monitor (CGM)',
      datePublished: '2026-04-03',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Does apple with almond butter spike blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'In Signos CGM data (n=35 afternoon snacks, 12 users), apple with almond butter averaged only +7.2 mg/dL with a median of +4.4 mg/dL. 91% of observations stayed under 20 mg/dL. For most people, this combination produces one of the smallest glucose responses measured.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is trail mix better than apple with almond butter for blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Slightly, in this dataset. Trail mix averaged +6.2 mg/dL (n=23) versus +7.2 for apple + almond butter (n=35). Both sit at the top of snack rankings — the difference is small enough that individual variation and preference should guide your choice.',
          },
        },
        {
          '@type': 'Question',
          name: 'What makes apple and almond butter so gentle on glucose?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The pairing stacks three mechanisms: soluble fiber from the apple slows carbohydrate absorption, fat from the almond butter delays gastric emptying, and protein from almonds adds a further blunting effect. In Signos data, this triple buffer kept 91% of observations in the lowest response bucket.',
          },
        },
      ],
    },
  ],
};

export default function AppleAlmondButterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
