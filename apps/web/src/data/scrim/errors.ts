import { Schema as S } from "effect";

export class ScrimNotFoundError extends S.TaggedError<ScrimNotFoundError>()(
  "ScrimNotFoundError",
  {
    scrimId: S.Number,
  }
) {
  get message(): string {
    return `Scrim not found: ${this.scrimId}`;
  }
}

export class ScrimQueryError extends S.TaggedError<ScrimQueryError>()(
  "ScrimQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Scrim query failed: ${this.operation}`;
  }
}
