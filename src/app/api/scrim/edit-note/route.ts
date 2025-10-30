import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { upsertNote } from "@/lib/notes";
import { noteDataSchema } from "@/lib/utils";
import { notFound, unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) notFound();

  const body = await request.json();

  const noteData = noteDataSchema.safeParse(body);
  if (!noteData.success) {
    return new Response("Invalid note data", { status: 400 });
  }

  await upsertNote({
    scrimId: noteData.data.scrimId,
    mapDataId: noteData.data.mapDataId,
    content: noteData.data.content,
  });

  return new Response(JSON.stringify(noteData.data), { status: 201 });
}
