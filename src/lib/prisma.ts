import {
  PrismaClient,
  type CalculatedStatType,
  type Prisma,
} from "@prisma/client";

// Main can share prod data with newer deploys. Hide enum rows this client
// cannot decode until the schema/client update lands.
const supportedCalculatedStatTypes = [
  "FLETA_DEADLIFT_PERCENTAGE",
  "FIRST_PICK_PERCENTAGE",
  "FIRST_PICK_COUNT",
  "FIRST_DEATH_PERCENTAGE",
  "FIRST_DEATH_COUNT",
  "MVP_SCORE",
  "MAP_MVP_COUNT",
  "AJAX_COUNT",
  "AVERAGE_ULT_CHARGE_TIME",
  "AVERAGE_TIME_TO_USE_ULT",
  "AVERAGE_DROUGHT_TIME",
  "KILLS_PER_ULTIMATE",
  "DUEL_WINRATE_PERCENTAGE",
  "FIGHT_REVERSAL_PERCENTAGE",
] satisfies CalculatedStatType[];

function onlySupportedCalculatedStatTypes<
  T extends { where?: Prisma.CalculatedStatWhereInput },
>(args: T): T {
  return {
    ...args,
    where: {
      AND: [
        args.where ?? {},
        { stat: { in: supportedCalculatedStatTypes } },
      ],
    },
  };
}

function prismaClientSingleton() {
  const client = new PrismaClient().$extends({
    query: {
      calculatedStat: {
        findMany({ args, query }) {
          return query(onlySupportedCalculatedStatTypes(args));
        },
      },
    },
  });

  return client as unknown as PrismaClient;
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
