"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FormattedMapGroup } from "@/types/map-group";
import { useQuery } from "@tanstack/react-query";
import { Check, FolderCog, FolderOpen, Loader2 } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

type MapGroupComparisonSelectorProps = {
  teamId: number;
  onSelect: (groupIds: number[]) => void;
};

async function fetchMapGroups(teamId: number): Promise<FormattedMapGroup[]> {
  const response = await fetch(`/api/compare/map-groups?teamId=${teamId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch map groups");
  }
  const data = (await response.json()) as {
    success: boolean;
    groups: FormattedMapGroup[];
  };
  return data.groups;
}

export function MapGroupComparisonSelector({
  teamId,
  onSelect,
}: MapGroupComparisonSelectorProps) {
  const t = useTranslations("comparePage.mapGroupSelector");
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  const { data: mapGroups, isLoading } = useQuery({
    queryKey: ["mapGroups", teamId],
    queryFn: () => fetchMapGroups(teamId),
    staleTime: 5 * 60 * 1000,
  });

  function handleToggleGroup(groupId: number) {
    setSelectedGroups((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      }
      // Limit to 2 groups for comparison
      if (prev.length >= 2) {
        return [prev[1], groupId];
      }
      return [...prev, groupId];
    });
  }

  function handleCompare() {
    if (selectedGroups.length > 0) {
      onSelect(selectedGroups);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!mapGroups || mapGroups.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-muted/50 mx-auto flex size-16 items-center justify-center rounded-full">
          <FolderOpen className="text-muted-foreground size-8" />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-semibold">{t("noGroups.title")}</h4>
          <p className="text-muted-foreground text-xs">
            {t("noGroups.description")}
          </p>
        </div>
        <Link href={`/${teamId}/map-groups` as Route}>
          <Button size="sm" variant="outline">
            <FolderCog className="mr-2 size-4" />
            {t("noGroups.createButton")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-left">
        <h4 className="text-sm font-semibold">{t("title")}</h4>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
      </div>

      <div className="max-h-[300px] space-y-2 overflow-y-auto">
        {mapGroups.map((group) => {
          const isSelected = selectedGroups.includes(group.id);
          return (
            <Card
              key={group.id}
              className={cn(
                "hover:bg-muted/50 cursor-pointer transition-colors",
                isSelected && "bg-primary/5 border-primary ring-primary ring-1"
              )}
              onClick={() => handleToggleGroup(group.id)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div
                  className={cn(
                    "border-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible"
                  )}
                >
                  <Check className="size-3.5 stroke-[3]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="truncate font-medium">{group.name}</span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs tabular-nums"
                    >
                      {group.mapCount}
                    </Badge>
                  </div>
                  {group.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {group.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-left">
        <p className="text-muted-foreground text-xs">
          {selectedGroups.length === 0
            ? t("hint.selectGroups")
            : selectedGroups.length === 1
              ? t("hint.selectOneMore")
              : t("hint.readyToCompare")}
        </p>
        <Button
          onClick={handleCompare}
          disabled={selectedGroups.length === 0}
          size="sm"
        >
          {t("compareButton")}
        </Button>
      </div>
    </div>
  );
}
