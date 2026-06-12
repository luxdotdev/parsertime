import { Logger } from "@/lib/logger";
import { r2 } from "@/lib/r2";
import { featureHash } from "./features";
import type { ModelArtifact } from "./model";

const MODEL_PREFIX = "wp-models";
const LATEST_KEY = `${MODEL_PREFIX}/latest.json`;
export const ARTIFACT_TTL_MS = 60 * 60 * 1000;

type LatestPointer = { key: string; modelVersion: number };

function modelKey(version: number): string {
  return `${MODEL_PREFIX}/model-v${version}.json`;
}

/** Minimal structural check — enough to refuse garbage and stale shapes. */
function parseArtifact(raw: string): ModelArtifact | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const artifact = parsed as ModelArtifact;
    if (artifact.schemaVersion !== 1) return null;
    if (typeof artifact.featureHash !== "string") return null;
    if (
      typeof artifact.modeFamilies !== "object" ||
      artifact.modeFamilies === null
    ) {
      return null;
    }
    return artifact;
  } catch {
    return null;
  }
}

let cache: { artifact: ModelArtifact | null; fetchedAt: number } | null = null;

export function __resetArtifactCacheForTests(): void {
  cache = null;
}

async function fetchLatest(): Promise<ModelArtifact | null> {
  try {
    const pointerRaw = await r2.download(LATEST_KEY);
    const pointer = JSON.parse(pointerRaw.toString("utf8")) as LatestPointer;
    const modelRaw = await r2.download(pointer.key);
    const artifact = parseArtifact(modelRaw.toString("utf8"));
    if (artifact === null) {
      Logger.warn({ event: "wp.artifact.invalid", key: pointer.key });
      return null;
    }
    if (artifact.featureHash !== featureHash()) {
      Logger.warn({
        event: "wp.artifact.feature_hash_mismatch",
        artifact_hash: artifact.featureHash,
        code_hash: featureHash(),
      });
      return null;
    }
    return artifact;
  } catch (error) {
    Logger.warn({
      event: "wp.artifact.load_failed",
      error_message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/**
 * TTL-cached loader. Returns null — never throws — on any failure; callers
 * hide the WP surface when no model is servable. Failures are cached too,
 * so an R2 outage costs one attempt per TTL window.
 */
export async function loadLatestArtifact(): Promise<ModelArtifact | null> {
  if (cache !== null && Date.now() - cache.fetchedAt < ARTIFACT_TTL_MS) {
    return cache.artifact;
  }
  const artifact = await fetchLatest();
  cache = { artifact, fetchedAt: Date.now() };
  return artifact;
}

/** Versioned publish: model object first, pointer advance last — a crash
 * between the two leaves the previous pointer serving. */
export async function publishArtifact(
  artifact: ModelArtifact
): Promise<{ key: string; modelVersion: number }> {
  let currentVersion = 0;
  try {
    const pointerRaw = await r2.download(LATEST_KEY);
    currentVersion = (JSON.parse(pointerRaw.toString("utf8")) as LatestPointer)
      .modelVersion;
  } catch {
    // No pointer yet — first publish.
  }
  const modelVersion = currentVersion + 1;
  const key = modelKey(modelVersion);
  await r2.upload({
    key,
    body: Buffer.from(JSON.stringify({ ...artifact, modelVersion }, null, 2)),
    contentType: "application/json",
  });
  await r2.upload({
    key: LATEST_KEY,
    body: Buffer.from(
      JSON.stringify({ key, modelVersion } satisfies LatestPointer)
    ),
    contentType: "application/json",
  });
  return { key, modelVersion };
}
