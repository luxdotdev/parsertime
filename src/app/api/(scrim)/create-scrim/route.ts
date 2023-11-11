import { auth } from "@/lib/auth";
import { createNewScrimFromParsedData } from "@/lib/parser";
import { ParserData } from "@/types/parser";
import { PrismaClient } from "@prisma/client";

export async function POST(request: Request, response: Response) {
  const prisma = new PrismaClient();
  const session = await auth();

  const data: ParserData = await request.json();

  if (!session) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await createNewScrimFromParsedData(prisma, data, session);

  return new Response("OK", {
    status: 200,
  });
}
