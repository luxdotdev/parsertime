import { SupporterHeart } from "@/components/profile/supporter-heart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, useTitleTranslation } from "@/lib/utils";
import type { BillingPlan, Title } from "@prisma/client";

type ProfileHeaderProps = {
  player: {
    name: string;
    image?: string | null;
    title?: Title | null; // e.g. "Squire", "Grandmaster"
    level?: number;
    endorsementLevel?: number;
    rankIcon?: string; // URL to rank icon
    billingPlan: BillingPlan;
  };
  className?: string;
};

export function ProfileHeader({ player, className }: ProfileHeaderProps) {
  const titleTranslation = useTitleTranslation(player.title!);

  return (
    <div
      className={cn(
        "bg-background relative w-full overflow-hidden rounded-lg border",
        className
      )}
    >
      {/* Banner Section */}
      <div className="relative h-48 w-full bg-gradient-to-r from-blue-600 to-purple-600">
        {/* Optional: Add a real banner image here if available */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* User Info Bar */}
      <div className="relative px-8 pb-6">
        <div className="-mt-12 flex flex-col items-start gap-6 sm:-mt-16 sm:flex-row sm:items-end">
          {/* Avatar Section */}
          <div className="relative">
            <div className="border-background bg-background rounded-full border-4 p-1">
              <Avatar className="border-muted h-32 w-32 rounded-full border-2">
                <AvatarImage
                  src={player.image ?? undefined}
                  alt={player.name}
                />
                <AvatarFallback className="rounded-sm text-4xl font-bold">
                  {player.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Player Details */}
          <div className="mb-2 flex flex-col space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-foreground flex items-center gap-4 text-4xl font-black tracking-tighter uppercase italic">
                {player.name}
                <SupporterHeart
                  billingPlan={player.billingPlan}
                  className="h-6 w-6"
                />
              </h1>
            </div>

            {player.title && (
              <div className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">
                {titleTranslation}
              </div>
            )}
          </div>

          {/* Rank/Extra Info (Right Side) */}
          <div className="ml-auto hidden sm:block">
            {/* Could put rank icon here */}
          </div>
        </div>
      </div>
    </div>
  );
}
