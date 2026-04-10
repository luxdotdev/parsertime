import { Schema as S } from "effect";

export const MapDataIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "MapData ID must be a positive integer" })
);

export const MapIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Map ID must be a positive integer" })
);

export const TeamIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Team ID must be a positive integer" })
);

export const MapGroupCreateSchema = S.Struct({
  name: S.String,
  description: S.optional(S.String),
  teamId: S.Number,
  mapIds: S.Array(S.Number),
  category: S.optional(S.String),
  createdBy: S.String,
});

export const MapGroupUpdateSchema = S.Struct({
  name: S.optional(S.String),
  description: S.optional(S.String),
  mapIds: S.optional(S.Array(S.Number)),
  category: S.optional(S.String),
});
