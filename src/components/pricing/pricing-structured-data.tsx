import { FAQJsonLd } from "next-seo";

type PricingStructuredDataProps = {
  faqs: { question: string; answer: string }[];
};

export function PricingStructuredData({ faqs }: PricingStructuredDataProps) {
  return <FAQJsonLd questions={faqs} />;
}
