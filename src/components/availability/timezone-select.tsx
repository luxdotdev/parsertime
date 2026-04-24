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
};

export function TimezoneSelect({ value, onValueChange, id }: Props) {
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
              <>
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
                {regional.length > 1 && (
                  <CommandGroup heading={region ?? "Regional"}>
                    {regional
                      .filter((z) => z !== detected)
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
                <CommandSeparator />
              </>
            )}
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
