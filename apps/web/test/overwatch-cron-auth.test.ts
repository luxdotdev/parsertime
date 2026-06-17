import { expect, test, vi, beforeEach } from "vitest";

vi.mock("@/lib/overwatch/patch-scraper", () => ({
  scrapeRecent: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/data/overwatch/patches-service", () => ({
  upsertScrapedPatches: vi
    .fn()
    .mockResolvedValue({ inserted: 0, updated: 0, skipped: 0 }),
}));

import { GET } from "@/app/api/cron/scrape-patch-notes/route";

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret-value";
});

function req(auth?: string): Request {
  return new Request("https://x.test/api/cron/scrape-patch-notes", {
    headers: auth ? { Authorization: auth } : {},
  });
}

test("rejects a missing token with 401", async () => {
  const res = await GET(req());
  expect(res.status).toBe(401);
});

test("rejects a wrong token with 401", async () => {
  const res = await GET(req("Bearer wrong-secret-value"));
  expect(res.status).toBe(401);
});

test("fails closed with 500 when the secret is unset", async () => {
  delete process.env.CRON_SECRET;
  const res = await GET(req("Bearer anything"));
  expect(res.status).toBe(500);
});

test("accepts the correct token", async () => {
  const res = await GET(req("Bearer test-secret-value"));
  expect(res.status).toBe(200);
});
