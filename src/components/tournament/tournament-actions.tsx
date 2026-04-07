"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TournamentStatus } from "@prisma/client";
import { MoreHorizontal, Play, Square, Ban, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type TournamentActionsProps = {
  tournamentId: number;
  currentStatus: TournamentStatus;
};

const statusTransitions: Record<
  TournamentStatus,
  { label: string; value: TournamentStatus; icon: typeof Play }[]
> = {
  DRAFT: [
    { label: "Start Tournament", value: "ACTIVE", icon: Play },
    { label: "Cancel Tournament", value: "CANCELLED", icon: Ban },
  ],
  ACTIVE: [
    { label: "Mark as Completed", value: "COMPLETED", icon: Square },
    { label: "Cancel Tournament", value: "CANCELLED", icon: Ban },
  ],
  COMPLETED: [],
  CANCELLED: [{ label: "Revert to Draft", value: "DRAFT", icon: RotateCcw }],
};

export function TournamentActions({
  tournamentId,
  currentStatus,
}: TournamentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const transitions = statusTransitions[currentStatus];
  if (transitions.length === 0) return null;

  async function updateStatus(newStatus: TournamentStatus) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        throw new Error(errBody.error ?? "Failed to update tournament");
      }

      toast.success(`Tournament status updated to ${newStatus}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={loading}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {transitions.map((transition) => (
          <DropdownMenuItem
            key={transition.value}
            onClick={() => updateStatus(transition.value)}
            variant={
              transition.value === "CANCELLED" ? "destructive" : "default"
            }
          >
            <transition.icon />
            {transition.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
