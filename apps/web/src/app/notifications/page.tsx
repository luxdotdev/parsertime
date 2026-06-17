import { NotificationsPage } from "@/components/notifications/notifications-page";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { unauthorized } from "next/navigation";

export default async function Notifications() {
  const session = await auth();
  if (!session) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  return <NotificationsPage />;
}
