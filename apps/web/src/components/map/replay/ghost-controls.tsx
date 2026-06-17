"use client";

import type { GhostAlignMode } from "@/lib/replay/ghost-alignment";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

export const GHOST_OPACITY = 0.35;

export type GhostCandidate = {
  mapDataId: number;
  scrimName: string;
  scrimDate: string;
};

export type GhostControlsProps = {
  /** Rounds available on the PRIMARY map (round_start numbers). */
  primaryRounds: number[];
  /** Other-scrim candidates to ghost in. */
  ghostCandidates: GhostCandidate[];

  /** Whether a ghost is currently active. */
  active: boolean;

  /** Source selection value. */
  sourceValue:
    | { kind: "round"; roundNumber: number }
    | { kind: "external"; mapDataId: number }
    | null;
  onSelectSourceAction: (
    value:
      | { kind: "round"; roundNumber: number }
      | { kind: "external"; mapDataId: number }
  ) => void;

  /** Ghost round (only meaningful for external sources). */
  ghostRounds: number[];
  ghostRoundNumber: number;
  onSelectGhostRoundAction: (roundNumber: number) => void;
  showGhostRoundSelect: boolean;

  primaryRoundNumber: number;
  onSelectPrimaryRoundAction: (roundNumber: number) => void;

  alignMode: GhostAlignMode;
  onSelectAlignModeAction: (mode: GhostAlignMode) => void;

  nudgeSec: number;
  onNudgeAction: (nudgeSec: number) => void;

  playerNames: string[];
  playerFilter: string | null;
  onSelectPlayerFilterAction: (name: string | null) => void;

  onClearAction: () => void;

  isLoading: boolean;
  notice: string | null;
};

const NUDGE_STEP = 1;
const NUDGE_CLAMP = 30;
const ROUND_OPTION_PREFIX = "round:";
const EXTERNAL_OPTION_PREFIX = "external:";
const ALL_PLAYERS = "__all__";

function formatScrimDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GhostControls({
  primaryRounds,
  ghostCandidates,
  active,
  sourceValue,
  onSelectSourceAction,
  ghostRounds,
  ghostRoundNumber,
  onSelectGhostRoundAction,
  showGhostRoundSelect,
  primaryRoundNumber,
  onSelectPrimaryRoundAction,
  alignMode,
  onSelectAlignModeAction,
  nudgeSec,
  onNudgeAction,
  playerNames,
  playerFilter,
  onSelectPlayerFilterAction,
  onClearAction,
  isLoading,
  notice,
}: GhostControlsProps) {
  const t = useTranslations("mapPage.replay.ghost");

  const sourceSelectValue =
    sourceValue == null
      ? ""
      : sourceValue.kind === "round"
        ? `${ROUND_OPTION_PREFIX}${sourceValue.roundNumber}`
        : `${EXTERNAL_OPTION_PREFIX}${sourceValue.mapDataId}`;

  function handleSourceChange(raw: string) {
    if (raw.startsWith(ROUND_OPTION_PREFIX)) {
      const roundNumber = parseInt(raw.slice(ROUND_OPTION_PREFIX.length), 10);
      onSelectSourceAction({ kind: "round", roundNumber });
    } else if (raw.startsWith(EXTERNAL_OPTION_PREFIX)) {
      const mapDataId = parseInt(raw.slice(EXTERNAL_OPTION_PREFIX.length), 10);
      onSelectSourceAction({ kind: "external", mapDataId });
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("title")}</span>
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAction}
            className="h-7 px-2 text-xs"
          >
            {t("clear")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("source")}</span>
          <Select value={sourceSelectValue} onValueChange={handleSourceChange}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder={t("source")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {primaryRounds.map((r) => (
                  <SelectItem
                    key={`r${r}`}
                    value={`${ROUND_OPTION_PREFIX}${r}`}
                  >
                    {t("primaryRound")} {r}
                  </SelectItem>
                ))}
              </SelectGroup>
              {ghostCandidates.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{t("otherScrim")}</SelectLabel>
                  {ghostCandidates.map((c) => (
                    <SelectItem
                      key={`e${c.mapDataId}`}
                      value={`${EXTERNAL_OPTION_PREFIX}${c.mapDataId}`}
                    >
                      {c.scrimName} · {formatScrimDate(c.scrimDate)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </label>

        {showGhostRoundSelect && (
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">{t("sourceRound")}</span>
            <Select
              value={String(ghostRoundNumber)}
              onValueChange={(v) => onSelectGhostRoundAction(parseInt(v, 10))}
              disabled={ghostRounds.length === 0}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ghostRounds.map((r) => (
                  <SelectItem key={`gr${r}`} value={String(r)}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("primaryRound")}</span>
          <Select
            value={String(primaryRoundNumber)}
            onValueChange={(v) => onSelectPrimaryRoundAction(parseInt(v, 10))}
            disabled={primaryRounds.length === 0}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {primaryRounds.map((r) => (
                <SelectItem key={`pr${r}`} value={String(r)}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div
          role="radiogroup"
          aria-label={t("alignMode")}
          className="flex flex-col gap-1 text-xs"
        >
          <span className="text-muted-foreground">{t("alignMode")}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              role="radio"
              aria-checked={alignMode === "ROUND_START"}
              onClick={() => onSelectAlignModeAction("ROUND_START")}
              className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                alignMode === "ROUND_START"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground border"
              }`}
            >
              {t("alignRoundStart")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={alignMode === "FIRST_CONTACT"}
              onClick={() => onSelectAlignModeAction("FIRST_CONTACT")}
              className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                alignMode === "FIRST_CONTACT"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground border"
              }`}
            >
              {t("alignFirstContact")}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("nudge")}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() =>
                onNudgeAction(Math.max(-NUDGE_CLAMP, nudgeSec - NUDGE_STEP))
              }
              aria-label={`${t("nudge")} -1`}
            >
              −
            </Button>
            <span className="w-10 text-center font-mono tabular-nums">
              {nudgeSec > 0 ? `+${nudgeSec}` : nudgeSec}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() =>
                onNudgeAction(Math.min(NUDGE_CLAMP, nudgeSec + NUDGE_STEP))
              }
              aria-label={`${t("nudge")} +1`}
            >
              +
            </Button>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("playerFilter")}</span>
          <Select
            value={playerFilter ?? ALL_PLAYERS}
            onValueChange={(v) =>
              onSelectPlayerFilterAction(v === ALL_PLAYERS ? null : v)
            }
            disabled={playerNames.length === 0}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PLAYERS}>{t("allPlayers")}</SelectItem>
              {playerNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-xs">{t("loading")}</p>
      )}
      {!isLoading && notice && (
        <p className="text-muted-foreground text-xs">{notice}</p>
      )}
    </div>
  );
}
