import { Schema as S } from "effect";

export const NonEmptyString = S.String.pipe(
  S.nonEmptyString({ message: () => "Cannot be empty" })
);

export const UploadArgsSchema = S.Struct({
  key: NonEmptyString,
  body: S.instanceOf(Buffer),
  contentType: S.optional(S.String),
});

export type UploadArgs = S.Schema.Type<typeof UploadArgsSchema>;

export type UploadResponse = {
  key: string;
};

export const PresignedUrlArgsSchema = S.Struct({
  key: NonEmptyString,
  expiresIn: S.optional(S.Number.pipe(S.positive())),
});

export type PresignedUrlArgs = S.Schema.Type<typeof PresignedUrlArgsSchema>;
