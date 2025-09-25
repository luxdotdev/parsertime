import { Logger } from "@/lib/logger";
import {
  createNotificationForCurrentUser,
  createNotificationForUser,
  deleteNotification,
  fetchNotifications as fetchNotificationsAPI,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications/client-utils";
import type { InAppNotification } from "@/lib/notifications/types";
import {
  notificationsStore,
  selectHasUnread,
  selectUnreadCount,
} from "@/stores/notifications-store";
import type { Notification } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@xstate/store/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type NotificationResponse = {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

export function useNotifications() {
  const t = useTranslations("notifications");
  const queryClient = useQueryClient();
  const [loadMoreElement, setLoadMoreElement] = useState<HTMLDivElement | null>(
    null
  );
  const [hasInitialized, setHasInitialized] = useState(false);

  // Subscribe to store state
  const notifications = useSelector(
    notificationsStore,
    (state) => state.context.notifications
  );
  const pagination = useSelector(
    notificationsStore,
    (state) => state.context.pagination
  );
  const isLoading = useSelector(
    notificationsStore,
    (state) => state.context.isLoading
  );
  const isError = useSelector(
    notificationsStore,
    (state) => state.context.isError
  );
  const isFetchingNextPage = useSelector(
    notificationsStore,
    (state) => state.context.isFetchingNextPage
  );
  const isMarkingAllAsRead = useSelector(
    notificationsStore,
    (state) => state.context.isMarkingAllAsRead
  );
  const loadingOperations = useSelector(
    notificationsStore,
    (state) => state.context.loadingOperations
  );

  // Derived state
  const unreadCount = useSelector(notificationsStore, (state) =>
    selectUnreadCount(state.context)
  );
  const hasUnread = useSelector(notificationsStore, (state) =>
    selectHasUnread(state.context)
  );
  const hasNextPage = pagination?.hasMore ?? false;

  // Fetch notifications function - now using client utilities
  const fetchNotifications = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (!append) {
          notificationsStore.trigger.setLoading({ isLoading: true });
        } else {
          notificationsStore.trigger.setFetchingNextPage({
            isFetchingNextPage: true,
          });
        }

        const data = (await fetchNotificationsAPI(
          page,
          10
        )) as NotificationResponse;

        if (append) {
          notificationsStore.trigger.appendNotifications({
            notifications: data.notifications,
            pagination: data.pagination,
          });
        } else {
          notificationsStore.trigger.setNotifications({
            notifications: data.notifications,
            pagination: data.pagination,
          });
        }

        setHasInitialized(true);
      } catch (error) {
        Logger.error("Failed to fetch notifications:", error);
        notificationsStore.trigger.setError({ isError: true });
      } finally {
        if (!append) {
          notificationsStore.trigger.setLoading({ isLoading: false });
        } else {
          notificationsStore.trigger.setFetchingNextPage({
            isFetchingNextPage: false,
          });
        }
      }
    },
    []
  );

  // Fetch next page - simplified without dependencies
  const fetchNextPage = useCallback(async () => {
    const currentPagination =
      notificationsStore.getSnapshot().context.pagination;
    const currentIsFetching =
      notificationsStore.getSnapshot().context.isFetchingNextPage;

    if (!currentPagination?.hasMore || currentIsFetching) {
      return;
    }

    await fetchNotifications(currentPagination.page + 1, true);
  }, [fetchNotifications]);

  // Initialize notifications on mount
  useEffect(() => {
    if (!hasInitialized && !isLoading && !isError) {
      void fetchNotifications();
    }
  }, [hasInitialized, isLoading, isError, fetchNotifications]);

  // Create a callback ref function
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    setLoadMoreElement(node);
  }, []);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreElement || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const currentPagination =
              notificationsStore.getSnapshot().context.pagination;
            const currentIsFetching =
              notificationsStore.getSnapshot().context.isFetchingNextPage;

            if (currentPagination?.hasMore && !currentIsFetching) {
              void fetchNextPage();
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "20px",
      }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.unobserve(loadMoreElement);
    };
  }, [fetchNextPage, hasNextPage, loadMoreElement]);

  // Mark all as read - now using client utilities
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      notificationsStore.trigger.setMarkingAllAsRead({
        isMarkingAllAsRead: true,
      });

      await markAllNotificationsAsRead();

      notificationsStore.trigger.markAllAsRead();
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      Logger.error("Failed to mark all notifications as read:", error);
      toast.error(t("mark-all-as-read-error"));
    } finally {
      notificationsStore.trigger.setMarkingAllAsRead({
        isMarkingAllAsRead: false,
      });
    }
  }, [t, queryClient]);

  // Mark as read - now using client utilities
  const handleMarkAsRead = useCallback(
    async (id: number) => {
      try {
        notificationsStore.trigger.setOperationLoading({
          id,
          operation: "markAsRead",
          isLoading: true,
        });

        await markNotificationAsRead(id);

        notificationsStore.trigger.updateNotification({
          id,
          updates: { read: true },
        });
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch (error) {
        Logger.error("Failed to mark notification as read:", error);
        toast.error(t("mark-as-read-error"));
      } finally {
        notificationsStore.trigger.setOperationLoading({
          id,
          operation: "markAsRead",
          isLoading: false,
        });
      }
    },
    [t, queryClient]
  );

  // Delete notification - now using client utilities
  const handleDelete = useCallback(
    async (id: number) => {
      try {
        notificationsStore.trigger.setOperationLoading({
          id,
          operation: "delete",
          isLoading: true,
        });

        await deleteNotification(id);

        notificationsStore.trigger.removeNotification({ id });
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch (error) {
        Logger.error("Failed to delete notification:", error);
        toast.error(t("delete-error"));
      } finally {
        notificationsStore.trigger.setOperationLoading({
          id,
          operation: "delete",
          isLoading: false,
        });
      }
    },
    [t, queryClient]
  );

  // Create notification for specific user
  const createNotificationForTargetUser = useCallback(
    async (userId: string, notification: Omit<InAppNotification, "userId">) => {
      try {
        await createNotificationForUser(userId, notification);
        // Optionally refresh notifications if creating for current user
        // This could be enhanced to check if the target user is the current user
        toast.success(t("notification-created"));
      } catch (error) {
        Logger.error("Failed to create notification:", error);
        toast.error(t("create-notification-error"));
        throw error;
      }
    },
    [t]
  );

  // Create notification for current session user
  const createNotificationForSelf = useCallback(
    async (notification: Omit<InAppNotification, "userId">) => {
      try {
        await createNotificationForCurrentUser(notification);
        // Refresh notifications since we just created one for ourselves
        void fetchNotifications(1, false);
        toast.success(t("notification-created"));
      } catch (error) {
        Logger.error("Failed to create notification:", error);
        toast.error(t("create-notification-error"));
        throw error;
      }
    },
    [t, fetchNotifications]
  );

  return {
    // Data
    notifications,
    unreadCount,
    hasUnread,

    // Loading states
    isLoading,
    isError,
    isFetchingNextPage,
    isMarkingAllAsRead,
    loadingOperations,

    // Pagination
    hasNextPage,
    loadMoreRef,

    // Actions
    handleMarkAllAsRead,
    handleMarkAsRead,
    handleDelete,

    // Creation actions
    createNotificationForTargetUser,
    createNotificationForSelf,

    // Manual actions
    fetchNotifications,
    fetchNextPage,
  };
}
