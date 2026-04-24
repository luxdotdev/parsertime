"use client";

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
import { listCommonTimezones } from "@/lib/availability/tz";
import { cn } from "@/lib/utils";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { useEffect, useMemo, useState } from "react";

function detectLocalTz(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  id?: string;
  /**
   * When provided and different from the viewer's detected tz, surfaces
   * the team's configured default timezone as its own pinned section at
   * the top of the list. Useful on the availability page where viewers
   * may want to switch to the team's tz to compare with the organizer's
   * canonical window.
   */
  teamTimezone?: string;
};

export function TimezoneSelect({
  value,
  onValueChange,
  id,
  teamTimezone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const listboxId = `tz-listbox-${id ?? "select"}`;

  // `Intl.DateTimeFormat` resolves to the server's tz during SSR, so defer
  // the detection until we're mounted on the client.
  useEffect(() => {
    setDetected(detectLocalTz());
  }, []);

  const allZones = useMemo(() => listCommonTimezones(), []);
  const region = useMemo(() => detected?.split("/")[0] ?? null, [detected]);
  const regional = useMemo(
    () =>
      region
        ? allZones.filter((z) => z.startsWith(`${region}/`) || z === region)
        : [],
    [allZones, region]
  );
  // Only show the team-default section when it's a distinct entry — if
  // the viewer's detected tz already matches the team's, we don't need
  // to pin the same zone twice.
  const showTeamSection = Boolean(teamTimezone && teamTimezone !== detected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value}</span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0">
        <Command>
          <CommandInput placeholder="Search timezone…" />
          <CommandList id={listboxId} className="max-h-[320px]">
            <CommandEmpty>No timezone found.</CommandEmpty>
            {detected && (
              <CommandGroup heading="Detected">
                <TzItem
                  zone={detected}
                  current={value}
                  onSelect={(v) => {
                    onValueChange(v);
                    setOpen(false);
                  }}
                />
              </CommandGroup>
            )}
            {showTeamSection && teamTimezone && (
              <CommandGroup heading="Team default">
                <TzItem
                  zone={teamTimezone}
                  current={value}
                  onSelect={(v) => {
                    onValueChange(v);
                    setOpen(false);
                  }}
                />
              </CommandGroup>
            )}
            {detected && regional.length > 1 && (
              <CommandGroup heading={region ?? "Regional"}>
                {regional
                  .filter((z) => z !== detected && z !== teamTimezone)
                  .map((z) => (
                    <TzItem
                      key={z}
                      zone={z}
                      current={value}
                      onSelect={(v) => {
                        onValueChange(v);
                        setOpen(false);
                      }}
                    />
                  ))}
              </CommandGroup>
            )}
            {(detected ?? showTeamSection) && <CommandSeparator />}
            <CommandGroup heading="All timezones">
              {allZones.map((z) => (
                <TzItem
                  key={z}
                  zone={z}
                  current={value}
                  onSelect={(v) => {
                    onValueChange(v);
                    setOpen(false);
                  }}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TzItem({
  zone,
  current,
  onSelect,
}: {
  zone: string;
  current: string;
  onSelect: (zone: string) => void;
}) {
  return (
    <CommandItem value={zone} onSelect={() => onSelect(zone)}>
      <span className="truncate">{zone}</span>
      <CheckIcon
        className={cn(
          "ml-auto h-4 w-4",
          current === zone ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  );
}
