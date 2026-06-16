import { featureHash } from "@/lib/win-probability/features";
import type { FamilyModel } from "@/lib/win-probability/model";
import type { ModeFamily } from "@/lib/win-probability/types";
import { gzipSync } from "node:zlib";
import { beforeEach, expect, test, vi } from "vitest";

const { loadLatestArtifact, publishArtifact } = vi.hoisted(() => ({
  loadLatestArtifact: vi.fn(),
  publishArtifact: vi.fn(),
}));
vi.mock("@/lib/win-probability/artifact-store", () => ({
  loadLatestArtifact,
  publishArtifact,
}));
vi.mock("@/lib/logger", () => ({
  Logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/cron/wp-publish/route";

function gbm(logLoss: number): FamilyModel {
  return {
    kind: "gbm",
    trees: [],
    baseScore: 0,
    sampleCount: 1,
    metrics: { logLoss, brier: 0.2, baseRate: 0.5 },
  };
}

type Candidate = {
  schemaVersion: 1;
  featureHash: string;
  modeFamilies: Record<ModeFamily, FamilyModel | null>;
  gates: Partial<Record<ModeFamily, boolean>>;
};

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    schemaVersion: 1,
    featureHash: featureHash(),
    modeFamilies: {
      control: gbm(0.5),
      escort_hybrid: null,
      push: null,
      flashpoint: null,
    },
    gates: { control: true },
    ...overrides,
  };
}

function gzReq(body: Candidate, auth = "Bearer test-secret-value"): Request {
  return new Request("https://x.test/api/cron/wp-publish", {
    method: "POST",
    headers: { Authorization: auth, "Content-Encoding": "gzip" },
    body: new Uint8Array(gzipSync(Buffer.from(JSON.stringify(body)))),
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret-value";
  loadLatestArtifact.mockReset().mockResolvedValue(null);
  publishArtifact
    .mockReset()
    .mockResolvedValue({ key: "model-v9.json", modelVersion: 9 });
});

test("rejects an unauthorized request", async () => {
  const res = await POST(gzReq(candidate(), "Bearer wrong"));
  expect(res.status).toBe(401);
  expect(publishArtifact).not.toHaveBeenCalled();
});

test("400s on a feature hash mismatch", async () => {
  const res = await POST(gzReq(candidate({ featureHash: "deadbeef" })));
  expect(res.status).toBe(400);
  expect(publishArtifact).not.toHaveBeenCalled();
});

test("decodes gzip, ships the gated challenger with no incumbent, publishes", async () => {
  const res = await POST(gzReq(candidate()));
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    key: string;
    modelVersion: number;
    shipped: Record<string, string | null>;
  };
  expect(body).toMatchObject({ key: "model-v9.json", modelVersion: 9 });
  expect(body.shipped.control).toBe("gbm");
  expect(publishArtifact).toHaveBeenCalledTimes(1);
  const published = publishArtifact.mock.calls[0][0] as {
    modeFamilies: Record<ModeFamily, FamilyModel | null>;
  };
  expect(published.modeFamilies.control?.metrics?.logLoss).toBe(0.5);
});

test("carries the live incumbent forward when the challenger is worse", async () => {
  const incumbent = gbm(0.3);
  loadLatestArtifact.mockResolvedValue({
    schemaVersion: 1,
    modelVersion: 8,
    createdAt: "x",
    featureHash: featureHash(),
    modeFamilies: {
      control: incumbent,
      escort_hybrid: null,
      push: null,
      flashpoint: null,
    },
  });
  await POST(gzReq(candidate()));
  const published = publishArtifact.mock.calls[0][0] as {
    modeFamilies: Record<ModeFamily, FamilyModel | null>;
  };
  // challenger logLoss 0.5 > incumbent 0.3 → incumbent carried forward.
  expect(published.modeFamilies.control?.metrics?.logLoss).toBe(0.3);
});

test("accepts a plain-JSON body (no Content-Encoding) for manual testing", async () => {
  const res = await POST(
    new Request("https://x.test/api/cron/wp-publish", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret-value" },
      body: JSON.stringify(candidate()),
    })
  );
  expect(res.status).toBe(200);
  expect(publishArtifact).toHaveBeenCalledTimes(1);
});
