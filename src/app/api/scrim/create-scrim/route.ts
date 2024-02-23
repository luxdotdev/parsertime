import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { createNewScrimFromParsedData } from "@/lib/parser";
import { ParserData } from "@/types/parser";

export type CreateScrimRequestData = {
  name: string;
  team: string;
  date: string;
  map: ParserData;
};

export async function POST(request: Request) {
  const session = await auth();

  const data = (await request.json()) as CreateScrimRequestData;

  if (!session) {
    Logger.warn("Unauthorized request to create scrim");

    return new Response("Unauthorized", {
      status: 401,
    });
  }

  Logger.log("Creating new scrim for user: ", session.user?.email);

  await createNewScrimFromParsedData(data, session);

  return new Response("OK", {
    status: 200,
  });
}
