"use client";

import { SupporterHeart } from "@/components/profile/supporter-heart";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { useTitleTranslation } from "@/lib/utils";
import type { BillingPlan, Title } from "@prisma/client";
import type { Route } from "next";
import Image from "next/image";

type TeamMemberCardProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    bannerImage: string | null;
    billingPlan: BillingPlan;
    appliedTitles: { title: Title }[];
    battletag: string | null;
  };
  isManager: boolean;
  isOwner: boolean;
  isCurrentUser: boolean;
  children?: React.ReactNode;
};

export function TeamMemberCard({
  user,
  isManager,
  isOwner,
  isCurrentUser,
  children,
}: TeamMemberCardProps) {
  const primaryTitle = user.appliedTitles[0]?.title ?? null;
  const titleTranslation = useTitleTranslation(primaryTitle);

  const badges = [];
  if (isManager) badges.push("Manager");
  if (isOwner) badges.push("Owner");
  if (isCurrentUser) badges.push("You");

  return (
    <Card className="gap-0 overflow-hidden p-0 pb-4">
      {/* Banner */}
      <AspectRatio ratio={21 / 3}>
        <div className="relative h-full w-full rounded-t-xl bg-gradient-to-r from-blue-600 to-purple-600">
          {user.bannerImage && (
            <Image
              src={user.bannerImage}
              alt={`${user.name} banner`}
              fill
              className="rounded-t-xl object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 rounded-t-xl bg-black/20" />
        </div>
      </AspectRatio>

      {/* User Info */}
      <div className="relative px-6 pb-4">
        <div className="-mt-12 flex flex-col items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="border-background bg-background rounded-full border-4">
              <Avatar className="border-muted h-24 w-24 rounded-full border-2">
                <AvatarImage
                  src={
                    user.image ?? `https://avatar.vercel.sh/${user.email}.png`
                  }
                  alt={user.name ?? user.email}
                />
                <AvatarFallback className="text-2xl font-bold">
                  {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* User Details */}
          <div className="w-full space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xl font-bold tracking-tight hover:underline">
                <Link href={`/profile/${user.battletag ?? ""}` as Route}>
                  {user.name}
                </Link>
              </h4>
              <SupporterHeart
                billingPlan={user.billingPlan}
                className="h-4 w-4"
              />
            </div>

            {primaryTitle && (
              <div className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {titleTranslation}
              </div>
            )}

            {badges.length > 0 && (
              <div className="text-muted-foreground flex flex-wrap gap-1 text-sm">
                {badges.map((badge, idx) => (
                  <span key={badge}>
                    {badge}
                    {idx < badges.length - 1 && " • "}
                  </span>
                ))}
              </div>
            )}

            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {children}
    </Card>
  );
}
