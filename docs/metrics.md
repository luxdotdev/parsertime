# Parsertime Metrics

All metrics are emitted to the Axiom dataset `ptime-metrics`. Paste each MPL query into Axiom's metrics chart builder (Explore → new chart → paste into the editor).

Chart-builder tips:
- Counters use `align to 5m using sum` — switch to `align using rate` for per-second rate charts.
- Duration histograms (`*_ms`) use `align to 5m using avg`. Use `p95` / `p99` via the builder's aggregator picker if you want tail latency.
- Replace `5m` with `$__interval` to let the dashboard auto-bucket by time range.

## Contents

Data-layer metrics (`src/data/`):

- [Admin](#admin)
- [Comparison](#comparison)
- [Hero](#hero)
- [Intelligence](#intelligence)
- [Map](#map)
- [Player](#player)
- [Scouting](#scouting)
- [Scrim](#scrim)
- [Team](#team)
- [Tournament](#tournament)
- [Tournament Team](#tournament-team)
- [User](#user)

Application metrics (`src/lib/axiom/metrics.ts`):

- [Application](#application)

## Admin

Source: `src/data/admin/metrics.ts`

### Unlabeled matches

Successes (counter):

```
`ptime-metrics`:`admin.unlabeled_matches.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`admin.unlabeled_matches.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`admin.unlabeled_matches.query.duration_ms` | align to 5m using avg
```

### Match for labeling

Successes (counter):

```
`ptime-metrics`:`admin.match_for_labeling.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`admin.match_for_labeling.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`admin.match_for_labeling.query.duration_ms` | align to 5m using avg
```

### Admin cache

Requests (counter):

```
`ptime-metrics`:`admin.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`admin.cache.miss` | align to 5m using sum
```

## Comparison

Source: `src/data/comparison/metrics.ts`

### Comparison stats

Successes (counter):

```
`ptime-metrics`:`comparison.stats.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`comparison.stats.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`comparison.stats.query.duration_ms` | align to 5m using avg
```

### Available maps

Successes (counter):

```
`ptime-metrics`:`comparison.available_maps.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`comparison.available_maps.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`comparison.available_maps.query.duration_ms` | align to 5m using avg
```

### Team players

Successes (counter):

```
`ptime-metrics`:`comparison.team_players.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`comparison.team_players.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`comparison.team_players.query.duration_ms` | align to 5m using avg
```

### Trends

Successes (counter):

```
`ptime-metrics`:`comparison.trends.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`comparison.trends.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`comparison.trends.duration_ms` | align to 5m using avg
```

### Comparison cache

Requests (counter):

```
`ptime-metrics`:`comparison.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`comparison.cache.miss` | align to 5m using sum
```

## Hero

Source: `src/data/hero/metrics.ts`

### Hero stats

Successes (counter):

```
`ptime-metrics`:`hero.stats.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`hero.stats.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`hero.stats.query.duration_ms` | align to 5m using avg
```

### Hero kills

Successes (counter):

```
`ptime-metrics`:`hero.kills.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`hero.kills.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`hero.kills.query.duration_ms` | align to 5m using avg
```

### Hero deaths

Successes (counter):

```
`ptime-metrics`:`hero.deaths.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`hero.deaths.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`hero.deaths.query.duration_ms` | align to 5m using avg
```

### Hero cache

Requests (counter):

```
`ptime-metrics`:`hero.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`hero.cache.miss` | align to 5m using sum
```

## Intelligence

Source: `src/data/intelligence/metrics.ts`

### Hero ban intelligence

Successes (counter):

```
`ptime-metrics`:`intelligence.hero_ban.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`intelligence.hero_ban.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`intelligence.hero_ban.query.duration_ms` | align to 5m using avg
```

### Map intelligence

Successes (counter):

```
`ptime-metrics`:`intelligence.map.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`intelligence.map.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`intelligence.map.query.duration_ms` | align to 5m using avg
```

### Intelligence cache

Requests (counter):

```
`ptime-metrics`:`intelligence.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`intelligence.cache.miss` | align to 5m using sum
```

## Map

Source: `src/data/map/metrics.ts`

### Heatmap

Successes (counter):

```
`ptime-metrics`:`map.heatmap.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.heatmap.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.heatmap.query.duration_ms` | align to 5m using avg
```

### Killfeed ult spans

Successes (counter):

```
`ptime-metrics`:`map.killfeed.ult_spans.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.killfeed.ult_spans.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.killfeed.ult_spans.query.duration_ms` | align to 5m using avg
```

### Killfeed calibration

Successes (counter):

```
`ptime-metrics`:`map.killfeed.calibration.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.killfeed.calibration.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.killfeed.calibration.query.duration_ms` | align to 5m using avg
```

### Replay data

Successes (counter):

```
`ptime-metrics`:`map.replay.data.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.replay.data.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.replay.data.query.duration_ms` | align to 5m using avg
```

### Tempo

Successes (counter):

```
`ptime-metrics`:`map.tempo.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.tempo.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.tempo.query.duration_ms` | align to 5m using avg
```

### Rotation death

Successes (counter):

```
`ptime-metrics`:`map.rotation_death.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.rotation_death.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.rotation_death.query.duration_ms` | align to 5m using avg
```

### Map group (query)

Successes (counter):

```
`ptime-metrics`:`map.group.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.group.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.group.query.duration_ms` | align to 5m using avg
```

### Map group (mutation)

Successes (counter):

```
`ptime-metrics`:`map.group.mutation.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.group.mutation.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.group.mutation.duration_ms` | align to 5m using avg
```

### Map hero trends

Successes (counter):

```
`ptime-metrics`:`map.hero_trends.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`map.hero_trends.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`map.hero_trends.query.duration_ms` | align to 5m using avg
```

### Map cache

Requests (counter):

```
`ptime-metrics`:`map.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`map.cache.miss` | align to 5m using sum
```

## Player

Source: `src/data/player/metrics.ts`

### Most played heroes

Successes (counter):

```
`ptime-metrics`:`player.most_played.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.most_played.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.most_played.query.duration_ms` | align to 5m using avg
```

### Player intelligence

Successes (counter):

```
`ptime-metrics`:`player.intelligence.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.intelligence.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.intelligence.query.duration_ms` | align to 5m using avg
```

### Scouting players

Successes (counter):

```
`ptime-metrics`:`player.scouting_players.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.scouting_players.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.scouting_players.query.duration_ms` | align to 5m using avg
```

### Player profile

Successes (counter):

```
`ptime-metrics`:`player.profile.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.profile.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.profile.query.duration_ms` | align to 5m using avg
```

### Scouting analytics

Successes (counter):

```
`ptime-metrics`:`player.scouting_analytics.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.scouting_analytics.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.scouting_analytics.query.duration_ms` | align to 5m using avg
```

### Player targets

Successes (counter):

```
`ptime-metrics`:`player.targets.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.targets.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.targets.query.duration_ms` | align to 5m using avg
```

### Team targets

Successes (counter):

```
`ptime-metrics`:`player.team_targets.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.team_targets.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.team_targets.query.duration_ms` | align to 5m using avg
```

### Recent scrim stats

Successes (counter):

```
`ptime-metrics`:`player.recent_scrim_stats.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`player.recent_scrim_stats.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`player.recent_scrim_stats.query.duration_ms` | align to 5m using avg
```

### Player cache

Requests (counter):

```
`ptime-metrics`:`player.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`player.cache.miss` | align to 5m using sum
```

## Scouting

Source: `src/data/scouting/metrics.ts`

### Scouting teams

Successes (counter):

```
`ptime-metrics`:`scouting.teams.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scouting.teams.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scouting.teams.query.duration_ms` | align to 5m using avg
```

### Opponent match data

Successes (counter):

```
`ptime-metrics`:`scouting.opponent_match_data.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scouting.opponent_match_data.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scouting.opponent_match_data.query.duration_ms` | align to 5m using avg
```

### Team profile

Successes (counter):

```
`ptime-metrics`:`scouting.team_profile.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scouting.team_profile.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scouting.team_profile.query.duration_ms` | align to 5m using avg
```

### Strength ratings

Successes (counter):

```
`ptime-metrics`:`scouting.strength_ratings.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scouting.strength_ratings.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scouting.strength_ratings.query.duration_ms` | align to 5m using avg
```

### Strength rating

Successes (counter):

```
`ptime-metrics`:`scouting.strength_rating.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scouting.strength_rating.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scouting.strength_rating.query.duration_ms` | align to 5m using avg
```

### Strength percentile

Successes (counter):

```
`ptime-metrics`:`scouting.strength_percentile.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scouting.strength_percentile.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scouting.strength_percentile.query.duration_ms` | align to 5m using avg
```

### Scouting cache

Requests (counter):

```
`ptime-metrics`:`scouting.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`scouting.cache.miss` | align to 5m using sum
```

## Scrim

Source: `src/data/scrim/metrics.ts`

### Get scrim

Successes (counter):

```
`ptime-metrics`:`scrim.get_scrim.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_scrim.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_scrim.query.duration_ms` | align to 5m using avg
```

### User-viewable scrims

Successes (counter):

```
`ptime-metrics`:`scrim.get_user_viewable_scrims.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_user_viewable_scrims.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_user_viewable_scrims.query.duration_ms` | align to 5m using avg
```

### Final round stats

Successes (counter):

```
`ptime-metrics`:`scrim.get_final_round_stats.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_final_round_stats.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_final_round_stats.query.duration_ms` | align to 5m using avg
```

### Final round stats (player)

Successes (counter):

```
`ptime-metrics`:`scrim.get_final_round_stats_for_player.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_final_round_stats_for_player.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_final_round_stats_for_player.query.duration_ms` | align to 5m using avg
```

### All stats for player

Successes (counter):

```
`ptime-metrics`:`scrim.get_all_stats_for_player.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_all_stats_for_player.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_all_stats_for_player.query.duration_ms` | align to 5m using avg
```

### All kills for player

Successes (counter):

```
`ptime-metrics`:`scrim.get_all_kills_for_player.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_all_kills_for_player.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_all_kills_for_player.query.duration_ms` | align to 5m using avg
```

### All deaths for player

Successes (counter):

```
`ptime-metrics`:`scrim.get_all_deaths_for_player.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_all_deaths_for_player.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_all_deaths_for_player.query.duration_ms` | align to 5m using avg
```

### All map winrates for player

Successes (counter):

```
`ptime-metrics`:`scrim.get_all_map_winrates_for_player.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.get_all_map_winrates_for_player.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.get_all_map_winrates_for_player.query.duration_ms` | align to 5m using avg
```

### Scrim overview

Successes (counter):

```
`ptime-metrics`:`scrim.overview.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.overview.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.overview.query.duration_ms` | align to 5m using avg
```

### Opponent map results

Successes (counter):

```
`ptime-metrics`:`scrim.opponent.map_results.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.opponent.map_results.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.opponent.map_results.query.duration_ms` | align to 5m using avg
```

### Opponent hero bans

Successes (counter):

```
`ptime-metrics`:`scrim.opponent.hero_bans.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.opponent.hero_bans.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.opponent.hero_bans.query.duration_ms` | align to 5m using avg
```

### Opponent player stats

Successes (counter):

```
`ptime-metrics`:`scrim.opponent.player_stats.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.opponent.player_stats.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.opponent.player_stats.query.duration_ms` | align to 5m using avg
```

### Ability timing

Successes (counter):

```
`ptime-metrics`:`scrim.ability_timing.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.ability_timing.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.ability_timing.query.duration_ms` | align to 5m using avg
```

### Fight timelines

Successes (counter):

```
`ptime-metrics`:`scrim.fight_timelines.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.fight_timelines.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.fight_timelines.query.duration_ms` | align to 5m using avg
```

### Map ability timing

Successes (counter):

```
`ptime-metrics`:`scrim.map_ability_timing.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`scrim.map_ability_timing.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`scrim.map_ability_timing.query.duration_ms` | align to 5m using avg
```

### Scrim cache

Requests (counter):

```
`ptime-metrics`:`scrim.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`scrim.cache.miss` | align to 5m using sum
```

## Team

Source: `src/data/team/metrics.ts`

### Team roster

Successes (counter):

```
`ptime-metrics`:`team.roster.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`team.roster.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`team.roster.query.duration_ms` | align to 5m using avg
```

### Team base data

Successes (counter):

```
`ptime-metrics`:`team.base_data.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`team.base_data.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`team.base_data.query.duration_ms` | align to 5m using avg
```

### Team extended data

Successes (counter):

```
`ptime-metrics`:`team.extended_data.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`team.extended_data.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`team.extended_data.query.duration_ms` | align to 5m using avg
```

### Team cache

Requests (counter):

```
`ptime-metrics`:`team.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`team.cache.miss` | align to 5m using sum
```

## Tournament

Source: `src/data/tournament/metrics.ts`

### Get tournament

Successes (counter):

```
`ptime-metrics`:`tournament.get_tournament.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament.get_tournament.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament.get_tournament.query.duration_ms` | align to 5m using avg
```

### User tournaments

Successes (counter):

```
`ptime-metrics`:`tournament.get_user_tournaments.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament.get_user_tournaments.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament.get_user_tournaments.query.duration_ms` | align to 5m using avg
```

### Tournament match

Successes (counter):

```
`ptime-metrics`:`tournament.get_tournament_match.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament.get_tournament_match.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament.get_tournament_match.query.duration_ms` | align to 5m using avg
```

### Tournament bracket

Successes (counter):

```
`ptime-metrics`:`tournament.get_tournament_bracket.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament.get_tournament_bracket.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament.get_tournament_bracket.query.duration_ms` | align to 5m using avg
```

### RR standings

Successes (counter):

```
`ptime-metrics`:`tournament.get_rr_standings.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament.get_rr_standings.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament.get_rr_standings.query.duration_ms` | align to 5m using avg
```

### Broadcast data

Successes (counter):

```
`ptime-metrics`:`tournament.get_broadcast_data.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament.get_broadcast_data.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament.get_broadcast_data.query.duration_ms` | align to 5m using avg
```

### Tournament cache

Requests (counter):

```
`ptime-metrics`:`tournament.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`tournament.cache.miss` | align to 5m using sum
```

### Broadcast cache

Requests (counter):

```
`ptime-metrics`:`broadcast.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`broadcast.cache.miss` | align to 5m using sum
```

## Tournament Team

Source: `src/data/tournament-team/metrics.ts`

### Base data

Successes (counter):

```
`ptime-metrics`:`tournament_team.base_data.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament_team.base_data.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament_team.base_data.query.duration_ms` | align to 5m using avg
```

### Roster

Successes (counter):

```
`ptime-metrics`:`tournament_team.roster.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament_team.roster.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament_team.roster.query.duration_ms` | align to 5m using avg
```

### Extended data

Successes (counter):

```
`ptime-metrics`:`tournament_team.extended_data.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament_team.extended_data.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament_team.extended_data.query.duration_ms` | align to 5m using avg
```

### Stats

Successes (counter):

```
`ptime-metrics`:`tournament_team.stats.query.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`tournament_team.stats.query.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`tournament_team.stats.query.duration_ms` | align to 5m using avg
```

### Tournament team cache

Requests (counter):

```
`ptime-metrics`:`tournament_team.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`tournament_team.cache.miss` | align to 5m using sum
```

## User

Source: `src/data/user/metrics.ts`

### getUser

Successes (counter):

```
`ptime-metrics`:`user.getUser.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`user.getUser.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`user.getUser.duration_ms` | align to 5m using avg
```

### getTeamsWithPerms

Successes (counter):

```
`ptime-metrics`:`user.getTeamsWithPerms.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`user.getTeamsWithPerms.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`user.getTeamsWithPerms.duration_ms` | align to 5m using avg
```

### getAppSettings

Successes (counter):

```
`ptime-metrics`:`user.getAppSettings.success` | align to 5m using sum
```

Errors (counter):

```
`ptime-metrics`:`user.getAppSettings.error` | align to 5m using sum
```

Avg duration, ms (histogram):

```
`ptime-metrics`:`user.getAppSettings.duration_ms` | align to 5m using avg
```

### User cache

Requests (counter):

```
`ptime-metrics`:`user.cache.request` | align to 5m using sum
```

Misses (counter):

```
`ptime-metrics`:`user.cache.miss` | align to 5m using sum
```

## Application

Source: `src/lib/axiom/metrics.ts`

Application-wide counters and latency histograms covering the core funnel, HTTP, database, AI chat, reliability, scrim pipeline, cron, billing, and bot notifications.

### Core funnel

**Sign-ins** — Counter:

```
`ptime-metrics`:`auth.signins` | align to 5m using sum
```

**New user registrations** — Counter:

```
`ptime-metrics`:`auth.new_users` | align to 5m using sum
```

**Teams created** — Counter:

```
`ptime-metrics`:`teams.created` | align to 5m using sum
```

**Team quota hits** — Counter:

```
`ptime-metrics`:`teams.quota_hits` | align to 5m using sum
```

**Scrims created** — Counter:

```
`ptime-metrics`:`scrims.created` | align to 5m using sum
```

**Maps added** — Counter:

```
`ptime-metrics`:`scrims.maps_added` | align to 5m using sum
```

**Maps removed** — Counter:

```
`ptime-metrics`:`scrims.maps_removed` | align to 5m using sum
```

### HTTP

**HTTP requests** — Counter:

```
`ptime-metrics`:`http.requests` | align to 5m using sum
```

**HTTP errors (4xx/5xx)** — Counter:

```
`ptime-metrics`:`http.errors` | align to 5m using sum
```

**HTTP request duration (avg ms)** — Avg latency, ms (histogram):

```
`ptime-metrics`:`http.request_duration_ms` | align to 5m using avg
```

### AI chat

**Chat requests** — Counter:

```
`ptime-metrics`:`ai.chat.requests` | align to 5m using sum
```

**Chat tokens consumed** — Counter:

```
`ptime-metrics`:`ai.chat.tokens` | align to 5m using sum
```

**Chat tool calls** — Counter:

```
`ptime-metrics`:`ai.chat.tool_calls` | align to 5m using sum
```

**Chat response duration (avg ms)** — Avg latency, ms (histogram):

```
`ptime-metrics`:`ai.chat.duration_ms` | align to 5m using avg
```

**Chat tool-call duration (avg ms)** — Avg latency, ms (histogram):

```
`ptime-metrics`:`ai.chat.tool_call_duration_ms` | align to 5m using avg
```

### Reliability

**Rate-limit hits** — Counter:

```
`ptime-metrics`:`ratelimit.hits` | align to 5m using sum
```

### Scrim pipeline

**Scrim parse duration (avg ms)** — Avg latency, ms (histogram):

```
`ptime-metrics`:`scrims.parse_duration_ms` | align to 5m using avg
```

**Map deletion duration (avg ms)** — Avg latency, ms (histogram):

```
`ptime-metrics`:`scrims.map_deletion_duration_ms` | align to 5m using avg
```

### Cron

**Cron runs** — Counter:

```
`ptime-metrics`:`cron.runs` | align to 5m using sum
```

**Items deleted by cron** — Counter:

```
`ptime-metrics`:`cron.deleted_items` | align to 5m using sum
```

**Cron duration (avg ms)** — Avg latency, ms (histogram):

```
`ptime-metrics`:`cron.duration_ms` | align to 5m using avg
```

### Billing & bot

**Stripe webhooks** — Counter:

```
`ptime-metrics`:`stripe.webhooks` | align to 5m using sum
```

**Bot notifications** — Counter:

```
`ptime-metrics`:`bot.notifications` | align to 5m using sum
```

