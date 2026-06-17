import { Schema as S } from "effect";

export class RankedQueryError extends S.TaggedError<RankedQueryError>()(
  "RankedQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Ranked query failed: ${this.operation}`;
  }
}
