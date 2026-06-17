import { Schema as S } from "effect";

export class ScoutingQueryError extends S.TaggedError<ScoutingQueryError>()(
  "ScoutingQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Scouting query failed: ${this.operation}`;
  }
}

export class ScoutingTeamNotFoundError extends S.TaggedError<ScoutingTeamNotFoundError>()(
  "ScoutingTeamNotFoundError",
  {
    teamAbbr: S.String,
  }
) {
  get message(): string {
    return `Scouting team not found: ${this.teamAbbr}`;
  }
}
