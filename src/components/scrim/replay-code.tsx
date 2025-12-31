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
            asChild
            className="text-md -mt-4 mb-2 p-0"
            onClick={() => handleClick({ replayCode })}
          >
            <h3>{t("code", { replayCode })}</h3>
          </Button>
        ) : (
          <Button variant="link" onClick={() => handleClick({ replayCode })}>
            <p className="z-10 font-semibold tracking-tight text-white">
              {replayCode}
            </p>
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{t("title")}</TooltipContent>
    </Tooltip>
  );
}
