"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseAsFloat, parseAsString, useQueryState } from "nuqs";
import { useCallback, type ReactNode } from "react";

type TabDef = {
  value: string;
  label: string;
  shortLabel?: string;
  hidden?: boolean;
  className?: string;
  content: ReactNode;
};

type MapTabsProps = {
  tabs: TabDef[];
};

export function MapTabs({ tabs }: MapTabsProps) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault("overview")
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        {tabs.map((t) =>
          t.hidden ? null : (
            <TabsTrigger key={t.value} value={t.value} className={t.className}>
              {t.shortLabel ? (
                <>
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="md:hidden">{t.shortLabel}</span>
                </>
              ) : (
                t.label
              )}
            </TabsTrigger>
          )
        )}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="space-y-4">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function useReplayTimeParam() {
  return useQueryState("t", parseAsFloat);
}

export function useGoToReplay() {
  const [, setTab] = useQueryState("tab", parseAsString);
  const [, setTime] = useQueryState("t", parseAsFloat);

  return useCallback(
    (matchTime: number) => {
      void setTime(matchTime);
      void setTab("replay");
    },
    [setTab, setTime]
  );
}
