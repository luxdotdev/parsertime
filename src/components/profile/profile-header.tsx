import { SupporterHeart } from "@/components/profile/supporter-heart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTitleTranslation } from "@/lib/utils";
import type { BillingPlan, Title } from "@/generated/prisma/client";
import Image from "next/image";

type ProfileHeaderProps = {
  player: {
    name: string;
    image?: string | null;
    bannerImage?: string | null;
    title?: Title | null;
    billingPlan: BillingPlan;
    email?: string | null;
  };
  stats: {
    label: string;
    value: string;
    sub?: string;
  }[];
  rightSlot?: React.ReactNode;
};

export function ProfileHeader({
  player,
  stats,
  rightSlot,
}: ProfileHeaderProps) {
  const titleTranslation = useTitleTranslation(player.title!);
  const isEmployee = player.email?.endsWith("@lux.dev") ?? false;
  const eyebrow = player.title ? `Player · ${titleTranslation}` : "Player";
  const hasBanner = Boolean(player.bannerImage);

  return (
    <header>
      {hasBanner ? (
        <div className="border-border bg-muted/40 relative aspect-[3/1] max-h-[280px] w-full overflow-hidden rounded-md border">
          <Image
            src={player.bannerImage!}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t to-transparent"
          />
        </div>
      ) : null}

      <div
        className={
          hasBanner
            ? "border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pt-4 pb-8"
            : "border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-8"
        }
      >
        <div className="flex items-end gap-5">
          <Avatar
            className={
              hasBanner
                ? "ring-background bg-card -mt-16 h-24 w-24 shrink-0 ring-4 sm:-mt-20 sm:h-28 sm:w-28"
                : "border-border bg-card h-14 w-14 shrink-0 border"
            }
          >
            <AvatarImage src={player.image ?? undefined} alt={player.name} />
            <AvatarFallback
              className={
                hasBanner ? "text-2xl font-semibold" : "text-base font-semibold"
              }
            >
              {player.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="pb-1">
            <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-4xl leading-none font-semibold tracking-tight">
              {player.name}
              <SupporterHeart
                billingPlan={player.billingPlan}
                className="h-5 w-5"
              />
              {isEmployee ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[10px]">
                      Employee
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Verified employee of lux.dev LLC.
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pb-1">
          {stats.length > 0 ? (
            <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                    {stat.label}
                  </dt>
                  <dd className="text-lg font-medium tabular-nums">
                    {stat.value}
                  </dd>
                  {stat.sub ? (
                    <dd className="text-muted-foreground/80 text-[10px]">
                      {stat.sub}
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
          ) : null}
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
