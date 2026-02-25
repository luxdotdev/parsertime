import { TeamSearch } from "@/components/scouting/team-search";
import { getScoutingTeams } from "@/data/scouting-dto";
import { getTranslations } from "next-intl/server";

export default async function ScoutingPage() {
  const t = await getTranslations("scoutingPage");
  const teams = await getScoutingTeams();

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-16 pb-8 sm:px-8 md:pt-24">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <TeamSearch teams={teams} />
      </div>
    </div>
  );
}
