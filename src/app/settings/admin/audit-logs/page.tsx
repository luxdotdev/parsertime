import { AuditLog } from "@/components/admin/audit-log";
import { NoAuthCard } from "@/components/auth/no-auth";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function AuditLogsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

  if (!user) {
    redirect("/sign-up");
  }

  if (user.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  return (
    <main className="py-6">
      <AuditLog limit={25} height="max-h-[75vh]" />
    </main>
  );
}
