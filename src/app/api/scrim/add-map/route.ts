import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import type { ParserData } from "@/types/parser";
import { track } from "@vercel/analytics/server";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export type AddMapRequestData = {
  map: ParserData;
  heroBans?: {
    hero: string;
    team: string;
    banPosition: number;
  }[];
};

export async function POST(req: NextRequest) {
  const session = await auth();

  const id = req.nextUrl.searchParams.get("id") ?? "";

  const data = (await req.json()) as AddMapRequestData;

  if (!session || !session.user || !session.user.email) {
    Logger.warn("Unauthorized request to add map");
    unauthorized();
  }

  try {
    await createNewMap(
      {
        map: data.map,
        scrimId: parseInt(id),
        heroBans: data.heroBans,
      },
      session
    );

    after(async () => {
      await Promise.all([
        track("Create Map", { user: session.user.email }),
        auditLog.createAuditLog({
          userEmail: session.user.email,
          action: "MAP_CREATED",
          target: id,
          details: `Map created: ${id}`,
        }),
      ]);
    });

    return new Response("OK", { status: 200 });
  } catch (e: unknown) {
    Logger.error("Error adding map", e);

    if (e instanceof Error) return new Response(e.message, { status: 500 });

    return new Response("Internal Server Error", { status: 500 });
  }
}
