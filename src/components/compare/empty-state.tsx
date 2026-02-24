"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, TrendingDown, UserX } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: "MapPin" | "UserX" | "TrendingDown" | "Loader";
  title: string;
  description: string;
  children?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  const Icon =
    icon === "MapPin"
      ? MapPin
      : icon === "UserX"
        ? UserX
        : icon === "TrendingDown"
          ? TrendingDown
          : Loader2;

  return (
    <Card>
      <CardContent className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
        <Icon className="text-muted-foreground h-16 w-16" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>
        {children && <div className="mt-4 w-full max-w-md">{children}</div>}
      </CardContent>
    </Card>
  );
}
