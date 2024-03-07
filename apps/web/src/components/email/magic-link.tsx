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
      <Body className="bg-white my-auto mx-auto font-sans px-2">
        <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
          <Section className="mt-[32px]">
            <Img
              src="https://parsertime.app/parsertime.png"
              width="50"
              height="50"
              alt="Parsertime Logo"
              className="my-0 mx-auto"
            />
          </Section>
          <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
            Sign In to <strong>Parsertime</strong>
          </Heading>
          <Text className="text-black text-[14px] leading-[24px]">
            Hello {username},
          </Text>
          <Text className="text-black text-[14px] leading-[24px]">
            Please click the button below to sign in to{" "}
            <strong>Parsertime</strong>.
          </Text>
          <Section className="text-center mt-[32px] mb-[32px]">
            <Button
              className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
              href={magicLink}
            >
              Sign In
            </Button>
          </Section>
          <Text className="text-black text-[14px] leading-[24px]">
            or copy and paste this URL into your browser:{" "}
            <Link href={magicLink} className="text-blue-600 no-underline">
              {magicLink}
            </Link>
          </Text>
          <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
          <Text className="text-[#666666] text-[12px] leading-[24px]">
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
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This email was sent from a development environment.
            </Text>
          )}
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default MagicLinkEmail;
