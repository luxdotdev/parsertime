import prisma from "@/lib/prisma";
import type { AuditLog } from "@prisma/client";
import { Context, Effect, Layer, ManagedRuntime, Schedule } from "effect";
import { DatabaseError } from "./errors";
import type { AuditLogArgs } from "./types";

// Service interface
export type Service = {
  createAuditLog(args: AuditLogArgs): Effect.Effect<AuditLog, DatabaseError>;
};

export class AuditLogService extends Context.Tag("AuditLogService")<
  AuditLogService,
  Service
>() {}

// Service implementation
function createService(): Effect.Effect<Service, never> {
  const service: Service = {
    createAuditLog: (args: AuditLogArgs) =>
      Effect.gen(function* () {
        const { userEmail, action, target, details } = args;

        // Create audit log entry in database with retry logic
        const auditLog = yield* Effect.tryPromise({
          try: () =>
            prisma.auditLog.create({
              data: { userEmail, action, target, details },
            }),
          catch: (error) =>
            new DatabaseError({
              operation: "create audit log",
              message: `Failed to create audit log: ${String(error)}`,
              cause: error,
            }),
        }).pipe(
          Effect.retry(
            Schedule.exponential(1000).pipe(
              Schedule.compose(Schedule.recurs(2))
            )
          ),
          Effect.withSpan("audit-log.create", {
            attributes: {
              userEmail,
              action,
              target,
              detailsLength: details.length,
            },
          }),
          Effect.tapBoth({
            onFailure: (error) =>
              Effect.logError(
                `Failed to create audit log for ${userEmail}: ${error._tag} - ${error.message}`
              ),
            onSuccess: (auditLog) =>
              Effect.logInfo(
                `Audit log created for ${userEmail}: ${JSON.stringify(auditLog)}`
              ),
          })
        );

        return auditLog;
      }).pipe(
        Effect.withSpan("audit-log.createAuditLog", {
          attributes: {
            userEmail: args.userEmail,
            action: args.action,
            target: args.target,
          },
        })
      ),
  };

  return Effect.succeed(service);
}

// Production Layer
export const layerFromConfig = Layer.effect(AuditLogService, createService());

// Layer composition for easy use
export function layer() {
  return layerFromConfig;
}

// Runtime for Promise-based usage
export const auditLogRuntime = ManagedRuntime.make(layer());

/**
 * Audit log service instance that provides a simplified API for creating audit logs.
 *
 * Features:
 * - Database integration with Prisma
 * - Error handling for database operations
 * - Automatic retry logic with exponential backoff
 * - Structured logging and observability
 */
export const auditLog = {
  createAuditLog: (args: AuditLogArgs) =>
    auditLogRuntime.runPromise(
      AuditLogService.pipe(
        Effect.flatMap((service) => service.createAuditLog(args))
      )
    ),
} as const;

// Re-export types for consumers
export type { AuditLogArgs };

// Re-export error types for API routes
export { DatabaseError } from "./errors";

// Re-export the action type for backward compatibility
export type { AuditLogAction } from "./types";
