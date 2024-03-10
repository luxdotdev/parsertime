import { User } from "@prisma/client";
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

interface SubscriptionEmailProps {
  user: User;
}

export const SubscriptionDeletedEmail = ({ user }: SubscriptionEmailProps) => {
  const previewText = "Your subscription has been cancelled.";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src="https://parsertime.app/parsertime.png"
                width="50"
                height="50"
                alt="Parsertime Logo"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Your subscription has been cancelled.
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {user.email!},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              We&apos;re sorry to see you go! Your subscription to Parsertime
              has been cancelled. You will continue to have access to your plan
              features until your current billing period ends.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
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
            <Text className="text-black text-[14px] leading-[24px]">
              If you have any questions or need help, feel free to reach out to
              us at{" "}
              <Link
                href="mailto:help@parsertime.app"
                className="text-blue-600 no-underline"
              >
                help@parsertime.app
              </Link>
              . We hope to see you back soon!
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This invitation was intended for{" "}
              <span className="text-black">{user.email}</span>. If you were not
              expecting this invitation, you can ignore this email. If you are
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
              <Text className="text-[#666666] text-[12px] leading-[24px]">
                This email was sent from a development environment.
              </Text>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SubscriptionDeletedEmail;
