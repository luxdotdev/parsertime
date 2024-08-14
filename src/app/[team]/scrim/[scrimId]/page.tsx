import { AddMapCard } from "@/components/map/add-map";
import { Search } from "@/components/dashboard/search";
import { ModeToggle } from "@/components/theme-switcher";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UserNav } from "@/components/user-nav";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toKebabCase } from "@/lib/utils";
import { SearchParams } from "@/types/next";
import { $Enums } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import {
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";
import { getUser } from "@/data/user-dto";
import { getScrim } from "@/data/scrim-dto";
import { MobileNav } from "@/components/mobile-nav";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GuestNav } from "@/components/guest-nav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClientDate } from "@/components/scrim/client-date";
import { notFound } from "next/navigation";

type Props = {
  params: { team: string; scrimId: string };
  searchParams: SearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const scrimId = decodeURIComponent(params.scrimId);

  const scrim = await prisma.scrim.findFirst({
    where: {
      id: parseInt(scrimId),
    },
    select: {
      name: true,
    },
  });

  const scrimName = scrim?.name ?? "Scrim";

  return {
    title: `${scrimName} Overview | Parsertime`,
    description: `Overview for ${scrimName} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
    openGraph: {
      title: `${scrimName} Overview | Parsertime`,
      description: `Overview for ${scrimName} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${scrimName} Overview`,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_US",
    },
  };
}

export default async function ScrimDashboardPage({ params }: Props) {
  const id = parseInt(params.scrimId);
  const session = await auth();

  const scrim = await getScrim(id);
  if (!scrim) notFound();

  const maps = (
    await prisma.map.findMany({
      where: {
        scrimId: id,
      },
    })
  ).sort((a, b) => a.id - b.id);

  const user = await getUser(session?.user?.email);

  const isManager =
    (await prisma.teamManager.findFirst({
      where: {
        teamId: scrim?.teamId ?? 0,
        userId: user?.id,
      },
    })) !== null && session !== null;

  const hasPerms =
    user?.id === scrim?.creatorId ||
    isManager ||
    user?.role === $Enums.UserRole.MANAGER ||
    user?.role === $Enums.UserRole.ADMIN;

  const visibility = (await prisma.scrim.findFirst({
    where: {
      id: parseInt(params.scrimId),
    },
    select: {
      guestMode: true,
    },
  })) ?? { guestMode: false };

  return (
    <div className="min-h-[90vh] flex-col md:flex">
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <div className="ml-auto flex items-center space-x-4">
            <Search user={user} />
            <ModeToggle />
            {session ? (
              <UserNav />
            ) : (
              <GuestNav guestMode={visibility.guestMode} />
            )}
          </div>
        </div>
      </div>
      <div className="flex h-16 items-center px-4 md:hidden">
        <MobileNav session={session} />
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          {session ? (
            <UserNav />
          ) : (
            <GuestNav guestMode={visibility.guestMode} />
          )}
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h4 className="text-gray-600 dark:text-gray-400">
          <Link href="/dashboard">&larr; Back to dashboard</Link>
        </h4>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            <span className="flex items-center space-x-2">
              {scrim?.name ?? "New Scrim"}{" "}
              {hasPerms && (
                <Link
                  className="pl-2"
                  href={`/${params.team}/scrim/${params.scrimId}/edit`}
                  aria-label="Edit scrim"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Pencil2Icon className="h-6 w-6" />
                      </TooltipTrigger>
                      <TooltipContent>Edit scrim</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Link>
              )}
            </span>
          </h2>
        </div>
        <h4 className="scroll-m-20 pb-4 text-xl font-semibold tracking-tight">
          <ClientDate date={scrim.date} />
        </h4>
        <p className="scroll-m-20 pb-2 text-2xl font-semibold tracking-tight">
          Maps
        </p>
        {maps.length > 0 ? (
          <div className="-m-2 flex flex-wrap">
            {maps.map((map) => (
              <div key={map.id} className="w-full p-2 md:w-1/3">
                <Card className="relative h-48 max-w-md bg-cover">
                  <Link
                    href={`/${params.team}/scrim/${params.scrimId}/map/${map.id}`}
                  >
                    <CardHeader className="">
                      <h3 className="z-10 text-3xl font-semibold tracking-tight text-white">
                        {map.name}
                        <div className="text-lg">{map.replayCode ?? ""}</div>
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <Image
                        src={`/maps/${toKebabCase(map.name)}.webp`}
                        alt={`The loading screen art for ${map.name}.`}
                        fill
                        className="rounded-md object-cover brightness-[0.65]"
                      />
                    </CardContent>
                  </Link>
                </Card>
              </div>
            ))}
            {hasPerms && <AddMapCard />}
          </div>
        ) : (
          <>
            <Alert variant="destructive" className="max-w-xl">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>
                No maps have been added to this scrim yet!
              </AlertTitle>
              <AlertDescription>
                Add maps to this scrim to start analyzing your games. If no maps
                are added, the scrim will automatically be deleted within 24
                hours. Need help?{" "}
                <Link href="https://docs.parsertime.app" target="_blank">
                  <span className="underline">Check out the documentation</span>{" "}
                  <ExternalLinkIcon className="inline h-4 w-4" />
                </Link>
                .
              </AlertDescription>
            </Alert>
            <div>{hasPerms && <AddMapCard />}</div>
          </>
        )}
      </div>
    </div>
  );
}
