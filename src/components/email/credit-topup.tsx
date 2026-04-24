import type { User } from "@prisma/client";
import {
  Body,
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
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

type CreditTopupEmailProps = {
  user: User;
  amountCents: number;
  balanceAfterCents: number;
  source: "topup" | "auto_refill";
  autoRefillEnabled: boolean;
  autoRefillThresholdCents: number;
  autoRefillAmountCents: number;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CreditTopupEmail({
  user,
  amountCents,
  balanceAfterCents,
  source,
  autoRefillEnabled,
  autoRefillThresholdCents,
  autoRefillAmountCents,
}: CreditTopupEmailProps) {
  const isAutoRefill = source === "auto_refill";
  const previewText = isAutoRefill
    ? `Auto-refill processed for ${formatCents(amountCents)}`
    : `${formatCents(amountCents)} of AI credits added to your account`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src="https://parsertime.app/parsertime.png"
                width="50"
                height="50"
                alt="Parsertime Logo"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              {isAutoRefill ? "Auto-refill processed" : "Credits added"}
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Hello {user.name ?? user.email},
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              {isAutoRefill
                ? `Your saved payment method was charged ${formatCents(amountCents)} to keep your AI chat credits topped up.`
                : `We added ${formatCents(amountCents)} of AI chat credits to your account.`}
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              <strong>New balance:</strong> {formatCents(balanceAfterCents)}
            </Text>

            <Hr className="mx-0 my-[20px] w-full border border-solid border-[#eaeaea]" />

            <Heading
              as="h2"
              className="mx-0 mb-[8px] p-0 text-[16px] font-medium text-black"
            >
              Auto-refill
            </Heading>
            {autoRefillEnabled ? (
              <Text className="text-[14px] leading-[22px] text-black">
                Auto-refill is <strong>on</strong>. We will charge your saved
                card {formatCents(autoRefillAmountCents)} whenever your balance
                drops below {formatCents(autoRefillThresholdCents)}. You can
                change or turn this off on your{" "}
                <Link
                  href="https://parsertime.app/settings/billing"
                  className="text-blue-600 no-underline"
                >
                  billing settings page
                </Link>
                .
              </Text>
            ) : (
              <Text className="text-[14px] leading-[22px] text-black">
                Auto-refill is currently <strong>off</strong>. You can turn it
                on from your{" "}
                <Link
                  href="https://parsertime.app/settings/billing"
                  className="text-blue-600 no-underline"
                >
                  billing settings page
                </Link>{" "}
                so your credits don&apos;t run out mid-scrim.
              </Text>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This message was intended for{" "}
              <span className="text-black">{user.email}</span>. Questions about
              your account? Reach out at{" "}
              <Link
                href="mailto:help@parsertime.app"
                className="text-blue-600 no-underline"
              >
                help@parsertime.app
              </Link>
              .
            </Text>
            {process.env.NODE_ENV !== "production" && (
              <Text className="text-[12px] leading-[24px] text-[#666666]">
                This email was sent from a development environment.
              </Text>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default CreditTopupEmail;
