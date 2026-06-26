const getCurrentUser = vi.fn();
const upload = vi.fn();
const userUpdate = vi.fn();
const limit = vi.fn();
const createAuditLog = vi.fn();
const track = vi.fn();

vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/r2", () => ({ r2: { upload: (a: unknown) => upload(a) } }));
vi.mock("@/lib/prisma", () => ({
  default: { user: { update: (a: unknown) => userUpdate(a) } },
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

import { POST } from "@/app/api/user/avatar-upload/route";
import { beforeEach, describe, expect, it, vi } from "vitest";

function pngRequest(bytes = new Uint8Array([1, 2, 3])) {
  return new Request("http://t/api/user/avatar-upload", {
    method: "POST",
    headers: {
      "content-type": "image/png",
      "content-length": String(bytes.length),
    },
    body: bytes,
  });
}

describe("POST /api/user/avatar-upload", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    upload.mockReset();
    userUpdate.mockReset();
    limit.mockReset();
    createAuditLog.mockReset();
    track.mockReset();
    getCurrentUser.mockResolvedValue({ id: "user_1", email: "a@b.com" });
    limit.mockResolvedValue({ success: true });
    upload.mockResolvedValue({ key: "avatars/user_1.png" });
    userUpdate.mockResolvedValue({});
  });

  it("uploads to R2, writes a relative proxy path, audit-logs", async () => {
    const res = await POST(pngRequest());
    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "avatars/user_1.png",
        contentType: "image/png",
      })
    );
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        image: expect.stringMatching(/^\/api\/image\/avatar\/user_1\?v=\d+$/),
      },
    });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_AVATAR_UPDATED" })
    );
    const json = (await res.json()) as { url: string };
    expect(json.url).toMatch(/^\/api\/image\/avatar\/user_1\?v=\d+$/);
  });

  it("rejects non-PNG with 415", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      headers: { "content-type": "image/jpeg", "content-length": "3" },
      body: new Uint8Array([1, 2, 3]),
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects oversize via content-length with 413", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      headers: {
        "content-type": "image/png",
        "content-length": String(6 * 1024 * 1024),
      },
      body: new Uint8Array([1]),
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(upload).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    limit.mockResolvedValue({ success: false });
    const res = await POST(pngRequest());
    expect(res.status).toBe(429);
    expect(upload).not.toHaveBeenCalled();
  });

  it("throws unauthorized when no session", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(POST(pngRequest())).rejects.toThrow("UNAUTHORIZED");
  });
});
