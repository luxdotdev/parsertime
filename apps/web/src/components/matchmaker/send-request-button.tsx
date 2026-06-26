"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("matchmaker");
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
        toast.success(t("send-success"));
        router.push(`/matchmaker/${fromTeamId}`);
        router.refresh();
        return;
      }
      toast.error(getSendError(res.status, t));
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
      {disabledReason ?? t("send-button")}
    </Button>
  );
}

function getSendError(status: number, t: ReturnType<typeof useTranslations>) {
  switch (status) {
    case 409:
      return t("send-error-409");
    case 422:
      return t("send-error-422");
    case 429:
      return t("send-error-429");
    default:
      return t("send-error-generic");
  }
}
