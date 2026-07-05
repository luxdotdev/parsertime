import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import { EmailTailwind } from "./_email-tailwind";

// Shared design language for every transactional email: content sits directly
// on white (no bordered card), left-aligned, logo top-left, bold sentence-case
// title, blue links in the body, gray underlined links in the footer.

export function EmailShell({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <EmailTailwind>
        <Body className="mx-auto my-auto bg-white px-[16px] font-sans">
          <Container className="mx-auto my-[40px] max-w-[580px]">
            <Img
              src={`${SITE_URL}/parsertime.png`}
              width="40"
              height="40"
              alt="Sightline"
              className="my-0"
            />
            {children}
            <Hr className="mx-0 mt-[32px] mb-[24px] w-full border border-solid border-[#eaeaea]" />
            <Text className="m-0 text-[13px] leading-[22px] text-[#666666]">
              If you&apos;d like to report an issue, reach out to{" "}
              <FooterLink href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </FooterLink>
              .
            </Text>
            <Text className="mt-[12px] mb-0 text-[13px] leading-[22px] text-[#666666]">
              Copyright &copy; {new Date().getFullYear()} lux.dev. All rights
              reserved.
            </Text>
            {process.env.NODE_ENV !== "production" && (
              <Text className="mt-[12px] mb-0 text-[13px] leading-[22px] text-[#666666]">
                This email was sent from a development environment.
              </Text>
            )}
          </Container>
        </Body>
      </EmailTailwind>
    </Html>
  );
}

export function EmailTitle({ children }: { children: ReactNode }) {
  return (
    <Heading className="mx-0 mt-[32px] mb-[24px] p-0 text-[24px] leading-[32px] font-bold tracking-[-0.01em] text-black">
      {children}
    </Heading>
  );
}

export function EmailSubheading({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h2"
      className="mx-0 mt-[28px] mb-[8px] p-0 text-[18px] leading-[26px] font-bold text-black"
    >
      {children}
    </Heading>
  );
}

export function EmailText({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-0 mb-[16px] text-[16px] leading-[26px] text-[#171717]">
      {children}
    </Text>
  );
}

// Stacked "Label: value" facts, tight line spacing, no paragraph gaps.
export function DetailList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <Section className="mt-0 mb-[16px]">
      {items.map((item) => (
        <Text
          key={item.label}
          className="m-0 text-[16px] leading-[28px] text-[#171717]"
        >
          <strong>{item.label}:</strong> {item.value}
        </Text>
      ))}
    </Section>
  );
}

export function EmailButton({
  href,
  children,
}: {
  href: string | undefined;
  children: ReactNode;
}) {
  return (
    <Section className="mt-0 mb-[24px]">
      <Button
        href={href}
        className="rounded-[6px] bg-black px-[20px] py-[10px] text-[14px] font-semibold text-white no-underline"
      >
        {children}
      </Button>
    </Section>
  );
}

export function EmailLink({
  href,
  children,
}: {
  href: string | undefined;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-[#2563eb] no-underline">
      {children}
    </Link>
  );
}

export function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-[#666666] underline">
      {children}
    </Link>
  );
}

export function EmailList({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-0 mb-[16px] pl-[24px] text-[16px] leading-[26px] text-[#171717]">
      {children}
    </ul>
  );
}

export function EmailListItem({ children }: { children: ReactNode }) {
  return <li className="mb-[8px]">{children}</li>;
}

// Quoted or preformatted content (user messages, snippets) on a light panel.
export function SnippetBlock({ children }: { children: ReactNode }) {
  return (
    <Section className="mt-0 mb-[16px] rounded-[6px] bg-[#f5f5f5] px-[16px] py-[4px]">
      <Text className="my-[8px] text-[15px] leading-[24px] text-[#171717]">
        {children}
      </Text>
    </Section>
  );
}
