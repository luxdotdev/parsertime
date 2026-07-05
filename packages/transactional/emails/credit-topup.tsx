import { SITE_URL } from "../lib/site";
import type { EmailUser } from "./_types";
import {
  DetailList,
  EmailLink,
  EmailShell,
  EmailSubheading,
  EmailText,
  EmailTitle,
} from "./_components";

type CreditTopupEmailProps = {
  user: EmailUser;
  amountCents: number;
  balanceAfterCents: number;
  source: "topup" | "auto_refill";
  autoRefillEnabled: boolean;
  autoRefillThresholdCents: number;
  autoRefillAmountCents: number;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CreditTopupEmail({
  user,
  amountCents,
  balanceAfterCents,
  source,
  autoRefillEnabled,
  autoRefillThresholdCents,
  autoRefillAmountCents,
}: CreditTopupEmailProps) {
  const isAutoRefill = source === "auto_refill";
  const previewText = isAutoRefill
    ? `Auto-refill processed for ${formatCents(amountCents)}`
    : `${formatCents(amountCents)} of AI credits added to your account`;

  return (
    <EmailShell preview={previewText}>
      <EmailTitle>
        {isAutoRefill ? "Auto-refill processed" : "Credits added"}
      </EmailTitle>
      <EmailText>
        Hello, <strong>{user.name ?? user.email}</strong>.
      </EmailText>
      <EmailText>
        {isAutoRefill ? (
          <>
            We charged your saved payment method{" "}
            <strong>{formatCents(amountCents)}</strong> to top up your AI chat
            credits.
          </>
        ) : (
          <>
            We added <strong>{formatCents(amountCents)}</strong> of AI chat
            credits to your account.
          </>
        )}
      </EmailText>
      <DetailList
        items={[
          { label: "New balance", value: formatCents(balanceAfterCents) },
        ]}
      />
      <EmailSubheading>Auto-refill</EmailSubheading>
      {autoRefillEnabled ? (
        <EmailText>
          Auto-refill is <strong>on</strong>. We&apos;ll charge your saved card{" "}
          {formatCents(autoRefillAmountCents)} whenever your balance drops below{" "}
          {formatCents(autoRefillThresholdCents)}. Manage it in your{" "}
          <EmailLink href={`${SITE_URL}/settings/billing`}>
            billing settings
          </EmailLink>
          .
        </EmailText>
      ) : (
        <EmailText>
          Auto-refill is <strong>off</strong>. Turn it on in your{" "}
          <EmailLink href={`${SITE_URL}/settings/billing`}>
            billing settings
          </EmailLink>{" "}
          so your credits don&apos;t run out mid-scrim.
        </EmailText>
      )}
    </EmailShell>
  );
}

CreditTopupEmail.PreviewProps = {
  user: { name: "Alex Morgan", email: "alex@example.com" },
  amountCents: 2000,
  balanceAfterCents: 2480,
  source: "topup",
  autoRefillEnabled: true,
  autoRefillThresholdCents: 500,
  autoRefillAmountCents: 2000,
} satisfies CreditTopupEmailProps;

export default CreditTopupEmail;
