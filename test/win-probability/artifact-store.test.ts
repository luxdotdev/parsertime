import { featureHash } from "@/lib/win-probability/features";
import type { ModelArtifact } from "@/lib/win-probability/model";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const download = vi.fn();
const upload = vi.fn();
vi.mock("@/lib/r2", () => ({
  r2: {
    download: (key: string) => download(key),
    upload: (args: unknown) => upload(args),
  },
}));
vi.mock("@/lib/logger", () => ({
  Logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
  __resetArtifactCacheForTests,
  loadLatestArtifact,
  publishArtifact,
} from "@/lib/win-probability/artifact-store";

function artifact(overrides: Partial<ModelArtifact> = {}): ModelArtifact {
  return {
    schemaVersion: 1,
    modelVersion: 2,
    createdAt: "2026-06-12T00:00:00.000Z",
    featureHash: featureHash(),
    modeFamilies: {
      control: null,
      escort_hybrid: null,
      push: null,
      flashpoint: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  download.mockReset();
  upload.mockReset();
  upload.mockResolvedValue({ key: "x" });
  __resetArtifactCacheForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

function stubDownloads(pointerVersion: number, model: ModelArtifact) {
  download.mockImplementation((key: string) => {
    if (key === "wp-models/latest.json") {
      return Promise.resolve(
        Buffer.from(
          JSON.stringify({
            key: `wp-models/model-v${pointerVersion}.json`,
            modelVersion: pointerVersion,
          })
        )
      );
    }
    return Promise.resolve(Buffer.from(JSON.stringify(model)));
  });
}

describe("loadLatestArtifact", () => {
  test("loads via the pointer and caches within the TTL", async () => {
    stubDownloads(2, artifact());
    const first = await loadLatestArtifact();
    expect(first?.modelVersion).toBe(2);
    expect(download).toHaveBeenCalledTimes(2); // pointer + model

    await loadLatestArtifact();
    expect(download).toHaveBeenCalledTimes(2); // cached

    vi.advanceTimersByTime(61 * 60 * 1000);
    await loadLatestArtifact();
    expect(download).toHaveBeenCalledTimes(4); // TTL expired → refetched
  });

  test("returns null on download failure without throwing, and caches the failure", async () => {
    download.mockRejectedValue(new Error("boom"));
    expect(await loadLatestArtifact()).toBeNull();
    expect(await loadLatestArtifact()).toBeNull();
    expect(download).toHaveBeenCalledTimes(1); // one attempt per TTL window
  });

  test("returns null on feature hash mismatch", async () => {
    stubDownloads(2, artifact({ featureHash: "deadbeef0000" }));
    expect(await loadLatestArtifact()).toBeNull();
  });

  test("returns null on malformed JSON", async () => {
    download.mockResolvedValue(Buffer.from("not json"));
    expect(await loadLatestArtifact()).toBeNull();
  });
});

describe("publishArtifact", () => {
  test("writes model-v(n+1) then advances the pointer, in that order", async () => {
    stubDownloads(2, artifact());
    const result = await publishArtifact(artifact());
    expect(result.modelVersion).toBe(3);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][0].key).toBe("wp-models/model-v3.json");
    expect(upload.mock.calls[1][0].key).toBe("wp-models/latest.json");
  });

  test("starts at v1 when no pointer exists", async () => {
    download.mockRejectedValue(new Error("404"));
    const result = await publishArtifact(artifact());
    expect(result.modelVersion).toBe(1);
  });
});
