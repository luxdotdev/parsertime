import {
  FAQJsonLd,
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
} from 'next-seo';

/**
 * Structured data for the docs landing. Mirrors the patterns in
 * src/components/home/new-landing/structured-data.tsx in the main parsertime
 * repo so the two surfaces present a consistent knowledge graph.
 */
export function LandingStructuredData() {
  return (
    <>
      <SoftwareApplicationJsonLd
        type="WebApplication"
        name="Parsertime"
        applicationCategory="GameApplication"
        operatingSystem="Web"
        url="https://parsertime.app"
        description="Overwatch 2 scrim analytics platform that turns raw Workshop logs into per-player stats, hero skill ratings, tournament ratings, and coaching insights."
        offers={{ price: 0, priceCurrency: 'USD' }}
      />
      <OrganizationJsonLd
        name="lux.dev"
        url="https://lux.dev"
        sameAs={[
          'https://twitter.com/luxdotdev',
          'https://bsky.app/profile/lux.dev',
          'https://github.com/luxdotdev',
        ]}
      />
      <FAQJsonLd
        questions={[
          {
            question: 'What is Parsertime?',
            answer:
              'Parsertime is an Overwatch 2 scrim analytics platform that turns raw Workshop log data into per-player stats, hero skill ratings, tournament ratings, and coaching insights for competitive teams.',
          },
          {
            question: 'What is CSR in Parsertime?',
            answer:
              'CSR (Composite Skill Rating) is a per-hero rating derived from your per-10-minute statistical performance compared to the average player on that hero, scaled to 1–5000 and centred at 2500.',
          },
          {
            question: 'What is TSR in Parsertime?',
            answer:
              'TSR (Tournament Skill Rating) is a per-player rating grounded in FACEIT-hosted Overwatch 2 tournament results. It runs on two regional ladders (NA and EMEA), anchors players at the highest tier they have ever reached, and weights matches with a 365-day half-life.',
          },
          {
            question: 'What is the Parsertime Matchmaker?',
            answer:
              'The Matchmaker pairs teams by Team TSR bracket and delivers scrim requests to the other team’s Discord through the Parsertime bot. Each team has a 24-hour cooldown per target and a 10-request-per-day total cap.',
          },
          {
            question: 'How are the docs organised?',
            answer:
              'The docs are grouped into Setup (teams, scrims, Discord bot), Pages (Maps, Stats, Team Stats, Profile), Ratings (CSR and TSR), Tools (Matchmaker, AI Analyst, Coaching Canvas, Availability), and Account (Settings, Billing, Linked Accounts).',
          },
        ]}
      />
    </>
  );
}
