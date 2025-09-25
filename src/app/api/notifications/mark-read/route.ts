import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import { notFound, unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  id: z.number().optional(),
  all: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) unauthorized();

  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return new Response("Invalid request body", { status: 400 });
  }
  const { id, all } = body.data;

  try {
    if (all) {
      await notifications.markAllAsRead(user.id);
      return new Response("OK", { status: 200 });
    }

    if (id) {
      await notifications.markAsRead(user.id, id);
      return new Response("OK", { status: 200 });
    }

    return new Response(
      "An unknown error occurred. Please ensure the request body is valid.",
      {
        status: 400,
      }
    );
  } catch (error) {
    Logger.error("Error marking notification as read:", error);

    // Handle specific error types if needed
    if (error && typeof error === "object" && "_tag" in error) {
      if (error._tag === "UnauthorizedError") {
        unauthorized();
      }
      if (error._tag === "NotFoundError") {
        notFound();
      }
      if (error._tag === "DatabaseError") {
        return new Response("Database error", { status: 500 });
      }
    }

    return new Response("Internal server error", { status: 500 });
  }
}
