import { SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import type { EmailUser } from "./_types";
import { EmailLink, EmailShell, EmailText, EmailTitle } from "./_components";

type SubscriptionEmailProps = {
  user: EmailUser;
};

export function SubscriptionDeletedEmail({ user }: SubscriptionEmailProps) {
  return (
    <EmailShell preview="Your Sightline subscription was cancelled.">
      <EmailTitle>Your subscription was cancelled</EmailTitle>
      <EmailText>
        Hello, <strong>{user.name ?? user.email}</strong>.
      </EmailText>
      <EmailText>
        We cancelled your Sightline subscription. You keep access to your plan
        features until the current billing period ends.
      </EmailText>
      <EmailText>
        Changed your mind? Resubscribe anytime from your{" "}
        <EmailLink href={`${SITE_URL}/settings`}>settings page</EmailLink>.
      </EmailText>
      <EmailText>
        Questions? Reach out at{" "}
        <EmailLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</EmailLink>.
      </EmailText>
    </EmailShell>
  );
}

SubscriptionDeletedEmail.PreviewProps = {
  user: { name: "Alex Morgan", email: "alex@example.com" },
} satisfies SubscriptionEmailProps;

export default SubscriptionDeletedEmail;
