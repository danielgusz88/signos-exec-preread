import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smoothie Bowl: A Glucose-Friendly Breakfast in Signos Data | Food Intelligence',
  description:
    'Signos CGM data: smoothie bowls (n=47) averaged +21.0 mg/dL with only 17% of meals spiking above 30 mg/dL. See breakfast rankings, distribution, and how protein, fat, and fiber create stability.',
  openGraph: {
    title: 'The Breakfast That Actually Keeps You Stable',
    description:
      'Real CGM data from Signos: smoothie bowls ranked among the most glucose-friendly breakfasts we measured—plus why they beat juice and how to keep yours steady.',
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
      headline: 'Smoothie Bowl: One of the Most Glucose-Friendly Breakfasts in Signos CGM Data',
      description:
        'Aggregated Signos continuous glucose monitor data for smoothie bowl meals (n=47, 13 users) shows an average postprandial glucose rise of +21.0 mg/dL, with 17% of observations exceeding a 30 mg/dL spike. Distribution: 40% low response (under 20 mg/dL), 53% moderate (20–35 mg/dL), 6% high (over 35 mg/dL). All observations were breakfast (morning). Among CGM variability subgroups, stable users (n=45) averaged +20.0 mg/dL (13% spiking); volatile users (n=2) averaged +43.3 mg/dL (100% spiking), underscoring that individual metabolic state matters alongside food choice.',
      author: { '@type': 'Organization', name: 'Signos Food Intelligence', url: 'https://www.signos.com' },
      publisher: { '@type': 'Organization', name: 'Signos', url: 'https://www.signos.com' },
      datePublished: '2026-04-01',
      dateModified: '2026-04-01',
      mainEntityOfPage: { '@type': 'WebPage' },
    },
    {
      '@type': 'NutritionInformation',
      name: 'Smoothie bowl (typical composite breakfast)',
      description:
        'Typical smoothie bowl as logged by members: blended fruit base, protein powder, nut butter or seeds, toppings such as granola, chia, or flax. Exact macros and ingredients vary by preparation.',
      servingSize: '1 meal (as logged)',
    },
    {
      '@type': 'Dataset',
      name: 'Signos Smoothie Bowl Breakfast Glucose Response Dataset',
      description:
        'Anonymized, aggregated continuous glucose monitor (CGM) spike data from Signos members for smoothie bowl meals (n=47, 13 users) with distribution buckets (low, moderate, high), breakfast-only timing, comparator breakfast foods (scrambled eggs + toast, oatmeal + berries, Greek yogurt + granola, avocado toast + egg), and CGM variability subgroup analysis (stable vs volatile users).',
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
          name: 'Is a smoothie bowl a good breakfast for glucose stability?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'In this Signos dataset, smoothie bowls averaged +21.0 mg/dL with only 17% of meals spiking more than 30 mg/dL—placing them among relatively glucose-friendly breakfast options compared with many common choices. Forty percent of observations were in the lowest response bucket (under 20 mg/dL). Individual response still varies.',
          },
        },
        {
          '@type': 'Question',
          name: 'Why would a smoothie bowl spike less than fruit juice?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Whole blended fruit retains fiber that juice often lacks; adding protein powder and healthy fats slows gastric emptying and absorption. The combination buffers the curve compared with liquid sugar alone—though portions and toppings still matter.',
          },
        },
        {
          '@type': 'Question',
          name: 'Who should still be cautious with smoothie bowls?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Members with higher day-to-day glucose variability may see larger responses even to “safe” foods. In this data, a small volatile subgroup (n=2) averaged +43.3 mg/dL versus +20.0 mg/dL for stable users. Anyone using CGM should validate their personal response.',
          },
        },
      ],
    },
  ],
};

export default function SmoothieBowlLayout({ children }: { children: React.ReactNode }) {
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
