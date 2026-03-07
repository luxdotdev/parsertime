import {
  $Enums,
  type MatchStart,
  type ObjectiveCaptured,
  type PayloadProgress,
  type PointProgress,
  type RoundEnd,
} from "@prisma/client";

const PROGRESS_COMPARISON_EPSILON = 0.05;

type ProgressSnapshot = {
  objectiveIndex: number;
  progress: number;
};

type PayloadScore = {
  team1: number;
  team2: number;
};

function compareNumericProgress(
  team1Progress: number,
  team2Progress: number
): number {
  if (Math.abs(team1Progress - team2Progress) <= PROGRESS_COMPARISON_EPSILON) {
    return 0;
  }

  return team1Progress > team2Progress ? 1 : -1;
}

function compareProgressSnapshots(
  team1Progress: ProgressSnapshot,
  team2Progress: ProgressSnapshot
): number {
  if (team1Progress.objectiveIndex !== team2Progress.objectiveIndex) {
    return team1Progress.objectiveIndex > team2Progress.objectiveIndex ? 1 : -1;
  }

  return compareNumericProgress(team1Progress.progress, team2Progress.progress);
}

function sortCaptures(captures: ObjectiveCaptured[]): ObjectiveCaptured[] {
  return [...captures].sort((firstCapture, secondCapture) => {
    if (firstCapture.round_number !== secondCapture.round_number) {
      return firstCapture.round_number - secondCapture.round_number;
    }

    return firstCapture.match_time - secondCapture.match_time;
  });
}

function sortPayloadProgress(
  progressRows: PayloadProgress[]
): PayloadProgress[] {
  return [...progressRows].sort((firstProgress, secondProgress) => {
    if (firstProgress.round_number !== secondProgress.round_number) {
      return firstProgress.round_number - secondProgress.round_number;
    }

    if (firstProgress.objective_index !== secondProgress.objective_index) {
      return firstProgress.objective_index - secondProgress.objective_index;
    }

    return firstProgress.match_time - secondProgress.match_time;
  });
}

function sortPointProgress(progressRows: PointProgress[]): PointProgress[] {
  return [...progressRows].sort((firstProgress, secondProgress) => {
    if (firstProgress.round_number !== secondProgress.round_number) {
      return firstProgress.round_number - secondProgress.round_number;
    }

    if (firstProgress.objective_index !== secondProgress.objective_index) {
      return firstProgress.objective_index - secondProgress.objective_index;
    }

    return firstProgress.match_time - secondProgress.match_time;
  });
}

function getFarthestPayloadProgress(
  progressRows: PayloadProgress[]
): ProgressSnapshot {
  let farthestProgress: ProgressSnapshot = {
    objectiveIndex: -1,
    progress: 0,
  };

  for (const progressRow of sortPayloadProgress(progressRows)) {
    const nextProgress = {
      objectiveIndex: progressRow.objective_index,
      progress: progressRow.payload_capture_progress,
    };

    if (compareProgressSnapshots(nextProgress, farthestProgress) > 0) {
      farthestProgress = nextProgress;
    }
  }

  return farthestProgress;
}

function getFarthestPointProgress(progressRows: PointProgress[]): ProgressSnapshot {
  let farthestProgress: ProgressSnapshot = {
    objectiveIndex: -1,
    progress: 0,
  };

  for (const progressRow of sortPointProgress(progressRows)) {
    const nextProgress = {
      objectiveIndex: progressRow.objective_index,
      progress: progressRow.point_capture_progress,
    };

    if (compareProgressSnapshots(nextProgress, farthestProgress) > 0) {
      farthestProgress = nextProgress;
    }
  }

  return farthestProgress;
}

function getWinnerFromComparison(
  comparison: number,
  matchDetails: MatchStart
): string | null {
  if (comparison === 0) {
    return null;
  }

  return comparison > 0 ? matchDetails.team_1_name : matchDetails.team_2_name;
}

function getWinnerFromFinalRoundScore({
  finalRound,
  matchDetails,
}: {
  finalRound: RoundEnd;
  matchDetails: MatchStart;
}): string | null {
  if (finalRound.team_1_score === finalRound.team_2_score) {
    return null;
  }

  return finalRound.team_1_score > finalRound.team_2_score
    ? matchDetails.team_1_name
    : matchDetails.team_2_name;
}

function getPayloadMapWinner({
  matchDetails,
  finalRound,
  team1Captures,
  team2Captures,
  team1PayloadProgress,
  team2PayloadProgress,
  team1PointProgress,
  team2PointProgress,
}: {
  matchDetails: MatchStart;
  finalRound: RoundEnd;
  team1Captures: ObjectiveCaptured[];
  team2Captures: ObjectiveCaptured[];
  team1PayloadProgress: PayloadProgress[];
  team2PayloadProgress: PayloadProgress[];
  team1PointProgress: PointProgress[];
  team2PointProgress: PointProgress[];
}): string {
  const orderedTeam1Captures = sortCaptures(team1Captures);
  const orderedTeam2Captures = sortCaptures(team2Captures);

  if (orderedTeam1Captures.length !== orderedTeam2Captures.length) {
    return orderedTeam1Captures.length > orderedTeam2Captures.length
      ? matchDetails.team_1_name
      : matchDetails.team_2_name;
  }

  if (matchDetails.map_type === $Enums.MapType.Hybrid) {
    if (orderedTeam1Captures.length === 0) {
      const pointWinner = getWinnerFromComparison(
        compareProgressSnapshots(
          getFarthestPointProgress(team1PointProgress),
          getFarthestPointProgress(team2PointProgress)
        ),
        matchDetails
      );

      if (pointWinner) {
        return pointWinner;
      }
    } else {
      const payloadWinner = getWinnerFromComparison(
        compareProgressSnapshots(
          getFarthestPayloadProgress(team1PayloadProgress),
          getFarthestPayloadProgress(team2PayloadProgress)
        ),
        matchDetails
      );

      if (payloadWinner) {
        return payloadWinner;
      }
    }
  }

  if (matchDetails.map_type === $Enums.MapType.Escort) {
    const payloadWinner = getWinnerFromComparison(
      compareProgressSnapshots(
        getFarthestPayloadProgress(team1PayloadProgress),
        getFarthestPayloadProgress(team2PayloadProgress)
      ),
      matchDetails
    );

    if (payloadWinner) {
      return payloadWinner;
    }
  }

  const scoreWinner = getWinnerFromFinalRoundScore({ finalRound, matchDetails });
  if (scoreWinner) {
    return scoreWinner;
  }

  const team1LastCapture = orderedTeam1Captures.at(-1);
  const team2LastCapture = orderedTeam2Captures.at(-1);

  if (team1LastCapture && team2LastCapture) {
    return team1LastCapture.match_time_remaining >
      team2LastCapture.match_time_remaining
      ? matchDetails.team_1_name
      : matchDetails.team_2_name;
  }

  return "N/A";
}

export function calculatePayloadMapScore({
  team1Captures,
  team2Captures,
}: {
  team1Captures: ObjectiveCaptured[];
  team2Captures: ObjectiveCaptured[];
}): PayloadScore {
  return {
    team1: team1Captures.length,
    team2: team2Captures.length,
  };
}

export function calculateWinner({
  matchDetails,
  finalRound,
  team1Captures,
  team2Captures,
  team1PayloadProgress = [],
  team2PayloadProgress = [],
  team1PointProgress = [],
  team2PointProgress = [],
}: {
  matchDetails: MatchStart | null;
  finalRound: RoundEnd | null;
  team1Captures: ObjectiveCaptured[];
  team2Captures: ObjectiveCaptured[];
  team1PayloadProgress?: PayloadProgress[];
  team2PayloadProgress?: PayloadProgress[];
  team1PointProgress?: PointProgress[];
  team2PointProgress?: PointProgress[];
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
      return getPayloadMapWinner({
        matchDetails,
        finalRound,
        team1Captures,
        team2Captures,
        team1PayloadProgress,
        team2PayloadProgress,
        team1PointProgress,
        team2PointProgress,
      });

    case $Enums.MapType.Flashpoint:
      return finalRound.team_1_score > finalRound.team_2_score
        ? matchDetails.team_1_name
        : matchDetails.team_2_name;

    case $Enums.MapType.Hybrid:
      return getPayloadMapWinner({
        matchDetails,
        finalRound,
        team1Captures,
        team2Captures,
        team1PayloadProgress,
        team2PayloadProgress,
        team1PointProgress,
        team2PointProgress,
      });

    case $Enums.MapType.Push:
      return "N/A";
    default:
      return "N/A";
  }
}
