import type { Notification } from "@prisma/client";

export type InAppNotification = {
  userId: string;
  title: string;
  description: string;
  href?: string;
};

export type PaginatedNotifications = {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};
