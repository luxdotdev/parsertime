import { Schema as S } from "effect";

export const RankedExportHeroSchema = S.Struct({
  hero: S.String,
  role: S.String,
  percentage: S.Number,
});

export const RankedExportMatchSchema = S.Struct({
  sourceId: S.String,
  map: S.String,
  mapType: S.String,
  result: S.Literal("win", "loss", "draw"),
  groupSize: S.Number,
  playedAt: S.String,
  heroes: S.Array(RankedExportHeroSchema),
});

export const RankedExportBundleSchema = S.Struct({
  version: S.Literal(1),
  user: S.Struct({
    email: S.String,
    oauthAccounts: S.Array(
      S.Struct({ provider: S.String, providerAccountId: S.String })
    ),
  }),
  matches: S.Array(RankedExportMatchSchema),
});

export type RankedExportBundle = S.Schema.Type<typeof RankedExportBundleSchema>;

export type ParseResult =
  | { ok: true; bundle: RankedExportBundle }
  | { ok: false; error: string };

export function parseRankedBundle(input: unknown): ParseResult {
  const result = S.decodeUnknownEither(RankedExportBundleSchema)(input);
  if (result._tag === "Right") return { ok: true, bundle: result.right };
  return { ok: false, error: "Invalid ranked export bundle" };
}
