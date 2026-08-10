import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { datasetToCsv } from "@/lib/win-probability/training/csv";
import {
  buildRows,
  fetchEventLog,
} from "@/lib/win-probability/training/extract";
import {
  type DatasetRow,
  MODE_FAMILIES,
  type ModeFamily,
} from "@/lib/win-probability/types";
import { put } from "@vercel/blob";
import { getWorkflowMetadata } from "workflow";
import {
  acquireLeaseStep,
  releaseLeaseStep,
  renewLeaseStep,
} from "./lease-steps";

const MAP_BATCH_SIZE = 50;
const TRAINER_ORIGIN = "https://parsertime.app";
const LEASE_KEY = "cron:wp-retrain";

type DatasetExportResult = {
  mapsTotal: number;
  mapsExported: number;
  mapsSkipped: number;
  rowsByFamily: Record<ModeFamily, number>;
  exportedModes: ModeFamily[];
  urls: Partial<Record<ModeFamily, string[]>>;
};

type DatasetBatchResult = Omit<
  DatasetExportResult,
  "mapsTotal" | "exportedModes"
>;

type TrainerResult = {
  published: boolean;
  runId?: string;
  reason?: string;
  errors?: Record<string, string>;
};

export async function winProbabilityRetrainWorkflow() {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  if (!(await acquireLeaseStep(LEASE_KEY, workflowRunId))) {
    return {
      exported: false,
      published: false,
      runId: workflowRunId,
      modes: [],
      skipped: true,
    };
  }
  const mapIds = await listWinProbabilityMapIdsStep();
  const exported: DatasetExportResult = {
    mapsTotal: mapIds.length,
    mapsExported: 0,
    mapsSkipped: 0,
    rowsByFamily: {
      control: 0,
      escort_hybrid: 0,
      push: 0,
      flashpoint: 0,
    },
    exportedModes: [],
    urls: {},
  };

  for (let index = 0; index < mapIds.length; index += MAP_BATCH_SIZE) {
    await renewLeaseStep(LEASE_KEY, workflowRunId);
    const batch = await exportWinProbabilityDatasetBatchStep(
      workflowRunId,
      Math.floor(index / MAP_BATCH_SIZE),
      mapIds.slice(index, index + MAP_BATCH_SIZE)
    );
    exported.mapsExported += batch.mapsExported;
    exported.mapsSkipped += batch.mapsSkipped;
    for (const family of MODE_FAMILIES) {
      exported.rowsByFamily[family] += batch.rowsByFamily[family];
      if (batch.urls[family]) {
        (exported.urls[family] ??= []).push(...batch.urls[family]);
      }
    }
  }
  exported.exportedModes = MODE_FAMILIES.filter(
    (family) => exported.rowsByFamily[family] > 0
  );

  let trainer: TrainerResult | null = null;
  if (exported.exportedModes.length > 0) {
    await renewLeaseStep(LEASE_KEY, workflowRunId);
    trainer = await triggerWinProbabilityTrainerStep(
      workflowRunId,
      exported.urls
    );
  }

  await logWinProbabilityRetrainCompletionStep(
    workflowRunId,
    exported,
    trainer
  );
  await releaseLeaseStep(LEASE_KEY, workflowRunId);
  return {
    exported: true,
    published: trainer?.published ?? false,
    runId: workflowRunId,
    modes: exported.exportedModes,
  };
}

async function listWinProbabilityMapIdsStep(): Promise<number[]> {
  "use step";

  const maps = await prisma.matchStart.findMany({
    where: { map_type: { not: "Clash" }, MapDataId: { not: null } },
    select: { MapDataId: true },
    distinct: ["MapDataId"],
    orderBy: { MapDataId: "asc" },
  });
  return maps.map((map) => map.MapDataId!);
}

export async function exportWinProbabilityDatasetBatchStep(
  runId: string,
  batchIndex: number,
  mapIds: number[]
): Promise<DatasetBatchResult> {
  "use step";

  const rowsByFamily: Record<ModeFamily, DatasetRow[]> = {
    control: [],
    escort_hybrid: [],
    push: [],
    flashpoint: [],
  };
  let mapsExported = 0;
  let mapsSkipped = 0;

  const logs = await Promise.all(mapIds.map(fetchEventLog));
  for (let index = 0; index < mapIds.length; index++) {
    const log = logs[index];
    if (log === null) {
      mapsSkipped += 1;
      continue;
    }
    const rows = buildRows(log, mapIds[index]);
    if (rows.length === 0) {
      mapsSkipped += 1;
      continue;
    }
    rowsByFamily[log.modeFamily].push(...rows);
    mapsExported += 1;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const urls: Partial<Record<ModeFamily, string[]>> = {};
  for (const family of MODE_FAMILIES) {
    const rows = rowsByFamily[family];
    if (rows.length === 0) continue;
    const blob = await put(
      `wp-train/${runId}/parts/${batchIndex}-${family}.csv`,
      datasetToCsv(rows),
      {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "text/csv",
        token,
      }
    );
    urls[family] = [blob.url];
  }

  return {
    mapsExported,
    mapsSkipped,
    rowsByFamily: Object.fromEntries(
      MODE_FAMILIES.map((family) => [family, rowsByFamily[family].length])
    ) as Record<ModeFamily, number>,
    urls,
  };
}

export async function triggerWinProbabilityTrainerStep(
  runId: string,
  urls: Partial<Record<ModeFamily, string[]>>
): Promise<TrainerResult> {
  "use step";

  const response = await fetch(`${TRAINER_ORIGIN}/api/wp-train`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ runId, urls }),
  });
  if (!response.ok) {
    throw new Error(`WP trainer returned HTTP ${response.status}`);
  }
  const result = (await response.json()) as TrainerResult;
  if (result.published !== true) {
    throw new Error(
      `WP trainer published nothing: ${result.reason ?? JSON.stringify(result.errors ?? {})}`
    );
  }
  return result;
}

triggerWinProbabilityTrainerStep.maxRetries = 1;

async function logWinProbabilityRetrainCompletionStep(
  runId: string,
  exported: DatasetExportResult,
  trainer: TrainerResult | null
) {
  "use step";

  await Promise.resolve(
    Logger.info({
      event: "wp.workflow.retrain",
      outcome:
        exported.exportedModes.length > 0 ? "success" : "no_data_exported",
      run_id: runId,
      maps_total: exported.mapsTotal,
      maps_exported: exported.mapsExported,
      maps_skipped: exported.mapsSkipped,
      rows_by_family: exported.rowsByFamily,
      exported_modes: exported.exportedModes,
      published: trainer?.published ?? false,
    })
  );
}
