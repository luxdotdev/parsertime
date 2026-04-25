# Parsertime — Design Context

This document captures the design direction for Parsertime. It is the source of truth that `/impeccable` and any frontend design work should consult before generating UI.

## Design Context

### Users

**Primary audience: coaches and analysts** on collegiate and pro Overwatch 2 teams who use Parsertime to dig into post-scrim data, surface outliers, and build insights they take back to their roster. They are technically literate, comfortable with dense tables, and want signal over hand-holding.

**Volume audience: players** checking their own scrim stats. They want fast answers ("how did I do?", "where did the team fall apart?") rather than deep exploration. The interface must serve them well without dragging the analyst experience down to a casual level.

**Use context.** Most sessions happen **late at night on desktop**, immediately after a scrim block ends (~10pm ET). 78% desktop / 22% mobile. Sessions are focused, often on a large monitor, sometimes alongside VOD review on a second screen. Mobile is for quick lookups between things — not the surface to optimize density for.

**Job to be done.** Turn raw scrim logs into a fast, trustworthy read of team and individual performance, with enough depth that an analyst can find non-obvious patterns and bring them to the next practice.

### Brand Personality

Three words: **competitive, analytical, technical.**

This is a tool for serious competitive teams — including pro orgs — and the interface should feel that way. Closer to a trader's terminal than a community fan site. Information-dense, fast, restrained, confident. Performance-tool energy, not gamer-aesthetic energy.

It should feel like the kind of software a coach would leave open on a second monitor for hours without it getting visually tiring.

### Aesthetic Direction

**Reference points the product should feel adjacent to:**

- **Vercel** — confident neutrals, Geist typography, restrained accent use, sharp deltas
- **Linear** — dense without feeling cramped, every interaction tuned, dark surfaces that respect long sessions
- **PlanetScale dashboards** — comfortable data-heavy surfaces, calm color use, charts that read instantly

**Theme.** **Dark by default**, light fully supported. This is derived, not defaulted: the dominant viewing context is late-night desktop sessions for hours of data work — dark surfaces are the right default for that audience, in that physical setting. Light mode must remain first-class for daytime use and for users who prefer it.

**Typography.** Geist Sans + Geist Mono are working and fit the Vercel-adjacent direction; keep them as the working baseline. Geist Mono should appear deliberately for tabular numerals, hashes, IDs, and stat columns — not as a "technical vibes" decoration. If a project surface (e.g. a marketing page or a distinct sub-app) wants a different display face, that's allowed, but the product UI should stay consistent.

**ALL-CAPS + mono + tracked-out is a treatment for descriptive labels, not a default style.** The dividing line is **describing vs. doing**:

- **Caps belongs on** text that _labels, describes, or taxonomizes_: page eyebrows, column headers, stat ribbon labels, "Sort" / "Filter" affordance labels, role or subrole tags attached to entities. These elements should visually _recede_ into a metadata layer so the content sits on top.
- **Sentence case belongs on** text that _is content_ or _asks the user to act_: hero names, page titles, prose, button labels, interactive filter pills, dropdown items, CTAs. If a user is supposed to click it to do something, sentence case reads as actionable; caps reads as "this is a label about what this is."

The failure modes at either extreme:

- **Caps on everything** (including buttons, pill filters, CTAs) feels shouty and templated — an AI design tell.
- **Caps nowhere** (sentence case everywhere) collapses the metadata/content distinction: labels compete with values (`Scrims 180` vs. `SCRIMS 180`), taxonomy tags read as name continuations (`Main Support` under a hero name reads like part of the name; `MAIN SUPPORT` reads as taxonomy), and column headers blend into the body rows.

The right treatment: caps for the "chrome layer" that describes content, sentence case for the content itself and for interactive elements. This is how Bloomberg, Stripe dashboards, Linear, and sports broadcast graphics consistently handle dense label-heavy analytics surfaces, which is the register Parsertime is in.

**Color.** The product commits to an **achromatic-first palette with a single amber accent**. Data and team identity carry the chromatic weight; the brand hue is reserved for signal. The working tokens live in `src/app/globals.css`; this section captures the intent.

- **Neutrals are very slightly cool-tinted** (hue ~250°, chroma 0.003–0.005). The coolness is imperceptible as "blue," but it makes the amber read as deliberately warm by contrast. Cool neutrals + warm signal is the Bloomberg-terminal move — it's what makes amber read as _gold_, not _mustard_. Pure grays would flatten the system; warm-tinted neutrals would tip it into sepia.
- **Primary accent: amber at `oklch(0.82 0.17 78)`**, mode-independent. Paired with near-black foreground `oklch(0.185 0.02 80)` on buttons. A primary button reads the same way to the brain in light or dark mode — amber is a brand constant, not a theme variant.
- **Amber IS for:** primary CTAs, focus rings, active/selected state (open tab, highlighted card, active nav item), and brand moments on marketing.
- **Amber is NOT for:** hover state, decorative surface accents, or status semantics. Hover must use a subtler treatment (e.g. brighter border, slight surface lift) so amber stays meaningful for _selected_. If hover and selected both turn amber, selected loses its signal value and every card reads as "winning" on mouseover. Warnings/errors use destructive red, not amber.
- **Chart ramp `--chart-1..5`** stays entirely in the amber family, but uses **wide lightness intervals** so adjacent slices in a pie chart are clearly distinguishable. A tight monochromatic ramp (steps of ~0.12 lightness) failed: amber at 0.82 next to amber at 0.74 in a binary pie was indistinguishable. Introducing a non-amber chart-2 (gray) looked dead, and multi-hue palettes felt candy-ish against the brand.
  - `chart-1` = brand amber `oklch(0.82 0.17 78)` / `oklch(0.55 0.17 68)` light — matches `--primary`, the hero shade.
  - `chart-2` = deep bronze, a **large** lightness jump from chart-1 (~0.34 apart in dark mode) so binary pies read instantly. Same family, opposite end of the scale.
  - `chart-3` = pale cream/bright amber — the "third direction" shade, lighter than chart-1 in dark mode, brighter in light mode.
  - `chart-4` = mid honey-pumpkin — fills the gap between chart-1 and chart-2.
  - `chart-5` = dark umber — near the contrast floor, for deep backgrounds or rare 5th categories.
  - The ordering is deliberate: chart-1 → chart-2 maximizes contrast for the common 2-series case (binary pies, active/inactive splits). chart-3, 4, 5 fill in for rarer multi-category charts.
  - Charts that compare _entities_ (teams, heroes, players) must use `--team-*` tokens or an explicit per-entity palette — the chart ramp is for categorical metrics without inherent entity identity.
- **Tooltips use `--popover` surfaces, never `--primary`.** An amber tooltip background wrecks contrast for team-1 cyan and team-2 red-orange text inside it. Chart tooltips must use neutral popover surfaces with a border so the data colors (teams, chart series) read clearly against the tooltip, not against amber.
- **Avoid** the dark-with-glowing-cyan / purple-to-blue-gradient AI palette.

**Team colors are non-negotiable.** The existing `--team-1-*` / `--team-2-*` tokens with deuteranopia / tritanopia / protanopia variants are load-bearing — team identity is a data primitive in this product, and color-blind users must be able to read every chart. Preserve and respect those tokens.

**Known violet remnants for a polish pass before go-live.** The design-token layer is fully amber, but two surfaces still carry violet identity from the previous direction: the marketing aurora hero WebGL background, and the per-team gradient orbs on team badges. Both get retuned in a pre-launch polish pass.

**Anti-references.**

- **Sparklines as decoration.** Tiny charts that look sophisticated but convey nothing have crept in and the user wants them out. Charts must carry real signal at the size they're drawn.
- **Generic dashboard bento grids** of identical icon-heading-blurb cards.
- **Glow / gradient hero cards**, gradient text, side-stripe accent borders on cards or list rows.
- Any AI-tells: cyan-on-near-black, neon accents on dark, monospace-as-vibe.

### Design Principles

1. **Data first, chrome second.** Every pixel must earn its place by carrying information or directly serving a task. Decorative elements (stripes, gradients, glows, ornamental icons, vanity sparklines) need a real reason to exist or they get cut.

2. **Density over breathing room — for the desktop product.** Analysts want to see more on screen, not less. Tight, intentional spacing; numbers right-aligned with tabular figures; no unnecessary card-wrapping; flatten hierarchy where possible. Marketing surfaces can breathe; the product cannot afford to.

3. **Restraint with color, brutality with contrast.** Neutrals carry the UI; brand and team colors are reserved for actual signal — wins/losses, deltas, team identity, state changes. When color _does_ appear, it should be confident, not muted-to-the-point-of-invisible.

4. **Earn every motion.** View transitions, state changes, and feedback are fair game. Decorative animation, parallax, and scroll-driven reveals are not. The user is here to read data fast; motion that delays a read is a regression.

5. **Charts are first-class.** A chart in this product is a primary UI surface, not an illustration. It needs proper axes, legible labels, color-blind-safe team encoding, accessible tooltips, and density that survives a 27" monitor. Recharts defaults are a starting point, not a destination.

6. **Desktop-first, mobile honest.** Design and review on desktop at the resolutions analysts actually use. Make mobile genuinely useful for quick lookups (clear hierarchy, key numbers, no horizontal scrolling on stat tables) — but do not amputate features or compress the desktop experience to make a phone happy.
