import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

export function InsufficientScrimsPlaceholder({
  scrimCount,
}: {
  scrimCount: number;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BarChart3 />
        </EmptyMedia>
        <EmptyTitle>At least two scrims required</EmptyTitle>
        <EmptyDescription>
          Team stats need at least two scrims to reliably identify which side
          your team played on each map. You currently have{" "}
          {scrimCount === 0
            ? "no scrims"
            : `${scrimCount} scrim${scrimCount === 1 ? "" : "s"}`}{" "}
          uploaded. Upload another to unlock the full stats dashboard.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/dashboard">Upload a scrim</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
