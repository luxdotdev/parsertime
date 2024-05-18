import { toTitleCase } from "@/lib/utils";
import { User } from "@prisma/client";
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

interface SubscriptionEmailProps {
  user: User;
  billingPlan: string;
}

export const SubscriptionCreatedEmail = ({
  user,
  billingPlan,
}: SubscriptionEmailProps) => {
  const previewText = "Thank you for subscribing to Parsertime!";

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
              Thank you for subscribing!
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Hello {user.email!},
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Thank you for subscribing to Parsertime! We&apos;re grateful for
              your support and can&apos;t wait to help you level up your
              Overwatch experience. You are now on the{" "}
              <strong>{toTitleCase(billingPlan)}</strong> plan.
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              To manage your subscription, including updating your payment
              method, visit your{" "}
              <Link
                href="https://parsertime.app/settings"
                className="text-blue-600 no-underline"
              >
                settings page
              </Link>{" "}
              and click &quot;Manage your subscription&quot;.
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              If you have any questions or need help, feel free to reach out to
              us at{" "}
              <Link
                href="mailto:help@parsertime.app"
                className="text-blue-600 no-underline"
              >
                help@parsertime.app
              </Link>
              . We appreciate your support and look forward to helping you
              improve your scrim experience!
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This message was intended for{" "}
              <span className="text-black">{user.email}</span>. If you were not
              expecting this message, you can ignore this email. If you are
              concerned about your account&apos;s safety, please get in touch
              with us at{" "}
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
};

export default SubscriptionCreatedEmail;
