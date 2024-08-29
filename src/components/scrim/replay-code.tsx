"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

function handleClick({ replayCode }: { replayCode: string }) {
  navigator.clipboard.writeText(replayCode);
  toast({
    title: "Copied to clipboard!",
    description: "Replay code copied to clipboard.",
    duration: 5000,
  });
}

export function ReplayCode({ replayCode }: { replayCode: string }) {
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
        <TooltipContent>Replay Code (click to copy)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
