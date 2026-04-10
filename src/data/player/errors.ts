import { Schema as S } from "effect";

export class PlayerQueryError extends S.TaggedError<PlayerQueryError>()(
  "PlayerQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Player query failed: ${this.operation}`;
  }
}

export class PlayerNotFoundError extends S.TaggedError<PlayerNotFoundError>()(
  "PlayerNotFoundError",
  {
    identifier: S.String,
  }
) {
  get message(): string {
    return `Player not found: ${this.identifier}`;
  }
}

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

export class ScoutingAnalyticsQueryError extends S.TaggedError<ScoutingAnalyticsQueryError>()(
  "ScoutingAnalyticsQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Scouting analytics query failed: ${this.operation}`;
  }
}

export class IntelligenceQueryError extends S.TaggedError<IntelligenceQueryError>()(
  "IntelligenceQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Player intelligence query failed: ${this.operation}`;
  }
}

export class TargetsQueryError extends S.TaggedError<TargetsQueryError>()(
  "TargetsQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Targets query failed: ${this.operation}`;
  }
}
