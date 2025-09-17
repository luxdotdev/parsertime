import { Data } from "effect";

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

export class ConfigurationError extends Data.TaggedError("ConfigurationError")<{
  readonly field: string;
  readonly message: string;
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly identifier: string;
  readonly message: string;
}> {}

export class EmailSendError extends Data.TaggedError("EmailSendError")<{
  readonly cause: unknown;
  readonly recipient: string;
  readonly operation: string;
}> {}
