import { Schema as S } from "effect";

export const EmailSchema = S.String.pipe(
  S.nonEmptyString({ message: () => "Email cannot be empty" })
);
