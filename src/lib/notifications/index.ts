import prisma from "@/lib/prisma";
import type { Notification } from "@prisma/client";
import { Context, Effect, Layer, ManagedRuntime } from "effect";
import {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  UserNotFoundError,
  ValidationError,
} from "./errors";
import type { InAppNotification, PaginatedNotifications } from "./types";

// Service interface
export type Service = {
  createInAppNotification(
    notification: InAppNotification
  ): Effect.Effect<
    Notification,
    DatabaseError | ValidationError | UserNotFoundError
  >;

  getUserNotifications(
    userId: string,
    limit?: number
  ): Effect.Effect<Notification[], DatabaseError>;

  getUserNotificationsPaginated(
    userId: string,
    page?: number,
    limit?: number
  ): Effect.Effect<PaginatedNotifications, DatabaseError>;

  markAsRead(
    userId: string,
    notificationId: number
  ): Effect.Effect<void, DatabaseError | NotFoundError | UnauthorizedError>;

  markAllAsRead(userId: string): Effect.Effect<void, DatabaseError>;

  deleteNotification(
    userId: string,
    notificationId: number
  ): Effect.Effect<void, DatabaseError | NotFoundError | UnauthorizedError>;
};

export class NotificationService extends Context.Tag("NotificationService")<
  NotificationService,
  Service
>() {}

// Service implementation
function createService(config: { prisma: typeof prisma }) {
  return Effect.gen(function* () {
    const { prisma } = config;

    const service: Service = {
      createInAppNotification: (notification: InAppNotification) =>
        Effect.gen(function* () {
          // Validate input
          if (!notification.title.trim()) {
            return yield* new ValidationError({
              field: "title",
              message: "Title cannot be empty",
            });
          }

          if (!notification.description.trim()) {
            return yield* new ValidationError({
              field: "description",
              message: "Description cannot be empty",
            });
          }

          // Check if user exists
          const userExists = yield* Effect.tryPromise({
            try: () =>
              prisma.user.findUnique({
                where: { id: notification.userId },
                select: { id: true },
              }),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "user lookup",
              }),
          }).pipe(
            Effect.withSpan("notification.validate-user", {
              attributes: { userId: notification.userId },
            })
          );

          if (!userExists) {
            return yield* new UserNotFoundError({
              userId: notification.userId,
            });
          }

          // Create notification
          const result = yield* Effect.tryPromise({
            try: () =>
              prisma.notification.create({
                data: {
                  userId: notification.userId,
                  title: notification.title.trim(),
                  description: notification.description.trim(),
                  href: notification.href?.trim() ?? null,
                },
              }),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "create notification",
              }),
          }).pipe(
            Effect.withSpan("notification.create", {
              attributes: {
                userId: notification.userId,
                title: notification.title,
                href: notification.href ?? "#",
              },
            })
          );

          return result;
        }).pipe(
          Effect.withSpan("notification.createInAppNotification", {
            attributes: { userId: notification.userId },
          })
        ),

      getUserNotifications: (userId: string, limit = 50) =>
        Effect.tryPromise({
          try: () =>
            prisma.notification.findMany({
              where: { userId },
              orderBy: { createdAt: "desc" },
              take: limit,
            }),
          catch: (cause) =>
            new DatabaseError({
              cause,
              operation: "get user notifications",
            }),
        }).pipe(
          Effect.withSpan("notification.getUserNotifications", {
            attributes: { userId, limit },
          })
        ),

      getUserNotificationsPaginated: (userId: string, page = 1, limit = 10) =>
        Effect.gen(function* () {
          const skip = (page - 1) * limit;

          const [notifications, total] = yield* Effect.tryPromise({
            try: () =>
              Promise.all([
                prisma.notification.findMany({
                  where: { userId },
                  orderBy: { createdAt: "desc" },
                  take: limit,
                  skip,
                }),
                prisma.notification.count({
                  where: { userId },
                }),
              ]),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "get paginated notifications",
              }),
          }).pipe(
            Effect.withSpan("notification.query-paginated", {
              attributes: { userId, page, limit, skip },
            })
          );

          const hasMore = skip + notifications.length < total;

          return {
            notifications,
            pagination: {
              page,
              limit,
              total,
              hasMore,
            },
          };
        }).pipe(
          Effect.withSpan("notification.getUserNotificationsPaginated", {
            attributes: { userId, page, limit },
          })
        ),

      markAsRead: (userId: string, notificationId: number) =>
        Effect.gen(function* () {
          // First check if the notification exists
          const notification = yield* Effect.tryPromise({
            try: () =>
              prisma.notification.findUnique({
                where: { id: notificationId },
                select: { userId: true },
              }),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "find notification for mark as read",
              }),
          }).pipe(
            Effect.withSpan("notification.find-for-mark-read", {
              attributes: { userId, notificationId },
            })
          );

          if (!notification) {
            return yield* new NotFoundError({
              resource: "notification",
              resourceId: notificationId.toString(),
            });
          }

          if (notification.userId !== userId) {
            return yield* new UnauthorizedError({
              userId,
              resource: `notification:${notificationId}`,
              reason: "Access denied - notification belongs to another user",
            });
          }

          yield* Effect.tryPromise({
            try: () =>
              prisma.notification.update({
                where: { id: notificationId },
                data: { read: true },
              }),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "mark notification as read",
              }),
          }).pipe(
            Effect.withSpan("notification.update-read-status", {
              attributes: { userId, notificationId },
            })
          );
        }).pipe(
          Effect.withSpan("notification.markAsRead", {
            attributes: { userId, notificationId },
          })
        ),

      markAllAsRead: (userId: string) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              prisma.notification.updateMany({
                where: { userId, read: false },
                data: { read: true },
              }),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "mark all notifications as read",
              }),
          }).pipe(
            Effect.withSpan("notification.update-all-read", {
              attributes: { userId },
            })
          );
        }).pipe(
          Effect.withSpan("notification.markAllAsRead", {
            attributes: { userId },
          })
        ),

      deleteNotification: (userId: string, notificationId: number) =>
        Effect.gen(function* () {
          // First check if the notification exists
          const notification = yield* Effect.tryPromise({
            try: () =>
              prisma.notification.findUnique({
                where: { id: notificationId },
                select: { userId: true },
              }),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "find notification for deletion",
              }),
          }).pipe(
            Effect.withSpan("notification.find-for-deletion", {
              attributes: { userId, notificationId },
            })
          );

          if (!notification) {
            return yield* new NotFoundError({
              resource: "notification",
              resourceId: notificationId.toString(),
            });
          }

          if (notification.userId !== userId) {
            return yield* new UnauthorizedError({
              userId,
              resource: `notification:${notificationId}`,
              reason: "Access denied - notification belongs to another user",
            });
          }

          yield* Effect.tryPromise({
            try: () =>
              prisma.notification.delete({
                where: { id: notificationId },
              }),
            catch: (cause) =>
              new DatabaseError({
                cause,
                operation: "delete notification",
              }),
          }).pipe(
            Effect.withSpan("notification.delete", {
              attributes: { userId, notificationId },
            })
          );
        }).pipe(
          Effect.withSpan("notification.deleteNotification", {
            attributes: { userId, notificationId },
          })
        ),
    };

    return service;
  });
}

// Production Layer driven by prisma
export const layerFromPrisma = Layer.effect(
  NotificationService,
  createService({ prisma })
);

export function layer() {
  return layerFromPrisma;
}

// Runtime for Promise-based usage
export const notificationRuntime = ManagedRuntime.make(layer());

/**
 * Simplified notification service that wraps Effect complexity behind a clean Promise-based API.
 *
 * This follows the service pattern where Effects are composed internally but exposed
 * as simple Promise-returning functions for easy consumption.
 */
export const notifications = {
  createInAppNotification: (notification: InAppNotification) =>
    notificationRuntime.runPromise(
      NotificationService.pipe(
        Effect.flatMap((service) =>
          service.createInAppNotification(notification)
        )
      )
    ),

  getUserNotifications: (userId: string, limit?: number) =>
    notificationRuntime.runPromise(
      NotificationService.pipe(
        Effect.flatMap((service) => service.getUserNotifications(userId, limit))
      )
    ),

  getUserNotificationsPaginated: (userId: string, page = 1, limit = 10) =>
    notificationRuntime.runPromise(
      NotificationService.pipe(
        Effect.flatMap((service) =>
          service.getUserNotificationsPaginated(userId, page, limit)
        )
      )
    ),

  markAsRead: (userId: string, notificationId: number) =>
    notificationRuntime.runPromise(
      NotificationService.pipe(
        Effect.flatMap((service) => service.markAsRead(userId, notificationId))
      )
    ),

  markAllAsRead: (userId: string) =>
    notificationRuntime.runPromise(
      NotificationService.pipe(
        Effect.flatMap((service) => service.markAllAsRead(userId))
      )
    ),

  deleteNotification: (userId: string, notificationId: number) =>
    notificationRuntime.runPromise(
      NotificationService.pipe(
        Effect.flatMap((service) =>
          service.deleteNotification(userId, notificationId)
        )
      )
    ),
} as const;

// Re-export types for consumers
export type { InAppNotification, PaginatedNotifications };

// Re-export error types for API routes
export {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  UserNotFoundError,
  ValidationError,
} from "./errors";

// Re-export types for advanced users
export type { Notification } from "@prisma/client";
