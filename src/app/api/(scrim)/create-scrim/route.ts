import { auth } from "@/lib/auth";
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

  const data: CreateScrimRequestData = await request.json();

  if (!session) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await createNewScrimFromParsedData(data, session);

  return new Response("OK", {
    status: 200,
  });
}
