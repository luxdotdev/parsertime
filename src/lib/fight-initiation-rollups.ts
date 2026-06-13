import { round } from "@/lib/utils";
import type { FightInitiationLabel } from "@/lib/fight-initiation";

/** Counts of fights bucketed relative to a single team. */
export type InitiationTally = {
  totalFights: number;
  contestedFights: number;
  /** Fights with a determined initiator (excludes contested/undetermined). */
  decidedFights: number;
  wentFirst: number;
  wentFirstWins: number;
  wentSecond: number;
  wentSecondWins: number;
  /** Number of maps that contributed (each tallyMapForTeam call = 1). */
  mapsCovered: number;
};

export function emptyTally(): InitiationTally {
  return {
    totalFights: 0,
    contestedFights: 0,
    decidedFights: 0,
    wentFirst: 0,
    wentFirstWins: 0,
    wentSecond: 0,
    wentSecondWins: 0,
    mapsCovered: 0,
  };
}

/**
 * Tally one map's fight labels from the perspective of `ourTeam`. A fight where
 * we initiated is "went first"; one the enemy initiated is "went second"; the
 * win is credited whenever the fight `winner` is us. Contested/undetermined
 * fights (null initiator) are counted only in totals.
 */
export function tallyMapForTeam(
  labels: FightInitiationLabel[],
  ourTeam: string
): InitiationTally {
  const tally = emptyTally();
  tally.mapsCovered = 1;
  for (const label of labels) {
    tally.totalFights++;
    if (label.initiator === null) {
      tally.contestedFights++;
      continue;
    }
    tally.decidedFights++;
    if (label.initiator === ourTeam) {
      tally.wentFirst++;
      if (label.winner === ourTeam) tally.wentFirstWins++;
    } else {
      tally.wentSecond++;
      if (label.winner === ourTeam) tally.wentSecondWins++;
    }
  }
  return tally;
}

export function mergeTallies(tallies: InitiationTally[]): InitiationTally {
  return tallies.reduce((acc, t) => {
    acc.totalFights += t.totalFights;
    acc.contestedFights += t.contestedFights;
    acc.decidedFights += t.decidedFights;
    acc.wentFirst += t.wentFirst;
    acc.wentFirstWins += t.wentFirstWins;
    acc.wentSecond += t.wentSecond;
    acc.wentSecondWins += t.wentSecondWins;
    acc.mapsCovered += t.mapsCovered;
    return acc;
  }, emptyTally());
}

export type InitiationRates = {
  /** Win rate of fights we initiated, 0-100. The headline number. */
  initiationWinrate: number;
  /** Share of decided fights we initiated, 0-100. */
  initiationFrequency: number;
  /** Win rate of fights the enemy initiated, 0-100. */
  goingSecondWinrate: number;
};

export function initiationRates(tally: InitiationTally): InitiationRates {
  return {
    initiationWinrate:
      tally.wentFirst > 0
        ? round((tally.wentFirstWins / tally.wentFirst) * 100)
        : 0,
    initiationFrequency:
      tally.decidedFights > 0
        ? round((tally.wentFirst / tally.decidedFights) * 100)
        : 0,
    goingSecondWinrate:
      tally.wentSecond > 0
        ? round((tally.wentSecondWins / tally.wentSecond) * 100)
        : 0,
  };
}
