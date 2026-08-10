import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  discoverAllTrackedChampionships,
  ingestPlayerHistory,
} from "@/lib/tsr/ingest";
import { getWorkflowMetadata } from "workflow";
import {
  acquireLeaseStep,
  releaseLeaseStep,
  renewLeaseStep,
} from "./lease-steps";

const REINGEST_BATCH_SIZE = 50;
const LEASE_KEY = "cron:tsr-enrich";

type DiscoverySummary = {
  organizers: number;
  inserted: number;
  updated: number;
  unclassified: number;
};

type ReingestSummary = {
  playersAttempted: number;
  matchesIngested: number;
  matchesSkipped: number;
  failures: number;
};

export async function tsrEnrichWorkflow() {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  if (!(await acquireLeaseStep(LEASE_KEY, workflowRunId))) {
    return {
      discovery: null,
      reingest: null,
      skipped: true,
    };
  }
  const discovery = await discoverChampionshipsStep();
  const playerIds = await listStalePlayerIdsStep();
  const reingest: ReingestSummary = {
    playersAttempted: playerIds.length,
    matchesIngested: 0,
    matchesSkipped: 0,
    failures: 0,
  };

  for (const playerId of playerIds) {
    await renewLeaseStep(LEASE_KEY, workflowRunId);
    try {
      const result = await reingestPlayerStep(playerId);
      reingest.matchesIngested += result.ingested;
      reingest.matchesSkipped += result.skipped;
    } catch (error) {
      reingest.failures += 1;
      await logReingestFailureStep(
        playerId,
        error instanceof Error ? error.message : "unknown"
      );
    }
  }

  await logTsrEnrichCompletionStep(discovery, reingest);
  await releaseLeaseStep(LEASE_KEY, workflowRunId);
  return { discovery, reingest };
}

async function discoverChampionshipsStep(): Promise<DiscoverySummary> {
  "use step";

  const discovery = await discoverAllTrackedChampionships();
  return {
    organizers: discovery.length,
    inserted: discovery.reduce((sum, item) => sum + item.inserted, 0),
    updated: discovery.reduce((sum, item) => sum + item.updated, 0),
    unclassified: discovery.reduce((sum, item) => sum + item.unclassified, 0),
  };
}

async function listStalePlayerIdsStep(): Promise<string[]> {
  "use step";

  const players = await prisma.faceitPlayer.findMany({
    where: { rosterEntries: { some: {} } },
    orderBy: [{ lastSyncedAt: "asc" }, { faceitPlayerId: "asc" }],
    take: REINGEST_BATCH_SIZE,
    select: { faceitPlayerId: true },
  });
  return players.map((player) => player.faceitPlayerId);
}

async function reingestPlayerStep(playerId: string) {
  "use step";

  const result = await ingestPlayerHistory(playerId, { maxPages: 5 });
  await prisma.faceitPlayer.update({
    where: { faceitPlayerId: playerId },
    data: { lastSyncedAt: new Date() },
  });
  return result;
}

reingestPlayerStep.maxRetries = 2;

async function logReingestFailureStep(playerId: string, message: string) {
  "use step";

  await Promise.resolve(
    Logger.warn({
      event: "tsr.workflow.reingest_failed",
      faceit_player_id: playerId,
      error_message: message,
    })
  );
}

async function logTsrEnrichCompletionStep(
  discovery: DiscoverySummary,
  reingest: ReingestSummary
) {
  "use step";

  await Promise.resolve(
    Logger.info({
      event: "tsr.workflow.enrich",
      outcome: "success",
      discovery,
      reingest,
    })
  );
}
