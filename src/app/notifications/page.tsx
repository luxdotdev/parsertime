import { NotificationsPage } from "@/components/notifications/notifications-page";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { unauthorized } from "next/navigation";

export default async function Notifications() {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) unauthorized();

  return <NotificationsPage />;
}
