import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { upsertNote } from "@/lib/notes";
import { noteDataSchema } from "@/lib/utils";
import { notFound, unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "POST /api/scrim/edit-note",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) {
      event.outcome = "unauthorized";
      event.status_code = 401;
      unauthorized();
    }

    event.user_email = session.user.email;

    const user = await getUser(session.user.email);
    if (!user) {
      event.outcome = "user_not_found";
      event.status_code = 404;
      notFound();
    }

    event.user_id = user.id;
    event.billing_plan = user.billingPlan;

    const body = await request.json();

    const noteData = noteDataSchema.safeParse(body);
    if (!noteData.success) {
      event.outcome = "invalid_note_data";
      event.status_code = 400;
      return new Response("Invalid note data", { status: 400 });
    }

    event.scrim_id = noteData.data.scrimId;
    event.map_data_id = noteData.data.mapDataId;

    await upsertNote({
      scrimId: noteData.data.scrimId,
      mapDataId: noteData.data.mapDataId,
      content: noteData.data.content,
    });

    event.outcome = "success";
    event.status_code = 201;

    return new Response(JSON.stringify(noteData.data), { status: 201 });
  } catch (error) {
    if (!event.outcome) {
      event.outcome = "error";
      event.status_code = 500;
      event.error = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : "UnknownError",
      };
    }
    throw error;
  } finally {
    event.duration_ms = Date.now() - startTime;
    Logger.info(event);
  }
}
