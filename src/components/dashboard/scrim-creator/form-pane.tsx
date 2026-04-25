"use client";

import { OpponentSearchField } from "@/components/scrim/opponent-search-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ParserData } from "@/types/parser";
import type { useSensors } from "@dnd-kit/core";
import { CalendarIcon } from "@radix-ui/react-icons";
import { track } from "@vercel/analytics";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { FileDropZone } from "./file-drop-zone";
import { HeroBansField } from "./hero-bans-field";
import type { FormValues, ScoutingTeam, TeamOption } from "./types";

type Props = {
  form: UseFormReturn<FormValues>;
  fileInputId: string;
  selectedFile: File | null;
  mapData: ParserData | undefined;
  parsing: boolean;
  hasCorruptedData: boolean;
  onFile: (file: File | null) => Promise<void> | void;
  teams: TeamOption[] | undefined;
  scoutingTeams: ScoutingTeam[];
  showOpponent: boolean;
  autoAssignTeamNames: boolean;
  setAutoAssignTeamNames: (value: boolean) => void;
  selectedTeam: string | undefined;
  isIndividual: boolean;
  sensors: ReturnType<typeof useSensors>;
  isLocked: boolean;
  onCancel: () => void;
};

export function FormPane({
  form,
  fileInputId,
  selectedFile,
  mapData,
  parsing,
  hasCorruptedData,
  onFile,
  teams,
  scoutingTeams,
  showOpponent,
  autoAssignTeamNames,
  setAutoAssignTeamNames,
  selectedTeam,
  isIndividual,
  sensors,
  isLocked,
  onCancel,
}: Props) {
  const t = useTranslations("dashboard.scrimCreationForm");
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="overflow-y-auto px-6 py-5">
        <Controller
          control={form.control}
          name="map"
          render={({ field, fieldState }) => (
            <FileDropZone
              inputName={field.name}
              inputId={fileInputId}
              invalid={fieldState.invalid}
              file={selectedFile}
              parsing={parsing}
              mapData={mapData}
              hasCorruption={hasCorruptedData}
              onFile={(f) => {
                startTransition(() => {
                  void onFile(f);
                });
              }}
              description={t("mapDescription")}
              dropTitle={t("mapDropTitle")}
              dropSubtitle={t("mapDropSubtitle")}
              parsedLabel={t("mapDropParsed")}
              parsingLabel={t("mapDropParsing")}
              replaceLabel={t("mapDropReplace")}
              versusLabel={t("mapDropTeamSeparator")}
            />
          )}
        />

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="sm:col-span-2"
              >
                <div id="docs-demo-step3">
                  <FieldLabel htmlFor={field.name}>{t("scrimName")}</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder={t("scrimPlaceholder")}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </div>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="team"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} id="docs-demo-step4">
                <FieldLabel htmlFor={field.name}>{t("teamName")}</FieldLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    className="w-full pl-3 text-left font-normal"
                  >
                    <SelectValue placeholder={t("teamPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("teamIndividual")}</SelectItem>
                    {teams ? (
                      teams.map((team) => (
                        <SelectItem key={team.value} value={team.value}>
                          {team.label}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="1">{t("teamLoading")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="date"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} id="docs-demo-step5">
                <FieldLabel htmlFor={field.name}>{t("dateName")}</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id={field.name}
                      variant="outline"
                      aria-invalid={fieldState.invalid}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PP")
                      ) : (
                        <span>{t("datePlaceholder")}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date: Date) =>
                        date > new Date() || date < new Date("2016-01-01")
                      }
                    />
                  </PopoverContent>
                </Popover>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <Label
            htmlFor="auto-assign-team-names"
            className={cn(
              "text-sm",
              isIndividual || !selectedTeam
                ? "text-muted-foreground"
                : undefined
            )}
          >
            {t("autoAssignTeamNames")}
          </Label>
          <Switch
            id="auto-assign-team-names"
            checked={autoAssignTeamNames}
            onCheckedChange={setAutoAssignTeamNames}
            disabled={isIndividual || !selectedTeam}
            aria-label={t("autoAssignTeamNames")}
          />
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs">
          {isIndividual || !selectedTeam
            ? t("autoAssignDisabledDescription")
            : t("autoAssignTeamNamesDescription")}
        </p>

        {showOpponent && (
          <div className="mt-5">
            <Controller
              control={form.control}
              name="opponentTeamAbbr"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>OWCS opponent</FieldLabel>
                  <OpponentSearchField
                    id={field.name}
                    options={scoutingTeams}
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                  <FieldDescription>
                    Optional. Links to OWCS scouting analytics.
                  </FieldDescription>
                </Field>
              )}
            />
          </div>
        )}

        <div className="mt-6">
          <Controller
            control={form.control}
            name="heroBans"
            render={({ field, fieldState }) => (
              <HeroBansField
                field={field}
                invalid={fieldState.invalid}
                error={fieldState.error}
                mapData={mapData}
                sensors={sensors}
              />
            )}
          />
        </div>
      </div>

      <div className="border-border/60 bg-background flex items-center justify-between gap-2 border-t px-6 py-3">
        <div className="text-muted-foreground/70 hidden items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.04em] uppercase sm:flex">
          <FileText className="size-3" aria-hidden="true" />
          <span>.xlsx · .txt</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLocked}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            id="docs-demo-step8"
            onClick={() => track("Create Scrim", { location: "Dashboard" })}
            disabled={isLocked}
          >
            {t("submit")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
