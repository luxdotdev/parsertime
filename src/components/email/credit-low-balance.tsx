import type { User } from "@prisma/client";
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
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

type CreditLowBalanceEmailProps = {
  user: User;
  balanceCents: number;
};

function formatCents(cents: number): string {
  return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}

export function CreditLowBalanceEmail({
  user,
  balanceCents,
}: CreditLowBalanceEmailProps) {
  const previewText = `Your Parsertime AI balance is running low (${formatCents(balanceCents)})`;

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
              Your AI credits are running low
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Hello {user.name ?? user.email},
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Your Parsertime AI chat balance just dropped to{" "}
              <strong>{formatCents(balanceCents)}</strong>. At this rate you may
              hit zero during your next scrim review. We&apos;ll block new
              messages once your balance is exhausted so you don&apos;t get
              surprise charges.
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Top up from the chat page, or turn on auto-refill so a saved card
              keeps your credits available without you having to think about it.
            </Text>

            <Section className="mt-[24px] text-center">
              <Button
                href="https://parsertime.app/settings/billing"
                className="rounded bg-black px-[18px] py-[10px] text-[14px] font-medium text-white no-underline"
              >
                Manage credits
              </Button>
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This message was intended for{" "}
              <span className="text-black">{user.email}</span>. Don&apos;t want
              these alerts? Reply to{" "}
              <Link
                href="mailto:help@parsertime.app"
                className="text-blue-600 no-underline"
              >
                help@parsertime.app
              </Link>{" "}
              and we&apos;ll turn them off for your account.
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

export default CreditLowBalanceEmail;
