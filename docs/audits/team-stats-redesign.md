# Team stats redesign audit

`/stats/team/[teamId]` reviewed against the new patterns shipping on `/stats/map`, `/stats/hero`, `/leaderboard`, and the recent `/stats/hero/[heroName]` redesign. Captured DSG (team 345, all-time) at 1440×900. Screenshots at `/tmp/team-stats-audit/01–10`.

## North star

The page violates the design system's two strongest commitments:

1. **Restraint with color, brutality with contrast.** Tank/Damage/Support cards, Hybrid/Escort/Control quadrants, Winning/Losing fight panels, and Win-Probability cards all carry **full-bleed colored backgrounds and saturated borders that signal nothing the heading and number don't already say**. Color is chrome, not signal.
2. **Data first, chrome second.** Section headings are sentence-case `<CardTitle>` only — no Geist Mono metadata layer. The whole page reads as one continuous wall of cards, none of which are visually privileged. Compare to `/stats/map`, where the eyebrow + 4xl headline + ribbon + filter row carries the entire navigational frame in 64px of vertical space.

The map-list redesign is the right reference. `MapHeroTrends` (`src/components/stats/map/map-hero-trends.tsx:164–181`) is the exact pattern to mirror.

## Reference patterns to mirror

From `/stats/map`:

- **Header**: `border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6` with eyebrow + 4xl headline left, `<dl>` Geist Mono stats ribbon right.
- **Eyebrow**: `text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase`. Carries category metadata (`MAP META · LAST 60 DAYS · 53 UNIQUE MAPS`).
- **Filter row**: `mt-6 flex flex-wrap items-center gap-3` — outline buttons, popover map picker with image+name, sort select, role + sub-role pills.
- **Body**: dense table on a flat background. No card-on-card. Tabular nums with `font-mono` labels.

From `/leaderboard` hub:

- **Section grid**: `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-10` with eyebrow + h2 + status + CTA on left, ribbon + prose + bullets on right.
- **Sections divided** by `divide-y divide-[var(--border)]`, no per-section card containers.

## Tab-by-tab observations

### Overview (01)

- Page header is generic: 100px circular avatar + `text-3xl` team name + small "Overall Record" line. No eyebrow, no border, no ribbon.
- `QuickStatsCard` uses `text-green/blue/yellow/red-600` for the Last-10 winrate (`src/components/stats/team/quick-stats-card.tsx:19–24`). Date "Wednesday" is a 2xl Switzer figure with no mono treatment despite being the kind of categorical metadata mono is for.
- "Recent Activity" calendar is good — neutral, dense, matches the system. Keep.
- "Top Maps by Playtime" amber bars at full saturation and full row width are the right idea but feel decorative — bar length already encodes value, and the right-aligned percentage gets lost.
- "Strengths & Weaknesses" uses `border-green-500` and `border-red-500` as full card outlines — same chrome-as-color anti-pattern as Win Probability Insights.
- `RoleBalanceRadar` legend lives below the chart with three filled dots; the radar itself uses raw `#3b82f6 / #ef4444 / #eab308` tooltip text (`src/components/stats/team/role-balance-radar.tsx:32–40`). Should use `--team-1/2-*` or `--chart-*` tokens.

### Performance (02) — worst color violation

- `RolePerformanceCard` (`src/components/stats/team/role-performance-card.tsx:25–29`):
  ```ts
  Tank: "bg-blue-100 dark:bg-blue-950";
  Damage: "bg-red-100 dark:bg-red-950";
  Support: "bg-yellow-100 dark:bg-yellow-950";
  ```
  These are full-bleed colored card backgrounds. Color is chrome, the heading already says "Tank". **Strip the backgrounds; replace with a small role glyph + Geist Mono caps eyebrow.**
- "Best Role Trios" #1 row has a saturated amber pill at the start of the row — the kind of side-stripe-ish accent the system bans. Whole component should be a dense table with rank in `font-mono tabular-nums`.

### Heroes (03)

- "Hero Pool Overview" stat row is a strong pattern — keep the 4-column dense numerals but mono-label them.
- "Most Played by Role" splits into Tank/Damage/Support sub-cards, each with the same blue/red/yellow heavy tint as the Performance tab. **Same fix.**
- "Top Hero Winrates" uses a heavy green-on-green full-row highlight for #1. Drop the tint, keep the rank numeral and a tiny amber dot for the leader (`bg-primary`, 6px).
- "Hero Pickrate Heatmap" green gradient is the only chart on the page using a token-driven scale — keep it, but match the role/hero icon rendering already established in `ult-usage-overview-card.tsx` (24px hero image with rounded clip).
- "Most Banned Heroes" / "Bar Weak Points" / "Our Ban Strategy" use orange-amber-red bars at full saturation. Single-series bars should pick one accent — amber `--primary` — and let the bar length be the signal.

### Trends (04)

- "Winrate Over Time" line chart is acceptable. Series legend dots are tiny and in two unrelated colors; use one neutral and one amber.
- "Recent Form" uses a green-tint "Strong recent performance" badge at top. Move "Strong / Average / Needs work" to a Geist Mono caps tag with `bg-primary/15 text-primary`.
- "Win/Loss Streaks" is the second-worst color violation: full green card for "Current Streak", full bright green for "Longest Win Streak", full red for "Longest Loss Streak". **Three plain stat tiles with mono caps labels, single accent (amber for current streak only). Win = neutral foreground, loss = neutral foreground. The labels already disambiguate.**

### Maps (05) — third-worst color violation

- `MapModePerformanceCard` (`src/components/stats/team/map-mode-performance-card.tsx:29–36`) uses raw hex Tailwind palette values:
  ```ts
  Control: "#3b82f6"; // blue
  Hybrid: "#8b5cf6"; // violet — banned by the design system
  Escort: "#ec4899"; // pink
  Push: "#f59e0b"; // amber
  Clash: "#10b981"; // emerald
  Flashpoint: "#ef4444"; // red
  ```
  Two of these (violet, pink) are explicitly called out as the "AI tool palette" the system rejects. Move to `--chart-1..5` ramp or, better, drop colored stacks — game modes don't have inherent identity color. Use a flat horizontal bar with mono labels.
- The Hybrid / Flashpoint / Escort / Control quadrants beneath the chart use heavy green/red/amber/red full-card backgrounds. Same fix as Win Probability.
- "Map Winrate Gallery" — every map card has a saturated background tinted by win rate (red/amber/green). At ~16 cards on screen it's overwhelming. **Replace with a uniform card + a small mono-labelled win rate pill in the corner; let the heatmap below carry the comparative signal.**
- "Player Map Performance Matrix" is the right format (heatmap), but the cell colors are bright red/yellow/orange. Switch to a single amber→muted scale or a token-driven diverging scale.

### Swaps (06)

- "Hero Swap Overview" has four big colored numbers (cyan, red, amber, blue) — same hex palette as map modes. Mono-tabular black/foreground numbers with mono caps labels would read 10× more like a Bloomberg ribbon.
- "Swap Timing Distribution" placeholder pill / "By Swap Count / By Swap Timing" quadrants are good (neutral) — keep. This is the cleanest tab; use as a template for the redesign.

### Teamfights (07) — second-worst color violation

- `WinProbabilityInsights` (`src/components/stats/team/win-probability-insights.tsx:125–131`):
  ```ts
  high-positive: "border-green-500 bg-green-50 dark:bg-green-950/30"
  negative:      "border-red-500 bg-red-50 dark:bg-red-950/30"
  moderate:      "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
  ```
  Plus `bg-green-600 / bg-red-600 / bg-yellow-600 text-white` solid badges in the corner. **This is a textbook bento-of-colored-cards anti-pattern.** Replace with a 4-column stat grid: tabular-nums value, mono caps label, single-line description, mono caps state tag (`STRONG / AVG / WEAK`) using `text-primary` or `text-destructive` only — no card tints, no border tints.
- "Overall Fight Performance" inner panel uses `bg-muted` correctly; values then go back to the green/yellow/red text scale. Pick one — neutral foreground with a single amber for the headline number.

### Ultimates (08)

- Top stat row is four big colored numerals (`text-blue/green/amber-600`). Strip color, mono caps the labels, tabular nums on the values.
- "Winning Fights" full-green card and "Losing Fights" full-red card next to each other are the most aggressive use of color on the page. **Two neutral stat tiles. The labels and the deltas in the numbers do all the work.** Optionally a tiny amber/destructive dot in the corner of the winning/losing tile.
- "Ultimate Timing Distribution" stacked-bar timeline is genuinely useful but its yellow/orange/red palette reads like a heat alert, not data. Move to a token-driven amber → muted ramp.
- "Player Ultimate Rankings" is a clean dense table — keep almost as-is, just add Geist Mono caps column headers.

### Winrates (09)

- "Hero Matchup Winrates" picker — Our Heroes column has a blue tint, Enemy Heroes column has a red tint. These are correct uses of the team-color tokens, but they should be `--team-1-off / --team-2-off`, not raw blue/red. (Verify in source.)
- "Best Compositions" shows 5 rank rows; in the screenshot 4 of them are empty placeholders with greyed names like "BPDM" and "1 game" stubs. Either show only what exists or render an honest empty state ("Need more matchup data — 1 game").
- "Match Results" table is fine — keep, mono-up the column headers.

### Simulator (10)

- Two-column layout (Scenario Setup left, Predicted Win Rate right) is right. The "Enemy bans against us" section has a heavy red-tinted vertical band; "Our bans" has a heavy blue-tinted band. Drop both tints. The labels disambiguate.
- "Predicted Win Rate" big amber number is correct. Keep that, drop the column tints.

## Cross-cutting issues

### 1. Color used as chrome

Inventoried below; every line is decorative color the system bans:

| File                            | Lines      | Treatment                                                      |
| ------------------------------- | ---------- | -------------------------------------------------------------- |
| `role-performance-card.tsx`     | 25–29      | Tank/Damage/Support card backgrounds                           |
| `win-probability-insights.tsx`  | 125–131    | Green/red/yellow card chrome + solid color badges              |
| `map-mode-performance-card.tsx` | 29–36      | Hex Tailwind palette for game modes (incl. banned violet/pink) |
| `quick-stats-card.tsx`          | 19–24      | Winrate text in green/blue/yellow/red                          |
| `ult-usage-overview-card.tsx`   | 26–31      | Initiation rate text in green/blue/yellow/red                  |
| `ultimate-economy-card.tsx`     | 33–52      | Efficiency text in green/blue/yellow/red                       |
| `role-balance-radar.tsx`        | 32–40      | Tooltip uses raw `#3b82f6 / #ef4444 / #eab308`                 |
| `team-fight-stats-card.tsx`     | (inferred) | Winning/Losing fight backgrounds                               |
| `recent-form-card.tsx`          | (inferred) | Strong-performance badge tint                                  |
| `win-loss-streaks-card.tsx`     | (inferred) | Streak tile chrome                                             |
| `top-maps-card.tsx`             | (inferred) | Bar fill saturation                                            |

**Action**: introduce `getStateColor(state: 'positive' | 'negative' | 'neutral')` returning `text-primary / text-destructive / text-foreground` only. Drop background and border state colors entirely except in the rare case where the tile _is_ the chart (heatmap cells).

### 2. No metadata layer

None of the section headings use the `font-mono uppercase tracking-[0.16em]` eyebrow. Every card uses `CardTitle` (Switzer 18px semibold), and there is no descriptive line under the title. The map redesign sits on the eyebrow as a wayfinding rail. **Action**: add a `<SectionHeader eyebrow="..." title="..." description="..." />` primitive used by every card.

### 3. Page header is undertuned

`/stats/team/[teamId]` opens with a 100px circular avatar + 3xl team name + 14px "Overall Record" line. The map page opens with eyebrow + 4xl headline + right-side mono ribbon. **Action**: rebuild the header as:

```tsx
<header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
  <div>
    <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
      Team · {timeframeLabel}
    </p>
    <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
      {team.name}
    </h1>
  </div>
  <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
    <Stat label="Record" value={`${wins}–${losses}`} />
    <Stat label="Winrate" value={`${winrate.toFixed(1)}%`} />
    <Stat label="Scrims" value={scrimCount} />
  </dl>
</header>
```

The 100px circular avatar should drop to 32px inline with the headline, or move to a small round inline avatar to the left of the team name (matching the dashboard team chips).

### 4. Tabs are not part of the metadata layer

The `<TabsList>` row is a flat strip of tabs that fights with the section headings beneath it for visual rank. **Action**: render tab labels in `font-mono uppercase tracking-[0.16em] text-xs`, anchor the tablist to the bottom of the header (border-b), and make the active tab carry a 1.5px amber underline rather than a filled pill. Compare to `/stats/map`'s sort + role pill row.

### 5. Card-on-card-on-card

- Performance tab nests Tank/Damage/Support panels inside `RolePerformanceCard`. Each inner panel has its own border + colored background, sitting inside an outer card with its own border. Three rings of containment.
- Heroes tab "Most Played by Role" does the same.
- Winrates tab "Hero Matchup Winrates" wraps two inner team panels in another card.

**Action**: flatten. The outer card carries the border + ring; inner sections separate with `divide-y` or a 24px gap, no inner border. Where the data is genuinely tabular (ult player rankings, swap player breakdown, match results), drop the card entirely and place the table on the page background.

### 6. Density inversion

Tabs sit ~32px above content with `space-y-4` between cards (16px). Cards then internally use `space-y-6`/`gap-6` (24px) and `py-6 px-6` padding. The breathing space is _inside_ cards (where dense data should be) and the section separation is _tight_. **Action**: invert. Use `divide-y` between sections with 40–48px vertical gaps; tighten card internals to `space-y-4` and `py-4 px-5`.

### 7. Stat ribbons are inconsistent

The page mixes `text-3xl font-bold` (QuickStatsCard) with `text-2xl font-bold` (Best Day inside same card) with `text-xl font-bold` (Avg Fight Duration) — three sizes for what should be one stat-row scale. Map redesign uses one: `text-lg font-medium tabular-nums` with mono caps `text-[10px] tracking-[0.18em]` labels (`MapHeroTrends → Stat`).

### 8. Empty / sparse states

- Winrates tab "Best Compositions" renders 5 empty rows (4 placeholder, one real). Render only what exists; below the fold, an honest empty footer ("More matchup data needed — 1 game on record").
- Performance tab "Best Role Trios" shows trio #2 with 50% (1 game) — one game is below the threshold for rank inference. **Action**: surface the minimum-sample threshold and either gray the row or hide it.

### 9. Iconography is inconsistent

- Tabs have no icons. Cards have icons sometimes (`Trophy`, `CalendarCheck`, `Clock`, `Heart`, `Shield`, `Swords`) and not other times.
- Icons inside `QuickStatsCard` use `text-muted-foreground` correctly, but icons inside `RolePerformanceCard` use `text-blue/red/yellow-400` — colored icons, not neutral.

**Action**: pick one. Either ship icons everywhere (small mono-color, 14px, `text-muted-foreground`) or nowhere. Map redesign uses no card icons — sentences and numerals are doing the work. I'd vote for nowhere.

### 10. Chart tokens

Multiple charts bypass the design system's chart tokens:

- `map-mode-performance-card.tsx` raw hex.
- `role-balance-radar.tsx` raw hex in tooltip text.
- `win-probability-insights.tsx` raw `bg-green-600 / bg-red-600` badge backgrounds.

**Action**: introduce a `getChartColor(role | mode | series)` helper that maps semantic roles to `--chart-1..5` (categorical) or `--team-1-* / --team-2-*` (entity-comparison), honoring colorblind variants per the design system.

## Prioritized recommendations

### P0 — strip decorative color (1 day, mostly mechanical)

- `role-performance-card.tsx`: drop `roleBgColors`, drop colored icon classes, lift the Tank/Damage/Support label into a Geist Mono caps eyebrow.
- `win-probability-insights.tsx`: drop `getImpactColor` background tinting; render a plain stat grid; replace solid colored badges with mono caps tags.
- `map-mode-performance-card.tsx`: replace hex palette with `--chart-1..5`; replace the colored quadrants with a flat table.
- `win-loss-streaks-card.tsx`, `recent-form-card.tsx`, `team-fight-stats-card.tsx`, `ult-usage-overview-card.tsx`: drop full-card color tints; keep optional small amber/destructive dot for the headline number.
- `quick-stats-card.tsx`, `ultimate-economy-card.tsx`: drop the four-tier `text-green/blue/yellow/red-600` scales; use `text-foreground` and a single amber for the highlight metric.
- `role-balance-radar.tsx`: token-ize tooltip color text (`text-team-1-off` etc., or `var(--chart-1)` etc.).
- `top-maps-card.tsx`: drop saturated bar fills, use `bg-primary/60`.
- `map-winrate-gallery`: drop per-card winrate tints.

### P1 — rebuild the page chrome (1 day)

- New header: eyebrow + 4xl headline + right-side `<dl>` mono ribbon, bottom border. Drop the 100px circular avatar in favor of a 32px inline avatar.
- Tablist: mono caps labels with amber underline for active. Anchor to the bottom of the header. The selected-tab amber rule (`DESIGN.md` §2 Amber-as-Signal) is already satisfied — match the pattern.
- Page padding: `px-6 sm:px-10 pt-8 pb-16` to match `/stats/map` and `/leaderboard`.
- Section spacing: `divide-y divide-[var(--border)] gap-y-12` between major content blocks.

### P2 — flatten card containment (1–2 days)

- Add `<SectionHeader />` primitive with eyebrow / title / description.
- Convert Performance, Heroes ("Most Played by Role"), Teamfights ("Win Probability"), Ultimates ("Winning/Losing Fights") to flat sections — single outer surface, no nested cards.
- Convert "Player Map Performance Matrix", "Player Ultimate Rankings", "Player Swap Breakdown", "Match Results" to page-bg dense tables (no card wrap).
- Standardize stat ribbons: one scale (`text-lg font-medium tabular-nums` value, `text-[10px] mono caps tracking-[0.18em]` label).

### P3 — content polish (0.5 day)

- Honest empty states for "Best Compositions", "Best Role Trios" sub-threshold rows, "Ability Impact Analysis" (the placeholder dropdown).
- Consistent timeframe label format in the eyebrow ("Last 7 days" not "Last Week" — match the dropdown's case).
- Mono caps the column headers across every dense table.
- Ban the icon-on-icon-on-color treatment — one icon system, neutral.

## What to keep

- Hero Pickrate Heatmap visual structure (just retoken).
- Recent Activity Calendar.
- Tabular tables: Player Ultimate Rankings, Match Results, Player Swap Breakdown, Player Map Performance Matrix (palette aside).
- Swap tab quadrants (By Swap Count / By Swap Timing) — these are already quiet.
- Winrate Over Time line chart structure.
- The 8-tab content taxonomy itself — the surfaces are right; only the chrome is loud.

## Implementation hint

Most of the visual work resolves to ~7 component edits and one new `<SectionHeader />`. The data and layout topology are sound. The redesign is a **palette + chrome pass**, not a re-architecture. Estimate 2–3 focused days end-to-end.
