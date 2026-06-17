import { Schema as S } from "effect";

export class TeamNotFoundError extends S.TaggedError<TeamNotFoundError>()(
  "TeamNotFoundError",
  {
    teamId: S.Number,
  }
) {
  get message(): string {
    return `Team not found: ${this.teamId}`;
  }
}

export class TeamQueryError extends S.TaggedError<TeamQueryError>()(
  "TeamQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Team query failed: ${this.operation}`;
  }
}
