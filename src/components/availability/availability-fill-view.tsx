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
import Link from "next/link";
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
      toast.error("Please enter your name");
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
            ? "Password required to edit this name"
            : "Incorrect password"
        );
        return;
      }
      if (!res.ok) {
        toast.error("Failed to save availability");
        return;
      }
      const { response } = (await res.json()) as {
        response: InitialResponse;
      };
      setResponses((prev) => {
        const others = prev.filter((r) => r.id !== response.id);
        return [...others, response];
      });
      toast.success("Availability saved");
    } finally {
      setSaving(false);
    }
  }, [name, password, mySlots, fillLocalTz, scheduleId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{teamName} availability</h1>
        <p className="text-muted-foreground text-sm">
          Week of {new Date(weekStartDate).toLocaleDateString()} — pick the
          times you&apos;re free.
        </p>
      </header>

      <div className="grid items-end gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={checkName}
            placeholder="Your name"
            disabled={sessionUserLoggedIn && Boolean(prefillName)}
            autoComplete="off"
          />
        </div>
        {!sessionUserLoggedIn ? (
          <div className="space-y-1.5">
            <Label htmlFor="password">
              Password {passwordRequired ? "(required)" : "(optional)"}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                passwordRequired ? "Enter your password" : "Set a password"
              }
              autoComplete="off"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="space-y-1.5">
          <Label htmlFor="viewer-tz">Viewing timezone</Label>
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
          <h2 className="text-lg font-semibold">Your availability</h2>

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
              {saving ? "Saving…" : "Save my availability"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMySlots(new Set())}
              disabled={saving || mySlots.size === 0}
            >
              Clear
            </Button>
          </div>
          {tzMismatch ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              <span className="font-medium">Heads up:</span> the team&apos;s
              calendar is set to <strong>{settings.timezone}</strong>, but
              you&apos;re in <strong>{fillLocalTz}</strong>. Pick slots in your
              local time — we&apos;ll translate to the team&apos;s timezone
              automatically.
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Selecting in your local time: {fillLocalTz}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Group availability
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({responses.length} responses)
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
              ? "Hover a cell to see who's available"
              : (() => {
                  const available = heatmap.get(hoveredSlot) ?? [];
                  const unavailable = responses
                    .map((r) => r.displayName)
                    .filter((name) => !available.includes(name));
                  return (
                    <>
                      <div>
                        <span className="text-foreground font-medium">
                          {available.length} / {responses.length}
                        </span>
                        {available.length > 0 && ` — ${available.join(", ")}`}
                      </div>
                      {unavailable.length > 0 && (
                        <div className="mt-1">
                          Unavailable: {unavailable.join(", ")}
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
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">
          Scrim analytics and team tools for Overwatch
        </CardTitle>
        <CardDescription>
          Parsertime turns raw Workshop Log data into skill ratings, trend
          lines, and coaching insights — plus team management tools like the
          availability calendar you&apos;re using right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <span className="text-foreground font-medium">Instant review.</span>{" "}
            Upload a scrim, see per-player stats, maps, and teamfights in
            minutes — no spreadsheets.
          </li>
          <li>
            <span className="text-foreground font-medium">CSR ratings.</span>{" "}
            Objective 1–5000 hero skill ratings across role-specific metrics.
          </li>
          <li>
            <span className="text-foreground font-medium">Trends.</span> Watch
            players improve across weeks and seasons, not just single matches.
          </li>
          <li>
            <span className="text-foreground font-medium">
              Coaching canvas.
            </span>{" "}
            Draw up strats on a shared whiteboard and keep them alongside the
            scrims they came from.
          </li>
          <li>
            <span className="text-foreground font-medium">
              Team availability.
            </span>{" "}
            This calendar, plus Discord reminders that ping your role at the
            start of each week.
          </li>
          <li>
            <span className="text-foreground font-medium">Free to start.</span>{" "}
            Two teams and five members on the free tier, no credit card.
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/sign-in">
            <Button>Sign in to see your team&apos;s scrims</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Learn more about Parsertime</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
