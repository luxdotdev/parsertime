"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FormattedMapGroup } from "@/types/map-group";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, FolderOpen, Loader2, X } from "lucide-react";
import { useState } from "react";

type MapGroupSelectorProps = {
  teamId: number;
  value: number[];
  onChange: (groupIds: number[]) => void;
  multiSelect?: boolean;
  placeholder?: string;
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

export function MapGroupSelector({
  teamId,
  value,
  onChange,
  multiSelect = false,
  placeholder = "Select map group...",
}: MapGroupSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: mapGroups, isLoading } = useQuery({
    queryKey: ["mapGroups", teamId],
    queryFn: () => fetchMapGroups(teamId),
    staleTime: 5 * 60 * 1000,
  });

  const selectedGroups = mapGroups?.filter((group) => value.includes(group.id));

  function handleSelect(groupId: number) {
    if (multiSelect) {
      const newValue = value.includes(groupId)
        ? value.filter((id) => id !== groupId)
        : [...value, groupId];
      onChange(newValue);
    } else {
      onChange(value.includes(groupId) ? [] : [groupId]);
      setOpen(false);
    }
  }

  function handleRemove(groupId: number, e?: React.MouseEvent) {
    e?.stopPropagation();
    onChange(value.filter((id) => id !== groupId));
  }

  function handleClearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  // Group by category
  const groupsByCategory = mapGroups?.reduce(
    (acc, group) => {
      const category = group.category ?? "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(group);
      return acc;
    },
    {} as Record<string, FormattedMapGroup[]>
  );

  const categories = groupsByCategory
    ? Object.keys(groupsByCategory).sort((a, b) => {
        // Sort "Uncategorized" last
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
      })
    : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls="map-group-selector-listbox"
          className="h-auto min-h-10 w-full justify-between"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FolderOpen className="text-muted-foreground size-4 shrink-0" />
            {selectedGroups && selectedGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedGroups.map((group) => (
                  <Badge
                    key={group.id}
                    variant="secondary"
                    className="gap-1 text-xs"
                  >
                    {group.name}
                    {multiSelect && (
                      <X
                        className="hover:text-destructive size-3 cursor-pointer"
                        onClick={(e) => handleRemove(group.id, e)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground truncate">
                {placeholder}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {selectedGroups && selectedGroups.length > 0 && (
              <X
                className="text-muted-foreground hover:text-foreground size-4 cursor-pointer"
                onClick={handleClearAll}
              />
            )}
            <ChevronDown className="text-muted-foreground size-4" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search map groups..." />
          <CommandList id="map-group-selector-listbox">
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    No map groups found
                  </p>
                </div>
              )}
            </CommandEmpty>
            {categories.map((category, idx) => (
              <div key={category}>
                <CommandGroup heading={category}>
                  {groupsByCategory![category].map((group) => {
                    const isSelected = value.includes(group.id);
                    return (
                      <CommandItem
                        key={group.id}
                        value={`${group.name}-${group.id}`}
                        onSelect={() => handleSelect(group.id)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            "border-primary mr-2 flex size-4 items-center justify-center rounded-sm border",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className="size-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {group.name}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <span className="tabular-nums">
                              {group.mapCount} map
                              {group.mapCount !== 1 ? "s" : ""}
                            </span>
                            {group.description && (
                              <>
                                <span>·</span>
                                <span className="truncate">
                                  {group.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {idx < categories.length - 1 && <CommandSeparator />}
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
