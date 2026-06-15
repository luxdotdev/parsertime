import { InsufficientScrimsPlaceholder } from "@/components/stats/team/insufficient-scrims-placeholder";
import Image from "next/image";

export function TeamStatsGate({
  team,
  scrimCount,
}: {
  team: { name: string; image: string | null };
  scrimCount: number;
}) {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div className="flex items-end gap-4">
          <Image
            src={team.image ?? `https://avatar.vercel.sh/${team.name}.png`}
            alt={team.name}
            width={48}
            height={48}
            className="border-border h-12 w-12 shrink-0 rounded-full border object-cover"
          />
          <div>
            <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
              Team
            </p>
            <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
              {team.name}
            </h1>
          </div>
        </div>
      </header>
      <div className="mt-8">
        <InsufficientScrimsPlaceholder scrimCount={scrimCount} />
      </div>
    </div>
  );
}
