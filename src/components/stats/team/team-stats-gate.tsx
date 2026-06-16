import { InsufficientScrimsPlaceholder } from "@/components/stats/team/insufficient-scrims-placeholder";

export function TeamStatsGate({ scrimCount }: { scrimCount: number }) {
  return (
    <div className="mt-8">
      <InsufficientScrimsPlaceholder scrimCount={scrimCount} />
    </div>
  );
}
