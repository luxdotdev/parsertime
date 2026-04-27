import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  type FaceitClientOptions,
  type FaceitMatchDetail,
  type FaceitPlayerLookupResult,
  getMatch,
  getPlayerHistory,
  listOrganizerChampionships,
} from "@/lib/tsr/faceit-client";
import { TRACKED_ORGANIZERS, isTrackedOrganizer } from "@/lib/tsr/organizers";
import { classifyTier, inferRegion } from "@/lib/tsr/tiers";
import {
  FaceitMatchStatus,
  FaceitTier,
  type Prisma,
  TsrRegion,
} from "@prisma/client";

function normalizeStatus(raw: string): FaceitMatchStatus | null {
  const s = raw.toUpperCase();
  if (s === "FINISHED") return FaceitMatchStatus.FINISHED;
  if (s === "CANCELLED" || s === "CANCELED") return FaceitMatchStatus.CANCELLED;
  if (s === "ABORTED") return FaceitMatchStatus.ABORTED;
  return null;
}

function regionFromOw2Field(faceitRegion: string | undefined): TsrRegion {
  if (faceitRegion === "US") return TsrRegion.NA;
  if (faceitRegion === "EU") return TsrRegion.EMEA;
  return TsrRegion.OTHER;
}

export async function upsertFullPlayer(
  player: FaceitPlayerLookupResult
): Promise<void> {
  const ow2 = player.games?.ow2;
  const region = regionFromOw2Field(ow2?.region);
  await prisma.faceitPlayer.upsert({
    where: { faceitPlayerId: player.player_id },
    create: {
      faceitPlayerId: player.player_id,
      faceitNickname: player.nickname,
      battletag: ow2?.game_player_id ?? null,
      region,
      verified: !!player.verified,
      ow2SkillLevel:
        ow2?.skill_level !== undefined ? Number(ow2.skill_level) : null,
    },
    update: {
      faceitNickname: player.nickname,
      battletag: ow2?.game_player_id ?? undefined,
      region,
      verified: !!player.verified,
      ow2SkillLevel:
        ow2?.skill_level !== undefined ? Number(ow2.skill_level) : undefined,
      lastSyncedAt: new Date(),
    },
  });
}

async function upsertRosterPlayer(
  tx: Prisma.TransactionClient,
  playerId: string,
  nickname: string
): Promise<void> {
  await tx.faceitPlayer.upsert({
    where: { faceitPlayerId: playerId },
    create: {
      faceitPlayerId: playerId,
      faceitNickname: nickname,
    },
    update: {
      faceitNickname: nickname,
    },
  });
}

async function upsertChampionshipFromMatch(
  tx: Prisma.TransactionClient,
  match: FaceitMatchDetail
): Promise<void> {
  if (!match.competition_id || !match.organizer_id) return;
  const tier = classifyTier(match.competition_name);
  const region = inferRegion(match.competition_name, match.region);
  await tx.faceitChampionship.upsert({
    where: { championshipId: match.competition_id },
    create: {
      championshipId: match.competition_id,
      name: match.competition_name ?? "(unknown)",
      organizerId: match.organizer_id,
      tier,
      region,
      classifiedBy: tier === FaceitTier.UNCLASSIFIED ? null : "auto",
      classifiedAt: tier === FaceitTier.UNCLASSIFIED ? null : new Date(),
    },
    update: {
      name: match.competition_name ?? undefined,
      organizerId: match.organizer_id,
    },
  });
}

export type UpsertMatchResult = {
  matchId: string;
  ingested: boolean;
  reason?: string;
  affectedPlayerIds: string[];
};

export async function upsertMatch(
  match: FaceitMatchDetail
): Promise<UpsertMatchResult> {
  const f1 = match.teams?.faction1?.roster ?? [];
  const f2 = match.teams?.faction2?.roster ?? [];
  const s1 = match.results?.score?.faction1;
  const s2 = match.results?.score?.faction2;
  const winner = match.results?.winner;
  const status = normalizeStatus(match.status);
  const finishedAt = match.finished_at;

  if (!status) {
    return {
      matchId: match.match_id,
      ingested: false,
      reason: "unknown-status",
      affectedPlayerIds: [],
    };
  }
  if (!isTrackedOrganizer(match.organizer_id)) {
    return {
      matchId: match.match_id,
      ingested: false,
      reason: "untracked-org",
      affectedPlayerIds: [],
    };
  }
  if (match.competition_type !== "championship") {
    return {
      matchId: match.match_id,
      ingested: false,
      reason: "non-championship",
      affectedPlayerIds: [],
    };
  }

  const allRoster = [...f1, ...f2];
  const affected = allRoster.map((r) => r.player_id);

  // Cancelled/aborted matches still get persisted (so we don't re-fetch them
  // forever) but they contribute nothing to the rating because the replay
  // filter only loads FINISHED matches.
  const isFinished = status === FaceitMatchStatus.FINISHED;
  if (isFinished) {
    if (
      f1.length === 0 ||
      f2.length === 0 ||
      s1 === undefined ||
      s2 === undefined ||
      !winner ||
      !finishedAt
    ) {
      return {
        matchId: match.match_id,
        ingested: false,
        reason: "missing-data",
        affectedPlayerIds: affected,
      };
    }
  }

  const winnerFaction =
    winner === "faction1" ? 1 : winner === "faction2" ? 2 : 0;
  const bestOf = match.best_of ?? Math.max((s1 ?? 0) + (s2 ?? 0), 3);

  await prisma.$transaction(async (tx) => {
    await upsertChampionshipFromMatch(tx, match);

    for (const r of allRoster) {
      await upsertRosterPlayer(tx, r.player_id, r.nickname);
    }

    await tx.faceitMatch.upsert({
      where: { faceitMatchId: match.match_id },
      create: {
        faceitMatchId: match.match_id,
        championshipId: match.competition_id!,
        organizerId: match.organizer_id!,
        bestOf,
        team1Score: s1 ?? 0,
        team2Score: s2 ?? 0,
        winnerFaction,
        status,
        finishedAt: new Date(
          (finishedAt ?? Math.floor(Date.now() / 1000)) * 1000
        ),
        rawRegion: match.region ?? "",
      },
      update: {
        championshipId: match.competition_id!,
        organizerId: match.organizer_id!,
        bestOf,
        team1Score: s1 ?? 0,
        team2Score: s2 ?? 0,
        winnerFaction,
        status,
        finishedAt: new Date(
          (finishedAt ?? Math.floor(Date.now() / 1000)) * 1000
        ),
        rawRegion: match.region ?? "",
      },
    });

    await tx.faceitMatchRoster.deleteMany({
      where: { matchId: match.match_id },
    });
    if (allRoster.length > 0) {
      await tx.faceitMatchRoster.createMany({
        data: [
          ...f1.map((r) => ({
            matchId: match.match_id,
            teamSide: 1,
            faceitPlayerId: r.player_id,
          })),
          ...f2.map((r) => ({
            matchId: match.match_id,
            teamSide: 2,
            faceitPlayerId: r.player_id,
          })),
        ],
        skipDuplicates: true,
      });
    }
  });

  return {
    matchId: match.match_id,
    ingested: true,
    affectedPlayerIds: affected,
  };
}

export async function ingestMatchById(
  matchId: string,
  opts?: FaceitClientOptions
): Promise<UpsertMatchResult> {
  const md = await getMatch(matchId, opts);
  return upsertMatch(md);
}

export type IngestPlayerHistoryResult = {
  playerId: string;
  scanned: number;
  ingested: number;
  skipped: number;
  affectedPlayerIds: Set<string>;
};

export async function ingestPlayerHistory(
  playerId: string,
  opts?: FaceitClientOptions & { maxPages?: number }
): Promise<IngestPlayerHistoryResult> {
  const history = await getPlayerHistory(playerId, opts);
  const champOnly = history.filter(
    (m) => m.competition_type === "championship"
  );

  const affected = new Set<string>();
  let ingested = 0;
  let skipped = 0;
  for (const item of champOnly) {
    try {
      const md = await getMatch(item.match_id, opts);
      const res = await upsertMatch(md);
      if (res.ingested) {
        ingested += 1;
        for (const pid of res.affectedPlayerIds) affected.add(pid);
      } else {
        skipped += 1;
      }
    } catch (err) {
      Logger.warn({
        event: "tsr.ingest.match_failed",
        faceit_match_id: item.match_id,
        for_player_id: playerId,
        error_message: err instanceof Error ? err.message : "unknown",
      });
      skipped += 1;
    }
  }
  return {
    playerId,
    scanned: champOnly.length,
    ingested,
    skipped,
    affectedPlayerIds: affected,
  };
}

export type DiscoverChampionshipsResult = {
  organizer: string;
  inserted: number;
  updated: number;
  unclassified: number;
};

export async function discoverChampionshipsForOrganizer(
  organizerId: string,
  opts?: FaceitClientOptions
): Promise<DiscoverChampionshipsResult> {
  const items = await listOrganizerChampionships(organizerId, {
    ...opts,
    limit: 100,
  });
  let inserted = 0;
  let updated = 0;
  let unclassified = 0;
  for (const c of items) {
    const tier = classifyTier(c.name);
    const region = inferRegion(c.name, c.region);
    if (tier === FaceitTier.UNCLASSIFIED) unclassified += 1;
    const existing = await prisma.faceitChampionship.findUnique({
      where: { championshipId: c.championship_id },
    });
    if (existing) {
      await prisma.faceitChampionship.update({
        where: { championshipId: c.championship_id },
        data: {
          name: c.name,
          organizerId: c.organizer_id,
          // Don't overwrite admin-classified tiers
          tier: existing.classifiedBy === "auto" ? tier : existing.tier,
          region: existing.classifiedBy === "auto" ? region : existing.region,
        },
      });
      updated += 1;
    } else {
      await prisma.faceitChampionship.create({
        data: {
          championshipId: c.championship_id,
          name: c.name,
          organizerId: c.organizer_id,
          tier,
          region,
          startDate: c.start_date ? new Date(c.start_date * 1000) : null,
          classifiedBy: tier === FaceitTier.UNCLASSIFIED ? null : "auto",
          classifiedAt: tier === FaceitTier.UNCLASSIFIED ? null : new Date(),
        },
      });
      inserted += 1;
    }
  }
  return { organizer: organizerId, inserted, updated, unclassified };
}

export async function discoverAllTrackedChampionships(
  opts?: FaceitClientOptions
): Promise<DiscoverChampionshipsResult[]> {
  const out: DiscoverChampionshipsResult[] = [];
  for (const org of TRACKED_ORGANIZERS) {
    try {
      out.push(await discoverChampionshipsForOrganizer(org.id, opts));
    } catch (err) {
      Logger.warn({
        event: "tsr.discover.organizer_failed",
        organizer_id: org.id,
        organizer_label: org.label,
        error_message: err instanceof Error ? err.message : "unknown",
      });
      out.push({ organizer: org.id, inserted: 0, updated: 0, unclassified: 0 });
    }
  }
  return out;
}
