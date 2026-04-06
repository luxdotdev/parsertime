import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import type { TournamentFormat, TournamentStatus } from "@prisma/client";
import type { Route } from "next";

type TournamentCardProps = {
  id: number;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  teamSlots: number;
  bestOf: number;
  teamNames: string[];
  matchCount: number;
  createdAt: Date;
};

const formatLabels: Record<TournamentFormat, string> = {
  SINGLE_ELIMINATION: "Single Elim",
  DOUBLE_ELIMINATION: "Double Elim",
  ROUND_ROBIN: "Round Robin",
  SWISS: "Swiss",
};

const statusVariants: Record<
  TournamentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function TournamentCard({
  id,
  name,
  format,
  status,
  teamSlots,
  bestOf,
  teamNames,
  matchCount,
  createdAt,
}: TournamentCardProps) {
  return (
    <Link href={`/tournaments/${id}` as Route} className="block">
      <Card className="hover:border-primary/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight">{name}</CardTitle>
            <Badge variant={statusVariants[status]}>{status}</Badge>
          </div>
          <CardDescription>
            {formatLabels[format]} &middot; Bo{bestOf} &middot; {teamSlots}{" "}
            teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground space-y-1 text-sm">
            <p className="truncate">
              {teamNames.length > 0
                ? teamNames.slice(0, 4).join(", ") +
                  (teamNames.length > 4 ? ` +${teamNames.length - 4} more` : "")
                : "No teams yet"}
            </p>
            <p>
              {matchCount} matches &middot; {createdAt.toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
