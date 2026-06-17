import { Schema as S } from "effect";

export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  }
) {}

export class ConfigurationError extends S.TaggedError<ConfigurationError>()(
  "ConfigurationError",
  {
    field: S.String,
    message: S.String,
  }
) {}

export class RateLimitError extends S.TaggedError<RateLimitError>()(
  "RateLimitError",
  {
    identifier: S.String,
    message: S.String,
  }
) {}

export class EmailSendError extends S.TaggedError<EmailSendError>()(
  "EmailSendError",
  {
    cause: S.optional(S.Defect),
    recipient: S.String,
    operation: S.String,
  }
) {
  get message(): string {
    return `Failed to ${this.operation} for ${this.recipient}`;
  }
}
