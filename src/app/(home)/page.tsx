import {
  LandingBrowse,
  LandingChangelog,
  LandingHero,
  LandingQuickstart,
} from '@/components/landing/hero';

export default function HomePage() {
  return (
    <main className="flex-1">
      <LandingHero />
      <LandingChangelog />
      <LandingQuickstart />
      <LandingBrowse />
    </main>
  );
}
