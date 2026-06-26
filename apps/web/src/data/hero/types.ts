import { Schema as S } from "effect";

export const ScrimIdsSchema = S.Array(
  S.Number.pipe(
    S.int(),
    S.positive({ message: () => "Scrim ID must be a positive integer" })
  )
).pipe(S.minItems(1, { message: () => "At least one scrim ID is required" }));

export const HeroNameSchema = S.String.pipe(
  S.minLength(1, { message: () => "Hero name must not be empty" })
);
