import { Schema as S } from "effect";

export class TournamentNotFoundError extends S.TaggedError<TournamentNotFoundError>()(
  "TournamentNotFoundError",
  {
    tournamentId: S.Number,
  }
) {
  get message(): string {
    return `Tournament not found: ${this.tournamentId}`;
  }
}

export class TournamentQueryError extends S.TaggedError<TournamentQueryError>()(
  "TournamentQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Tournament query failed: ${this.operation}`;
  }
}

export class TournamentMatchNotFoundError extends S.TaggedError<TournamentMatchNotFoundError>()(
  "TournamentMatchNotFoundError",
  {
    matchId: S.Number,
  }
) {
  get message(): string {
    return `Tournament match not found: ${this.matchId}`;
  }
}

export class BroadcastQueryError extends S.TaggedError<BroadcastQueryError>()(
  "BroadcastQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Broadcast query failed: ${this.operation}`;
  }
}
