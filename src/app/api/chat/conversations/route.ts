import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const userData = await getUser(session.user.email);
  if (!userData) unauthorized();

  const conversations = await prisma.chatConversation.findMany({
    where: { userId: userData.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const userData = await getUser(session.user.email);
  if (!userData) unauthorized();

  const body = (await req.json()) as {
    title: string;
    messages: Record<string, unknown>[];
  };

  const conversation = await prisma.chatConversation.create({
    data: {
      userId: userData.id,
      title: body.title || "New conversation",
      messages: body.messages as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ id: conversation.id });
}
