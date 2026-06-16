"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const ENVS = ["PRODUCTION", "PREVIEW", "DEVELOPMENT"] as const;

export function EnvSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("env", value);
    router.push(`${pathname}?${params.toString()}` as Route);
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENVS.map((e) => (
          <SelectItem key={e} value={e}>
            {e.charAt(0) + e.slice(1).toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
