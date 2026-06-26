import { SectionHeader } from "@/components/section-header";
import type { MatchStoryResult } from "@/data/map/match-story-service";
import { getTranslations } from "next-intl/server";
import { MatchStoryExplorer } from "./match-story-explorer";
import { WpaTable } from "./wpa-table";

export async function MatchStoryTab({
  result,
  team1Color,
  team2Color,
}: {
  result: MatchStoryResult;
  team1Color: string;
  team2Color: string;
}) {
  const t = await getTranslations("mapPage.matchStory");

  if (result.status === "no_family_model") {
    return <p className="text-muted-foreground py-8 text-sm">{t("noModel")}</p>;
  }

  const { data } = result;
  return (
    <div className="space-y-6">
      <SectionHeader
        id="match-story"
        title={t("title")}
        description={t("description", { team1: data.teams.team1 })}
      />
      {data.limited ? (
        <p className="text-muted-foreground text-xs">{t("limited")}</p>
      ) : null}
      <MatchStoryExplorer
        data={data}
        team1Color={team1Color}
        team2Color={team2Color}
      />
      <div>
        <SectionHeader
          id="wpa"
          title={t("wpa.title")}
          description={t("wpa.subtitle")}
        />
        <WpaTable
          wpa={data.wpa}
          teams={data.teams}
          team1Color={team1Color}
          team2Color={team2Color}
        />
      </div>
    </div>
  );
}
