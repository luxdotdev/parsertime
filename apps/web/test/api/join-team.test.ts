const auth = vi.fn();
const findUnique = vi.fn();
const deleteMany = vi.fn();
const teamUpdate = vi.fn();
const createAuditLog = vi.fn();
const loggerError = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        teamInviteToken: {
          findUnique: (a: unknown) => findUnique(a),
          deleteMany: (a: unknown) => deleteMany(a),
        },
        team: { update: (a: unknown) => teamUpdate(a) },
      }),
  },
}));
vi.mock("@/lib/logger", () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: (...a: unknown[]) => loggerError(...a),
  },
}));
vi.mock("@/lib/audit-logs", () => ({
  auditLog: { createAuditLog: (a: unknown) => createAuditLog(a) },
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

import { POST } from "@/app/api/team/join-team/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SESSION_EMAIL = "enderberto0610@gmail.com";
const FUTURE = new Date(Date.now() + 60_000);
const PAST = new Date(Date.now() - 60_000);

function request(token = "tok") {
  return new NextRequest(`http://t/api/team/join-team?token=${token}`, {
    method: "POST",
  });
}

describe("POST /api/team/join-team", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { email: SESSION_EMAIL } });
    findUnique.mockReset();
    deleteMany.mockReset().mockResolvedValue({ count: 1 });
    teamUpdate.mockReset().mockResolvedValue({ id: 675, name: "Team" });
    createAuditLog.mockReset();
    loggerError.mockReset();
  });

  it("returns 403 email_mismatch with a masked invitee and the session email", async () => {
    findUnique.mockResolvedValue({
      teamId: 675,
      email: "humjavi06@gmail.com",
      expires: FUTURE,
    });

    const res = await POST(request());

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      reason: "email_mismatch",
      invitedEmail: "h•••@gmail.com",
      currentEmail: SESSION_EMAIL,
    });
    // Token must survive so the user can retry after switching accounts.
    expect(deleteMany).not.toHaveBeenCalled();
    expect(teamUpdate).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith("Team invite email mismatch", {
      invitedEmail: "humjavi06@gmail.com",
      sessionEmail: SESSION_EMAIL,
    });
  });

  it("returns 410 expired for a stale token", async () => {
    findUnique.mockResolvedValue({
      teamId: 675,
      email: SESSION_EMAIL,
      expires: PAST,
    });

    const res = await POST(request());

    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toEqual({ reason: "expired" });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("returns 404 invalid for an unknown token", async () => {
    findUnique.mockResolvedValue(null);

    const res = await POST(request());

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ reason: "invalid" });
  });

  it("returns 404 invalid when the token was consumed concurrently", async () => {
    findUnique.mockResolvedValue({
      teamId: 675,
      email: SESSION_EMAIL,
      expires: FUTURE,
    });
    deleteMany.mockResolvedValue({ count: 0 });

    const res = await POST(request());

    expect(res.status).toBe(404);
    expect(teamUpdate).not.toHaveBeenCalled();
  });

  it("joins the team when the session email matches, case-insensitively", async () => {
    findUnique.mockResolvedValue({
      teamId: 675,
      email: "EnderBerto0610@gmail.com",
      expires: FUTURE,
    });

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(teamUpdate).toHaveBeenCalledWith({
      where: { id: 675 },
      data: { users: { connect: { email: SESSION_EMAIL } } },
      select: { id: true, name: true },
    });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TEAM_JOINED",
        userEmail: SESSION_EMAIL,
      })
    );
  });

  it("rejects unauthenticated requests", async () => {
    auth.mockResolvedValue(null);

    await expect(POST(request())).rejects.toThrow("UNAUTHORIZED");
  });
});
