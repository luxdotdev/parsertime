"use client";

import type { GetScoutingTeamsResponse } from "@/app/api/scouting/get-teams/route";
import type { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { useFeatureFlags } from "@/components/feature-flags-provider";
import {
  runSequentialUpload,
  uploadMapStream,
} from "@/components/map/bulk-upload/sequential-upload";
import { useBulkMapUpload } from "@/components/map/bulk-upload/use-bulk-map-upload";
import { scrimCreatorStore } from "@/stores/scrim-creator-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@xstate/store/react";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { FormPane } from "./form-pane";
import { SuccessPane } from "./success-pane";
import type { FormValues } from "./types";

export function ScrimCreationForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const { scoutingEnabled } = useFeatureFlags();
  const submitState = useSelector(
    scrimCreatorStore,
    (s) => s.context.submitState
  );
  const autoAssignTeamNames = useSelector(
    scrimCreatorStore,
    (s) => s.context.autoAssignTeamNames
  );

  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("dashboard.scrimCreationForm");
  const tb = useTranslations("bulkUpload");

  const upload = useBulkMapUpload();
  const { pendingMaps, isParsing, failedCount, reset: resetMaps, patchMap } =
    upload;
  const scrimIdRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);

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
    opponentTeamAbbr: z.string().nullable().optional(),
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
    },
  });

  const selectedTeam = form.watch("team");
  const isIndividual = selectedTeam === "0";

  useEffect(() => {
    if (isIndividual) {
      scrimCreatorStore.trigger.autoAssignChanged({ value: false });
    }
  }, [isIndividual]);

  const usableMaps = pendingMaps.filter((m) => !m.parseFailed);

  async function onSubmit(data: FormValues) {
    if (usableMaps.length === 0) {
      toast.error(tb("noMapsTitle"), { description: tb("noMapsDescription") });
      return;
    }

    setBusy(true);

    const resolvedTeam1Name =
      autoAssignTeamNames && !isIndividual
        ? (teams?.find((opt) => opt.value === data.team)?.label ?? null)
        : null;
    const resolvedTeam2Name =
      autoAssignTeamNames && data.opponentTeamAbbr
        ? (scoutingTeams.find((s) => s.abbreviation === data.opponentTeamAbbr)
            ?.fullName ?? null)
        : null;

    const { scrimId, allSucceeded } = await runSequentialUpload({
      maps: usableMaps,
      patchMap,
      baseOrder: 0,
      initialScrimId: scrimIdRef.current,
      uploadMap: async (map, order, sid, reportProgress) => {
        if (sid === null) {
          // First map creates the scrim (and is map order 0 server-side).
          const { scrimId } = await uploadMapStream(
            "/api/scrim/create-scrim-stream",
            {
              name: data.name.trim(),
              team: data.team,
              date: data.date.toISOString(),
              map: map.parsedData,
              replayCode: "",
              opponentTeamAbbr: data.opponentTeamAbbr ?? null,
              autoAssignTeamNames,
              team1Name: resolvedTeam1Name,
              team2Name: resolvedTeam2Name,
              heroBans: map.heroBans,
            },
            reportProgress
          );
          if (scrimId == null) {
            throw new Error("Server did not return a scrim id");
          }
          return scrimId;
        }

        await uploadMapStream(
          `/api/scrim/add-map-stream?id=${sid}`,
          {
            map: map.parsedData,
            order,
            heroBans: map.heroBans.length > 0 ? map.heroBans : undefined,
          },
          reportProgress
        );
        return sid;
      },
    });

    scrimIdRef.current = scrimId;
    setBusy(false);

    if (allSucceeded) {
      void queryClient.invalidateQueries({ queryKey: ["scrims"] });
      router.refresh();
      scrimCreatorStore.trigger.submitSucceeded();
    } else if (scrimId === null) {
      // The first map failed; nothing was created. Per-map error is shown
      // inline and the user can retry.
      toast.error(tb("partialFailureTitle"), {
        description: tb("createFirstMapFailed"),
      });
    } else {
      toast.error(tb("partialFailureTitle"), {
        description: tb("partialFailureDescription"),
      });
    }
  }

  function handleCreateAnother() {
    form.reset({ date: new Date(), opponentTeamAbbr: null });
    resetMaps();
    scrimIdRef.current = null;
    scrimCreatorStore.trigger.reset();
  }

  const showOpponent = scoutingEnabled && scoutingTeams.length > 0;
  const submitLabel =
    failedCount > 0
      ? tb("retryFailed", { count: failedCount })
      : tb("createScrimWithMaps", { count: usableMaps.length });
  const isSubmitDisabled = busy || isParsing || usableMaps.length === 0;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <AnimatePresence mode="wait" initial={false}>
        {submitState === "success" ? (
          <SuccessPane
            key="success"
            hasCorruptedData={pendingMaps.some((m) => m.hasCorruption)}
            onClose={() => setOpen(false)}
            onCreateAnother={handleCreateAnother}
          />
        ) : (
          <FormPane
            key="form"
            form={form}
            upload={upload}
            busy={busy}
            teams={teams}
            scoutingTeams={scoutingTeams}
            showOpponent={showOpponent}
            autoAssignTeamNames={autoAssignTeamNames}
            setAutoAssignTeamNames={(value) =>
              scrimCreatorStore.trigger.autoAssignChanged({ value })
            }
            selectedTeam={selectedTeam}
            isIndividual={isIndividual}
            submitLabel={submitLabel}
            isSubmitDisabled={isSubmitDisabled}
            onCancel={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </form>
  );
}
