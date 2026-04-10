import { Schema as S } from "effect";

export class HeroQueryError extends S.TaggedError<HeroQueryError>()(
  "HeroQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Hero query failed: ${this.operation}`;
  }
}
