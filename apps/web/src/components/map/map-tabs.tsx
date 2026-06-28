"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { parseAsFloat, parseAsString, useQueryState } from "nuqs";
import { useCallback, useTransition, type ReactNode } from "react";

type TabDef = {
  value: string;
  label: string;
  shortLabel?: string;
  hidden?: boolean;
  className?: string;
};

type MapTabsProps = {
  tabs: TabDef[];
  /** The active tab, resolved server-side from the `?tab=` search param. */
  activeTab: string;
  /** Server-rendered content for the active tab only. */
  children: ReactNode;
};

export function MapTabs({ tabs, activeTab, children }: MapTabsProps) {
  const t = useTranslations("mapPage");
  // Drive the shallow:false navigation through a transition so React keeps the
  // current page chrome visible while the new tab streams in, instead of
  // reverting the outer Suspense boundary to its skeleton. shallow:false still
  // re-runs the server page so only the selected tab's content is rendered.
  const [isPending, startTransition] = useTransition();
  const [, setTab] = useQueryState(
    "tab",
    parseAsString
      .withDefault("overview")
      .withOptions({ shallow: false, startTransition })
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => void setTab(value)}
      className={cn("space-y-4", isPending && "[&_[role=tabpanel]]:opacity-60")}
    >
      <TabsList aria-label={t("tabsLabel")}>
        {tabs.map((tab) =>
          tab.hidden ? null : (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={tab.className}
            >
              {tab.shortLabel ? (
                <>
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.shortLabel}</span>
                </>
              ) : (
                tab.label
              )}
            </TabsTrigger>
          )
        )}
      </TabsList>
      <TabsContent value={activeTab} className="space-y-4">
        {children}
      </TabsContent>
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
