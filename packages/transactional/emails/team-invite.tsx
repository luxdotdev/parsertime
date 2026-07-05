import { SITE_URL } from "../lib/site";
import { Column, Img, Row, Section } from "react-email";
import {
  EmailButton,
  EmailLink,
  EmailShell,
  EmailText,
  EmailTitle,
} from "./_components";

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
  return (
    <EmailShell preview={`Join ${teamName} on Sightline`}>
      <EmailTitle>Join {teamName} on Sightline</EmailTitle>
      <EmailText>
        Hello, <strong>{username}</strong>.
      </EmailText>
      <EmailText>
        <strong>{invitedByUsername}</strong> (
        <EmailLink href={`mailto:${invitedByEmail}`}>
          {invitedByEmail}
        </EmailLink>
        ) invited you to the <strong>{teamName}</strong> team on Sightline.
      </EmailText>
      <Section className="mt-0 mb-[24px]">
        <Row>
          <Column className="w-[64px]">
            <Img
              className="rounded-full"
              src={userImage}
              width="64"
              height="64"
            />
          </Column>
          <Column className="w-[44px]" align="center">
            <Img
              src={`${SITE_URL}/team-invite-arrow.png`}
              width="12"
              height="9"
              alt="invited you to"
            />
          </Column>
          <Column className="w-[64px]">
            <Img
              className="rounded-full"
              src={teamImage}
              width="64"
              height="64"
            />
          </Column>
          <Column />
        </Row>
      </Section>
      <EmailButton href={inviteLink}>Join the team</EmailButton>
      <EmailText>
        Or copy and paste this URL into your browser:{" "}
        <EmailLink href={inviteLink}>{inviteLink}</EmailLink>
      </EmailText>
      <EmailText>
        If you weren&apos;t expecting this invitation, you can ignore this
        email.
      </EmailText>
    </EmailShell>
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
