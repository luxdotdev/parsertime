import { Data } from "effect";

// Database operation error
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  operation: string;
  message: string;
  cause?: unknown;
}> {}
