import type { Metadata } from 'next';
import {
  LandingBrowse,
  LandingChangelog,
  LandingHero,
  LandingQuickstart,
} from '@/components/landing/hero';
import { LandingStructuredData } from '@/components/landing/structured-data';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

const TITLE = `${SITE_NAME} — Overwatch 2 scrim analytics reference`;

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s | Parsertime Docs" template
  // so the home tab doesn't read "Parsertime Docs … | Parsertime Docs".
  title: { absolute: TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: 'website',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function HomePage() {
  return (
    <main className="flex-1">
      <LandingStructuredData />
      <LandingHero />
      <LandingChangelog />
      <LandingQuickstart />
      <LandingBrowse />
    </main>
  );
}
