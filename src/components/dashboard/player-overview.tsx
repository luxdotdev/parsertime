import { OverviewTable } from "@/components/dashboard/overview-table";
import { SelectedPlayerContext } from "@/components/dashboard/player-switcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParserDataContext } from "@/lib/parser-context";
import { aggregatePlayerData } from "@/lib/player-table-data";
import { table } from "console";
import { useContext } from "react";

export function PlayerOverview() {
  let { data } = useContext(ParserDataContext);
  let { selectedPlayer } = useContext(SelectedPlayerContext);
  let dataFromLocalStorage = localStorage.getItem("data");

  if (!data) {
    data = JSON.parse(dataFromLocalStorage ?? "{}");
  }

  const finalRound = data?.round_end[data?.round_end.length - 1];

  const tableData = aggregatePlayerData(data.player_stat);
  const selectedPlayerData = tableData.find(
    (player) => player.playerName === selectedPlayer.label
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Match Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(finalRound[1] / 60).toFixed(2)} minutes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Played Hero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedPlayerData?.mostPlayedHero}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +201 since last hour
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2"></CardContent>
        </Card>
      </div>
    </>
  );
}
