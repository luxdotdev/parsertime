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
        name="Parsertime"
        applicationCategory="GameApplication"
        operatingSystem="Web"
        url="https://parsertime.app"
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
            question: "What is Parsertime?",
            answer:
              "Parsertime is an Overwatch scrim analytics platform that turns raw match data into skill ratings, trend lines, and coaching insights for competitive teams.",
          },
          {
            question: "How does Parsertime work?",
            answer:
              "Create your team, upload your scrim data after each session, and get instant access to charts, trends, and player ratings. The parser handles the heavy lifting automatically.",
          },
          {
            question: "Is Parsertime free?",
            answer:
              "Yes, Parsertime is free to start with no credit card required. Create a team, upload your first scrim, and see results in minutes.",
          },
          {
            question: "What stats does Parsertime track?",
            answer: `Parsertime captures killfeeds, hero swaps, ultimate economy, role-specific performance, and more. It processes over ${teamCount} teams' data with custom hero skill ratings on a 1-5000 scale.`,
          },
        ]}
      />
    </>
  );
}
