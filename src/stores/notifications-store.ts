import type { Notification } from "@prisma/client";
import { createStore } from "@xstate/store";

type NotificationContext = {
  // Data
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  } | null;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  isMarkingAllAsRead: boolean;
  loadingOperations: Record<
    string,
    {
      markAsRead: boolean;
      delete: boolean;
    }
  >;

  // UI state
  isPopoverOpen: boolean;
  hasInitialized: boolean;
};

export const notificationsStore = createStore({
  context: {
    notifications: [],
    pagination: null,
    isLoading: false,
    isError: false,
    isFetchingNextPage: false,
    isMarkingAllAsRead: false,
    loadingOperations: {},
    isPopoverOpen: false,
    hasInitialized: false,
  } satisfies NotificationContext,
  on: {
    // Data operations
    setNotifications: (
      context: NotificationContext,
      event: {
        notifications: Notification[];
        pagination: NotificationContext["pagination"];
      }
    ) => ({
      ...context,
      notifications: event.notifications,
      pagination: event.pagination,
      hasInitialized: true,
    }),

    appendNotifications: (
      context: NotificationContext,
      event: {
        notifications: Notification[];
        pagination: NotificationContext["pagination"];
      }
    ) => ({
      ...context,
      notifications: [...context.notifications, ...event.notifications],
      pagination: event.pagination,
    }),

    updateNotification: (
      context: NotificationContext,
      event: { id: number; updates: Partial<Notification> }
    ) => ({
      ...context,
      notifications: context.notifications.map((notification: Notification) =>
        notification.id === event.id
          ? { ...notification, ...event.updates }
          : notification
      ),
    }),

    removeNotification: (
      context: NotificationContext,
      event: { id: number }
    ) => ({
      ...context,
      notifications: context.notifications.filter(
        (notification: Notification) => notification.id !== event.id
      ),
    }),

    markAllAsRead: (context: NotificationContext) => ({
      ...context,
      notifications: context.notifications.map(
        (notification: Notification) => ({
          ...notification,
          read: true,
        })
      ),
    }),

    // Loading states
    setLoading: (
      context: NotificationContext,
      event: { isLoading: boolean }
    ) => ({
      ...context,
      isLoading: event.isLoading,
      isError: false,
    }),

    setError: (context: NotificationContext, event: { isError: boolean }) => ({
      ...context,
      isError: event.isError,
      isLoading: false,
    }),

    setFetchingNextPage: (
      context: NotificationContext,
      event: { isFetchingNextPage: boolean }
    ) => ({
      ...context,
      isFetchingNextPage: event.isFetchingNextPage,
    }),

    setMarkingAllAsRead: (
      context: NotificationContext,
      event: { isMarkingAllAsRead: boolean }
    ) => ({
      ...context,
      isMarkingAllAsRead: event.isMarkingAllAsRead,
    }),

    setOperationLoading: (
      context: NotificationContext,
      event: {
        id: number;
        operation: "markAsRead" | "delete";
        isLoading: boolean;
      }
    ) => ({
      ...context,
      loadingOperations: {
        ...context.loadingOperations,
        [event.id]: {
          markAsRead:
            event.operation === "markAsRead"
              ? event.isLoading
              : (context.loadingOperations[event.id]?.markAsRead ?? false),
          delete:
            event.operation === "delete"
              ? event.isLoading
              : (context.loadingOperations[event.id]?.delete ?? false),
        },
      },
    }),

    clearOperationLoading: (
      context: NotificationContext,
      event: { id: number }
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [event.id]: _removed, ...remaining } = context.loadingOperations;
      return {
        ...context,
        loadingOperations: remaining,
      };
    },

    // UI state
    setPopoverOpen: (
      context: NotificationContext,
      event: { isOpen: boolean }
    ) => ({
      ...context,
      isPopoverOpen: event.isOpen,
    }),
  },
});

// Selectors
export const selectUnreadCount = (state: NotificationContext) =>
  state.notifications.filter((notification) => !notification.read).length;

export const selectHasUnread = (state: NotificationContext) =>
  selectUnreadCount(state) > 0;

export const selectNotificationLoadingState = (
  state: NotificationContext,
  id: number
) => state.loadingOperations[id] ?? { markAsRead: false, delete: false };
