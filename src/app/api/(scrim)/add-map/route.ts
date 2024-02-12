import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import { ParserData } from "@/types/parser";
import { track } from "@vercel/analytics/server";
import { NextRequest } from "next/server";

export type CreateMapRequestData = {
  scrimId: number;
  map: ParserData;
};

export async function POST(req: NextRequest) {
  const session = await auth();

  const id = req.nextUrl.searchParams.get("id") ?? "";

  const data = (await req.json()) as ParserData;

  if (!session || !session.user || !session.user.email) {
    Logger.warn("Unauthorized request to add map");

    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await createNewMap({ map: data, scrimId: parseInt(id) }, session);

  await track("Create Map", { user: session.user.email });

  return new Response("OK", {
    status: 200,
  });
}
