import "server-only";

import prisma from "@/lib/prisma";
import type { UsageEnv } from "@prisma/client";
import { dayKey } from "./rollup";

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dayKey(d);
}

export type Scorecard = {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number; // dau / mau, 0..1
  events30d: number;
  activeFeatures: number;
};

export async function getScorecard(env: UsageEnv): Promise<Scorecard> {
  const today = dayKey(new Date());
  const day1 = daysAgoKey(1);
  const day7 = daysAgoKey(7);
  const day28 = daysAgoKey(28);

  const [dauRows, wauRows, mauRows, events30d, features] = await Promise.all([
    prisma.userActiveDay.findMany({ where: { environment: env, day: day1 }, select: { userId: true } }),
    prisma.userActiveDay.findMany({ where: { environment: env, day: { gte: day7, lte: today } }, select: { userId: true } }),
    prisma.userActiveDay.findMany({ where: { environment: env, day: { gte: day28, lte: today } }, select: { userId: true } }),
    prisma.dailyFeatureRollup.aggregate({ where: { environment: env, day: { gte: daysAgoKey(30) } }, _sum: { totalEvents: true } }),
    prisma.dailyFeatureRollup.findMany({ where: { environment: env, day: { gte: daysAgoKey(30) }, name: { not: "page_view" } }, distinct: ["name"], select: { name: true } }),
  ]);

  const dau = dauRows.length;
  const mau = new Set(mauRows.map((r) => r.userId)).size;
  return {
    dau,
    wau: new Set(wauRows.map((r) => r.userId)).size,
    mau,
    stickiness: mau === 0 ? 0 : dau / mau,
    events30d: events30d._sum.totalEvents ?? 0,
    activeFeatures: features.length,
  };
}

export type FeatureAdoptionRow = { name: string; uniqueUsers: number; totalEvents: number };

export async function getFeatureAdoption(env: UsageEnv): Promise<FeatureAdoptionRow[]> {
  const grouped = await prisma.dailyFeatureRollup.groupBy({
    by: ["name"],
    where: { environment: env, day: { gte: daysAgoKey(30) }, name: { not: "page_view" } },
    _sum: { totalEvents: true },
  });
  // uniqueUsers can't be summed across days (double-counts); approximate with
  // the max single-day unique users per feature, which is exact for DAU-style reads.
  const maxUsers = await prisma.dailyFeatureRollup.groupBy({
    by: ["name"],
    where: { environment: env, day: { gte: daysAgoKey(30) }, name: { not: "page_view" } },
    _max: { uniqueUsers: true },
  });
  const userByName = new Map(maxUsers.map((m) => [m.name, m._max.uniqueUsers ?? 0]));
  return grouped
    .map((g) => ({ name: g.name, totalEvents: g._sum.totalEvents ?? 0, uniqueUsers: userByName.get(g.name) ?? 0 }))
    .sort((a, b) => b.uniqueUsers - a.uniqueUsers);
}

export type DailyActivePoint = { day: string; dau: number };

export async function getDailyActiveSeries(env: UsageEnv, days = 30): Promise<DailyActivePoint[]> {
  const rows = await prisma.userActiveDay.groupBy({
    by: ["day"],
    where: { environment: env, day: { gte: daysAgoKey(days) } },
    _count: { userId: true },
  });
  return rows
    .map((r) => ({ day: r.day, dau: r._count.userId }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export type PageHeatRow = { path: string; views: number; uniqueUsers: number };

export async function getPageHeat(env: UsageEnv): Promise<PageHeatRow[]> {
  const grouped = await prisma.dailyPageRollup.groupBy({
    by: ["path"],
    where: { environment: env, day: { gte: daysAgoKey(30) } },
    _sum: { views: true },
    _max: { uniqueUsers: true },
  });
  return grouped
    .map((g) => ({ path: g.path, views: g._sum.views ?? 0, uniqueUsers: g._max.uniqueUsers ?? 0 }))
    .sort((a, b) => b.views - a.views);
}
