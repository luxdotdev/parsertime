"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type HealthCheck = "ok" | "error";

type HealthResponse = {
  status: "healthy" | "degraded";
  checks: Record<string, HealthCheck>;
};

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health", { cache: "no-store" });
  return (await res.json()) as HealthResponse;
}

export function HealthStatus() {
  const t = useTranslations("footer");

  const { data, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  function serviceLabel(key: string): string {
    switch (key) {
      case "database":
        return t("healthServiceDatabase");
      case "discordBot":
        return t("healthServiceDiscordBot");
      default:
        return key;
    }
  }

  const status: "healthy" | "degraded" | "loading" | "unknown" = isPending
    ? "loading"
    : data
      ? data.status
      : "unknown";

  const label =
    status === "healthy"
      ? t("healthOk")
      : status === "degraded"
        ? t("healthDegraded")
        : status === "loading"
          ? t("healthChecking")
          : t("healthUnknown");

  const dotClass =
    status === "healthy"
      ? "bg-green-500"
      : status === "degraded"
        ? "bg-yellow-500"
        : status === "loading"
          ? "bg-muted-foreground animate-pulse"
          : "bg-muted-foreground";

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="flex cursor-help items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          {label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-56">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
          {t("healthCardTitle")}
        </p>
        {data ? (
          <ul className="space-y-1.5 text-sm">
            {Object.entries(data.checks).map(([key, value]) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-foreground">{serviceLabel(key)}</span>
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      value === "ok" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {value === "ok"
                    ? t("healthStatusOperational")
                    : t("healthStatusDown")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="bg-muted-foreground inline-block h-2 w-2 animate-pulse rounded-full" />
            {isError ? t("healthUnknown") : t("healthChecking")}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
