import { SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import {
  Body,
  Button,
  Column,
  Container,
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
} from "react-email";
import { EmailTailwind } from "./_email-tailwind";

type TeamInviteUserEmailProps = {
  username?: string;
  userImage?: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  teamName?: string;
  teamImage?: string;
  inviteLink?: string;
};

export function TeamInviteUserEmail({
  username,
  userImage,
  invitedByUsername,
  invitedByEmail,
  teamName,
  teamImage,
  inviteLink,
}: TeamInviteUserEmailProps) {
  const previewText = `Join ${invitedByUsername} on Sightline`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <EmailTailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={`${SITE_URL}/parsertime.png`}
                width="50"
                height="50"
                alt="Sightline Logo"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Join <strong>{teamName}</strong> on <strong>Sightline</strong>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Hello {username},
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              <strong>{invitedByUsername}</strong> (
              <Link
                href={`mailto:${invitedByEmail}`}
                className="text-blue-600 no-underline"
              >
                {invitedByEmail}
              </Link>
              ) has invited you to the <strong>{teamName}</strong> team on{" "}
              <strong>Sightline</strong>.
            </Text>
            <Section>
              <Row>
                <Column align="right">
                  <Img
                    className="rounded-full"
                    src={userImage}
                    width="64"
                    height="64"
                  />
                </Column>
                <Column align="center">
                  <Img
                    src={`${SITE_URL}/team-invite-arrow.png`}
                    width="12"
                    height="9"
                    alt="invited you to"
                  />
                </Column>
                <Column align="left">
                  <Img
                    className="rounded-full"
                    src={teamImage}
                    width="64"
                    height="64"
                  />
                </Column>
              </Row>
            </Section>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={inviteLink}
              >
                Join the team
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              or copy and paste this URL into your browser:{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This invitation was intended for{" "}
              <span className="text-black">{username}</span>. If you were not
              expecting this invitation, you can ignore this email. If you are
              concerned about your account&apos;s safety, please get in touch
              with us at{" "}
              <Link
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-blue-600 no-underline"
              >
                {SUPPORT_EMAIL}
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
      </EmailTailwind>
    </Html>
  );
}

TeamInviteUserEmail.PreviewProps = {
  username: "Alex Morgan",
  userImage: `${SITE_URL}/parsertime.png`,
  invitedByUsername: "Jordan Lee",
  invitedByEmail: "jordan@example.com",
  teamName: "Neon Wolves",
  teamImage: `${SITE_URL}/parsertime.png`,
  inviteLink: `${SITE_URL}/team/join?token=preview-token`,
} satisfies TeamInviteUserEmailProps;

export default TeamInviteUserEmail;
