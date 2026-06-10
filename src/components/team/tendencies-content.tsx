import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TendenciesResult } from "@/data/team/route-tendencies-service";

type TendenciesLabels = {
  title: string;
  description: string;
  empty: string;
  totalRoutes: string;
  route: string;
  share: string;
  routeColumn: string;
  outcomes: string;
  won: string;
  lost: string;
  unknown: string;
};

type TendenciesContentProps = {
  tendencies: TendenciesResult;
  labels: TendenciesLabels;
};

type OutcomeCounts = { won: number; lost: number; unknown: number };

function OutcomeBar({ outcomes }: { outcomes: OutcomeCounts }) {
  const total = outcomes.won + outcomes.lost + outcomes.unknown;
  if (total === 0) {
    return null;
  }

  const wonPercent = (outcomes.won / total) * 100;
  const lostPercent = (outcomes.lost / total) * 100;
  const unknownPercent = (outcomes.unknown / total) * 100;

  return (
    <div
      className="bg-muted flex h-2 w-24 overflow-hidden rounded-full"
      aria-hidden="true"
    >
      {outcomes.won > 0 && (
        <div
          className="h-full bg-green-500"
          style={{ width: `${wonPercent}%` }}
        />
      )}
      {outcomes.lost > 0 && (
        <div
          className="h-full bg-red-500"
          style={{ width: `${lostPercent}%` }}
        />
      )}
      {outcomes.unknown > 0 && (
        <div
          className="bg-muted-foreground/40 h-full"
          style={{ width: `${unknownPercent}%` }}
        />
      )}
    </div>
  );
}

type TendencyRow = {
  key: string;
  routeLabel: string;
  sharePercent: number;
  outcomes: OutcomeCounts;
};

function toRows(
  map: TendenciesResult[number],
  labels: TendenciesLabels
): TendencyRow[] {
  return map.clusters.map((cluster, index) => {
    const routeNumber = index + 1;
    const routeLabel =
      cluster.label ?? labels.route.replace("{n}", String(routeNumber));
    return {
      key: `${map.mapName}-${routeNumber}-${routeLabel}`,
      routeLabel,
      sharePercent: cluster.sharePercent,
      outcomes: cluster.outcomes,
    };
  });
}

export function TendenciesContent({
  tendencies,
  labels,
}: TendenciesContentProps) {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{labels.title}</h2>
        <p className="text-muted-foreground mt-2">{labels.description}</p>
      </div>

      {tendencies.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            {labels.empty}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tendencies.map((map) => (
            <Card key={map.mapName}>
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between gap-2">
                  <span>{map.mapName}</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {labels.totalRoutes}: {map.totalRoutes}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{labels.routeColumn}</TableHead>
                      <TableHead className="text-right">
                        {labels.share}
                      </TableHead>
                      <TableHead>{labels.outcomes}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toRows(map, labels).map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">
                          {row.routeLabel}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.sharePercent}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground tabular-nums">
                              {row.outcomes.won} / {row.outcomes.lost} /{" "}
                              {row.outcomes.unknown}
                            </span>
                            <OutcomeBar outcomes={row.outcomes} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
