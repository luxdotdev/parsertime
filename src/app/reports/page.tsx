import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReportsList } from "./reports-list";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) redirect("/sign-in");

  const reports = await prisma.chatReport.findMany({
    where: { userId: userData.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return <ReportsList reports={reports} />;
}
