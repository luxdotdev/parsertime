# Product Marketing Context

_Last updated: 2026-03-14_

## Product Overview

**One-liner:** Parsertime turns raw Overwatch scrim data into skill ratings, trend lines, and coaching insights.
**What it does:** Parsertime is a scrim analytics platform for competitive Overwatch teams. Players and coaches upload Workshop Log data from scrims and instantly get dashboards with per-player stats, hero skill ratings, trend analysis, and team performance breakdowns — replacing manual spreadsheet tracking with automated, visual analytics.
**Product category:** Esports analytics / scrim analytics platform
**Product type:** SaaS (web application)
**Business model:** Freemium with three tiers — Free ($0/mo, 2 teams, 5 members), Basic ($10/mo, 5 teams, 10 members), Premium ($15/mo, 10 teams, 20 members). Discounts available for collegiate and Calling All Heroes teams. Open source codebase.

## Target Audience

**Target companies:** Collegiate esports programs, professional Overwatch teams, competitive amateur teams
**Decision-makers:** Head coaches, team managers, team captains, program directors
**Primary use case:** Turning raw scrim data into actionable coaching insights without manual spreadsheet work
**Jobs to be done:**

- Review scrim performance quickly after practice ends
- Track player improvement over weeks, months, and seasons
- Identify coaching focus areas with data instead of guesswork
  **Use cases:**
- Post-scrim review: Upload a scrim, see results in minutes
- Player development: Track individual player stats and trends over time
- Scouting and roster decisions: Compare players across heroes and roles using skill ratings
- Match preparation: Analyze team strengths/weaknesses across map types and compositions

## Personas

| Persona          | Cares about                                     | Challenge                                                                                              | Value we promise                                                                      |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Head Coach       | Actionable insights to improve team performance | Reviewing scrims means copying stats into spreadsheets, squinting at columns, hoping no formula errors | Coach with data, not guesswork — every stat the scoreboard doesn't show you           |
| Team Manager     | Organizing team data, managing access           | Keeping stats organized across multiple players and scrims                                             | Team workspace with scoped permissions, everyone sees the same data                   |
| Player           | Personal improvement, knowing what to work on   | No easy way to track individual performance trends over time                                           | Per-player profiles with trend lines, hero skill ratings, and clear improvement areas |
| Program Director | Justifying program investment, seeing ROI       | No visibility into team progress across a season                                                       | Season-long analytics, trend filtering, and proof points for program value            |

## Problems & Pain Points

**Core problem:** After scrims end, coaches and players have no fast, reliable way to analyze what happened. The in-game scoreboard is incomplete and replay codes expire.
**Why alternatives fall short:**

- Manual spreadsheets are slow, error-prone, and tedious ("copying numbers into spreadsheets, squinting at columns, hoping someone didn't fat-finger a formula")
- In-game replay codes expire, so historical data is lost
- General analytics tools aren't built for Overwatch scrim workflows
- No existing tool provides hero-specific skill ratings or trend analysis for scrims
  **What it costs them:** Hours of manual data entry per week, missed coaching insights, inability to track long-term player development, decisions based on gut feel instead of data
  **Emotional tension:** Frustration with tedious manual work, uncertainty about whether coaching focus areas are right, fear of missing improvement opportunities for players

## Competitive Landscape

**Direct:** Manual spreadsheet tracking (Google Sheets) — falls short because it's slow, error-prone, loses data when someone fat-fingers a formula, and can't show trends or skill ratings
**Secondary:** In-game replay viewer — falls short because replay codes expire, no persistent data, no aggregate stats across scrims, no trend analysis
**Indirect:** General esports analytics platforms — fall short because they aren't purpose-built for Overwatch scrims, don't support Workshop Log format, lack hero-specific skill ratings

## Differentiation

**Key differentiators:**

- Custom Hero Skill Rating (CSR): proprietary 1-5000 scale using Z-scores across role-specific metrics, with tier badges from Bronze to Champion
- Purpose-built for Overwatch scrims — not a general analytics tool
- Instant results — data available within minutes of scrim upload
- Data persists permanently, independent of replay codes
- Open source — code is public, community can audit and contribute
- Eight-dimension team analytics: Overview, Performance, Heroes, Trends, Maps, Swaps, Teamfights, Ultimates
  **How we do it differently:** Upload Workshop Log data and get automated dashboards with rich visualizations — no manual entry, no spreadsheets, no waiting
  **Why that's better:** Coaches get answers in seconds instead of hours; data is permanent and analyzable over any timeframe; skill ratings provide objective player evaluation
  **Why customers choose us:** Speed (results in minutes vs. hours of spreadsheet work), depth of analysis (CSR, trend lines, role-specific metrics), and zero friction to start (free tier, no credit card)

## Objections

| Objection                                        | Response                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "We already use spreadsheets and they work fine" | Spreadsheets take hours of manual entry every week and can't show trend lines or skill ratings. Parsertime gives you more insight in minutes, free to try. |
| "Is my team's data private?"                     | Yes — passwordless login, team-scoped permissions, zero data sharing between teams. Your scrims stay yours.                                                |
| "We're a small/casual team, is this for us?"     | The free tier supports 2 teams and 5 members with full analytics. First-time coaches and seasoned analysts both feel at home.                              |

**Anti-persona:** Casual players who don't scrim or play competitively. Teams that don't use the ScrimTime Workshop code for data collection. Players looking for ranked/competitive ladder stats (Parsertime is for scrims, not ranked play).

## Switching Dynamics

**Push:** Frustration with hours of manual spreadsheet work after every scrim; losing data when replay codes expire; inability to track player improvement over time; mistakes from manual data entry
**Pull:** Instant dashboards after uploading scrims; permanent data storage; hero skill ratings that objectively measure player performance; trend lines that show improvement over weeks and months
**Habit:** Familiarity with existing spreadsheet workflows; team members already know where to find the shared Google Sheet; "it works well enough"
**Anxiety:** Learning curve for a new tool; whether the data will be accurate; whether the team will actually adopt it; whether the free tier is enough to evaluate properly

## Customer Language

**How they describe the problem:**

- "We spend hours copying stats into spreadsheets after every scrim"
- "The scoreboard doesn't show us everything we need"
- "Replay codes expire and then our data is gone"
- "We're coaching based on gut feel, not data"
  **How they describe us:**
- "Parsertime is so impactful to the point where my players can be coached on things they actively need help with, like living more, or holding their ult longer and being patient."
- "We can actually see how players are improving week over week now"
  **Words to use:** scrims, coaching insights, skill ratings, trend lines, analytics, dashboard, upload, team workspace, performance tracking
  **Words to avoid:** AI-powered (not applicable), "big data," enterprise, corporate jargon, overly technical database terms
  **Glossary:**
  | Term | Meaning |
  |------|---------|
  | CSR (Custom Hero Skill Rating) | Proprietary 1-5000 player rating using Z-scores across role-specific metrics |
  | Workshop Log | Raw data output from the ScrimTime Overwatch Workshop code |
  | Scrim | Scrimmage — a practice match between competitive teams |
  | Map | A single game within a scrim session |
  | First Pick Rate | How often a team gets the first elimination in a teamfight |

## Brand Voice

**Tone:** Conversational, confident, practical — technical enough to be credible but never dense or intimidating
**Style:** Direct and action-oriented. Lead with what the product does, not abstract concepts. Use gaming-native language. Short sentences.
**Personality:** Built-by-a-player authenticity, community-driven, open and transparent, improvement-focused, no-BS

## Proof Points

**Metrics:**

- 800,000+ player stats tracked
- 450,000+ kills recorded
- 6,000+ maps uploaded
- 99.99% uptime
- 50+ collegiate and professional teams
- 7 major releases in ~2 years
  **Customers:** St. Clair College, Cornell University, Florida International University, Georgia State University, VLLN, o7 Esports
  **Testimonials:**
  > "Parsertime is so impactful to the point where my players can be coached on things they actively need help with, like living more, or holding their ult longer and being patient." — coy (@shy.coy), Manager for o7 Esports
  > **Value themes:**
  > | Theme | Proof |
  > |-------|-------|
  > | Speed | Upload a scrim, see results in minutes — not hours of spreadsheet work |
  > | Depth | CSR skill ratings, 8-dimension team analytics, trend lines across any timeframe |
  > | Accessibility | Free tier with full analytics; first-time coaches and seasoned analysts both feel at home |
  > | Reliability | 99.99% uptime, permanent data storage, built on modern cloud infrastructure |
  > | Community | Open source, community-driven roadmap, Discord bot built because users asked for it |

## Goals

**Business goal:** Become the standard analytics platform for competitive Overwatch teams at every level — collegiate, amateur, and professional
**Conversion action:** Sign up for a free account, create a team, and upload first scrim
**Current metrics:** 50+ teams, 800K+ stats tracked, 6K+ maps uploaded
