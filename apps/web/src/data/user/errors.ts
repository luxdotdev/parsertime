import { Schema as S } from "effect";

export class UserNotFoundError extends S.TaggedError<UserNotFoundError>()(
  "UserNotFoundError",
  {
    email: S.String,
  }
) {
  get message(): string {
    return `User not found: ${this.email}`;
  }
}

export class UserQueryError extends S.TaggedError<UserQueryError>()(
  "UserQueryError",
  {
    cause: S.Defect,
    operation: S.String,
  }
) {
  get message(): string {
    return `User query failed: ${this.operation}`;
  }
}
