import { SearchParams } from "@/types/next";
import prisma from "@/lib/prisma";
import { EditScrimForm } from "@/components/scrim/edit-scrim-form";
import { Search } from "@/components/dashboard/search";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import { MainNav } from "@/components/dashboard/main-nav";
import Link from "next/link";
import { DangerZone } from "@/components/scrim/danger-zone";
import { getScrim } from "@/data/scrim-dto";
import { MobileNav } from "@/components/mobile-nav";
import { auth } from "@/lib/auth";

type Props = {
  params: { team: string; scrimId: string };
  searchParams: SearchParams;
};

export default async function EditScrimPage({ params }: Props) {
  const scrim = await getScrim(parseInt(params.scrimId));
  const session = await auth();

  if (!scrim) {
    return <div>Scrim not found</div>;
  }

  return (
    <div className="flex-col md:flex min-h-[90vh]">
      <div className="border-b">
        <div className="hidden md:flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <ModeToggle />
            <UserNav />
          </div>
        </div>
        <div className="flex md:hidden h-16 items-center px-4">
          <MobileNav session={session} />
          <div className="ml-auto flex items-center space-x-4">
            <ModeToggle />
            <UserNav />
          </div>
        </div>
      </div>
      <main className="container py-2">
        <h4 className="text-gray-600 dark:text-gray-400 pb-2">
          <Link href={`/${params.team}/scrim/${params.scrimId}`}>
            &larr; Back to scrim
          </Link>
        </h4>

        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight pb-2">
          Edit Scrim Details
        </h3>

        <EditScrimForm scrim={scrim} />

        <div className="p-4" />

        <DangerZone scrim={scrim} />
      </main>
    </div>
  );
}
