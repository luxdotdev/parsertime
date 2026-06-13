import { Schema as S } from "effect";

export class FaceitScoutingQueryError extends S.TaggedError<FaceitScoutingQueryError>()(
  "FaceitScoutingQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `FACEIT scouting query failed: ${this.operation}`;
  }
}
