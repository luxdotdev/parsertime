import { auditLog } from "@/lib/audit-logs";
import { auth, canEditScrim, getCurrentUser } from "@/lib/auth";
import { mapDeletionDuration, mapRemovedCounter } from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const id = params.get("id");

  const session = await auth();

  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to remove map: ", id);
    unauthorized();
  }

  const user = await getCurrentUser();

  if (!user) return new Response("User not found", { status: 404 });
  if (!id) return new Response("Missing ID", { status: 400 });

  const map = await prisma.map.findFirst({
    where: { id: parseInt(id) },
  });
  if (!map) return new Response("Map not found", { status: 404 });

  const scrim = await prisma.scrim.findUnique({ where: { id: map.scrimId! } });
  if (!scrim) return new Response("Scrim not found", { status: 404 });

  if (!(await canEditScrim(scrim.id, user))) {
    unauthorized();
  }

  Logger.info(`Removing map: ${id}`);

  const mapId = parseInt(id);

  const deleteStart = performance.now();
  await prisma.map.delete({ where: { id: mapId } });
  mapDeletionDuration.record(performance.now() - deleteStart);
  mapRemovedCounter.add(1);

  revalidateTag(`map:${mapId}`, "max");

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "MAP_DELETED",
      target: `${scrim.name} (ID: ${scrim.id})`,
      details: `Map deleted: ${id}`,
    });
  });

  return new Response("OK", { status: 200 });
}
