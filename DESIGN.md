---
name: Parsertime
description: Coach's terminal for Overwatch 2 scrim analytics — achromatic-first, amber-as-signal, dense and tuned for late-night desktop sessions.
colors:
  background-light: "oklch(0.985 0.003 250)"
  background-dark: "oklch(0.14 0.003 250)"
  foreground-light: "oklch(0.185 0.005 250)"
  foreground-dark: "oklch(0.98 0.002 250)"
  card-light: "oklch(0.998 0.002 250)"
  card-dark: "oklch(0.175 0.004 250)"
  popover-light: "oklch(0.998 0.002 250)"
  popover-dark: "oklch(0.175 0.004 250)"
  muted-light: "oklch(0.965 0.003 250)"
  muted-dark: "oklch(0.22 0.004 250)"
  muted-foreground-light: "oklch(0.5 0.005 250)"
  muted-foreground-dark: "oklch(0.68 0.005 250)"
  border-light: "oklch(0.915 0.004 250)"
  border-dark: "oklch(1 0 0 / 10%)"
  primary-light: "oklch(0.55 0.17 68)"
  primary-dark: "oklch(0.82 0.17 78)"
  primary-foreground-light: "oklch(0.985 0.003 250)"
  primary-foreground-dark: "oklch(0.185 0.02 80)"
  destructive-light: "oklch(0.58 0.22 27)"
  destructive-dark: "oklch(0.65 0.22 27)"
  chart-1-light: "oklch(0.55 0.17 68)"
  chart-1-dark: "oklch(0.82 0.17 78)"
  chart-2-light: "oklch(0.32 0.09 58)"
  chart-2-dark: "oklch(0.48 0.11 68)"
  chart-3-light: "oklch(0.72 0.16 78)"
  chart-3-dark: "oklch(0.92 0.1 88)"
  chart-4-light: "oklch(0.42 0.12 62)"
  chart-4-dark: "oklch(0.65 0.17 72)"
  chart-5-light: "oklch(0.22 0.04 50)"
  chart-5-dark: "oklch(0.35 0.06 55)"
  team-1-off: "oklch(0.753 0.153965 232.1809)"
  team-2-off: "oklch(0.6218 0.224 17.51)"
  team-1-deuteranopia: "oklch(0.6074 0.1504 244.22)"
  team-2-deuteranopia: "oklch(0.8268 0.0775 352.56)"
  team-1-tritanopia: "oklch(0.7243 0.2464 142.5)"
  team-2-tritanopia: "oklch(0.6781 0.3168 324.84)"
  team-1-protanopia: "oklch(0.6921 0.1347 227.9)"
  team-2-protanopia: "oklch(0.7307 0.1638 346.28)"
typography:
  display:
    fontFamily: "Switzer, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Switzer, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Switzer, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Switzer, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.06em"
  numeral:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-foreground-dark}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-foreground-dark}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.muted-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-destructive:
    backgroundColor: "oklch(0.65 0.22 27 / 20%)"
    textColor: "{colors.destructive-dark}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  card:
    backgroundColor: "{colors.card-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    height: "36px"
  badge-default:
    backgroundColor: "{colors.muted-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "20px"
---

# Design System: Parsertime

## 1. Overview

**Creative North Star: "The Coach's Terminal"**

Parsertime sits next to a coach at 10pm ET, after the scrim block ends, on a 27" monitor. It is a working surface, not a marketing surface — the data is the product, and every interface decision serves a coach who is reading numbers fast, comparing players across weeks, and deciding what next practice should focus on. The closest reference is a Bloomberg terminal in temperament: cool neutrals carry the UI, warm signal lands on the things that matter, and the system never gets visually tiring across hours of use. Linear's tuning, Vercel's restraint, PlanetScale's data calm.

The system is **achromatic-first with a single amber accent**. Neutrals are very slightly cool-tinted (hue ~250°, chroma 0.003–0.005); the coolness is imperceptible as "blue" but it makes amber read as deliberately _gold_, not _mustard_. Amber is the brand identity, but the **specific lightness shifts per mode for contrast**: a deep amber `oklch(0.55 0.17 68)` paired with near-white foreground in light mode, a bright amber `oklch(0.82 0.17 78)` paired with near-black foreground in dark mode. Both still read as amber; both clear WCAG AA when the token is used as text on the page background — which is the active-nav case the original mode-independent doctrine missed. Amber is reserved for **selected, active, and primary CTA** states. Hover gets a subtler treatment so amber stays meaningful for "this is the chosen one." Team identity, win/loss deltas, and chart series carry the rest of the chromatic weight.

This system explicitly rejects the gamer-aesthetic AI palette (cyan-on-near-black, purple-to-blue gradients, neon accents on dark). It rejects identical icon-heading-blurb dashboard bento grids, sparklines as decoration, glow/gradient hero cards, gradient text, and side-stripe accent borders. Caps + mono + tracked-out is the metadata layer for column headers and taxonomy tags — never the default voice.

**Key Characteristics:**

- Achromatic-first with one signal hue (amber `oklch(0.82 0.17 78)`)
- Cool-tinted neutrals (hue 250°, chroma 0.003–0.005)
- Dark by default, light fully first-class
- Switzer for content, Geist Mono for labels and tabular numerals
- Density tuned for desktop; mobile is for quick lookups, not the design target
- Charts are first-class UI, with color-blind-safe team encoding as a hard requirement
- Motion is functional only — view transitions, state changes, reduced-motion honored

## 2. Colors

A cool-tinted achromatic spine with one warm amber signal hue. Team-identity and chart colors carry the rest of the chromatic weight; the brand hue is reserved for user intent and brand moments.

### Primary

- **Signal Amber, light mode** (`oklch(0.55 0.17 68)`): Primary CTAs, focus rings, selected/active state (open tab, highlighted card, active nav item), and brand moments on marketing. Paired with near-white foreground `oklch(0.985 0.003 250)`. Deep enough to clear WCAG AA when used as text on the near-white page background — that's the active-nav case (`text-primary` on a `bg-background` surface) the dark-mode doctrine alone could not cover.
- **Signal Amber, dark mode** (`oklch(0.82 0.17 78)`): Same role, brighter pairing. Paired with near-black foreground `oklch(0.185 0.02 80)`. The brightness keeps amber readable as text on the deep `oklch(0.14 ...)` page and gives buttons a confident gold lift.

The amber identity is shared across modes — same hue family, same role, same place in the system. The lightness shifts (0.55 vs 0.82) are the price of clearing contrast in both themes; the token is no longer mode-independent.

### Tertiary (chart ramp)

The amber-family chart ramp lives entirely in the brand hue but uses **wide lightness intervals** so adjacent slices in a binary pie are clearly distinguishable. A tight monochromatic ramp failed; a non-amber gray looked dead; multi-hue palettes felt candy-ish. The ordering below maximizes contrast for the common 2-series case (binary pies, active/inactive splits).

- **Hero Amber** (`chart-1`, `oklch(0.55 0.17 68)` light / `oklch(0.82 0.17 78)` dark): Matches `--primary`. The hero shade.
- **Deep Bronze** (`chart-2`, `oklch(0.32 0.09 58)` light / `oklch(0.48 0.11 68)` dark): A large lightness jump from chart-1 — same family, opposite end of the scale — so binary pies read instantly.
- **Pale Cream Amber** (`chart-3`, `oklch(0.72 0.16 78)` light / `oklch(0.92 0.1 88)` dark): The "third direction" shade.
- **Honey Pumpkin** (`chart-4`, `oklch(0.42 0.12 62)` light / `oklch(0.65 0.17 72)` dark): Fills the gap between chart-1 and chart-2.
- **Dark Umber** (`chart-5`, `oklch(0.22 0.04 50)` light / `oklch(0.35 0.06 55)` dark): Near the contrast floor, for deep backgrounds or rare 5th categories.

### Neutral

The cool tint (~250° hue, 0.003–0.005 chroma) is imperceptible as blue but flips amber from mustard to gold by contrast. Pure grays would flatten the system; warm-tinted neutrals would tip it into sepia.

- **Page Background** (light `oklch(0.985 0.003 250)` / dark `oklch(0.14 0.003 250)`): Body surface. Dark mode runs deep so cards lift cleanly off it.
- **Card Surface** (light `oklch(0.998 0.002 250)` / dark `oklch(0.175 0.004 250)`): Card / popover background. In dark mode, sits one step lighter than the page so layering works without shadows.
- **Foreground** (light `oklch(0.185 0.005 250)` / dark `oklch(0.98 0.002 250)`): Body text and primary content.
- **Muted Foreground** (light `oklch(0.5 0.005 250)` / dark `oklch(0.68 0.005 250)`): Secondary text, descriptions, axis labels.
- **Border** (light `oklch(0.915 0.004 250)` / dark `oklch(1 0 0 / 10%)`): Card rings, dividers, input strokes. Dark mode uses a translucent white so borders pick up the surface tint correctly when stacked.

### Team Identity (semantic)

Load-bearing — team identity is a data primitive in this product. Each team token has off / deuteranopia / tritanopia / protanopia variants, and the active variant is a user-level preference. Charts that compare entities (teams, heroes, players) must use these tokens or an explicit per-entity palette, never the chart-1..5 ramp.

- **Team 1** (default `oklch(0.753 0.154 232)` — cyan-leaning): Home team identity.
- **Team 2** (default `oklch(0.622 0.224 17.5)` — red-orange): Opposing team identity.

### Named Rules

**The Amber-as-Signal Rule.** Amber is for primary CTAs, focus rings, and selected/active state — and nothing else. Hover state must use a subtler treatment (slightly brighter border, slight surface lift). If hover and selected both turn amber, "selected" loses its signal value and every card reads as winning on mouseover.

**The Mode-Aware Amber Rule.** Light mode uses deep amber (`oklch(0.55 0.17 68)` + near-white foreground); dark mode uses bright amber (`oklch(0.82 0.17 78)` + near-black foreground). Both clear WCAG AA when used as text on the page background. **Don't reach for the dark-mode amber in light mode just because it looks more "branded" — it fails contrast on `text-primary` against `bg-background` and the active nav item disappears.**

**The Cool-Neutral, Warm-Signal Rule.** Neutrals carry hue ~250°, chroma 0.003–0.005. Amber lands at hue ~68–78°, chroma 0.17. The contrast between cool ground and warm figure is the Bloomberg-terminal move — it is what makes the accent read as gold.

**The Tooltip Surface Rule.** Chart tooltips render on `--popover` neutral surfaces with a border, never on `--primary` amber. Amber backgrounds wreck contrast for team-1 cyan and team-2 red-orange data text inside them.

**The Team-Token Rule.** Any chart comparing entities (teams, heroes, players) uses `--team-*` tokens with the active colorblind variant honored. The chart-1..5 ramp is for categorical metrics without inherent entity identity.

## 3. Typography

**Display Font:** Switzer (Indian Type Foundry / Pangram Pangram, OFL). Loaded via `next/font/local` as a single variable woff2, weight axis `100 900`, with a matching italic. Fallback: `ui-sans-serif, system-ui, -apple-system, sans-serif`.
**Body Font:** Switzer, same family.
**Label / Mono Font:** Geist Mono (Vercel, loaded via `next/font/google`). Fallback: `ui-monospace, "SF Mono", Menlo, monospace`.

**Character.** Switzer is a modern grotesk with geometric precision and slightly sharper terminals than Geist — reads neutral at body sizes, picks up a confident edge at headlines. The variable axis lets us reach unusual weights (350, 550, 650) without loading extra files, which gives the hierarchy more room to breathe than the prior 400/700-only pairing. Geist Mono is retained as the metadata-and-numeral face; it is the half of the system that already does the trader-terminal lift on tabular figures, IDs, and caps-and-tracked labels, and it is never used as "technical vibes" decoration on prose.

### Hierarchy

- **Display** (700, `1.875rem` / 30px, line-height 1.15, tracking -0.01em): Marketing hero titles and major page headlines on long-form surfaces.
- **Headline** (700, `1.5rem` / 24px, line-height 1.2): Page titles inside the product. The default `h1` for app pages.
- **Title** (600, `1.125rem` / 18px, line-height 1.3): Card titles, section labels, dialog headings. The default `h2` / `h3` weight in product UI.
- **Body** (400, `0.875rem` / 14px, line-height 1.5): All running content. Cap measure at 65–75ch on long-form prose; product surfaces ignore measure since rows are typically wider than copy.
- **Label** (Geist Mono, 500, `0.75rem` / 12px, line-height 1.2, tracking 0.06em, **UPPERCASE**): Column headers, page eyebrows, stat ribbon labels, taxonomy tags ("MAIN SUPPORT", "TANK"), affordance labels ("SORT", "FILTER"). The metadata layer that recedes so content sits on top.
- **Numeral** (Geist Mono, 500, `0.875rem` / 14px, `font-feature-settings: "tnum"`): All comparable numbers — leaderboards, stat columns, deltas, win rates, ratings. Tabular figures align on the digit so analysts can scan columns at a glance.

### Named Rules

**The Describing-vs.-Doing Rule.** Caps + Geist Mono + tracked-out is for text that _labels, describes, or taxonomizes_: page eyebrows, column headers, role tags, "Sort"/"Filter" affordance labels. Sentence case in Switzer is for text that _is content_ or _asks the user to act_: hero names, page titles, prose, button labels, dropdown items, CTAs. Caps everywhere is shouty and AI-templated; caps nowhere collapses metadata into content.

**The Tabular-Numeral Rule.** Any number that compares to another number renders in Geist Mono with `font-feature-settings: "tnum"`. Mixed proportional digits in stat columns is the kind of small unprofessionalism that disqualifies a tool from a coaching workflow.

**The No-Mono-As-Vibe Rule.** Geist Mono is functional — labels, numerals, IDs, code. It is not used to make body prose look "technical," and it is not used on CTAs.

## 4. Elevation

The system is **flat-by-default with surface-tonal layering**. Cards lift off the page through a one-step lighter surface tone (and a 1-pixel ring at 10% white in dark mode), not a shadow. The single shadow vocabulary in use is `shadow-xs` — a barely-there shadow that signals "this is a card, not a panel" without introducing visual noise.

Depth in this product is conveyed by: tonal layer (page → card → popover), border/ring (1px, very low contrast), and the active-state amber accent. Drop shadows are a polish tool for popovers and floating menus, never a generalized "depth" trick.

### Shadow Vocabulary

- **xs** (`box-shadow: 0 1px 2px 0 oklch(0 0 0 / 0.05)`): The default card shadow, plus inputs and outline buttons. Almost imperceptible — its job is to nudge the eye that a surface is liftable, not to create depth theater.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Depth is conveyed by tonal layering and a 1px ring at low contrast. A shadow only appears on `shadow-xs` cards and on floating menus/popovers/dialogs at the framework level — never as a decorative lift on landing-page hero cards.

**The Ring-Over-Shadow Rule.** In dark mode, cards use `ring-1 ring-foreground/10` instead of a shadow because shadows over a `oklch(0.14 ...)` background are invisible. The ring uses a translucent white so it picks up the surface tint correctly when stacked.

## 5. Components

### Buttons

- **Shape:** `rounded-md` corners (8px). Default size 36px tall, x-padding 10px, x-small 24px, small 32px, large 40px. The radius narrows by 2px at smaller sizes (`rounded-[min(var(--radius-md),10px)]` for `sm`, `8px` for `xs`) to keep optical roundness consistent.
- **Primary:** `bg-primary text-primary-foreground` — bright amber on near-black in dark mode, deep amber on near-white in light mode. Hover dims to 80% opacity (`hover:bg-primary/80`); selected/expanded state stays at full amber.
- **Outline:** Transparent background with `border-border`; hover swaps to `bg-muted text-foreground`. In dark mode, the outline button picks up `bg-input/30` for a subtle filled feel. `aria-expanded:true` matches the hover surface so dropdown triggers stay anchored when open.
- **Secondary:** `bg-secondary text-secondary-foreground` — a cool-tinted neutral surface, hover dims to 80%. Used for non-primary actions inside cards.
- **Ghost:** Fully transparent, picks up `bg-muted` on hover. The default for icon-only buttons inside dense toolbars.
- **Destructive:** `bg-destructive/10 text-destructive` — red-tinted soft fill, hover lifts to `/20`. The destructive-foreground constant is reserved for the destructive-on-destructive case (full color background); the soft fill is the dominant variant.
- **Link:** `text-primary` underline-on-hover. Inline only; never used for primary actions.
- **Focus ring:** `ring-[3px] ring-ring/50 border-ring` on `focus-visible`. Amber ring with 50% opacity, 3px wide, tied to the `--ring` token (which equals `--primary`).
- **Icon sizing:** Auto-sized SVG (`size-4` default, `size-3` at xs). Icon-only variants use the matching square size.

### Cards

- **Corner Style:** `rounded-xl` (14px).
- **Background:** `bg-card` — one step lighter than the page in dark mode, near-white in light. The card never shares the page background.
- **Shadow Strategy:** `shadow-xs` plus `ring-1 ring-foreground/10`. The ring carries depth in dark mode where `shadow-xs` is invisible; the shadow carries depth in light mode where the ring is faint.
- **Border:** No outer border distinct from the ring.
- **Internal Padding:** `py-6` default, `py-4` at `data-size=sm`. Header/content/footer all get `px-6` (`px-4` sm). Internal stack uses `gap-6` (`gap-4` sm) — generous in product UI by exception, since the card title is the main hierarchy mark inside a dense surface.
- **Image edge:** `*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl` — full-bleed images at the top or bottom of a card stay flush with the card's corner radius.

### Inputs / Fields

- **Style:** `border-input` 1px stroke, transparent background in light, `bg-input/30` in dark. `rounded-md` (8px), 36px tall, `px-2.5 py-1`. `text-base` mobile / `text-sm` desktop so iOS doesn't auto-zoom on focus.
- **Focus:** `border-ring` swap and `ring-[3px] ring-ring/50` — the same amber 3px ring buttons use. No glow, no animation; the ring snaps in instantly.
- **Error / Invalid:** `aria-invalid:border-destructive` plus `aria-invalid:ring-destructive/20` (40% in dark). The error state is the same pattern as focus, just in destructive red.
- **Disabled:** `disabled:opacity-50 disabled:pointer-events-none`. No background change — the opacity drop is sufficient signal.

### Badges / Chips

- **Style:** `rounded-sm` (6px), 20px tall, `px-2 py-0.5`, `text-xs` Switzer. Filled variant uses `bg-secondary` (or `bg-muted`) with `text-secondary-foreground`. Outlined variant uses `border` with transparent background.
- **State:** Active/selected badges shift to `bg-primary text-primary-foreground` — the same amber-as-signal rule as buttons.

### Navigation

- **Style:** Sidebar uses `bg-sidebar` (slightly lighter than `bg-background` in dark mode, slightly lighter than `bg-card` in light). Active nav item picks up `bg-sidebar-accent` and `text-sidebar-accent-foreground`; the active-active state (current route) gets the amber `bg-sidebar-primary` token.
- **Typography:** Body Switzer for nav labels — caps treatment is reserved for sidebar group headers (the metadata layer).
- **Mobile:** Sidebar collapses behind a sheet trigger; on phones we surface a bottom-anchored navigation strip with the same amber-as-active rule.

### Charts

- **Library:** Recharts, restyled. Defaults are a starting point, not a destination.
- **Tooltip:** Always `bg-popover` with `border-border`, `rounded-md`, body Switzer for category labels, Geist Mono with `tnum` for values. Never amber background — see the Tooltip Surface Rule.
- **Color encoding:** Categorical metrics use the `chart-1..5` ramp. Entity comparisons (teams, heroes, players) use `--team-*` tokens with the active colorblind variant honored. Wins/losses use destructive red and primary amber respectively.
- **Axes / labels:** Geist Mono caps for axis labels, body Switzer for legend entries. Gridlines pick up `border-border` at 30–40% opacity.

### View Transitions (signature)

The product runs `view-transition-name` on persistent surfaces (site header, the active map card transitioning to a map detail page). Three transition styles in use: `fade-in`/`fade-out` (default), `slide-up`/`slide-down` (vertical navigation), `nav-forward`/`nav-back` (horizontal directional navigation), and `expand-map`/`contract-map` (the map card → map page flourish). Timing tokens: `--duration-exit: 150ms`, `--duration-enter: 210ms`, `--duration-move: 400ms`. Reduced motion zeroes all three.

## 6. Do's and Don'ts

### Do:

- **Do** keep amber for primary CTAs, focus rings, and selected/active state. Light mode: deep amber `oklch(0.55 0.17 68)` + near-white foreground `oklch(0.985 0.003 250)`. Dark mode: bright amber `oklch(0.82 0.17 78)` + near-black foreground `oklch(0.185 0.02 80)`. Both clear WCAG AA when the token is used as text on the page background.
- **Do** render comparable numbers in Geist Mono with `font-feature-settings: "tnum"`. Stat columns must align on the digit.
- **Do** use caps + Geist Mono + tracked-out (0.06em) for the metadata layer (column headers, eyebrows, taxonomy tags) — and only that layer. Buttons, pills, CTAs, page titles, hero names stay in sentence-case Switzer.
- **Do** use `--team-*` tokens for entity-identity charts (teams, heroes, players). Honor the user's active colorblind variant (off / deuteranopia / tritanopia / protanopia).
- **Do** convey card depth through tonal layering plus `ring-1 ring-foreground/10`. Use `shadow-xs` for the soft lift; reserve real shadows for popovers and dialogs.
- **Do** gate every keyframe and view transition behind `prefers-reduced-motion: reduce`. Reduced motion gets instant state changes.
- **Do** render chart tooltips on `--popover` surfaces with a border. Body Switzer for category labels, Geist Mono `tnum` for values.

### Don't:

- **Don't** use cyan-on-near-black, neon-on-dark, or purple-to-blue gradients. That is the AI-tool palette; this is a coach's terminal.
- **Don't** put amber on hover state. Hover uses a subtler treatment (slightly brighter border, surface lift). Amber must stay reserved for "selected" so it carries signal.
- **Don't** use the dark-mode amber `oklch(0.82 0.17 78)` as a text color in light mode. It fails WCAG AA against the near-white page background and the active nav item disappears. Use the deep light-mode amber `oklch(0.55 0.17 68)` (which is what `--primary` resolves to in light mode) instead.
- **Don't** use side-stripe accent borders (`border-left` greater than 1px as a colored stripe) on cards, list rows, callouts, or alerts as a generic chrome treatment. Use full borders, background tints, or leading numerals instead. **Exception:** an amber `border-l-4 border-primary/50` stripe on testimonial blockquotes and similar emphasis blocks is welcome — it reads as an intentional quote indicator and reinforces brand color, and it overrides the cross-system side-stripe ban for this project.
- **Don't** use gradient text (`background-clip: text` plus a gradient background). Emphasis comes from weight or size, not from a decorative gradient.
- **Don't** reach for glass / backdrop-blur as a default decorative trick. Rare and purposeful, or nothing.
- **Don't** ship sparklines as decoration. A chart in this product must carry real signal at the size it is drawn — if it doesn't, cut it.
- **Don't** use the identical-icon-heading-blurb dashboard bento grid pattern. It's the AI dashboard cliché and reads as templated.
- **Don't** put caps on buttons, pills, CTAs, hero names, or page titles. Caps belongs on the metadata layer; everywhere else, sentence case.
- **Don't** put chart tooltips on amber backgrounds. Team-1 cyan and team-2 red-orange data text wrecks against `--primary`.
- **Don't** use Geist Mono on prose to make text look "technical." It is for labels, numerals, IDs, and code.
- **Don't** add purple-era violet accents (the marketing aurora hero and per-team gradient orbs are the last remnants — they get retuned in the polish pass before launch).
- **Don't** use em dashes or `--` in copy. Use commas, colons, semicolons, periods, or parentheses.
