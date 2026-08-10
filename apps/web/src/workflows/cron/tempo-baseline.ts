import prisma from "@/lib/prisma";
import { sampleTeamTempo, writeTempoBaselines } from "@/lib/tempo/compute";
import type { TeamTempoSample } from "@/lib/tempo/aggregate";
import { getWorkflowMetadata } from "workflow";
import {
  acquireLeaseStep,
  releaseLeaseStep,
  renewLeaseStep,
} from "./lease-steps";

const TEAM_BATCH_SIZE = 6;
const LEASE_KEY = "cron:tempo-baseline";

type SampleBatchResult = {
  samples: TeamTempoSample[];
  failures: number;
};

export async function tempoBaselineWorkflow() {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  if (!(await acquireLeaseStep(LEASE_KEY, workflowRunId))) {
    return {
      teamsConsidered: 0,
      teamsFailed: 0,
      baselinesWritten: 0,
      perMetricSampleN: {
        FIGHT_DURATION: 0,
        ULT_CHARGE_TIME: 0,
        ULT_HOLD_TIME: 0,
      },
      skipped: true,
    };
  }

  try {
    const teamIds = await listTempoTeamIdsStep();
    const samples: TeamTempoSample[] = [];
    let failures = 0;
    for (let index = 0; index < teamIds.length; index += TEAM_BATCH_SIZE) {
      await renewLeaseStep(LEASE_KEY, workflowRunId);
      const result = await sampleTempoTeamsStep(
        teamIds.slice(index, index + TEAM_BATCH_SIZE)
      );
      samples.push(...result.samples);
      failures += result.failures;
    }
    return await writeTempoBaselinesStep(samples, teamIds.length, failures);
  } finally {
    await releaseLeaseStep(LEASE_KEY, workflowRunId);
  }
}

async function listTempoTeamIdsStep(): Promise<number[]> {
  "use step";

  const teams = await prisma.team.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return teams.map((team) => team.id);
}

async function sampleTempoTeamsStep(
  teamIds: number[]
): Promise<SampleBatchResult> {
  "use step";

  const results = await Promise.allSettled(teamIds.map(sampleTeamTempo));
  return {
    samples: results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    ),
    failures: results.filter((result) => result.status === "rejected").length,
  };
}

async function writeTempoBaselinesStep(
  samples: TeamTempoSample[],
  teamsConsidered: number,
  teamsFailed: number
) {
  "use step";

  return writeTempoBaselines(samples, teamsConsidered, teamsFailed);
}
