import { NoAuthCard } from "@/components/auth/no-auth";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { $Enums } from "@/generated/prisma/browser";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { SettingsAdminImpersonateUserSkeleton } from "./loading-skeleton";

export default function AdminLayout({
  children,
}: LayoutProps<"/settings/admin/impersonate-user">) {
  return (
    <Suspense fallback={<SettingsAdminImpersonateUserSkeleton />}>
      <AdminImpersonateUserGate>{children}</AdminImpersonateUserGate>
    </Suspense>
  );
}

async function AdminImpersonateUserGate({ children }: { children: ReactNode }) {
  const session = await auth();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  if (user?.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  // Must be wrapped in an element due to Next.js Server Component typing

  return <div className="lg:max-w-2xl">{children}</div>;
}
