import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface MagicLinkEmailProps {
  username?: string;
  magicLink?: string;
}

export const MagicLinkEmail = ({
  magicLink,
  username,
}: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Log in with this magic link.</Preview>
    <Tailwind>
      <Body className="mx-auto my-auto bg-white px-2 font-sans">
        <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
          <Section className="mt-[32px]">
            <Img
              src="https://parsertime.app/parsertime.png"
              width="50"
              height="50"
              alt="Parsertime Logo"
              className="mx-auto my-0"
            />
          </Section>
          <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
            Sign In to <strong>Parsertime</strong>
          </Heading>
          <Text className="text-[14px] leading-[24px] text-black">
            Hello {username},
          </Text>
          <Text className="text-[14px] leading-[24px] text-black">
            Please click the button below to sign in to{" "}
            <strong>Parsertime</strong>.
          </Text>
          <Section className="mt-[32px] mb-[32px] text-center">
            <Button
              className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
              href={magicLink}
            >
              Sign In
            </Button>
          </Section>
          <Text className="text-[14px] leading-[24px] text-black">
            or copy and paste this URL into your browser:{" "}
            <Link href={magicLink} className="text-blue-600 no-underline">
              {magicLink}
            </Link>
          </Text>
          <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
          <Text className="text-[12px] leading-[24px] text-[#666666]">
            This message was intended for{" "}
            <span className="text-black">{username}</span>. If you were not
            expecting this message, you can ignore this email. If you are
            concerned about your account&apos;s safety, please get in touch with
            us at{" "}
            <Link
              href="mailto:help@parsertime.app"
              className="text-blue-600 no-underline"
            >
              help@parsertime.app
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
    </Tailwind>
  </Html>
);

export default MagicLinkEmail;
