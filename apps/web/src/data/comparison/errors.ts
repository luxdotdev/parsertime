import { Schema as S } from "effect";

export class ComparisonQueryError extends S.TaggedError<ComparisonQueryError>()(
  "ComparisonQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Comparison query failed: ${this.operation}`;
  }
}

export class ComparisonValidationError extends S.TaggedError<ComparisonValidationError>()(
  "ComparisonValidationError",
  {
    field: S.String,
    reason: S.String,
  }
) {
  get message(): string {
    return `Comparison validation failed on ${this.field}: ${this.reason}`;
  }
}
