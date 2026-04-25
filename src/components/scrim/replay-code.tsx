"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function ReplayCode({
  replayCode,
  subtitle = false,
}: {
  replayCode: string;
  subtitle?: boolean;
}) {
  const t = useTranslations("scrimPage.replayCode");

  function handleClick({ replayCode }: { replayCode: string }) {
    void navigator.clipboard.writeText(replayCode);
    toast.success(t("onClick.title"), {
      description: t("onClick.description"),
      duration: 5000,
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {subtitle ? (
          <Button
            variant="link"
            className="h-auto p-0 text-base font-mono tabular-nums"
            onClick={() => handleClick({ replayCode })}
          >
            {t("code", { replayCode })}
          </Button>
        ) : (
          <Button variant="link" onClick={() => handleClick({ replayCode })}>
            <p className="z-10 font-semibold tracking-tight">{replayCode}</p>
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{t("title")}</TooltipContent>
    </Tooltip>
  );
}
