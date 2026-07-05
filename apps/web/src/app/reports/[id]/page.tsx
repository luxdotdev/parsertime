import { MessageResponse } from "@/components/ai-elements/message";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    return { title: "Report | Parsertime" };
  }

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) {
    return { title: "Report | Parsertime" };
  }

  const report = await prisma.chatReport.findUnique({
    where: { id },
    select: { title: true, userId: true },
  });

  return {
    title:
      report?.userId === userData.id
        ? `${report.title} | Parsertime`
        : "Report | Parsertime",
  };
}

// Static shell: the page frame prerenders and the report (title included —
// it comes from the database) streams into ONE boundary whose fallback
// mirrors the loaded header + prose layout.
export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<ReportSkeleton />}>
        <ReportContent params={params} />
      </Suspense>
    </div>
  );
}

async function ReportContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) redirect("/sign-in");

  const report = await prisma.chatReport.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });

  if (!report) notFound();
  if (report.userId !== userData.id) notFound();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          By {report.user.name ?? "Unknown"} &middot;{" "}
          {report.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <article className="prose prose-sm dark:prose-invert max-w-none">
        <MessageResponse>{report.content}</MessageResponse>
      </article>
    </>
  );
}

// Mirrors the loaded state: title + byline header, then prose paragraphs.
function ReportSkeleton() {
  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="space-y-6">
        {["a", "b", "c"].map((k) => (
          <div key={k} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
        <Skeleton className="h-5 w-36" />
        {["d", "e"].map((k) => (
          <div key={k} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </>
  );
}
