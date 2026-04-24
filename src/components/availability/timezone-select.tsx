"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCommonTimezones } from "@/lib/availability/tz";
import { useMemo } from "react";

export function TimezoneSelect({
  value,
  onValueChange,
  id,
}: {
  value: string;
  onValueChange: (v: string) => void;
  id?: string;
}) {
  const zones = useMemo(() => listCommonTimezones(), []);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {zones.map((z) => (
          <SelectItem key={z} value={z}>
            {z}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
