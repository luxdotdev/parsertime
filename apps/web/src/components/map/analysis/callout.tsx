import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CalloutProps = {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Callout({ icon, children, className }: CalloutProps) {
  return (
    <div
      className={cn(
        "bg-muted/50 border-border flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        className
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
