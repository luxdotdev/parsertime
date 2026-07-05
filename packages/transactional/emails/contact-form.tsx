import {
  EmailLink,
  EmailShell,
  EmailText,
  EmailTitle,
  SnippetBlock,
} from "./_components";

type ContactFormEmailProps = {
  name?: string;
  email?: string;
  message?: string;
};

export function ContactFormEmail({
  name,
  email,
  message,
}: ContactFormEmailProps) {
  return (
    <EmailShell preview={`New message from ${name}`}>
      <EmailTitle>New message from {name}</EmailTitle>
      <EmailText>
        <strong>{name}</strong> (
        <EmailLink href={`mailto:${email}`}>{email}</EmailLink>) wrote:
      </EmailText>
      <SnippetBlock>{message}</SnippetBlock>
      <EmailText>
        Reply directly to this email to answer{" "}
        <EmailLink href={`mailto:${email}`}>{email}</EmailLink>.
      </EmailText>
    </EmailShell>
  );
}

ContactFormEmail.PreviewProps = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  message:
    "Hey! I'm having trouble getting my scrim logs to upload — the map stats come through empty. Could you take a look?",
} satisfies ContactFormEmailProps;

export default ContactFormEmail;
