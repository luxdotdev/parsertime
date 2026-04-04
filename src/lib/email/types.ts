import { Schema as S } from "effect";

export const EmailAddress = S.String.pipe(
  S.nonEmptyString({ message: () => "Email address cannot be empty" }),
  S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Must be a valid email address",
  })
);

export const NonEmptyString = S.String.pipe(
  S.nonEmptyString({ message: () => "Cannot be empty" })
);

export const OptionalEmailArray = S.optional(
  S.Array(EmailAddress).pipe(
    S.maxItems(10, { message: () => "Cannot exceed 10 recipients" })
  )
);

export const EmailArgsSchema = S.Struct({
  to: EmailAddress,
  from: S.optional(EmailAddress),
  subject: NonEmptyString,
  html: NonEmptyString,
  replyTo: OptionalEmailArray,
  ccAddresses: OptionalEmailArray,
  bccAddresses: OptionalEmailArray,
});

export type EmailArgs = S.Schema.Type<typeof EmailArgsSchema>;
