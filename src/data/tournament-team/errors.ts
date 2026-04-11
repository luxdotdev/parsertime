import { Schema as S } from "effect";

export class TournamentTeamQueryError extends S.TaggedError<TournamentTeamQueryError>()(
  "TournamentTeamQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Tournament team query failed: ${this.operation}`;
  }
}
