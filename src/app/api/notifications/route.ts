import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import { getSession } from "next-auth/react";
import { notFound, unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const createNotificationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  href: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) unauthorized();

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");

  try {
    const result = await notifications.getUserNotificationsPaginated(
      user.id,
      page,
      limit
    );

    return new Response(
      JSON.stringify({
        notifications: result.notifications,
        pagination: result.pagination,
      })
    );
  } catch (error) {
    Logger.error("Error fetching notifications:", error);

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

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) unauthorized();

  try {
    const body = createNotificationSchema.safeParse(await request.json());
    if (!body.success) {
      return new Response("Invalid request body", { status: 400 });
    }

    // Determine the target user ID
    let targetUserId: string;

    if (body.data.userId) {
      // Explicit user ID provided - verify session user has permission
      const sessionUser = await getUser(session.user.email);
      if (!sessionUser) unauthorized();

      // For now, allow any authenticated user to create notifications for any user
      // TODO: Add role-based checks here
      targetUserId = body.data.userId;
    } else {
      // Fallback to session user (backward compatibility)
      const sessionUser = await getUser(session.user.email);
      if (!sessionUser) unauthorized();
      targetUserId = sessionUser.id;
    }

    const notification = await notifications.createInAppNotification({
      title: body.data.title,
      description: body.data.description,
      href: body.data.href,
      userId: targetUserId,
    });

    return new Response(JSON.stringify(notification), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    Logger.error("Error creating notification:", error);

    // Handle specific error types if needed
    if (error && typeof error === "object" && "_tag" in error) {
      if (error._tag === "ValidationError") {
        return new Response("Validation error", { status: 400 });
      }
      if (error._tag === "UserNotFoundError") {
        return new Response("User not found", { status: 404 });
      }
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

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) unauthorized();

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  if (!id) return new Response("No ID provided", { status: 400 });

  try {
    await notifications.deleteNotification(user.id, parseInt(id));
    return new Response("OK", { status: 200 });
  } catch (error) {
    Logger.error("Error deleting notification:", error);

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
