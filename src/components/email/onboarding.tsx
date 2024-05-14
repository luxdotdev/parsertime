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

interface OnboardingEmailProps {
  name?: string;
  email?: string;
}

export const UserOnboardingEmail = ({ name, email }: OnboardingEmailProps) => {
  const previewText = "Welcome to Parsertime!";

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
              Welcome <strong>{name}</strong> to <strong>Parsertime</strong>!
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Hello {name},
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Welcome to Parsertime! We&apos;re excited to have you on board.
              You can now start uploading your scrims and matches to get
              started. Here are a few things you can do to get started:
            </Text>
            <ul className="text-[14px] leading-[24px] text-black">
              <li>
                Set up your profile in your{" "}
                <Link
                  href="https://parsertime.app/settings"
                  className="text-blue-600 no-underline"
                >
                  settings
                </Link>
                .
              </li>
              <li>
                Create a team or join an existing team to start uploading your
                scrims and matches.
              </li>
              <li>
                Upload your first scrim or match by clicking the &quot;Create
                Scrim&quot; button on the{" "}
                <Link
                  href="https://parsertime.com/dashboard"
                  className="text-blue-600 no-underline"
                >
                  Dashboard
                </Link>
                .
              </li>
              <li>
                Read through our{" "}
                <Link
                  href="https://docs.parsertime.app/"
                  className="text-blue-600 no-underline"
                >
                  docs
                </Link>{" "}
                to learn more about Parsertime and how to use it.
              </li>
              <li>
                Join our{" "}
                <Link
                  href="https://discord.gg/svz3qhVDXM"
                  className="text-blue-600 no-underline"
                >
                  Discord
                </Link>{" "}
                to get help from the community and stay up to date with the
                latest updates.
              </li>
            </ul>
            <Text className="text-[14px] leading-[24px] text-black">
              If you have any questions or need help, feel free to reach out to
              us at{" "}
              <Link
                href="mailto:help@parsertime.app"
                className="text-blue-600 no-underline"
              >
                help@parsertime.app
              </Link>
              . Happy scrimming!
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This message was intended for{" "}
              <span className="text-black">{email}</span>. If you were not
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

export default UserOnboardingEmail;
