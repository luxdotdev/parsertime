import { SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import type { EmailUser } from "./_types";
import {
  EmailButton,
  EmailLink,
  EmailShell,
  EmailText,
  EmailTitle,
} from "./_components";

type CreditLowBalanceEmailProps = {
  user: EmailUser;
  balanceCents: number;
};

function formatCents(cents: number): string {
  return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}

export function CreditLowBalanceEmail({
  user,
  balanceCents,
}: CreditLowBalanceEmailProps) {
  return (
    <EmailShell
      preview={`Your Sightline AI balance is running low (${formatCents(balanceCents)})`}
    >
      <EmailTitle>Your AI credits are running low</EmailTitle>
      <EmailText>
        Hello, <strong>{user.name ?? user.email}</strong>.
      </EmailText>
      <EmailText>
        Your AI chat balance dropped to{" "}
        <strong>{formatCents(balanceCents)}</strong>. We&apos;ll block new
        messages once it hits zero, so you won&apos;t get surprise charges.
      </EmailText>
      <EmailText>
        Top up now, or turn on auto-refill to keep credits available
        automatically.
      </EmailText>
      <EmailButton href={`${SITE_URL}/settings/billing`}>
        Manage credits
      </EmailButton>
      <EmailText>
        Don&apos;t want these alerts? Reply to{" "}
        <EmailLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</EmailLink>{" "}
        and we&apos;ll turn them off.
      </EmailText>
    </EmailShell>
  );
}

CreditLowBalanceEmail.PreviewProps = {
  user: { name: "Alex Morgan", email: "alex@example.com" },
  balanceCents: 180,
} satisfies CreditLowBalanceEmailProps;

export default CreditLowBalanceEmail;
