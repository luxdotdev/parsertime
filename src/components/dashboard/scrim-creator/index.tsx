"use client";

import type { GetScoutingTeamsResponse } from "@/app/api/scouting/get-teams/route";
import type { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { useFeatureFlags } from "@/components/feature-flags-provider";
import { parseData } from "@/lib/parser-client";
import { detectFileCorruption } from "@/lib/utils";
import { scrimCreatorStore } from "@/stores/scrim-creator-store";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@xstate/store/react";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { ErrorPane } from "./error-pane";
import { FormPane } from "./form-pane";
import { SubmittingPane } from "./submitting-pane";
import { SuccessPane } from "./success-pane";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE, type FormValues } from "./types";

export function ScrimCreationForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const { scoutingEnabled } = useFeatureFlags();
  const mapData = useSelector(scrimCreatorStore, (s) => s.context.mapData);
  const selectedFile = useSelector(
    scrimCreatorStore,
    (s) => s.context.selectedFile
  );
  const parsing = useSelector(scrimCreatorStore, (s) => s.context.parsing);
  const hasCorruptedData = useSelector(
    scrimCreatorStore,
    (s) => s.context.hasCorruptedData
  );
  const submitState = useSelector(
    scrimCreatorStore,
    (s) => s.context.submitState
  );
  const errorCause = useSelector(
    scrimCreatorStore,
    (s) => s.context.errorCause
  );
  const autoAssignTeamNames = useSelector(
    scrimCreatorStore,
    (s) => s.context.autoAssignTeamNames
  );

  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("dashboard.scrimCreationForm");

  const fileInputId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset the singleton store each time the form mounts so a fresh open
  // doesn't inherit state from the previous session.
  useEffect(() => {
    scrimCreatorStore.trigger.reset();
  }, []);

  const FormSchema = z.object({
    name: z
      .string({ error: t("scrimRequiredError") })
      .min(2, { message: t("scrimMinMessage") })
      .max(30, { message: t("scrimMaxMessage") }),
    team: z.string({ error: t("teamRequiredError") }),
    date: z.date({ error: t("dateRequiredError") }),
    map: z.any(),
    opponentTeamAbbr: z.string().nullable().optional(),
    heroBans: z.array(
      z.object({
        hero: z.string().min(1, { message: t("heroBanRequiredError") }),
        team: z.string().min(1, { message: t("teamRequiredError") }),
        banPosition: z.number().min(1, {
          message: t("banPositionRequiredError"),
        }),
      })
    ),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await fetch("/api/team/get-teams-with-perms");
      if (!response.ok) {
        throw new Error("Failed to fetch teams with permissions");
      }
      const data = (await response.json()) as GetTeamsResponse;
      return data.teams.map((team) => ({
        label: team.name,
        value: team.id.toString(),
      }));
    },
    staleTime: Infinity,
  });

  const { data: scoutingTeams = [] } = useQuery({
    queryKey: ["scouting-teams"],
    queryFn: async () => {
      const response = await fetch("/api/scouting/get-teams");
      if (!response.ok) return [];
      const data = (await response.json()) as GetScoutingTeamsResponse;
      return data.teams;
    },
    staleTime: Infinity,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      date: new Date(),
      opponentTeamAbbr: null,
      heroBans: [],
    },
  });

  const selectedTeam = form.watch("team");
  const isIndividual = selectedTeam === "0";

  useEffect(() => {
    if (isIndividual) {
      scrimCreatorStore.trigger.autoAssignChanged({ value: false });
    }
  }, [isIndividual]);

  async function handleFile(file: File | null) {
    if (!file) {
      scrimCreatorStore.trigger.fileCleared();
      return;
    }

    if (file.size > MAX_FILE_SIZE && !scoutingEnabled) {
      toast.error(t("fileSize.title"), {
        duration: 5000,
        description: t("fileSize.description"),
      });
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error(t("fileType.title"), {
        duration: 5000,
        description: t("fileType.description"),
      });
      return;
    }

    scrimCreatorStore.trigger.fileSelected({ file });

    try {
      const corruption = await detectFileCorruption(file);

      if (corruption.isCorrupted) {
        let warningMessage = t("dataCorruption.warning.baseDescription");
        if (corruption.hasInvalidMercyRez) {
          warningMessage += `\n${t("dataCorruption.warning.invalidMercyRez")}`;
        }
        if (corruption.hasAsterisks) {
          warningMessage += `\n${t("dataCorruption.warning.asteriskValues")}`;
        }
        toast.warning(t("dataCorruption.warning.title"), {
          description: warningMessage,
          duration: 8000,
        });
      }

      const parsed = await parseData(file);
      scrimCreatorStore.trigger.parsingFinished({
        mapData: parsed,
        hasCorruption: corruption.isCorrupted,
      });
    } catch {
      scrimCreatorStore.trigger.parsingFailed();
    }
  }

  async function onSubmit(data: FormValues) {
    scrimCreatorStore.trigger.submitStarted();

    data.map = mapData;
    data.name = data.name.trim();

    const resolvedTeam1Name =
      autoAssignTeamNames && !isIndividual
        ? (teams?.find((t) => t.value === data.team)?.label ?? null)
        : null;

    const resolvedTeam2Name =
      autoAssignTeamNames && data.opponentTeamAbbr
        ? (scoutingTeams.find((t) => t.abbreviation === data.opponentTeamAbbr)
            ?.fullName ?? null)
        : null;

    try {
      const res = await fetch("/api/scrim/create-scrim", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          autoAssignTeamNames,
          team1Name: resolvedTeam1Name,
          team2Name: resolvedTeam2Name,
        }),
      });

      if (res.ok) {
        void queryClient.invalidateQueries({ queryKey: ["scrims"] });
        router.refresh();
        scrimCreatorStore.trigger.submitSucceeded();
      } else {
        const text = (await res.text()).trim();
        const detail = text.length > 0 ? text : t("createdScrim.errorFallback");
        scrimCreatorStore.trigger.submitFailed({
          cause: `${detail} (${res.status})`,
        });
      }
    } catch (e) {
      scrimCreatorStore.trigger.submitFailed({
        cause:
          e instanceof Error
            ? e.message
            : "We couldn't reach our servers. Your network may have dropped.",
      });
    }
  }

  function handleCreateAnother() {
    form.reset({
      date: new Date(),
      opponentTeamAbbr: null,
      heroBans: [],
    });
    scrimCreatorStore.trigger.reset();
  }

  function handleBackToForm() {
    scrimCreatorStore.trigger.backToForm();
  }

  const showOpponent = scoutingEnabled && scoutingTeams.length > 0;
  const isLocked = submitState !== "idle";

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <AnimatePresence mode="wait" initial={false}>
        {submitState === "idle" && (
          <FormPane
            key="form"
            form={form}
            fileInputId={fileInputId}
            selectedFile={selectedFile}
            mapData={mapData}
            parsing={parsing}
            hasCorruptedData={hasCorruptedData}
            onFile={handleFile}
            teams={teams}
            scoutingTeams={scoutingTeams}
            showOpponent={showOpponent}
            autoAssignTeamNames={autoAssignTeamNames}
            setAutoAssignTeamNames={(value) =>
              scrimCreatorStore.trigger.autoAssignChanged({ value })
            }
            selectedTeam={selectedTeam}
            isIndividual={isIndividual}
            sensors={sensors}
            isLocked={isLocked}
            onCancel={() => setOpen(false)}
          />
        )}
        {submitState === "submitting" && <SubmittingPane key="submitting" />}
        {submitState === "success" && (
          <SuccessPane
            key="success"
            hasCorruptedData={hasCorruptedData}
            onClose={() => setOpen(false)}
            onCreateAnother={handleCreateAnother}
          />
        )}
        {submitState === "error" && (
          <ErrorPane
            key="error"
            errorCause={errorCause}
            onBack={handleBackToForm}
          />
        )}
      </AnimatePresence>
    </form>
  );
}
