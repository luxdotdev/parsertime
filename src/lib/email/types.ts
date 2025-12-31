import { Schema } from "effect";

// Email Schema Definitions (exported for potential reuse)
export const EmailAddress = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => "Email address cannot be empty" }),
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Must be a valid email address",
  })
);

export const NonEmptyString = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => "Cannot be empty" })
);

export const OptionalEmailArray = Schema.optional(
  Schema.Array(EmailAddress).pipe(
    Schema.maxItems(10, { message: () => "Cannot exceed 10 recipients" })
  )
);

// Email Arguments Schema
export const EmailArgsSchema = Schema.Struct({
  to: EmailAddress,
  from: Schema.optional(EmailAddress),
  subject: NonEmptyString,
  html: NonEmptyString,
  replyTo: OptionalEmailArray,
  ccAddresses: OptionalEmailArray,
  bccAddresses: OptionalEmailArray,
});

export type EmailArgs = Schema.Schema.Type<typeof EmailArgsSchema>;
