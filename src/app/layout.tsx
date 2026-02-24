import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FunnelAI — LTV Intelligence Platform',
  description: 'Signos LTV Intelligence Platform: Optimize lifetime value across acquisition, engagement, and retention.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-surface-0 text-white antialiased`}>
        <Sidebar />
        <main className="ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
