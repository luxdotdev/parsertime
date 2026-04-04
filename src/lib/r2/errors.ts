import { Schema as S } from "effect";

export class ConfigurationError extends S.TaggedError<ConfigurationError>()(
  "ConfigurationError",
  {
    field: S.String,
    message: S.String,
  }
) {}

export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: S.String,
    message: S.String,
  }
) {}

export class UploadError extends S.TaggedError<UploadError>()("UploadError", {
  cause: S.optional(S.Defect),
  key: S.String,
  operation: S.String,
}) {
  get message(): string {
    return `Failed to ${this.operation} for key ${this.key}`;
  }
}

export class DeleteError extends S.TaggedError<DeleteError>()("DeleteError", {
  cause: S.optional(S.Defect),
  key: S.String,
}) {
  get message(): string {
    return `Failed to delete key ${this.key}`;
  }
}

export class PresignError extends S.TaggedError<PresignError>()(
  "PresignError",
  {
    cause: S.optional(S.Defect),
    key: S.String,
  }
) {
  get message(): string {
    return `Failed to generate presigned URL for key ${this.key}`;
  }
}
