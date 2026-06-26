import { createStore } from "@xstate/store";

type MapSelection = {
  mapId: number;
  scrimId: number;
};

type MapSelectionContext = {
  // Map from mapId to scrimId
  selections: Map<number, number>;
};

const STORAGE_KEY = "parsertime:map-selections";

// Helper to safely access localStorage (SSR-safe)
function getStoredSelections(): Map<number, number> {
  if (typeof window === "undefined") {
    return new Map();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored) as [number, number][];
    return new Map(parsed);
  } catch {
    return new Map();
  }
}

function saveSelections(selections: Map<number, number>): void {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify(Array.from(selections.entries()));
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage errors
  }
}

function clearStoredSelections(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export const mapSelectionStore = createStore({
  context: {
    selections: getStoredSelections(),
  } satisfies MapSelectionContext,
  on: {
    toggleMapSelection: (
      context: MapSelectionContext,
      event: { mapId: number; scrimId: number }
    ): MapSelectionContext => {
      const newSelections = new Map(context.selections);

      if (newSelections.has(event.mapId)) {
        newSelections.delete(event.mapId);
      } else {
        newSelections.set(event.mapId, event.scrimId);
      }

      // Persist to localStorage
      saveSelections(newSelections);

      return {
        ...context,
        selections: newSelections,
      };
    },

    selectAll: (
      context: MapSelectionContext,
      event: { maps: MapSelection[] }
    ): MapSelectionContext => {
      const newSelections = new Map(context.selections);

      for (const { mapId, scrimId } of event.maps) {
        newSelections.set(mapId, scrimId);
      }

      // Persist to localStorage
      saveSelections(newSelections);

      return {
        ...context,
        selections: newSelections,
      };
    },

    clearAll: (context: MapSelectionContext): MapSelectionContext => {
      // Clear localStorage
      clearStoredSelections();

      return {
        ...context,
        selections: new Map(),
      };
    },

    clearScrim: (
      context: MapSelectionContext,
      event: { scrimId: number }
    ): MapSelectionContext => {
      const newSelections = new Map(context.selections);

      for (const [mapId, scrimId] of newSelections.entries()) {
        if (scrimId === event.scrimId) {
          newSelections.delete(mapId);
        }
      }

      // Persist to localStorage
      saveSelections(newSelections);

      return {
        ...context,
        selections: newSelections,
      };
    },
  },
});

// Selectors
export function selectIsMapSelected(state: MapSelectionContext, mapId: number) {
  return state.selections.has(mapId);
}

export function selectHasSelections(state: MapSelectionContext) {
  return state.selections.size > 0;
}

export function selectSelectedMapIds(state: MapSelectionContext) {
  return state.selections;
}

export function selectSelectionCount(state: MapSelectionContext) {
  return state.selections.size;
}

export function selectUniqueScrimCount(state: MapSelectionContext) {
  const scrimIds = new Set<number>();
  for (const scrimId of state.selections.values()) {
    scrimIds.add(scrimId);
  }
  return scrimIds.size;
}

export function selectMapsByScrim(state: MapSelectionContext) {
  const mapsByScrim = new Map<number, number[]>();

  for (const [mapId, scrimId] of state.selections.entries()) {
    const maps = mapsByScrim.get(scrimId) ?? [];
    maps.push(mapId);
    mapsByScrim.set(scrimId, maps);
  }

  return mapsByScrim;
}
