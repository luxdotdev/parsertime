import { createStore } from "@xstate/store";
import { createJSONStorage, persist } from "@xstate/store/persist";

type DashboardOverviewContext = {
  /** Whether the dashboard activity band is collapsed to its compact strip. */
  collapsed: boolean;
};

/**
 * Remembers whether the coach prefers the activity overview expanded or
 * collapsed. Persisted to localStorage so the choice survives reloads.
 *
 * `createJSONStorage(() => globalThis.localStorage)` is SSR-safe: on the server
 * `globalThis.localStorage` is undefined and the adapter no-ops, so the store
 * starts from the default and hydrates from storage on the client.
 */
const initialContext: DashboardOverviewContext = { collapsed: false };

export const dashboardOverviewStore = createStore({
  context: initialContext,
  on: {
    toggleCollapsed: (context) => ({ collapsed: !context.collapsed }),
    setCollapsed: (context, event: { collapsed: boolean }) => ({
      collapsed: event.collapsed,
    }),
  },
}).with(
  persist({
    name: "parsertime:dashboard-overview",
    version: 1,
    storage: createJSONStorage(() => globalThis.localStorage),
  })
);
