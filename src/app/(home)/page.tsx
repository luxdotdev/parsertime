import { LandingHero, LandingIndex } from '@/components/landing/hero';

export default function HomePage() {
  return (
    <main className="flex-1">
      <LandingHero />
      <LandingIndex />
    </main>
  );
}
