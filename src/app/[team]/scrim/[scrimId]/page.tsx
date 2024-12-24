import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AddMapCard } from "@/components/map/add-map";
import { MobileNav } from "@/components/mobile-nav";
import { ClientDate } from "@/components/scrim/client-date";
import { ReplayCode } from "@/components/scrim/replay-code";
import { ModeToggle } from "@/components/theme-switcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserNav } from "@/components/user-nav";
import { getScrim } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toKebabCase } from "@/lib/utils";
import { SearchParams } from "@/types/next";
import { $Enums } from "@prisma/client";
import { ExclamationTriangleIcon, Pencil2Icon } from "@radix-ui/react-icons";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

type Props = {
  params: { team: string; scrimId: string; locale: string };
  searchParams: SearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "scrimPage.metadata",
  });
  const scrimId = decodeURIComponent(params.scrimId);

  const scrim = await prisma.scrim.findFirst({
    where: {
      id: parseInt(scrimId),
    },
    select: {
      name: true,
    },
  });

  const scrimName = scrim?.name ?? t("scrim");

  return {
    title: t("title", { scrimName }),
    description: t("description", { scrimName }),
    openGraph: {
      title: t("ogTitle", { scrimName }),
      description: t("ogDescription", { scrimName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", { scrimName })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function ScrimDashboardPage({ params }: Props) {
  const id = parseInt(params.scrimId);
  const session = await auth();
  const t = await getTranslations("scrimPage");

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
      <div className="flex h-16 items-center px-4 md:hidden">
        <MobileNav session={session} />
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <LocaleSwitcher />
          {session ? (
            <UserNav />
          ) : (
            <GuestNav guestMode={visibility.guestMode} />
          )}
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h4 className="text-gray-600 dark:text-gray-400">
          <Link href="/dashboard">&larr; {t("back")}</Link>
        </h4>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            <span className="flex items-center space-x-2">
              {scrim?.name ?? t("newScrim")}{" "}
              {hasPerms && (
                <Link
                  className="pl-2"
                  href={`/${params.team}/scrim/${params.scrimId}/edit`}
                  aria-label={t("edit")}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Pencil2Icon className="h-6 w-6" />
                      </TooltipTrigger>
                      <TooltipContent>{t("edit")}</TooltipContent>
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
          {t("maps.title")}
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
                        {t(`maps.${toKebabCase(map.name)}`)}
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <Image
                        src={`/maps/${toKebabCase(map.name)}.webp`}
                        alt={t("maps.altText", {
                          map: t(`maps.${toKebabCase(map.name)}`),
                        })}
                        fill
                        className="select-none rounded-md object-cover brightness-[0.65]"
                      />
                    </CardContent>
                  </Link>
                  <CardFooter className="float-right flex items-center justify-between pt-10">
                    <div className="z-10 font-semibold tracking-tight text-white">
                      <ReplayCode replayCode={map.replayCode ?? ""} />
                    </div>
                  </CardFooter>
                </Card>
              </div>
            ))}
            {hasPerms && <AddMapCard />}
          </div>
        ) : (
          <>
            <Alert variant="destructive" className="max-w-xl">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>{t("noMaps.title")}</AlertTitle>
              <AlertDescription>
                {t("noMaps.description")}
                <Link
                  href="https://docs.parsertime.app"
                  target="_blank"
                  external
                >
                  {t("noMaps.link")}
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
