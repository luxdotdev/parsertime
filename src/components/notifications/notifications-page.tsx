"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bell, Loader2, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function NotificationsPage() {
  const {
    notifications,
    isLoading,
    isError,
    isFetchingNextPage,
    isMarkingAllAsRead,
    loadingOperations,
    hasNextPage,
    loadMoreRef,
    handleMarkAllAsRead,
    handleMarkAsRead,
    handleDelete,
  } = useNotifications();

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;
  const hasUnread = unreadCount > 0;

  const t = useTranslations("notifications");
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {hasUnread && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllAsRead}
            className="ml-auto"
          >
            {isMarkingAllAsRead ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("marking-all-as-read")}
              </>
            ) : (
              t("mark-all-as-read")
            )}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("unread-notifications", { count: unreadCount })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : isError ? (
            <div className="text-muted-foreground flex h-64 items-center justify-center text-center">
              <div>
                <p className="text-lg font-medium">{t("error-loading")}</p>
                <p className="text-sm">{t("error-loading-description")}</p>
              </div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  isLoading={loadingOperations[notification.id]}
                />
              ))}
              {hasNextPage && (
                <div
                  ref={loadMoreRef}
                  className="flex h-20 items-center justify-center"
                >
                  {isFetchingNextPage && (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground flex h-64 items-center justify-center text-center">
              <div>
                <Bell className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-4 text-lg font-medium">
                  {t("no-notifications")}
                </p>
                <p className="text-sm">{t("no-notifications-description")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type NotificationItemProps = {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  isLoading?: { markAsRead: boolean; delete: boolean };
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  isLoading,
}: NotificationItemProps) {
  const t = useTranslations("notifications");
  const router = useRouter();

  function handleMarkAsRead(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!notification.read && !isLoading?.markAsRead) {
      onMarkAsRead(notification.id);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading?.delete) {
      onDelete(notification.id);
    }
  }

  function handleNotificationClick() {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.href) {
      router.push(notification.href as Route);
    }
  }

  return (
    <div
      className={cn(
        "group hover:bg-muted/50 relative p-6 transition-colors",
        !notification.read && "bg-muted/30"
      )}
    >
      <div
        className="flex cursor-pointer flex-col gap-2"
        onClick={handleNotificationClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleNotificationClick();
          }
        }}
        tabIndex={0}
        role="button"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-semibold">
                {notification.title}
              </h3>
              {!notification.read && (
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {notification.description}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMarkAsRead}
                disabled={isLoading?.markAsRead}
                title={t("mark-as-read")}
              >
                {isLoading?.markAsRead ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="bg-muted-foreground h-2 w-2 rounded-full" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8"
              onClick={handleDelete}
              disabled={isLoading?.delete}
              title={t("delete")}
            >
              {isLoading?.delete ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="text-muted-foreground text-xs">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
