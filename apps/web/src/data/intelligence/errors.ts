import { Schema as S } from "effect";

export class HeroBanIntelligenceQueryError extends S.TaggedError<HeroBanIntelligenceQueryError>()(
  "HeroBanIntelligenceQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Hero ban intelligence query failed: ${this.operation}`;
  }
}

export class MapIntelligenceQueryError extends S.TaggedError<MapIntelligenceQueryError>()(
  "MapIntelligenceQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Map intelligence query failed: ${this.operation}`;
  }
}
