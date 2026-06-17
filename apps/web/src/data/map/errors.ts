import { Schema as S } from "effect";

export class MapQueryError extends S.TaggedError<MapQueryError>()(
  "MapQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `Map query failed: ${this.operation}`;
  }
}

export class MapNotFoundError extends S.TaggedError<MapNotFoundError>()(
  "MapNotFoundError",
  {
    mapDataId: S.Number,
  }
) {
  get message(): string {
    return `Map data not found: ${this.mapDataId}`;
  }
}

export class CalibrationNotFoundError extends S.TaggedError<CalibrationNotFoundError>()(
  "CalibrationNotFoundError",
  {
    mapName: S.String,
  }
) {
  get message(): string {
    return `No calibration data found for map: ${this.mapName}`;
  }
}
