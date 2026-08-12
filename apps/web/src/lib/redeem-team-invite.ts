export function redeemTeamInvite(token: string): Promise<Response> {
  const search = new URLSearchParams({ token });
  return fetch(`/api/team/join-team?${search}`, { method: "POST" });
}
