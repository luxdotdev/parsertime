import type { InAppNotification } from "./types";

/**
 * Client-side utilities for working with notifications
 * These are convenience functions that wrap the API calls
 */

/**
 * Create a notification with an explicit user ID.
 * This is the recommended way to create notifications
 */
export async function createNotificationForUser(
  userId: string,
  notification: Omit<InAppNotification, "userId">
): Promise<void> {
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...notification,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create notification");
  }
}

/**
 * Create a notification for the current session user.
 * Uses session-based user determination.
 */
export async function createNotificationForCurrentUser(
  notification: Omit<InAppNotification, "userId">
): Promise<void> {
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    throw new Error("Failed to create notification");
  }
}

export async function fetchNotifications(page = 1, limit = 10) {
  const response = await fetch(
    `/api/notifications?page=${page}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

export async function markNotificationAsRead(id: number): Promise<void> {
  const response = await fetch("/api/notifications/mark-read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch("/api/notifications/mark-read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ all: true }),
  });

  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }
}

export async function deleteNotification(id: number): Promise<void> {
  const response = await fetch(`/api/notifications?id=${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete notification");
  }
}
