import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import type { ParserData } from "@/types/parser";
import { track } from "@vercel/analytics/server";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  const id = req.nextUrl.searchParams.get("id") ?? "";

  const data = (await req.json()) as ParserData;

  if (!session || !session.user || !session.user.email) {
    Logger.warn("Unauthorized request to add map");
    unauthorized();
  }

  try {
    await createNewMap({ map: data, scrimId: parseInt(id) }, session);

    await track("Create Map", { user: session.user.email });

    return new Response("OK", { status: 200 });
  } catch (e: unknown) {
    Logger.error("Error adding map", e);

    if (e instanceof Error) return new Response(e.message, { status: 500 });

    return new Response("Internal Server Error", { status: 500 });
  }
}
