"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReloadIcon } from "@radix-ui/react-icons";
import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { toast } from "sonner";

type Props = {
  teamId: number;
  playerName: string;
  displayName: string;
  isSubstitute: boolean;
};

export function SubstituteToggle({
  teamId,
  playerName,
  displayName,
  isSubstitute,
}: Props) {
  const t = useTranslations("teamStatsPage.teamRosterGrid");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const endpoint = isSubstitute
      ? "/api/team/unmark-substitute"
      : "/api/team/mark-substitute";

    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ teamId: String(teamId), playerName }),
    });

    setLoading(false);

    if (res.ok) {
      toast.success(
        isSubstitute
          ? t("unmarkSuccess", { player: displayName })
          : t("markSuccess", { player: displayName })
      );
      router.refresh();
    } else {
      toast.error(t("errorTitle"), {
        description: t("errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("manageSubstitute")}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground size-7"
        >
          {loading ? (
            <ReloadIcon className="size-3.5 animate-spin" />
          ) : (
            <MoreVertical className="size-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => startTransition(() => void toggle())}>
          {isSubstitute ? t("unmarkSubstitute") : t("markSubstitute")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
