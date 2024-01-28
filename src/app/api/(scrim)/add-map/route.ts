import { auth } from "@/lib/auth";
import { createNewMap } from "@/lib/parser";
import { ParserData } from "@/types/parser";
import { NextRequest } from "next/server";

export type CreateMapRequestData = {
  scrimId: number;
  map: ParserData;
};

export async function POST(req: NextRequest) {
  const session = await auth();

  const id = req.nextUrl.searchParams.get("id") ?? "";

  const data: ParserData = await req.json();

  if (!session) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await createNewMap({ map: data, scrimId: parseInt(id) }, session);

  return new Response("OK", {
    status: 200,
  });
}
