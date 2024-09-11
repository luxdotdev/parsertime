import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

const prismaClientSingleton = () => {
  if (process.env.NODE_ENV === "test") {
    return new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DB_URL,
        },
      },
    });
  }

  // For other environments, return the default PrismaClient
  return new PrismaClient().$extends(
    withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY })
  );
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
