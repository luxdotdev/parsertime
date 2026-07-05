import { SITE_URL } from "@/lib/site";
import {
  FAQJsonLd,
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
} from "next-seo";

type StructuredDataProps = {
  teamCount: number;
};

export function StructuredData({ teamCount }: StructuredDataProps) {
  return (
    <>
      <SoftwareApplicationJsonLd
        type="WebApplication"
        name="Sightline"
        applicationCategory="GameApplication"
        operatingSystem="Web"
        url={SITE_URL}
        description="Overwatch scrim analytics platform that turns raw match data into skill ratings, trend lines, and coaching insights."
        offers={{
          price: 0,
          priceCurrency: "USD",
        }}
      />
      <OrganizationJsonLd
        name="lux.dev"
        url="https://lux.dev"
        sameAs={[
          "https://twitter.com/luxdotdev",
          "https://bsky.app/profile/lux.dev",
          "https://github.com/luxdotdev",
        ]}
      />
      <FAQJsonLd
        questions={[
          {
            question: "What is Sightline?",
            answer:
              "Sightline is an Overwatch scrim analytics platform that turns raw match data into skill ratings, trend lines, and coaching insights for competitive teams.",
          },
          {
            question: "How does Sightline work?",
            answer:
              "Create your team, upload your scrim data after each session, and get instant access to charts, trends, and player ratings. The parser handles the heavy lifting automatically.",
          },
          {
            question: "Is Sightline free?",
            answer:
              "Yes, Sightline is free to start with no credit card required. Create a team, upload your first scrim, and see results in minutes.",
          },
          {
            question: "What stats does Sightline track?",
            answer: `Sightline captures killfeeds, hero swaps, ultimate economy, role-specific performance, and more. It processes over ${teamCount} teams' data with custom hero skill ratings on a 1-5000 scale.`,
          },
        ]}
      />
    </>
  );
}
