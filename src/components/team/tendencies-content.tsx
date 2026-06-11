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
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { getTranslations } from "next-intl/server";
import type { Route } from "next";
import Link from "next/link";

type TendenciesContentProps = {
  teamId: number;
  tendencies: TendenciesResult;
  calibrations: Record<string, LoadedCalibration | null>;
};

type OutcomeCounts = { won: number; lost: number; unknown: number };

type Tone = "win" | "loss" | "neutral";

const TONE_COLOR: Record<Tone, string> = {
  win: "#22c55e",
  loss: "#ef4444",
  neutral: "#e4e4e7",
};

/**
 * A cluster's record only earns color once it's decisive: at least three
 * rated routes and a winrate clearly off 50%.
 */
function clusterTone(outcomes: OutcomeCounts): Tone {
  const decisive = outcomes.won + outcomes.lost;
  if (decisive < 3) return "neutral";
  const winrate = outcomes.won / decisive;
  if (winrate >= 0.6) return "win";
  if (winrate <= 0.4) return "loss";
  return "neutral";
}

function winratePercent(outcomes: OutcomeCounts): number | null {
  const decisive = outcomes.won + outcomes.lost;
  if (decisive === 0) return null;
  return Math.round((outcomes.won / decisive) * 100);
}

/** Thumbnail crop: the medoid route over a dimmed slice of the map image. */
function RoutePreview({
  points,
  calibration,
  tone,
}: {
  points: { x: number; z: number }[];
  calibration: LoadedCalibration;
  tone: Tone;
}) {
  const { transform, imagePresignedUrl, imageWidth, imageHeight } = calibration;
  const pts = points
    .map((p) => worldToImage({ x: p.x, y: p.z }, transform))
    .filter(
      ({ u, v }) => u >= 0 && v >= 0 && u <= imageWidth && v <= imageHeight
    );
  if (pts.length < 2) return <PreviewPlaceholder />;

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const { u, v } of pts) {
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }

  // Expand the bbox to the thumbnail's aspect ratio with padding, clamped
  // to the image so the crop never samples outside it.
  const aspect = 112 / 72;
  const pad = Math.max((maxU - minU) * 0.25, (maxV - minV) * 0.25, 60);
  let w = maxU - minU + pad * 2;
  let h = maxV - minV + pad * 2;
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  w = Math.min(w, imageWidth);
  h = Math.min(h, imageHeight);
  const cx = (minU + maxU) / 2;
  const cy = (minV + maxV) / 2;
  const x = Math.min(Math.max(cx - w / 2, 0), imageWidth - w);
  const y = Math.min(Math.max(cy - h / 2, 0), imageHeight - h);

  const stroke = w / 36;
  const color = TONE_COLOR[tone];
  const path = pts.map(({ u, v }) => `${u.toFixed(1)},${v.toFixed(1)}`).join(" ");
  const start = pts[0];
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const angle = (Math.atan2(end.v - prev.v, end.u - prev.u) * 180) / Math.PI;
  const arrow = stroke * 3;

  return (
    <svg
      viewBox={`${x.toFixed(0)} ${y.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`}
      className="border-border bg-muted/30 h-[72px] w-28 shrink-0 rounded-md border"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <image
        href={imagePresignedUrl}
        width={imageWidth}
        height={imageHeight}
        style={{ filter: "brightness(0.7) saturate(0.55)" }}
      />
      <polyline
        points={path}
        fill="none"
        stroke="#09090b"
        strokeWidth={stroke * 1.9}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.75}
      />
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={start.u}
        cy={start.v}
        r={stroke * 1.5}
        fill={color}
        stroke="#09090b"
        strokeWidth={stroke * 0.5}
      />
      <polygon
        points={`0,${-arrow / 2} ${arrow},0 0,${arrow / 2}`}
        transform={`translate(${end.u}, ${end.v}) rotate(${angle})`}
        fill={color}
        stroke="#09090b"
        strokeWidth={stroke * 0.4}
      />
    </svg>
  );
}

function PreviewPlaceholder() {
  return (
    <div
      className="border-border bg-muted/30 h-[72px] w-28 shrink-0 rounded-md border"
      aria-hidden
    />
  );
}

function OutcomeBar({ outcomes }: { outcomes: OutcomeCounts }) {
  const total = outcomes.won + outcomes.lost + outcomes.unknown;
  if (total === 0) return null;
  return (
    <div
      className="bg-muted flex h-1.5 w-20 overflow-hidden rounded-full"
      aria-hidden
    >
      {outcomes.won > 0 && (
        <div
          className="h-full bg-green-500"
          style={{ width: `${(outcomes.won / total) * 100}%` }}
        />
      )}
      {outcomes.lost > 0 && (
        <div
          className="h-full bg-red-500"
          style={{ width: `${(outcomes.lost / total) * 100}%` }}
        />
      )}
      {outcomes.unknown > 0 && (
        <div
          className="bg-muted-foreground/40 h-full"
          style={{ width: `${(outcomes.unknown / total) * 100}%` }}
        />
      )}
    </div>
  );
}

export async function TendenciesContent({
  teamId,
  tendencies,
  calibrations,
}: TendenciesContentProps) {
  const t = await getTranslations("tendenciesPage");

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground mt-2 max-w-prose">
          {t("description")}
        </p>
      </div>

      {tendencies.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tendencies.map((map) => {
            const calibration = calibrations[map.mapName] ?? null;
            // Singleton clusters are anecdotes, not tendencies — collapse
            // them into a footnote unless a map has nothing else to show.
            const recurring = map.clusters.filter((c) => c.routeCount >= 2);
            const visible =
              recurring.length > 0 ? recurring : map.clusters.slice(0, 5);
            const hiddenCount = map.clusters.length - visible.length;

            return (
              <Card key={map.mapName}>
                <CardHeader>
                  <CardTitle className="flex items-baseline justify-between gap-2">
                    <span>{map.mapName}</span>
                    <span className="text-muted-foreground text-sm font-normal tabular-nums">
                      {t("totalRoutes")}: {map.totalRoutes}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("routeColumn")}</TableHead>
                        <TableHead className="text-right">
                          {t("share")}
                        </TableHead>
                        <TableHead>{t("record")}</TableHead>
                        <TableHead className="text-right">
                          {t("winrate")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((cluster, index) => {
                        const tone = clusterTone(cluster.outcomes);
                        const winrate = winratePercent(cluster.outcomes);
                        const label =
                          cluster.label ?? t("route", { n: index + 1 });
                        const href =
                          `/${teamId}/scrim/${cluster.medoid.scrimId}/map/${cluster.medoid.mapId}?tab=routes` as Route;
                        const rowKey = `${map.mapName}-${cluster.medoid.scrimId}-${cluster.medoid.mapId}-${cluster.routeCount}-${cluster.sharePercent}-${label}`;
                        return (
                          <TableRow key={rowKey}>
                            <TableCell>
                              <Link
                                href={href}
                                className="group flex items-center gap-3"
                              >
                                {calibration ? (
                                  <RoutePreview
                                    points={cluster.medoid.points}
                                    calibration={calibration}
                                    tone={tone}
                                  />
                                ) : (
                                  <PreviewPlaceholder />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="font-medium group-hover:underline">
                                    {label}
                                  </span>
                                  <span className="text-muted-foreground text-xs tabular-nums">
                                    {t("clusterRoutes", {
                                      count: cluster.routeCount,
                                    })}
                                  </span>
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-right align-middle tabular-nums">
                              {cluster.sharePercent}%
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex items-center gap-3">
                                <span className="tabular-nums">
                                  <span className="text-green-500">
                                    {cluster.outcomes.won}
                                    {t("wonShort")}
                                  </span>{" "}
                                  <span className="text-red-500">
                                    {cluster.outcomes.lost}
                                    {t("lostShort")}
                                  </span>
                                  {cluster.outcomes.unknown > 0 && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      · {cluster.outcomes.unknown}?
                                    </span>
                                  )}
                                </span>
                                <OutcomeBar outcomes={cluster.outcomes} />
                              </div>
                            </TableCell>
                            <TableCell
                              className={`text-right align-middle font-medium tabular-nums ${
                                tone === "win"
                                  ? "text-green-500"
                                  : tone === "loss"
                                    ? "text-red-500"
                                    : ""
                              }`}
                            >
                              {winrate === null ? "—" : `${winrate}%`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {hiddenCount > 0 && (
                    <p className="text-muted-foreground mt-3 text-xs">
                      {t("oneOffs", { count: hiddenCount })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
