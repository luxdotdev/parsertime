import { NotificationsPage } from "@/components/notifications/notifications-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { getStaticTranslations } from "@/lib/metadata-i18n";
import { Bell, Loader2 } from "lucide-react";
import { unauthorized } from "next/navigation";
import { Suspense } from "react";

// Static shell: the auth-gated content streams into ONE boundary whose
// fallback mirrors NotificationsPage's own pending layout (header row, card
// with the zero-count title, h-64 spinner well), so navigation shows a
// single, stable loading state that the client component replaces in place.
export default function Notifications() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsContent />
    </Suspense>
  );
}

async function NotificationsContent() {
  const session = await auth();
  if (!session) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  return <NotificationsPage />;
}

function NotificationsSkeleton() {
  const t = getStaticTranslations("notifications");

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("unread-notifications", { count: 0 })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
