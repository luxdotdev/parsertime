import { NoAuthCard } from "@/components/auth/no-auth";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { $Enums } from "@prisma/client";

export default async function AdminLayout({
  children,
}: LayoutProps<"/settings/admin/audit-logs">) {
  const session = await auth();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  if (user?.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  // Must be wrapped in an element due to Next.js Server Component typing
  // oxlint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
