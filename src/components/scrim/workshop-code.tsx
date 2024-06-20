"use client";
import { Button } from "@/components/ui/button"
import CardIcon from "../ui/card-icon";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export const workshopCodeLiteral = "DKEEH";

export default function WorkshopCode() {
  const [codeCopied, setCodeCopied] = useState(false);
  const { toast } = useToast();

  const copiedNotification = "Copied Scrim Code: ".concat(workshopCodeLiteral);

  function copyCode() {
    navigator.clipboard.writeText(workshopCodeLiteral);
    setCodeCopied(true); 
    toast({
      title: copiedNotification,
      duration: 3000,
    });
  }
 
  return (
    <Button variant="ghost" className="group p-2 border-solid border-2 border-gray-300" onClick={copyCode}>
      <div className="w-0 md:group-hover:w-auto truncate text-clip">{workshopCodeLiteral}</div>
      <div className="ml-0 md:group-hover:ml-2">
        <CardIcon>
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          <path className={codeCopied ? "stroke-gray-600" : "stroke-none"} d="m12 15 3 3 6-6" />
        </CardIcon>
      </div>
    </Button>
  );
}