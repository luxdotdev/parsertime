"use client";

import { useFeatureFlags } from "@/components/feature-flags-provider";
import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { locales } from "@/i18n/config";
import { loadFrecency, recordVisit, topFrecent } from "@/lib/find/frecency";
import {
  FIND_ACTIONS,
  flattenFindPages,
  localeAction,
  type FindActionDef,
} from "@/lib/find/schema";
import { mergeStable } from "@/lib/find/merge";
import { searchDocs, type FindDoc, type FindResult } from "@/lib/find/search";
import {
  useDebouncedPhrase,
  useFindIndex,
  useFindPhrase,
} from "@/lib/find/use-find-data";
import { setUserLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { User } from "@/generated/prisma/browser";
import { track } from "@vercel/analytics";
import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  SearchIcon,
  SwordsIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type { Route } from "next";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const RESULT_LIMIT = 8;
const RECENT_LIMIT = 5;
const SUGGESTED_IDS = [
  "dashboard",
  "stats-player",
  "stats-team",
  "teams-list",
  "leaderboard",
  "docs",
];

export function FindContent({
  user,
  mobile,
  listHeight,
  onClose,
  onOpenBugReport,
}: {
  user: User | null;
  mobile: boolean;
  listHeight: number;
  onClose: () => void;
  onOpenBugReport: () => void;
}) {
  const authed = user !== null;
  const t = useTranslations("dashboard.find");
  const tDash = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const flags = useFeatureFlags();
  const { teamId } = use(TeamSwitcherContext);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState("");
  const trimmed = query.trim();

  // Frecency is read once per open (the dialog remounts every open).
  const [frecency] = useState(() => loadFrecency());

  const index = useFindIndex(authed);
  const phrase = useDebouncedPhrase(query);
  const phraseResults = useFindPhrase(phrase, authed);

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
    [locale]
  );

  // ---- documents -------------------------------------------------------

  const pageDocs = useMemo<FindDoc[]>(() => {
    return flattenFindPages(flags, authed, { teamId }).map((page) => {
      const label = tDash(page.leaf.labelKey);
      return {
        key: page.leaf.id,
        kind: "page",
        texts: [label, ...(page.leaf.aliases ?? [])],
        teamHref: page.leaf.teamHref,
        playerHref: page.leaf.playerHref,
        result: {
          key: page.leaf.id,
          kind: "page",
          label,
          meta: page.pathLabelKeys.map((k) => tDash(k)),
          icon: page.icon,
          href: page.href,
          external: page.leaf.external,
        },
      };
    });
  }, [flags, authed, teamId, tDash]);

  const entityDocs = useMemo<FindDoc[]>(() => {
    if (!index.data) return [];
    const docs: FindDoc[] = [];

    for (const team of index.data.teams) {
      const key = `team:${team.id}`;
      docs.push({
        key,
        kind: "team",
        texts: [team.name],
        teamId: team.id,
        result: {
          key,
          kind: "team",
          label: team.name,
          meta: [t("kinds.team")],
          icon: UsersIcon,
          href: `/team/${team.id}` as Route,
        },
      });
    }

    for (const player of index.data.players) {
      const key = `player:${player.name}`;
      docs.push({
        key,
        kind: "player",
        texts: [player.name],
        playerName: player.name,
        result: {
          key,
          kind: "player",
          label: player.name,
          meta: [t("kinds.player"), player.teamName],
          icon: UserIcon,
          href: `/stats/${encodeURIComponent(player.name)}` as Route,
        },
      });
    }

    for (const scrim of index.data.scrims) {
      docs.push(scrimDoc(scrim, t("kinds.scrim"), dateFormat));
    }

    return docs;
  }, [index.data, t, dateFormat]);

  const remoteDocs = useMemo<FindDoc[]>(() => {
    if (!phraseResults.data) return [];
    const known = new Set(entityDocs.map((d) => d.key));
    return phraseResults.data.scrims
      .map((scrim) => scrimDoc(scrim, t("kinds.scrim"), dateFormat))
      .filter((d) => !known.has(d.key));
  }, [phraseResults.data, entityDocs, t, dateFormat]);

  const actionDocs = useMemo<FindDoc[]>(() => {
    const defs: FindActionDef[] = [
      ...FIND_ACTIONS.filter((a) => {
        if (a.requiresAuth && !authed) return false;
        if (a.requiresUnauth && authed) return false;
        if (a.pathnamePattern && !a.pathnamePattern.test(pathname)) {
          return false;
        }
        return true;
      }),
      ...locales
        .filter((l) => l.code !== locale)
        .map((l) => localeAction(l.code, l.name)),
    ];

    return defs.map((def) => {
      const label = t(
        def.labelKey.replace(/^find\./, ""),
        def.labelValues ?? {}
      );
      return {
        key: def.id,
        kind: "action",
        texts: [label, ...(def.aliases ?? [])],
        result: {
          key: def.id,
          kind: "action",
          label,
          meta: [t("kinds.action")],
          icon: def.icon,
          actionId: def.id,
        },
      } satisfies FindDoc;
    });
  }, [authed, pathname, locale, t]);

  const allDocs = useMemo(
    () => [...pageDocs, ...entityDocs, ...remoteDocs, ...actionDocs],
    [pageDocs, entityDocs, remoteDocs, actionDocs]
  );

  // ---- search + shift-prevention merge ---------------------------------

  const ranked = useMemo(
    () => searchDocs(trimmed, allDocs, frecency, RESULT_LIMIT),
    [trimmed, allDocs, frecency]
  );

  const stableRef = useRef<{ query: string; results: FindResult[] }>({
    query: "",
    results: [],
  });
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  const results = useMemo(() => {
    const prev = stableRef.current;
    // Same query, fresh data (index/remote arrived): merge with the
    // stability rules. New query: replace outright.
    const merged =
      prev.query === trimmed
        ? mergeStable(prev.results, ranked, focusedRef.current, RESULT_LIMIT)
        : ranked;
    stableRef.current = { query: trimmed, results: merged };
    return merged;
  }, [trimmed, ranked]);

  // ---- pre-query (negative latency) view --------------------------------

  const docByKey = useMemo(() => {
    const map = new Map<string, FindDoc>();
    for (const doc of allDocs) map.set(doc.key, doc);
    return map;
  }, [allDocs]);

  const recentResults = useMemo(() => {
    return topFrecent(frecency, RECENT_LIMIT * 2)
      .map((key) => docByKey.get(key)?.result)
      .filter((r): r is FindDoc["result"] => r !== undefined)
      .slice(0, RECENT_LIMIT);
  }, [frecency, docByKey]);

  const suggestedResults = useMemo(() => {
    const recent = new Set(recentResults.map((r) => r.key));
    return SUGGESTED_IDS.map((id) => docByKey.get(id)?.result).filter(
      (r): r is FindDoc["result"] => r !== undefined && !recent.has(r.key)
    );
  }, [recentResults, docByKey]);

  const commandResults = useMemo(
    () => actionDocs.map((d) => d.result),
    [actionDocs]
  );

  // ---- focus rules -------------------------------------------------------

  const emptyFirstKey =
    recentResults[0]?.key ?? suggestedResults[0]?.key ?? commandResults[0]?.key;
  const firstKey = trimmed ? results[0]?.key : emptyFirstKey;
  const firstKeyRef = useRef(firstKey);
  firstKeyRef.current = firstKey;

  // Typing always refocuses the first result (asymmetric with data arrival,
  // which must never move focus — mergeStable guarantees the focused row
  // keeps its position when fresh data lands).
  useEffect(() => {
    setFocused(firstKeyRef.current ?? "");
  }, [trimmed]);

  // If the focused row disappeared (e.g. entity index arrived and reranked
  // a brand-new list), fall back to the first row.
  const visibleKeys = useMemo(() => {
    const keys = new Set<string>();
    if (trimmed) {
      for (const r of results) keys.add(r.key);
    } else {
      for (const r of recentResults) keys.add(r.key);
      for (const r of suggestedResults) keys.add(r.key);
      for (const r of commandResults) keys.add(r.key);
    }
    return keys;
  }, [trimmed, results, recentResults, suggestedResults, commandResults]);

  useEffect(() => {
    if (!focusedRef.current || !visibleKeys.has(focusedRef.current)) {
      setFocused(firstKeyRef.current ?? "");
    }
  }, [visibleKeys]);

  // ---- selection ---------------------------------------------------------

  function runAction(id: FindActionDef["id"]) {
    if (id.startsWith("locale-")) {
      const code = id.slice("locale-".length);
      void setUserLocale(code as (typeof locales)[number]["code"]).then(() =>
        router.refresh()
      );
      return;
    }
    switch (id) {
      case "theme-light":
        setTheme("light");
        break;
      case "theme-dark":
        setTheme("dark");
        break;
      case "theme-system":
        setTheme("system");
        break;
      case "share-scrim": {
        let link = window.location.href;
        if (link.includes("/edit")) link = link.split("/edit")[0];
        void navigator.clipboard.writeText(link);
        toast.success(t("share.copied"), {
          description: t("share.description", {
            pathname: pathname.includes("/map")
              ? t("share.map")
              : t("share.scrim"),
          }),
          duration: 5000,
        });
        break;
      }
      case "discord":
        window.open("https://discord.gg/svz3qhVDXM", "_blank", "noopener");
        break;
      case "sign-in":
        track("Sign In", { location: "Find" });
        router.push("/sign-in");
        break;
      default:
        break;
    }
  }

  function run(result: Omit<FindResult, "score">) {
    if (result.kind === "action" && result.actionId) {
      if (result.actionId === "bug-report") {
        onOpenBugReport();
        return;
      }
      runAction(result.actionId);
      onClose();
      return;
    }

    // Selecting a destination from Find is an intentional visit by
    // definition — credit it immediately.
    recordVisit(result.key);

    if (result.href) {
      if (result.external) {
        window.open(result.href, "_blank", "noopener");
      } else {
        router.push(result.href);
      }
    }
    onClose();
  }

  // ---- render ------------------------------------------------------------

  const searching = phraseResults.isFetching || (authed && index.isPending);
  const noResults = trimmed !== "" && results.length === 0 && !searching;
  const fallbackResults = useMemo(
    () =>
      ["docs", "contact"]
        .map((id) => docByKey.get(id)?.result)
        .filter((r): r is FindDoc["result"] => r !== undefined),
    [docByKey]
  );

  return (
    <Command
      shouldFilter={false}
      loop
      value={focused}
      onValueChange={setFocused}
      className="bg-transparent"
    >
      <div className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <SearchIcon className="text-muted-foreground size-4 shrink-0" />
        <CommandPrimitive.Input
          value={query}
          onValueChange={setQuery}
          placeholder={t("placeholder")}
          className="placeholder:text-muted-foreground h-full w-full bg-transparent text-base outline-none md:text-sm"
        />
        {searching && trimmed !== "" && (
          <LoaderCircleIcon
            className="text-muted-foreground size-4 shrink-0 animate-spin motion-reduce:hidden"
            aria-label={t("searching")}
          />
        )}
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring -mr-3 flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
          >
            <XIcon className="size-4" />
          </button>
        ) : (
          <kbd className="bg-muted text-muted-foreground pointer-events-none flex h-5 shrink-0 items-center rounded border px-1.5 font-mono text-[10px] select-none">
            esc
          </kbd>
        )}
      </div>

      <CommandList
        className={cn(
          "max-h-none scroll-py-2 p-2",
          mobile && "h-auto flex-1"
        )}
        style={mobile ? undefined : { height: listHeight }}
      >
        {trimmed === "" ? (
          <>
            {recentResults.length > 0 && (
              <FindGroup heading={t("groups.recent")}>
                {recentResults.map((r) => (
                  <FindRow key={r.key} result={r} onRun={run} />
                ))}
              </FindGroup>
            )}
            <FindGroup heading={t("groups.suggested")}>
              {suggestedResults.map((r) => (
                <FindRow key={r.key} result={r} onRun={run} />
              ))}
            </FindGroup>
            <FindGroup heading={t("groups.commands")}>
              {commandResults.map((r) => (
                // The group heading already says "Commands"; the per-row kind
                // tag would repeat it on every line.
                <FindRow key={r.key} result={r} onRun={run} hideMeta />
              ))}
            </FindGroup>
          </>
        ) : noResults ? (
          <div className="flex h-full flex-col">
            <div className="text-muted-foreground px-3 py-8 text-center text-sm">
              <p>{t("noResults", { query: trimmed })}</p>
              <p className="mt-1 text-xs">{t("noResultsHint")}</p>
            </div>
            <FindGroup heading={t("groups.fallback")}>
              {fallbackResults.map((r) => (
                <FindRow key={r.key} result={r} onRun={run} />
              ))}
            </FindGroup>
          </div>
        ) : (
          results.map((r) => <FindRow key={r.key} result={r} onRun={run} />)
        )}
      </CommandList>

      {!mobile && (
        <div className="border-border text-muted-foreground flex h-9 shrink-0 items-center gap-4 border-t px-4 font-mono text-[10px] tracking-[0.08em] uppercase">
          <span>
            <kbd className="font-mono">↑↓</kbd> {t("hints.navigate")}
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> {t("hints.open")}
          </span>
          <span className="ml-auto">
            <kbd className="font-mono">esc</kbd> {t("hints.close")}
          </span>
        </div>
      )}
    </Command>
  );
}

function scrimDoc(
  scrim: {
    id: number;
    name: string;
    date: string;
    teamId: number;
    teamName: string | null;
  },
  kindLabel: string,
  dateFormat: Intl.DateTimeFormat
): FindDoc {
  const key = `scrim:${scrim.id}`;
  const meta = [kindLabel, dateFormat.format(new Date(scrim.date))];
  if (scrim.teamName) meta.splice(1, 0, scrim.teamName);
  return {
    key,
    kind: "scrim",
    texts: [scrim.name, scrim.teamName ?? ""],
    result: {
      key,
      kind: "scrim",
      label: scrim.name,
      meta,
      icon: SwordsIcon,
      href: `/scrims/${scrim.id}` as Route,
    },
  };
}

function FindGroup({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <CommandGroup
      heading={heading}
      className="[&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:uppercase"
    >
      {children}
    </CommandGroup>
  );
}

function FindRow({
  result,
  onRun,
  hideMeta = false,
}: {
  result: Omit<FindResult, "score">;
  onRun: (result: Omit<FindResult, "score">) => void;
  hideMeta?: boolean;
}) {
  const meta = hideMeta ? [] : result.meta.filter(Boolean);

  return (
    <CommandItem
      value={result.key}
      onSelect={() => onRun(result)}
      className="group/find-row h-11 gap-3 rounded-md px-3 data-[selected=true]:bg-muted"
    >
      {result.icon && (
        <result.icon className="text-muted-foreground size-4 shrink-0 transition-colors group-data-[selected=true]/find-row:text-primary" />
      )}
      <span className="truncate text-sm">{result.label}</span>
      {result.external && (
        <ExternalLinkIcon className="text-muted-foreground size-3 shrink-0" />
      )}
      <span className="text-muted-foreground ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px]">
        {meta.join(" · ")}
        <kbd className="bg-background hidden h-5 items-center rounded border px-1 group-data-[selected=true]/find-row:flex">
          ↵
        </kbd>
      </span>
    </CommandItem>
  );
}
