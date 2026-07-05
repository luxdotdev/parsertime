import { SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import {
  EmailButton,
  EmailLink,
  EmailShell,
  EmailText,
  EmailTitle,
} from "./_components";

type MagicLinkEmailProps = {
  username?: string;
  magicLink?: string;
};

export function MagicLinkEmail({ magicLink, username }: MagicLinkEmailProps) {
  return (
    <EmailShell preview="Your sign-in link for Sightline.">
      <EmailTitle>Sign in to Sightline</EmailTitle>
      <EmailText>
        Hello, <strong>{username}</strong>.
      </EmailText>
      <EmailText>Click the button below to sign in:</EmailText>
      <EmailButton href={magicLink}>Sign in</EmailButton>
      <EmailText>
        Or copy and paste this URL into your browser:{" "}
        <EmailLink href={magicLink}>{magicLink}</EmailLink>
      </EmailText>
      <EmailText>
        If you didn&apos;t request this email, you can safely ignore it.
        Concerned about your account? Contact{" "}
        <EmailLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</EmailLink>.
      </EmailText>
    </EmailShell>
  );
}

MagicLinkEmail.PreviewProps = {
  username: "Alex Morgan",
  magicLink: `${SITE_URL}/auth/magic?token=preview-token`,
} satisfies MagicLinkEmailProps;

export default MagicLinkEmail;
