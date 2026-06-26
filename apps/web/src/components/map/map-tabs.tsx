"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { parseAsFloat, parseAsString, useQueryState } from "nuqs";
import { useCallback, type ReactNode } from "react";

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
  // shallow:false so switching tabs re-runs the server page and renders the
  // newly-selected tab's content, instead of shipping every tab up front.
  const [, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault("overview").withOptions({ shallow: false })
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => void setTab(value)}
      className="space-y-4"
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
