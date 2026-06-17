import { Schema as S } from "effect";

export class DataLabelingQueryError extends S.TaggedError<DataLabelingQueryError>()(
  "DataLabelingQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Data labeling query failed: ${this.operation}`;
  }
}

export class MatchNotFoundError extends S.TaggedError<MatchNotFoundError>()(
  "MatchNotFoundError",
  {
    matchId: S.Number,
  }
) {
  get message(): string {
    return `Match not found: ${this.matchId}`;
  }
}
