import { Schema as S } from "effect";

export const TeamIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Team ID must be a positive integer" })
);

export const BaseTeamDataOptionsSchema = S.Struct({
  excludePush: S.optional(S.Boolean),
  excludeClash: S.optional(S.Boolean),
  includeDateInfo: S.optional(S.Boolean),
  dateRange: S.optional(
    S.Struct({
      from: S.Date,
      to: S.Date,
    })
  ),
});

export type BaseTeamDataOptions = S.Schema.Type<
  typeof BaseTeamDataOptionsSchema
>;
