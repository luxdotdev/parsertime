"use client";

import { Button } from "@/components/ui/button";
import CardIcon from "@/components/ui/card-icon";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "@/components/ui/use-toast";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const WORKSHOP_CODE_LITERAL = "DKEEH";

export function WorkshopCode() {
  const [codeCopied, setCodeCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(WORKSHOP_CODE_LITERAL);
    setCodeCopied(true);
    toast({
      title: `Copied Scrim Code to Clipboard: ${WORKSHOP_CODE_LITERAL}`,
      description: `Code ${WORKSHOP_CODE_LITERAL} has been copied to the clipboard.`,
    });
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" className="group p-2" onClick={copyCode}>
            <div className="w-0 truncate text-clip md:group-hover:w-auto">
              {WORKSHOP_CODE_LITERAL}
            </div>
            <div className="ml-0 md:group-hover:ml-2">
              <CardIcon>
                <rect
                  className="dark:stroke-gray-100"
                  width="14"
                  height="14"
                  x="8"
                  y="8"
                  rx="2"
                  ry="2"
                />
                <path
                  className="dark:stroke-gray-100"
                  d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
                />
                <path
                  className={cn(
                    codeCopied ? "dark:stroke-gray-100" : "stroke-none"
                  )}
                  d="m12 15 3 3 6-6"
                />
              </CardIcon>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy Workshop Code</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
