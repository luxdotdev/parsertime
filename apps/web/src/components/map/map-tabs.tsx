"use client";

import { DotMatrixLoader } from "@/components/dot-matrix-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { parseAsFloat, parseAsString, useQueryState } from "nuqs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useOptimistic,
  useRef,
  useTransition,
  type ReactNode,
} from "react";

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

// Lets content rendered inside the tabs (killfeed, timelines) switch tabs
// through the same transition-wrapped setter as a tab-strip click, so the
// optimistic indicator, cached-content display, and server re-render are
// wired up identically.
const MapTabsSwitchContext = createContext<((tab: string) => void) | null>(
  null
);

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
  // The indicator is optimistic local state, not the nuqs value: it must move
  // the moment a tab is clicked, and it settles back to the server-resolved
  // tab when the transition commits.
  const [optimisticTab, setOptimisticTab] = useOptimistic(activeTab);

  // Client-side cache of every visited tab's server-rendered content. Map and
  // scrim data is static, so switching back to a visited tab renders the
  // cached tree instantly (no loader) while the refresh streams in behind it.
  const visitedTabs = useRef(new Map<string, ReactNode>());
  useEffect(() => {
    visitedTabs.current.set(activeTab, children);
  }, [activeTab, children]);

  const switchTab = useCallback(
    (value: string) => {
      startTransition(() => {
        setOptimisticTab(value);
        void setTab(value);
      });
    },
    [setTab, setOptimisticTab]
  );

  // While a switch is in flight, `children` still holds the PREVIOUS tab's
  // content. Show the cached tree for the target tab when we have one;
  // otherwise keep the stale content dimmed under the loader until the new
  // tab streams in.
  const isSettled = optimisticTab === activeTab;
  const cachedContent = isSettled
    ? undefined
    : visitedTabs.current.get(optimisticTab);
  const showStaleOverlay = isPending && !isSettled && cachedContent == null;

  return (
    <MapTabsSwitchContext.Provider value={switchTab}>
      <Tabs
        value={optimisticTab}
        onValueChange={switchTab}
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
        <TabsContent value={optimisticTab} className="relative space-y-4">
          <div
            aria-busy={showStaleOverlay}
            className={cn(
              "space-y-4 transition-opacity duration-200",
              showStaleOverlay && "pointer-events-none opacity-40"
            )}
          >
            {cachedContent ?? children}
          </div>
          {showStaleOverlay ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-12">
              <DotMatrixLoader label={t("loadingTab")} />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </MapTabsSwitchContext.Provider>
  );
}

export function useReplayTimeParam() {
  return useQueryState("t", parseAsFloat);
}

export function useGoToReplay() {
  const switchTab = useContext(MapTabsSwitchContext);
  // Fallback for use outside MapTabs; shallow:false so the server actually
  // re-renders the active tab (the default shallow update only touches the URL).
  const [, setTab] = useQueryState(
    "tab",
    parseAsString.withOptions({ shallow: false })
  );
  const [, setTime] = useQueryState("t", parseAsFloat);

  return useCallback(
    (matchTime: number) => {
      void setTime(matchTime);
      if (switchTab) {
        switchTab("replay");
      } else {
        void setTab("replay");
      }
    },
    [switchTab, setTab, setTime]
  );
}
