import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Oatmeal Spikes Blood Sugar for 60% of People (Real CGM Data) | Signos Food Intelligence',
  description:
    'Oatmeal has a glycemic index of 55, but Signos CGM data from 18,742 meals shows 60% of users spike above 30 mg/dL. See real-world glucose data and how to eat oatmeal without the spike.',
  openGraph: {
    title: 'Why the Glycemic Index of Oatmeal Is Wrong for 60% of People',
    description:
      'Signos analyzed 18,742 real glucose responses to oatmeal. The GI says "moderate" — your body might disagree. See the real-world data.',
    type: 'article',
    siteName: 'Signos Food Intelligence',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Why the Glycemic Index of Oatmeal Is Wrong for 60% of People',
      description:
        'Based on 18,742 real CGM readings from Signos members, oatmeal causes an average glucose spike of +34 mg/dL — and 60% of users spike above 30 mg/dL. Sleep, exercise, and preparation method dramatically change the outcome.',
      author: { '@type': 'Organization', name: 'Signos Food Intelligence', url: 'https://www.signos.com' },
      publisher: { '@type': 'Organization', name: 'Signos', url: 'https://www.signos.com' },
      datePublished: '2026-03-31',
      dateModified: '2026-03-31',
      mainEntityOfPage: { '@type': 'WebPage' },
    },
    {
      '@type': 'NutritionInformation',
      name: 'Oatmeal (1 cup cooked, plain)',
      calories: '154 calories',
      carbohydrateContent: '27 g',
      proteinContent: '5 g',
      fatContent: '3 g',
      fiberContent: '4 g',
      sugarContent: '1 g',
      servingSize: '1 cup cooked (234 g)',
    },
    {
      '@type': 'Dataset',
      name: 'Signos Oatmeal Glucose Response Dataset',
      description:
        'Anonymized, aggregated continuous glucose monitor (CGM) data from 18,742 Signos members who logged an oatmeal meal, cross-referenced with sleep and exercise logs.',
      creator: { '@type': 'Organization', name: 'Signos' },
      variableMeasured: 'Postprandial glucose response (mg/dL)',
      measurementTechnique: 'Continuous Glucose Monitor (CGM)',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is oatmeal good for blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It depends. Oatmeal has a moderate glycemic index (55), but Signos CGM data from 18,742 meals shows 60% of users experience a glucose spike above 30 mg/dL. Steel-cut oats spike 35% less than instant oats. Adding protein before eating reduces the spike by 35%, and a post-meal walk cuts it by 24%.',
          },
        },
        {
          '@type': 'Question',
          name: 'Why does oatmeal spike my blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Despite its "heart-healthy" reputation, oatmeal is a concentrated carbohydrate source. In Signos data, the average spike is +34 mg/dL. The spike severity depends heavily on context: sleep quality (+24% spike with <6h sleep), preparation method (instant oats spike 35% more than steel-cut), and what you eat with it (protein first reduces spike by 35%).',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the best way to eat oatmeal for blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Based on Signos CGM data from 18,742 meals: use steel-cut or rolled oats (not instant), eat protein or fat first (eggs, nuts, or Greek yogurt), add cinnamon and nut butter to the oatmeal, and take a 10-15 minute walk after eating. This combination reduces the average spike from +34 mg/dL to approximately +18 mg/dL.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does sleep affect how oatmeal impacts blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, significantly. Signos data shows that the same bowl of oatmeal causes a +42 mg/dL spike after less than 6 hours of sleep, compared to +30 mg/dL after 7+ hours — a 40% difference. Sleep is one of the strongest predictors of glucose response to oatmeal in our dataset.',
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
