import DashboardLayout from "@/components/dashboard-layout";
import { DangerZone } from "@/components/scrim/danger-zone";
import { EditScrimForm } from "@/components/scrim/edit-scrim-form";
import { getScrim } from "@/data/scrim-dto";
import { getTeamsWithPerms } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SearchParams } from "@/types/next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type Props = {
  params: Promise<{ team: string; scrimId: string }>;
  searchParams: SearchParams;
};

export default async function EditScrimPage(
  props: PageProps<"/[team]/scrim/[scrimId]/edit">
) {
  const params = await props.params;
  const scrim = await getScrim(parseInt(params.scrimId));
  const session = await auth();
  const t = await getTranslations("scrimPage.editScrim");

  if (!scrim) {
    return <div>Scrim not found</div>;
  }

  const teamsWithPerms = await getTeamsWithPerms(session?.user?.email);

  const maps = (
    await prisma.map.findMany({
      where: {
        scrimId: scrim.id,
      },
    })
  ).sort((a, b) => a.id - b.id);

  return (
    <DashboardLayout>
      <main className="container py-2">
        <h4 className="pb-2 text-gray-600 dark:text-gray-400">
          <Link href={`/${params.team}/scrim/${params.scrimId}`}>
            &larr; {t("back")}
          </Link>
        </h4>

        <h3 className="scroll-m-20 pb-2 text-2xl font-semibold tracking-tight">
          {t("title")}
        </h3>

        <EditScrimForm scrim={scrim} teams={teamsWithPerms} maps={maps} />

        <div className="p-4" />

        <DangerZone scrim={scrim} />
      </main>
    </DashboardLayout>
  );
}
