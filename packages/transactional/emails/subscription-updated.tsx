import { SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import { toTitleCase } from "./_utils";
import type { EmailUser } from "./_types";
import { EmailLink, EmailShell, EmailText, EmailTitle } from "./_components";

type SubscriptionEmailProps = {
  user: EmailUser;
  billingPlan: string;
};

export function SubscriptionUpdatedEmail({
  user,
  billingPlan,
}: SubscriptionEmailProps) {
  const planName = toTitleCase(billingPlan);

  return (
    <EmailShell preview={`You're now on the ${planName} plan.`}>
      <EmailTitle>You&apos;re now on the {planName} plan</EmailTitle>
      <EmailText>
        Hello, <strong>{user.name ?? user.email}</strong>.
      </EmailText>
      <EmailText>
        We updated your Sightline subscription to the{" "}
        <strong>{planName}</strong> plan. Manage it, including your payment
        method, from your{" "}
        <EmailLink href={`${SITE_URL}/settings`}>settings page</EmailLink>.
      </EmailText>
      <EmailText>
        Questions? Reach out at{" "}
        <EmailLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</EmailLink>.
      </EmailText>
    </EmailShell>
  );
}

SubscriptionUpdatedEmail.PreviewProps = {
  user: { name: "Alex Morgan", email: "alex@example.com" },
  billingPlan: "premium",
} satisfies SubscriptionEmailProps;

export default SubscriptionUpdatedEmail;
