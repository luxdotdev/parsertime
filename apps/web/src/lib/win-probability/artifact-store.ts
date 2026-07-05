import { Logger } from "@/lib/logger";
import { r2 } from "@/lib/r2";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { featureHash } from "./features";
import type { ModelArtifact } from "./model";

const MODEL_PREFIX = "wp-models";
const LATEST_KEY = `${MODEL_PREFIX}/latest.json`;
/** Cache tag for the live model artifact; busted by `publishArtifact`. */
const ARTIFACT_TAG = "wp-artifact";

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
 * Loads the live model artifact. Returns null — never throws — on any failure;
 * callers hide the WP surface when no model is servable (failures are cached
 * too, so an R2 outage costs one fetch per revalidation window).
 *
 * Wrapped in `use cache` so Next governs the TTL. This is deliberate: the old
 * hand-rolled `Date.now()` module TTL read the wall clock, and this loader is
 * the FIRST call inside `getCachedMatchStory`'s `use cache` body — so that
 * `Date.now()` executed inside a cache scope, turning `getCachedMatchStory`
 * into a dynamic `use cache` that never committed. The result: a
 * HANGING_PROMISE_REJECTION and an 8.9MB model re-download on every map render.
 * `fetchLatest()` takes no arguments and reads only the deterministic
 * `featureHash()`, so it is safe to cache; `publishArtifact` busts the tag.
 */
export async function loadLatestArtifact(): Promise<ModelArtifact | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTIFACT_TAG);
  return fetchLatest();
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
  // Drop the cached artifact so the freshly-published model is served
  // immediately instead of waiting out the `cacheLife` window.
  revalidateTag(ARTIFACT_TAG, "hours");
  return { key, modelVersion };
}
