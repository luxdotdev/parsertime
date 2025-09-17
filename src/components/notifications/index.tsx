"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Bell, Loader2, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function Notifications() {
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
    fetchNotifications,
  } = useNotifications();

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;
  const hasUnread = unreadCount > 0;

  const t = useTranslations("notifications");

  function handleBellClick() {
    void fetchNotifications(1, false);
  }

  return (
    <div className="relative">
      <Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                  onClick={handleBellClick}
                >
                  <Bell className="h-5 w-5" />
                  {hasUnread && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">
                    {hasUnread
                      ? t("notifications", { count: unreadCount })
                      : t("title")}
                  </span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("unread-notifications", { count: unreadCount })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="border-border flex items-center justify-between border-b p-4">
            <h3 className="font-medium">{t("title")}</h3>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                {isMarkingAllAsRead ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {t("marking-all-as-read")}
                  </>
                ) : (
                  t("mark-all-as-read")
                )}
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isError ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              {t("error-loading")}
            </div>
          ) : notifications.length > 0 ? (
            <ScrollArea className="h-[calc(80vh-8rem)] max-h-[420px]">
              <div className="flex flex-col">
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
            </ScrollArea>
          ) : (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              {t("no-notifications")}
            </div>
          )}
          <div className="border-border border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground w-full justify-center text-xs"
            >
              {t("view-all-notifications")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
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
    if (!notification.read && !isLoading?.markAsRead) {
      onMarkAsRead(notification.id);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!isLoading?.delete) {
      onDelete(notification.id);
    }
  }

  return (
    <div
      className={cn(
        "group border-border hover:bg-muted/50 relative flex flex-col gap-1 border-b p-4 last:border-0",
        !notification.read && "bg-muted/30"
      )}
    >
      <Link
        href={(notification.href as Route) ?? "#"}
        external={notification.href?.startsWith("http")}
        className="flex flex-col gap-1"
        onClick={(e) => {
          e.preventDefault();
          handleMarkAsRead(e);
          router.push((notification.href as Route) ?? "#");
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium">{notification.title}</span>
          {!notification.read && (
            <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {notification.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </span>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleMarkAsRead}
                disabled={isLoading?.markAsRead}
                title={t("mark-as-read")}
              >
                {isLoading?.markAsRead ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="bg-muted-foreground h-2 w-2 rounded-full" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-6 w-6"
              onClick={handleDelete}
              disabled={isLoading?.delete}
              title={t("delete")}
            >
              {isLoading?.delete ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
}
