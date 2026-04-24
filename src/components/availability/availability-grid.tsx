"use client";

import { cn } from "@/lib/utils";
import {
  DAYS_PER_WEEK,
  slotIndexToUtc,
  visibleSlotsPerDay,
  type AvailabilitySettingsShape,
} from "@/lib/availability/slots";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type GridProps = {
  settings: AvailabilitySettingsShape;
  weekStart: Date;
  teamTimezone: string;
  viewerTimezone: string;
  selected: Set<number>;
  onChange?: (next: Set<number>) => void;
  readOnly?: boolean;
  heatmap?: Map<number, string[]>; // slotIndex → list of names
  totalRespondents?: number;
  onHoverSlot?: (slotIndex: number | null) => void;
};

function formatHourLabel(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatDayLabel(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(d);
}

export function AvailabilityGrid({
  settings,
  weekStart,
  teamTimezone,
  viewerTimezone,
  selected,
  onChange,
  readOnly,
  heatmap,
  totalRespondents = 0,
  onHoverSlot,
}: GridProps) {
  const perDay = visibleSlotsPerDay(settings);
  const totalSlots = perDay * DAYS_PER_WEEK;

  const slotInstants = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < totalSlots; i++) {
      out.push(slotIndexToUtc(i, weekStart, settings, teamTimezone));
    }
    return out;
  }, [weekStart, settings, teamTimezone, totalSlots]);

  const dayHeaders = useMemo(() => {
    const out: string[] = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      out.push(formatDayLabel(slotInstants[d * perDay], viewerTimezone));
    }
    return out;
  }, [slotInstants, perDay, viewerTimezone]);

  const rowLabels = useMemo(() => {
    const out: { label: string; key: string }[] = [];
    for (let r = 0; r < perDay; r++) {
      const inst = slotInstants[r];
      out.push({
        label: formatHourLabel(inst, viewerTimezone),
        key: inst.toISOString(),
      });
    }
    return out;
  }, [slotInstants, perDay, viewerTimezone]);

  const [dragMode, setDragMode] = useState<"add" | "remove" | null>(null);
  const draftRef = useRef<Set<number>>(new Set(selected));

  useEffect(() => {
    draftRef.current = new Set(selected);
  }, [selected]);

  const applyToCell = useCallback(
    (idx: number, mode: "add" | "remove") => {
      const next = new Set(draftRef.current);
      if (mode === "add") next.add(idx);
      else next.delete(idx);
      draftRef.current = next;
      onChange?.(next);
    },
    [onChange]
  );

  function handlePointerDown(idx: number) {
    return (e: React.PointerEvent) => {
      if (readOnly) return;
      e.preventDefault();
      const mode = selected.has(idx) ? "remove" : "add";
      setDragMode(mode);
      applyToCell(idx, mode);
    };
  }

  function handlePointerEnter(idx: number) {
    return () => {
      onHoverSlot?.(idx);
      if (readOnly) return;
      if (!dragMode) return;
      applyToCell(idx, dragMode);
    };
  }

  useEffect(() => {
    function onUp() {
      setDragMode(null);
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function cellStyle(idx: number): {
    className: string;
    style?: React.CSSProperties;
  } {
    if (heatmap) {
      const count = heatmap.get(idx)?.length ?? 0;
      if (totalRespondents === 0 || count === 0) {
        return { className: "bg-muted" };
      }
      // Sweep hue 0 (red) -> 60 (yellow) -> 120 (green) as availability
      // ratio rises. Saturation stays high so even low-count slots read
      // clearly; lightness dims slightly at the extremes.
      const ratio = count / totalRespondents;
      const hue = Math.round(ratio * 120);
      const lightness = 50 - Math.abs(ratio - 0.5) * 10;
      return {
        className: "",
        style: { backgroundColor: `hsl(${hue}, 70%, ${lightness}%)` },
      };
    }
    if (selected.has(idx)) {
      return { className: "bg-emerald-500", style: { opacity: 0.7 } };
    }
    return { className: "bg-muted hover:bg-muted/60" };
  }

  return (
    <div className="select-none">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `4rem repeat(${DAYS_PER_WEEK}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {dayHeaders.map((label) => (
          <div
            key={label}
            className="text-muted-foreground px-1 text-center text-xs font-medium"
          >
            {label}
          </div>
        ))}
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `4rem repeat(${DAYS_PER_WEEK}, minmax(0, 1fr))`,
        }}
        onPointerLeave={() => onHoverSlot?.(null)}
      >
        {rowLabels.map(({ label: rowLabel, key: rowKey }, row) => (
          <Fragment key={rowKey}>
            <div
              className="text-muted-foreground pr-2 text-right text-[10px] leading-none"
              style={{ paddingTop: 2 }}
            >
              {row % 2 === 0 ? rowLabel : ""}
            </div>
            {dayHeaders.map((dayLabel, day) => {
              const idx = day * perDay + row;
              const { className, style } = cellStyle(idx);
              return (
                <button
                  key={`c-${idx}`}
                  type="button"
                  onPointerDown={handlePointerDown(idx)}
                  onPointerEnter={handlePointerEnter(idx)}
                  className={cn(
                    "border-border/50 h-4 touch-none border-t border-l last:border-r",
                    row === perDay - 1 && "border-b",
                    className,
                    readOnly && "cursor-default"
                  )}
                  style={style}
                  aria-label={`${dayLabel} ${rowLabel}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
