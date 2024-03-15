import prisma from "@/lib/prisma";
import { PlayerStatRows } from "@/types/prisma";
import { expect, test } from "vitest";

test("should be equivalent queries", async () => {
  await prisma.$connect();

  console.time("originalQuery");
  const originalQuery = await prisma.$queryRaw<PlayerStatRows>`
    SELECT
        ps.*
    FROM
        "PlayerStat" ps
        INNER JOIN (
            SELECT
                "MapDataId",
                MAX("match_time") AS max_time
            FROM
                "PlayerStat"
            WHERE
                "MapDataId" = 100
            GROUP BY
                "MapDataId"
        ) AS max_time ON ps."MapDataId" = max_time."MapDataId"
        AND ps."match_time" = max_time.max_time`;
  console.timeEnd("originalQuery");

  console.time("newQuery");
  const newQuery = await prisma.$queryRaw<PlayerStatRows>`
      WITH maxTime AS (
          SELECT
              MAX("match_time") AS max_time
          FROM
              "PlayerStat"
          WHERE
              "MapDataId" = 100
      )
      SELECT
          ps.*
      FROM
          "PlayerStat" ps
          INNER JOIN maxTime m ON ps."match_time" = m.max_time
      WHERE
          ps."MapDataId" = 100
    `;
  console.timeEnd("newQuery");

  expect(newQuery).toEqual(originalQuery);
});
