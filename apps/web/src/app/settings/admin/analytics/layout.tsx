import { NoAuthCard } from "@/components/auth/no-auth";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { $Enums } from "@/generated/prisma/browser";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { SettingsAdminAnalyticsSkeleton } from "./loading-skeleton";

export default function AdminAnalyticsLayout({
  children,
}: LayoutProps<"/settings/admin/analytics">) {
  return (
    <Suspense fallback={<SettingsAdminAnalyticsSkeleton />}>
      <AdminAnalyticsGate>{children}</AdminAnalyticsGate>
    </Suspense>
  );
}

async function AdminAnalyticsGate({ children }: { children: ReactNode }) {
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
