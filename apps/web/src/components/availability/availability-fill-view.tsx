"use client";

import { AvailabilityGrid } from "@/components/availability/availability-grid";
import { TimezoneSelect } from "@/components/availability/timezone-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AvailabilitySettingsShape } from "@/lib/availability/slots";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type InitialResponse = {
  id: string;
  displayName: string;
  slots: number[];
  updatedAt: string;
};

type Props = {
  scheduleId: string;
  teamName: string;
  weekStart: string;
  weekEnd: string;
  settings: AvailabilitySettingsShape & { timezone: string };
  initialResponses: InitialResponse[];
  prefillName?: string | null;
  sessionUserLoggedIn: boolean;
};

function detectLocalTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function AvailabilityFillView({
  scheduleId,
  teamName,
  weekStart,
  settings,
  initialResponses,
  prefillName,
  sessionUserLoggedIn,
}: Props) {
  const t = useTranslations("availability.fillView");
  const format = useFormatter();
  const weekStartDate = useMemo(() => new Date(weekStart), [weekStart]);

  const [name, setName] = useState(prefillName ?? "");
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [mySlots, setMySlots] = useState<Set<number>>(new Set());
  const [responses, setResponses] = useState(initialResponses);
  const [saving, setSaving] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const fillLocalTz = useMemo(() => detectLocalTz(), []);
  // SSR renders in the team tz (Intl can't detect the viewer there); on
  // mount we switch to the viewer's detected tz so the default matches
  // where they actually are. Manual dropdown picks stick — this effect's
  // dependency is stable so it only runs once.
  const [viewerTz, setViewerTz] = useState(settings.timezone);
  useEffect(() => {
    setViewerTz(fillLocalTz);
  }, [fillLocalTz]);

  const tzMismatch = fillLocalTz !== settings.timezone;

  const heatmap = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const r of responses) {
      for (const idx of r.slots) {
        const arr = m.get(idx);
        if (arr) arr.push(r.displayName);
        else m.set(idx, [r.displayName]);
      }
    }
    return m;
  }, [responses]);

  const checkName = useCallback(async () => {
    if (!name.trim()) return;
    const res = await fetch(
      `/api/availability/${scheduleId}/responses/verify-name`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }
    );
    if (!res.ok) return;
    const json = (await res.json()) as {
      exists: boolean;
      passwordRequired: boolean;
      existingSlots?: number[];
    };
    setPasswordRequired(json.passwordRequired);
    if (json.existingSlots) {
      setMySlots(new Set(json.existingSlots));
    }
  }, [name, scheduleId]);

  const save = useCallback(async () => {
    if (!name.trim()) {
      toast.error(t("toast.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/availability/${scheduleId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          password: password || undefined,
          slots: Array.from(mySlots),
          submittedFromTz: fillLocalTz,
        }),
      });
      if (res.status === 401) {
        const body = (await res.json().catch(() => null)) as {
          passwordRequired?: boolean;
          error?: string;
        } | null;
        setPasswordRequired(true);
        toast.error(
          body?.error === "Password required"
            ? t("toast.passwordRequired")
            : t("toast.incorrectPassword")
        );
        return;
      }
      if (!res.ok) {
        toast.error(t("toast.saveFailed"));
        return;
      }
      const { response } = (await res.json()) as {
        response: InitialResponse;
      };
      setResponses((prev) => {
        const others = prev.filter((r) => r.id !== response.id);
        return [...others, response];
      });
      toast.success(t("toast.saved"));
    } finally {
      setSaving(false);
    }
  }, [name, password, mySlots, fillLocalTz, scheduleId, t]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{t("title", { teamName })}</h1>
        <p className="text-muted-foreground text-sm">
          {t("weekIntro", {
            date: format.dateTime(weekStartDate, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          })}
        </p>
      </header>

      <div className="grid items-end gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={checkName}
            placeholder={t("namePlaceholder")}
            disabled={sessionUserLoggedIn && Boolean(prefillName)}
            autoComplete="off"
          />
        </div>
        {!sessionUserLoggedIn ? (
          <div className="space-y-1.5">
            <Label htmlFor="password">
              {t("password", {
                required: passwordRequired ? "true" : "false",
              })}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                passwordRequired
                  ? t("passwordRequiredPlaceholder")
                  : t("passwordOptionalPlaceholder")
              }
              autoComplete="off"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="space-y-1.5">
          <Label htmlFor="viewer-tz">{t("viewingTimezone")}</Label>
          <TimezoneSelect
            id="viewer-tz"
            value={viewerTz}
            onValueChange={setViewerTz}
            teamTimezone={settings.timezone}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("yourAvailability")}</h2>

          <AvailabilityGrid
            settings={settings}
            weekStart={weekStartDate}
            teamTimezone={settings.timezone}
            viewerTimezone={viewerTz}
            selected={mySlots}
            onChange={setMySlots}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMySlots(new Set())}
              disabled={saving || mySlots.size === 0}
            >
              {t("clear")}
            </Button>
          </div>
          {tzMismatch ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              {t.rich("timezoneMismatch", {
                label: (chunks) => (
                  <span className="font-medium">{chunks}</span>
                ),
                teamTimezone: (chunks) => <strong>{chunks}</strong>,
                localTimezone: (chunks) => <strong>{chunks}</strong>,
                teamTz: settings.timezone,
                localTz: fillLocalTz,
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              {t("localTimezone", { timezone: fillLocalTz })}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {t("groupAvailability")}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {t("responseCount", { count: responses.length })}
            </span>
          </h2>

          <AvailabilityGrid
            settings={settings}
            weekStart={weekStartDate}
            teamTimezone={settings.timezone}
            viewerTimezone={viewerTz}
            selected={new Set()}
            readOnly
            heatmap={heatmap}
            totalRespondents={responses.length}
            onHoverSlot={setHoveredSlot}
          />

          <div className="border-border text-muted-foreground min-h-[2rem] rounded-md border px-3 py-2 text-xs">
            {hoveredSlot === null
              ? t("hoverPrompt")
              : (() => {
                  const available = heatmap.get(hoveredSlot) ?? [];
                  const unavailable = responses
                    .map((r) => r.displayName)
                    .filter((name) => !available.includes(name));
                  return (
                    <>
                      <div>
                        <span className="text-foreground font-medium">
                          {t("availabilityRatio", {
                            available: available.length,
                            total: responses.length,
                          })}
                        </span>
                        {available.length > 0 &&
                          t("namesSuffix", { names: available.join(", ") })}
                      </div>
                      {unavailable.length > 0 && (
                        <div className="mt-1">
                          {t("unavailable", {
                            names: unavailable.join(", "),
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
          </div>
        </section>
      </div>

      {!sessionUserLoggedIn && <ParsertimePromoCard />}
    </div>
  );
}

function ParsertimePromoCard() {
  const t = useTranslations("availability.fillView.promo");

  function strong(chunks: ReactNode) {
    return <span className="text-foreground font-medium">{chunks}</span>;
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
          <li>{t.rich("bullets.instantReview", { strong })}</li>
          <li>{t.rich("bullets.csrRatings", { strong })}</li>
          <li>{t.rich("bullets.trends", { strong })}</li>
          <li>{t.rich("bullets.coachingCanvas", { strong })}</li>
          <li>{t.rich("bullets.teamAvailability", { strong })}</li>
          <li>{t.rich("bullets.freeToStart", { strong })}</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/sign-in">
            <Button>{t("signIn")}</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">{t("learnMore")}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
