import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BillingPlan } from "@prisma/client";
import { Heart } from "lucide-react";

export function SupporterHeart({
  billingPlan,
  className,
}: {
  billingPlan: BillingPlan;
  className?: string;
}) {
  if (billingPlan === BillingPlan.FREE) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Heart
          className={cn(
            className,
            billingPlan === BillingPlan.BASIC
              ? "fill-rose-500 text-rose-500"
              : // add a glow for the premium heart
                "fill-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        {billingPlan === BillingPlan.BASIC ? "Supporter" : "Premium Supporter"}
      </TooltipContent>
    </Tooltip>
  );
}
