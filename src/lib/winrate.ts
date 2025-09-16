import {
  $Enums,
  type MatchStart,
  type ObjectiveCaptured,
  type RoundEnd,
} from "@prisma/client";

export function calculateWinner({
  matchDetails,
  finalRound,
  team1Captures,
  team2Captures,
}: {
  matchDetails: MatchStart | null;
  finalRound: RoundEnd | null;
  team1Captures: ObjectiveCaptured[];
  team2Captures: ObjectiveCaptured[];
}) {
  const mapType = matchDetails ? matchDetails.map_type : $Enums.MapType.Control;

  if (!matchDetails) return "N/A";
  if (!finalRound) return "N/A";

  switch (mapType) {
    case $Enums.MapType.Control:
      return finalRound.team_1_score > finalRound.team_2_score
        ? matchDetails.team_1_name
        : matchDetails.team_2_name;

    case $Enums.MapType.Escort:
      if (team1Captures.length === 0) return matchDetails.team_2_name;
      if (team2Captures.length === 0) return matchDetails.team_1_name;

      if (team1Captures.length === team2Captures.length) {
        return team1Captures[team1Captures.length - 1]?.match_time_remaining >
          team2Captures[team2Captures.length - 1]?.match_time_remaining
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;
      }

      return team1Captures.length > team2Captures.length
        ? matchDetails.team_1_name
        : matchDetails.team_2_name;

    case $Enums.MapType.Flashpoint:
      return finalRound.team_1_score > finalRound.team_2_score
        ? matchDetails.team_1_name
        : matchDetails.team_2_name;

    case $Enums.MapType.Hybrid:
      if (!team1Captures) return matchDetails.team_2_name;
      if (!team2Captures) return matchDetails.team_1_name;

      if (team1Captures.length === team2Captures.length) {
        return team1Captures[team1Captures.length - 1]?.match_time_remaining >
          team2Captures[team2Captures.length - 1]?.match_time_remaining
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;
      }

      return team1Captures.length > team2Captures.length
        ? matchDetails.team_1_name
        : matchDetails.team_2_name;

    case $Enums.MapType.Push:
      return "N/A";
    default:
      return "N/A";
  }
}
