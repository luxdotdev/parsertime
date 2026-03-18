type StatRowProps = {
  label: string;
  team1Value: string;
  team2Value: string;
  team1Color: string;
  team2Color: string;
};

export function StatRow({
  label,
  team1Value,
  team2Value,
  team1Color,
  team2Color,
}: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: team1Color }}
      >
        {team1Value}
      </span>
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: team2Color }}
      >
        {team2Value}
      </span>
    </div>
  );
}
