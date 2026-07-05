import { SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import { toTitleCase } from "./_utils";
import type { EmailUser } from "./_types";
import { EmailLink, EmailShell, EmailText, EmailTitle } from "./_components";

type SubscriptionEmailProps = {
  user: EmailUser;
  billingPlan: string;
};

export function SubscriptionCreatedEmail({
  user,
  billingPlan,
}: SubscriptionEmailProps) {
  return (
    <EmailShell preview="Thanks for subscribing to Sightline.">
      <EmailTitle>Thanks for subscribing to Sightline</EmailTitle>
      <EmailText>
        Hello, <strong>{user.name ?? user.email}</strong>.
      </EmailText>
      <EmailText>
        You&apos;re now on the <strong>{toTitleCase(billingPlan)}</strong> plan.
        Thanks for supporting Sightline.
      </EmailText>
      <EmailText>
        Manage your subscription, including your payment method, from your{" "}
        <EmailLink href={`${SITE_URL}/settings`}>settings page</EmailLink>.
      </EmailText>
      <EmailText>
        Questions? Reach out at{" "}
        <EmailLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</EmailLink>.
      </EmailText>
    </EmailShell>
  );
}

SubscriptionCreatedEmail.PreviewProps = {
  user: { name: "Alex Morgan", email: "alex@example.com" },
  billingPlan: "premium",
} satisfies SubscriptionEmailProps;

export default SubscriptionCreatedEmail;
