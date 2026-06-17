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

import { POST } from "@/app/api/user/banner-upload/route";
import { $Enums } from "@/generated/prisma/browser";
import { beforeEach, describe, expect, it, vi } from "vitest";

function pngRequest() {
  const bytes = new Uint8Array([1, 2, 3]);
  return new Request("http://t/api/user/banner-upload", {
    method: "POST",
    headers: {
      "content-type": "image/png",
      "content-length": String(bytes.length),
    },
    body: bytes,
  });
}

describe("POST /api/user/banner-upload", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    upload.mockReset();
    userUpdate.mockReset();
    limit.mockReset();
    createAuditLog.mockReset();
    track.mockReset();
    limit.mockResolvedValue({ success: true });
    upload.mockResolvedValue({ key: "banners/user_1.png" });
    userUpdate.mockResolvedValue({});
  });

  it("uploads and writes bannerImage for a premium user", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "a@b.com",
      billingPlan: $Enums.BillingPlan.PREMIUM,
      role: $Enums.UserRole.USER,
    });
    const res = await POST(pngRequest());
    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "banners/user_1.png",
        contentType: "image/png",
      })
    );
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        bannerImage: expect.stringMatching(
          /^\/api\/image\/banner\/user_1\?v=\d+$/
        ),
      },
    });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_BANNER_UPDATED" })
    );
  });

  it("returns 403 for a non-premium, non-admin user", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "a@b.com",
      billingPlan: $Enums.BillingPlan.FREE,
      role: $Enums.UserRole.USER,
    });
    const res = await POST(pngRequest());
    expect(res.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });
});
