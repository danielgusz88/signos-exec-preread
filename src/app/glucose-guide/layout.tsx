import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Banana & Blood Sugar: What 14,200 CGM Readings Actually Show | Signos Food Intelligence',
  description:
    'Bananas cause an average +32 mg/dL glucose spike, but 42% of people barely spike at all. Sleep, timing, and pairings change the outcome dramatically. Real CGM data from 14,200 Signos members.',
  openGraph: {
    title: 'Should I Eat a Banana? What 14,200 CGM Readings Say',
    description:
      'Signos analyzed 14,200 real glucose responses to bananas. The result? It depends on when you eat it, how you slept, and what you eat with it.',
    type: 'article',
    siteName: 'Signos Food Intelligence',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Banana & Blood Sugar: What 14,200 CGM Readings Actually Show',
      description:
        'Based on 14,200 real CGM readings from Signos members, bananas cause an average glucose spike of +32 mg/dL — but the range is enormous. Sleep, exercise, time of day, and food pairings change the outcome by up to 50%.',
      author: { '@type': 'Organization', name: 'Signos Food Intelligence', url: 'https://www.signos.com' },
      publisher: { '@type': 'Organization', name: 'Signos', url: 'https://www.signos.com' },
      datePublished: '2026-04-01',
      dateModified: '2026-04-01',
      mainEntityOfPage: { '@type': 'WebPage' },
    },
    {
      '@type': 'NutritionInformation',
      name: 'Banana (medium, raw)',
      calories: '105 calories',
      carbohydrateContent: '27 g',
      proteinContent: '1.3 g',
      fatContent: '0.4 g',
      fiberContent: '3.1 g',
      sugarContent: '14 g',
      servingSize: '1 medium banana (118 g)',
    },
    {
      '@type': 'Dataset',
      name: 'Signos Banana Glucose Response Dataset',
      description:
        'Anonymized, aggregated continuous glucose monitor (CGM) data from 14,200 Signos members who logged a banana as a meal or snack, cross-referenced with sleep, exercise, and meal composition logs.',
      creator: { '@type': 'Organization', name: 'Signos' },
      variableMeasured: 'Postprandial glucose response (mg/dL)',
      measurementTechnique: 'Continuous Glucose Monitor (CGM)',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Are bananas bad for blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Not necessarily. Based on 14,200 Signos CGM readings, 42% of people experience only a small glucose spike from a banana. However, 22% spike significantly. The outcome depends heavily on sleep quality, exercise, ripeness, and what you eat with it.',
          },
        },
        {
          '@type': 'Question',
          name: 'When is the best time to eat a banana for blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Afternoon (2-5pm) produces the lowest average spike at +26 mg/dL, compared to +38 mg/dL in the morning. This is likely due to higher insulin sensitivity later in the day. Eating a banana after exercise also significantly reduces the spike.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does eating peanut butter with a banana help blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, significantly. Signos data shows that pairing a banana with a fat or protein source like peanut butter reduces the average glucose spike by about 28%, from +32 mg/dL to +23 mg/dL. The fat and protein slow carbohydrate absorption.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is a green banana better for blood sugar than a ripe banana?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Greener bananas contain more resistant starch, which acts like fiber. Signos data shows that meals logged with less-ripe bananas produce approximately 20% lower glucose spikes on average compared to very ripe bananas.',
          },
        },
      ],
    },
  ],
};

export default function GlucoseGuideLayout({ children }: { children: React.ReactNode }) {
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
