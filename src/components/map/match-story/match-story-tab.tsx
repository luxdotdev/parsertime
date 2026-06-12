import { SectionHeader } from "@/components/section-header";
import type { MatchStoryResult } from "@/data/map/match-story-service";
import { getTranslations } from "next-intl/server";
import { FightLedgerTable } from "./fight-ledger-table";
import { InsightsStrip } from "./insights-strip";
import { WpaTable } from "./wpa-table";
import { WpTimelineChart } from "./wp-timeline-chart";

export async function MatchStoryTab({ result }: { result: MatchStoryResult }) {
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
      <InsightsStrip insights={data.insights} />
      <WpTimelineChart
        points={data.points}
        fights={data.fights}
        roundMarkers={data.roundMarkers}
        team1={data.teams.team1}
      />
      <SectionHeader id="fight-ledger" title={t("ledger.title")} />
      <FightLedgerTable fights={data.fights} team1={data.teams.team1} />
      <SectionHeader
        id="wpa"
        title={t("wpa.title")}
        description={t("wpa.subtitle")}
      />
      <WpaTable wpa={data.wpa} />
    </div>
  );
}
