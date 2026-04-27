export function renderScrimRequestMessage(input: {
  fromTeamName: string;
  fromBracketLabel: string;
  fromTsr: number;
  toTsr: number;
}): string {
  const delta = input.fromTsr - input.toTsr;
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
  const formatted = `${sign}${Math.abs(delta)}`;
  return `${input.fromTeamName} (${input.fromBracketLabel} · TSR ${input.fromTsr}) is looking for a scrim. They're ${formatted} TSR from your roster.`;
}
