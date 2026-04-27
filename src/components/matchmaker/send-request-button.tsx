"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  fromTeamId: number;
  toTeamId: number;
  disabledReason: string | null;
};

export function SendRequestButton({
  fromTeamId,
  toTeamId,
  disabledReason,
}: Props) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onClick() {
    if (disabledReason || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/matchmaker/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromTeamId, toTeamId }),
      });
      if (res.ok) {
        toast.success("Scrim request sent");
        router.push(`/matchmaker/${fromTeamId}`);
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error(body.error ?? "Couldn't send scrim request");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={!!disabledReason || pending}
      className="h-10 w-full rounded-md text-sm"
      title={disabledReason ?? undefined}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {disabledReason ?? "Send scrim request"}
    </Button>
  );
}
