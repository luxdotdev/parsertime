import { MessageResponse } from "@/components/ai-elements/message";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await prisma.chatReport.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: report ? `${report.title} | Parsertime` : "Report | Parsertime",
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
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
    </div>
  );
}
