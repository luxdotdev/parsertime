import { Data } from "effect";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string;
  readonly resourceId: string;
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly userId: string;
  readonly resource: string;
  readonly reason: string;
}> {}
