import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { createNewScrimFromParsedData } from "@/lib/parser";
import { ParserData } from "@/types/parser";

export type CreateScrimRequestData = {
  name: string;
  team: string;
  date: string;
  map: ParserData;
  replayCode: string;
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

  if (data.map === null) {
    Logger.warn("Invalid map data");

    return new Response("Invalid map data", {
      status: 400,
    });
  }

  Logger.log("Creating new scrim for user: ", session.user?.email);

  await createNewScrimFromParsedData(data, session);

  return new Response("OK", {
    status: 200,
  });
}
