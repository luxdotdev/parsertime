import { DOCS_URL, SITE_URL, SUPPORT_EMAIL } from "../lib/site";
import {
  EmailLink,
  EmailList,
  EmailListItem,
  EmailShell,
  EmailText,
  EmailTitle,
} from "./_components";

type OnboardingEmailProps = {
  name?: string;
  email?: string;
};

export function UserOnboardingEmail({ name }: OnboardingEmailProps) {
  return (
    <EmailShell preview="Welcome to Sightline. Here's how to get started.">
      <EmailTitle>Welcome to Sightline</EmailTitle>
      <EmailText>
        Hello, <strong>{name}</strong>.
      </EmailText>
      <EmailText>
        Your account is ready. Here&apos;s how to get started:
      </EmailText>
      <EmailList>
        <EmailListItem>
          Set up your profile in your{" "}
          <EmailLink href={`${SITE_URL}/settings`}>settings</EmailLink>.
        </EmailListItem>
        <EmailListItem>Create a team, or join an existing one.</EmailListItem>
        <EmailListItem>
          Upload your first scrim from the{" "}
          <EmailLink href={`${SITE_URL}/dashboard`}>dashboard</EmailLink>.
        </EmailListItem>
        <EmailListItem>
          Read the <EmailLink href={DOCS_URL}>docs</EmailLink> to learn how
          Sightline works.
        </EmailListItem>
        <EmailListItem>
          Join our{" "}
          <EmailLink href="https://discord.gg/svz3qhVDXM">Discord</EmailLink>{" "}
          for help and updates.
        </EmailListItem>
      </EmailList>
      <EmailText>
        Questions? Reach out at{" "}
        <EmailLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</EmailLink>.
        Happy scrimming!
      </EmailText>
    </EmailShell>
  );
}

UserOnboardingEmail.PreviewProps = {
  name: "Alex Morgan",
  email: "alex@example.com",
} satisfies OnboardingEmailProps;

export default UserOnboardingEmail;
