import { featureHash } from "@/lib/win-probability/features";
import type { ModelArtifact } from "@/lib/win-probability/model";
import { beforeEach, describe, expect, test, vi } from "vitest";

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
// `loadLatestArtifact` is now a `use cache` function; caching + TTL are Next's
// responsibility (governed by `cacheLife`), not a hand-rolled module cache.
// Outside the Next runtime these are no-ops so we can exercise the fetch logic.
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

import {
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
  download.mockReset();
  upload.mockReset();
  upload.mockResolvedValue({ key: "x" });
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
  test("resolves the live model via the pointer", async () => {
    stubDownloads(2, artifact());
    const result = await loadLatestArtifact();
    expect(result?.modelVersion).toBe(2);
    expect(download).toHaveBeenCalledWith("wp-models/latest.json");
    expect(download).toHaveBeenCalledWith("wp-models/model-v2.json");
  });

  test("returns null on download failure without throwing", async () => {
    download.mockRejectedValue(new Error("boom"));
    expect(await loadLatestArtifact()).toBeNull();
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
