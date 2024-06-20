"use client";

import { Button } from "@/components/ui/button";
import CardIcon from "@/components/ui/card-icon";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export const workshopCodeLiteral = "DKEEH";

export function WorkshopCode() {
  const [codeCopied, setCodeCopied] = useState(false);
  const { toast } = useToast();

  function copyCode() {
    navigator.clipboard.writeText(workshopCodeLiteral);
    setCodeCopied(true);
    toast({
      title: `Copied Scrim Code: ${workshopCodeLiteral}`,
    });
  }

  return (
    <Button
      variant="ghost"
      className="group border-2 border-solid border-gray-300 p-2"
      onClick={copyCode}
    >
      <div className="w-0 truncate text-clip md:group-hover:w-auto">
        {workshopCodeLiteral}
      </div>
      <div className="ml-0 md:group-hover:ml-2">
        <CardIcon>
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          <path
            className={cn(codeCopied ? "stroke-gray-600" : "stroke-none")}
            d="m12 15 3 3 6-6"
          />
        </CardIcon>
      </div>
    </Button>
  );
}
