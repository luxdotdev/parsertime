# Product

## Register

product

## Users

**Primary audience: coaches and analysts** on collegiate and pro Overwatch 2 teams who use Parsertime to dig into post-scrim data, surface outliers, and build insights they take back to their roster. They are technically literate, comfortable with dense tables, and want signal over hand-holding.

**Volume audience: players** checking their own scrim stats. They want fast answers ("how did I do?", "where did the team fall apart?") rather than deep exploration. The interface must serve them well without dragging the analyst experience down to a casual level.

**Secondary buyers: team managers and program directors.** Managers care about organizing data and access; program directors care about season-long ROI and proof of progress. Both interact with the same surfaces as coaches but with broader scope.

**Use context.** Most sessions happen **late at night on desktop**, immediately after a scrim block ends (~10pm ET). 78% desktop / 22% mobile. Sessions are focused, often on a large monitor, sometimes alongside VOD review on a second screen. Mobile is for quick lookups between things — not the surface to optimize density for.

**Job to be done.** Turn raw scrim logs into a fast, trustworthy read of team and individual performance, with enough depth that an analyst can find non-obvious patterns and bring them to the next practice. Replace hours of spreadsheet copy-paste with automated dashboards that arrive within minutes of upload.

## Product Purpose

Parsertime turns raw Overwatch 2 scrim data into skill ratings, trend lines, and coaching insights. Coaches and players upload Workshop Log data from scrims and get dashboards with per-player stats, hero skill ratings (CSR, a 1–5000 Z-score scale), trend analysis, and team performance breakdowns across eight dimensions (Overview, Performance, Heroes, Trends, Maps, Swaps, Teamfights, Ultimates).

It exists because the in-game scoreboard is incomplete, replay codes expire, and existing alternatives (Google Sheets, generic esports analytics tools) cost coaches hours of manual data entry per week and still can't show trends or hero-specific skill ratings. Parsertime makes data permanent, instant, and analyzable across any timeframe.

Success looks like: coaches make practice decisions from data instead of gut feel; players see week-over-week improvement they can act on; programs justify investment with season-long analytics — and all of it happens in the gap between when a scrim ends and when the team starts VOD review.

## Brand Personality

Three words: **competitive, analytical, technical.**

This is a tool for serious competitive teams — including pro orgs — and the interface should feel that way. Closer to a trader's terminal than a community fan site. Information-dense, fast, restrained, confident. Performance-tool energy, not gamer-aesthetic energy.

It should feel like the kind of software a coach would leave open on a second monitor for hours without it getting visually tiring.

**Voice.** Conversational, confident, practical — technical enough to be credible but never dense or intimidating. Direct and action-oriented. Lead with what the product does, not abstract concepts. Use gaming-native language ("scrim", "map", "swap"). Short sentences. Built-by-a-player authenticity, no-BS, community-driven.

**Reference points the product should feel adjacent to:**

- **Vercel** — confident neutrals, Geist typography, restrained accent use, sharp deltas
- **Linear** — dense without feeling cramped, every interaction tuned, dark surfaces that respect long sessions
- **PlanetScale dashboards** — comfortable data-heavy surfaces, calm color use, charts that read instantly
- **Bloomberg Terminal** — cool neutrals, warm signal, tabular figures, the "describing vs. doing" caps treatment

## Anti-references

- **Sparklines as decoration.** Tiny charts that look sophisticated but convey nothing have crept in and we want them out. Charts must carry real signal at the size they're drawn.
- **Generic dashboard bento grids** of identical icon-heading-blurb cards.
- **Glow / gradient hero cards**, gradient text, side-stripe accent borders on cards or list rows.
- **Gamer-aesthetic AI tells**: cyan-on-near-black, neon accents on dark, monospace-as-vibe, dark-with-purple-to-blue-gradients.
- **Caps on everything** (buttons, pill filters, CTAs) — feels shouty and templated. Caps belong only on the metadata/chrome layer.
- **Casual community-fan-site polish.** This is for pro and collegiate teams; the surface should not soften toward a hobbyist UI.
- **AI-powered marketing language**, enterprise jargon, "big data" copy. Not what users say.

## Design Principles

1. **Data first, chrome second.** Every pixel must earn its place by carrying information or directly serving a task. Decorative elements (stripes, gradients, glows, ornamental icons, vanity sparklines) need a real reason to exist or they get cut.

2. **Density over breathing room — for the desktop product.** Analysts want to see more on screen, not less. Tight, intentional spacing; numbers right-aligned with tabular figures; no unnecessary card-wrapping; flatten hierarchy where possible. Marketing surfaces can breathe; the product cannot afford to.

3. **Restraint with color, brutality with contrast.** Neutrals carry the UI; brand and team colors are reserved for actual signal — wins/losses, deltas, team identity, state changes. When color _does_ appear, it should be confident, not muted-to-the-point-of-invisible.

4. **Earn every motion.** View transitions, state changes, and feedback are fair game. Decorative animation, parallax, and scroll-driven reveals are not. The user is here to read data fast; motion that delays a read is a regression.

5. **Charts are first-class.** A chart in this product is a primary UI surface, not an illustration. It needs proper axes, legible labels, color-blind-safe team encoding, accessible tooltips, and density that survives a 27" monitor. Recharts defaults are a starting point, not a destination.

6. **Desktop-first, mobile honest.** Design and review on desktop at the resolutions analysts actually use. Make mobile genuinely useful for quick lookups (clear hierarchy, key numbers, no horizontal scrolling on stat tables) — but do not amputate features or compress the desktop experience to make a phone happy.

7. **Describing vs. doing.** Caps + mono + tracked-out is the metadata layer (column headers, eyebrows, taxonomy tags). Sentence case is content and interaction (names, titles, prose, buttons, pills, CTAs). Caps everywhere is shouty and AI-templated; caps nowhere collapses the metadata/content distinction.

## Accessibility & Inclusion

- **Team color tokens are non-negotiable.** `--team-1-*` / `--team-2-*` exist in deuteranopia, tritanopia, and protanopia variants. Team identity is a data primitive in this product; color-blind users must be able to read every chart. Preserve and respect those tokens — never swap them for arbitrary colors.
- **Reduced motion is honored.** All view transitions and keyframe animations are gated behind `prefers-reduced-motion`; reduced-motion users get instant state changes with no animation duration.
- **Contrast over decoration.** Neutrals + amber accent are picked so foreground/background pairs clear WCAG AA at the very least; primary buttons use a near-black foreground on amber so the button reads identically in light and dark mode without relying on theme-specific contrast tricks.
- **Keyboard and screen-reader parity.** Every chart tooltip, dropdown, and command surface must be reachable from the keyboard. Charts must carry textual labels alongside the visual encoding so the data is readable without color.
- **Tabular figures everywhere numbers compare.** Stat columns, leaderboards, and timeline tables use Geist Mono with tabular numerals so digits align — readable at a glance for analysts who scan columns.
