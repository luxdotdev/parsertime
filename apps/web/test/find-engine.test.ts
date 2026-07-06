import {
  frecencyScore,
  loadFrecency,
  recordVisit,
  topFrecent,
} from "@/lib/find/frecency";
import { matchAll, tokenize, withinOneEdit } from "@/lib/find/matcher";
import { mergeStable } from "@/lib/find/merge";
import { searchDocs, type FindDoc } from "@/lib/find/search";
import { beforeEach, describe, expect, it } from "vitest";

describe("matcher", () => {
  it("matches exact and prefix tokens", () => {
    expect(matchAll(tokenize("dash"), ["Dashboard"])).not.toBeNull();
    expect(matchAll(tokenize("dashboard"), ["Dashboard"])).not.toBeNull();
    expect(matchAll(tokenize("xyz"), ["Dashboard"])).toBeNull();
  });

  it("ranks better prefix coverage higher", () => {
    const a = matchAll(tokenize("dashb"), ["Dashboard"]);
    const b = matchAll(tokenize("da"), ["Dashboard"]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!).toBeGreaterThan(b!);
  });

  it("tolerates one typo including transposition", () => {
    expect(withinOneEdit("wesbite", "website")).toBe(true);
    expect(withinOneEdit("deply", "deploy")).toBe(true);
    expect(withinOneEdit("depxy", "deploy")).toBe(false);
    // "lederboard" -> "leaderboard" (one deletion)
    expect(matchAll(tokenize("lederboard"), ["Leaderboard"])).not.toBeNull();
  });

  it("matches via aliases", () => {
    expect(
      matchAll(tokenize("rankings"), ["Leaderboard", "rankings", "top"])
    ).not.toBeNull();
  });

  it("requires every query token to land", () => {
    expect(matchAll(tokenize("hero stats"), ["Hero Stats"])).not.toBeNull();
    expect(matchAll(tokenize("hero nonsense"), ["Hero Stats"])).toBeNull();
  });
});

describe("mergeStable", () => {
  function r(key: string) {
    return { key };
  }
  it("returns fresh results when there is no previous set", () => {
    expect(mergeStable([], [r("a"), r("b")], null)).toEqual([r("a"), r("b")]);
  });

  it("keeps the focused row even when the fresh set drops it", () => {
    const merged = mergeStable(
      [r("a"), r("b"), r("c")],
      [r("x"), r("y"), r("z")],
      "b"
    );
    expect(merged[1]).toEqual(r("b"));
    expect(merged.map((m) => m.key)).toContain("x");
  });

  it("keeps surviving rows in their previous positions", () => {
    const merged = mergeStable(
      [r("a"), r("b"), r("c")],
      [r("c"), r("d"), r("a")],
      null
    );
    // a stays at 0, c stays at 2, d fills the vacated slot.
    expect(merged.map((m) => m.key)).toEqual(["a", "d", "c"]);
  });

  it("always includes the top-ranked fresh result somewhere", () => {
    const merged = mergeStable([r("a"), r("b")], [r("winner"), r("a")], "a");
    expect(merged.map((m) => m.key)).toContain("winner");
  });
});

describe("frecency", () => {
  beforeEach(() => {
    // Vitest runs in a node environment: provide an in-memory localStorage.
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    });
  });

  it("records and ranks visits, deduping rapid re-visits", () => {
    const now = 1_700_000_000_000;
    recordVisit("dashboard", now);
    recordVisit("dashboard", now + 1000); // inside dedupe window: ignored
    recordVisit("dashboard", now + 10 * 60 * 1000);
    recordVisit("settings", now + 10 * 60 * 1000);

    const table = loadFrecency();
    expect(table["dashboard"].count).toBe(2);
    expect(table["settings"].count).toBe(1);
    expect(topFrecent(table, 2, now + 11 * 60 * 1000)[0]).toBe("dashboard");
  });

  it("scores recent visits above stale ones", () => {
    const now = Date.now();
    const recent = { count: 3, visits: [now - 1000] };
    const stale = { count: 3, visits: [now - 30 * 24 * 60 * 60 * 1000] };
    expect(frecencyScore(recent, now)).toBeGreaterThan(
      frecencyScore(stale, now)
    );
  });
});

describe("searchDocs", () => {
  function pageDoc(
    key: string,
    label: string,
    aliases: string[] = [],
    scoped?: Partial<Pick<FindDoc, "teamHref" | "playerHref">>
  ): FindDoc {
    return {
      key,
      kind: "page",
      texts: [label, ...aliases],
      result: { key, kind: "page", label, meta: [] },
      ...scoped,
    };
  }

  const docs: FindDoc[] = [
    pageDoc("dashboard", "Dashboard", ["scrims", "home"], {
      teamHref: (id) => `/dashboard?team=${id}` as never,
    }),
    pageDoc("stats-hero", "Hero Stats", ["heroes"]),
    pageDoc("stats-team-trends", "Team Trends", ["trends", "stats"], {
      teamHref: (id) => `/stats/team/${id}/trends` as never,
    }),
    pageDoc("stats-player", "Player Stats", ["player"], {
      playerHref: (name) => `/stats/${name}` as never,
    }),
    {
      key: "team:3",
      kind: "team",
      texts: ["FaZe Clan"],
      teamId: 3,
      result: { key: "team:3", kind: "team", label: "FaZe Clan", meta: [] },
    },
    {
      key: "player:ana",
      kind: "player",
      texts: ["Anakin"],
      playerName: "Anakin",
      result: {
        key: "player:ana",
        kind: "player",
        label: "Anakin",
        meta: [],
      },
    },
    {
      key: "scrim:9",
      kind: "scrim",
      texts: ["vs Luminosity"],
      result: {
        key: "scrim:9",
        kind: "scrim",
        label: "vs Luminosity",
        meta: [],
      },
    },
  ];

  it("finds pages by fuzzy label", () => {
    const results = searchDocs("hero", docs, {});
    expect(results[0].key).toBe("stats-hero");
  });

  it("resolves combined team + page queries to scoped URLs", () => {
    const results = searchDocs("faze trends", docs, {});
    expect(results[0].kind).toBe("scoped-page");
    expect(results[0].href).toBe("/stats/team/3/trends");
    expect(results[0].meta).toEqual(["FaZe Clan"]);
  });

  it("resolves combined player + page queries", () => {
    const results = searchDocs("anakin player", docs, {});
    const scoped = results.find((r) => r.kind === "scoped-page");
    expect(scoped?.href).toBe("/stats/Anakin");
  });

  it("matches entities alone", () => {
    const results = searchDocs("luminosity", docs, {});
    expect(results[0].key).toBe("scrim:9");
  });

  it("boosts frecent destinations on ties", () => {
    // "stats" alone matches hero/player/trends pages; boost the trends page.
    const frecency = {
      "stats-team-trends": { count: 20, visits: [Date.now() - 1000] },
    };
    const plain = searchDocs("stats", docs, {});
    const boosted = searchDocs("stats", docs, frecency);
    expect(plain.map((r) => r.key)).toContain("stats-team-trends");
    expect(boosted[0].key).toBe("stats-team-trends");
  });

  it("returns nothing for an empty query", () => {
    expect(searchDocs("   ", docs, {})).toEqual([]);
  });
});
