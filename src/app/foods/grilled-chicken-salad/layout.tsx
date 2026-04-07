import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grilled Chicken Salad Spikes Blood Sugar More Than a Big Mac | Signos Data',
  description:
    'Signos CGM data: grilled chicken salad averaged +32.8 mg/dL glucose spike vs. +11.1 mg/dL for a Big Mac — 66% of salads spiked above 30 mg/dL. See real-world comparison data and rankings.',
  openGraph: {
    title: "The 'Healthy' Choice That Spikes More Than a Big Mac",
    description:
      'Real CGM data from Signos: this “healthy” salad spiked more than a Big Mac on average. See side-by-side numbers, rankings, and how to eat salad without the surprise spike.',
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
      headline: "Grilled Chicken Salad Spikes Blood Sugar More Than a Big Mac (Signos CGM Data)",
      description:
        'Aggregated Signos continuous glucose monitor data shows grilled chicken salad meals (n=35) averaged a +32.8 mg/dL postprandial spike versus +11.1 mg/dL for Big Mac meals (n=25). Sixty-six percent of salad observations exceeded a 30 mg/dL spike; zero percent of Big Mac observations did. Hidden carbohydrates from dressings, croutons, and toppings likely explain much of the contrast alongside fat and protein slowing absorption in the burger.',
      author: { '@type': 'Organization', name: 'Signos Food Intelligence', url: 'https://www.signos.com' },
      publisher: { '@type': 'Organization', name: 'Signos', url: 'https://www.signos.com' },
      datePublished: '2026-04-01',
      dateModified: '2026-04-01',
      mainEntityOfPage: { '@type': 'WebPage' },
    },
    {
      '@type': 'NutritionInformation',
      name: 'Grilled chicken salad (restaurant-style composite meal)',
      description:
        'Typical grilled chicken salad as logged by members: mixed greens, grilled chicken, dressing, and common add-ons (e.g., croutons, cheese, dried fruit). Exact macros vary by preparation.',
      servingSize: '1 meal (as logged)',
    },
    {
      '@type': 'Dataset',
      name: 'Signos Grilled Chicken Salad vs Comparator Foods Glucose Response Dataset',
      description:
        'Anonymized, aggregated continuous glucose monitor (CGM) spike data from Signos members for grilled chicken salad meals (n=35, 13 users) and comparator foods including Big Mac (n=25), with distribution buckets and CGM variability subgroup analysis (stable vs volatile users).',
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
          name: 'Can a salad spike blood sugar more than fast food?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — in this Signos dataset, grilled chicken salad meals averaged a +32.8 mg/dL glucose spike compared to +11.1 mg/dL for a Big Mac. Labels like “healthy” do not guarantee a lower glucose response; dressings, croutons, dried fruit, and portion size can add substantial carbohydrates.',
          },
        },
        {
          '@type': 'Question',
          name: 'Why would grilled chicken salad spike blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Even with lean protein and greens, common salad components add fast-absorbing carbs: sweet dressings, croutons, candied nuts, dried cranberries, and large portions. Fat and protein in a Big Mac can slow gastric emptying and blunt the glucose curve compared to a carb-heavy salad.',
          },
        },
        {
          '@type': 'Question',
          name: 'How can I eat salad without spiking blood sugar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Strategies supported by metabolic common sense and Signos member patterns: skip or limit croutons and sugary dressings, request dressing on the side, prioritize unsweetened fats like avocado or olive oil, eat protein and non-starchy vegetables first, and watch portion sizes of dried fruit and sweet toppings.',
          },
        },
      ],
    },
  ],
};

export default function GrilledChickenSaladLayout({ children }: { children: React.ReactNode }) {
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
