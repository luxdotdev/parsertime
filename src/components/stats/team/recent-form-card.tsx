"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecentForm } from "@/data/team-performance-trends-dto";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

type RecentFormCardProps = {
  recentForm: RecentForm;
};

export function RecentFormCard({ recentForm }: RecentFormCardProps) {
  const [view, setView] = useState<"5" | "10" | "20">("5");

  const matches =
    view === "5"
      ? recentForm.last5
      : view === "10"
        ? recentForm.last10
        : recentForm.last20;
  const winrate =
    view === "5"
      ? recentForm.last5Winrate
      : view === "10"
        ? recentForm.last10Winrate
        : recentForm.last20Winrate;

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No recent matches to display.
          </p>
        </CardContent>
      </Card>
    );
  }

  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Form</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {wins}W - {losses}L • {winrate.toFixed(1)}% winrate
            </p>
          </div>
          <Select
            value={view}
            onValueChange={(v) => setView(v as "5" | "10" | "20")}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Last 5</SelectItem>
              <SelectItem value="10">Last 10</SelectItem>
              <SelectItem value="20">Last 20</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {winrate >= 60 ? (
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : winrate <= 40 ? (
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : null}
              <span className="text-sm font-medium">
                {winrate >= 60
                  ? "Strong recent performance"
                  : winrate <= 40
                    ? "Struggling recently"
                    : "Average performance"}
              </span>
            </div>
            <Badge
              className={cn(
                "font-bold",
                winrate >= 60
                  ? "bg-green-500"
                  : winrate >= 50
                    ? "bg-blue-500"
                    : "bg-red-500"
              )}
            >
              {winrate.toFixed(1)}%
            </Badge>
          </div>

          <div className="space-y-2">
            {matches.map((match) => (
              <div
                key={`${match.scrimId}-${match.mapName}`}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                      match.result === "win"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    )}
                  >
                    {match.result === "win" ? "W" : "L"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{match.scrimName}</p>
                    <p className="text-muted-foreground text-xs">
                      {match.mapName}
                    </p>
                  </div>
                </div>
                <span className="text-muted-foreground text-xs">
                  {match.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 mt-4 flex items-center justify-center gap-1 rounded-lg p-3">
            {matches.map((match) => (
              <div
                key={`indicator-${match.scrimId}-${match.mapName}`}
                className={cn(
                  "h-3 w-3 rounded-full",
                  match.result === "win" ? "bg-green-500" : "bg-red-500"
                )}
                title={`${match.scrimName} - ${match.result === "win" ? "Win" : "Loss"}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
