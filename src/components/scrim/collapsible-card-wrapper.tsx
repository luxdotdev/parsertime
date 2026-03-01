"use client";

import {
  Card,
  CardHeader,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function CollapsibleCard({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">{header}</div>
            <CollapsibleTrigger
              className="text-muted-foreground hover:text-foreground -mr-1 shrink-0 rounded-md p-1.5 transition-colors"
              aria-label={open ? "Collapse overview" : "Expand overview"}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
