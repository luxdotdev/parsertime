"use client";

import { AvailabilityGrid } from "@/components/availability/availability-grid";
import { TimezoneSelect } from "@/components/availability/timezone-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AvailabilitySettingsShape } from "@/lib/availability/slots";
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

  const [viewerTz, setViewerTz] = useState(settings.timezone);
  useEffect(() => {
    setViewerTz(settings.timezone);
  }, [settings.timezone]);

  const fillLocalTz = useMemo(() => detectLocalTz(), []);

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

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your availability</h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
            {!sessionUserLoggedIn && (
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
            )}
          </div>

          <AvailabilityGrid
            settings={settings}
            weekStart={weekStartDate}
            teamTimezone={settings.timezone}
            viewerTimezone={viewerTz}
            selected={mySlots}
            onChange={setMySlots}
          />

          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save my availability"}
          </Button>
          <p className="text-muted-foreground text-xs">
            Selecting in your local time: {fillLocalTz}
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              Group availability
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({responses.length} responses)
              </span>
            </h2>
            <div className="w-56">
              <Label htmlFor="viewer-tz" className="sr-only">
                Viewing timezone
              </Label>
              <TimezoneSelect
                id="viewer-tz"
                value={viewerTz}
                onValueChange={setViewerTz}
              />
            </div>
          </div>

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
            {hoveredSlot !== null && (heatmap.get(hoveredSlot)?.length ?? 0) > 0
              ? `Available: ${(heatmap.get(hoveredSlot) ?? []).join(", ")}`
              : "Hover a cell to see who's available"}
          </div>
        </section>
      </div>
    </div>
  );
}
