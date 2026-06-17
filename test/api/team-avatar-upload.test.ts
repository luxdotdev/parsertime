const getCurrentUser = vi.fn();
const canManageTeam = vi.fn();
const upload = vi.fn();
const teamUpdate = vi.fn();
const limit = vi.fn();
const createAuditLog = vi.fn();
const track = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUser(),
  canManageTeam: (...a: unknown[]) => canManageTeam(...a),
}));
vi.mock("@/lib/r2", () => ({ r2: { upload: (a: unknown) => upload(a) } }));
vi.mock("@/lib/prisma", () => ({
  default: { team: { update: (a: unknown) => teamUpdate(a) } },
}));
vi.mock("@/lib/logger", () => ({
  Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/audit-logs", () => ({
  auditLog: { createAuditLog: (a: unknown) => createAuditLog(a) },
}));
vi.mock("@vercel/analytics/server", () => ({
  track: (...a: unknown[]) => track(...a),
}));
vi.mock("@vercel/kv", () => ({ kv: {} }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    limit(key: string) {
      return limit(key);
    }
  },
}));
vi.mock("next/navigation", () => ({
  unauthorized: () => {
    throw new Error("UNAUTHORIZED");
  },
}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => void cb() };
});

import { POST } from "@/app/api/team/avatar-upload/route";
import { beforeEach, describe, expect, it, vi } from "vitest";

function pngRequest(teamId = "42") {
  const bytes = new Uint8Array([1, 2, 3]);
  return new Request(`http://t/api/team/avatar-upload?teamId=${teamId}`, {
    method: "POST",
    headers: {
      "content-type": "image/png",
      "content-length": String(bytes.length),
    },
    body: bytes,
  });
}

describe("POST /api/team/avatar-upload", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    canManageTeam.mockReset();
    upload.mockReset();
    teamUpdate.mockReset();
    limit.mockReset();
    createAuditLog.mockReset();
    track.mockReset();
    getCurrentUser.mockResolvedValue({ id: "user_1", email: "a@b.com" });
    canManageTeam.mockResolvedValue(true);
    limit.mockResolvedValue({ success: true });
    upload.mockResolvedValue({ key: "team-avatars/42.png" });
    teamUpdate.mockResolvedValue({ id: 42, name: "Cool Team", image: "" });
  });

  it("uploads and writes team image for a manager", async () => {
    teamUpdate.mockResolvedValue({
      id: 42,
      name: "Cool Team",
      image: "/api/image/team/42?v=1700000000000",
    });
    const res = await POST(pngRequest());
    expect(res.status).toBe(200);
    expect(canManageTeam).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ id: "user_1" })
    );
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "team-avatars/42.png",
        contentType: "image/png",
      })
    );
    expect(teamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: {
          image: expect.stringMatching(/^\/api\/image\/team\/42\?v=\d+$/),
        },
      })
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TEAM_AVATAR_UPDATED" })
    );
  });

  it("returns 400 for a missing/invalid teamId", async () => {
    const req = new Request("http://t/api/team/avatar-upload", {
      method: "POST",
      headers: { "content-type": "image/png", "content-length": "3" },
      body: new Uint8Array([1, 2, 3]),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it("returns 403 when the user cannot manage the team", async () => {
    canManageTeam.mockResolvedValue(false);
    const res = await POST(pngRequest());
    expect(res.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });
});
