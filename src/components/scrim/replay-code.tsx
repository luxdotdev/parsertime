"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

export function ReplayCode({ replayCode }: { replayCode: string }) {
  const t = useTranslations("scrimPage.replayCode");

  function handleClick({ replayCode }: { replayCode: string }) {
    void navigator.clipboard.writeText(replayCode);
    toast({
      title: t("onClick.title"),
      description: t("onClick.description"),
      duration: 5000,
    });
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="link" onClick={() => handleClick({ replayCode })}>
            <p className="z-10 font-semibold tracking-tight text-white">
              {replayCode}
            </p>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("title")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
