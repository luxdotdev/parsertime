/**
 * Why a team invite could not be redeemed. Mirrors the JSON body returned by
 * `POST /api/team/join-team` on failure so the client can explain the problem
 * instead of collapsing everything into "invalid token".
 */
export type RedeemTeamInviteFailure =
  | { reason: "unauthorized" }
  | { reason: "invalid" }
  | { reason: "expired" }
  | { reason: "email_mismatch"; invitedEmail: string; currentEmail: string }
  | { reason: "error" };

export type RedeemTeamInviteResult =
  | { ok: true }
  | ({ ok: false } & RedeemTeamInviteFailure);

/**
 * Masks an email address for display to someone other than its owner, e.g.
 * `humjavi06@gmail.com` → `h•••@gmail.com`. Keeps the domain so the reader can
 * still recognise which of their accounts an invite was addressed to.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "•••";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local[0]}•••@${domain}`;
}

function isFailure(value: unknown): value is RedeemTeamInviteFailure {
  if (!value || typeof value !== "object" || !("reason" in value)) return false;
  const { reason } = value;
  if (reason === "email_mismatch") {
    return (
      "invitedEmail" in value &&
      typeof value.invitedEmail === "string" &&
      "currentEmail" in value &&
      typeof value.currentEmail === "string"
    );
  }
  return (
    reason === "unauthorized" ||
    reason === "invalid" ||
    reason === "expired" ||
    reason === "error"
  );
}

export async function redeemTeamInvite(
  token: string
): Promise<RedeemTeamInviteResult> {
  const search = new URLSearchParams({ token });
  const response = await fetch(`/api/team/join-team?${search}`, {
    method: "POST",
  });

  if (response.ok) return { ok: true };
  if (response.status === 401) return { ok: false, reason: "unauthorized" };

  try {
    const body: unknown = await response.json();
    if (isFailure(body)) return { ok: false, ...body };
  } catch {
    // Non-JSON error body (proxy error page, etc.) — fall through.
  }

  return { ok: false, reason: "error" };
}
