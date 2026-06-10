import { CalculatedStatType, PrismaClient, type Prisma } from "@prisma/client";

// Main can share prod data with newer deploys. Hide enum rows this client
// cannot decode until the schema/client update lands.
const supportedCalculatedStatTypes = Object.values(CalculatedStatType);

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
