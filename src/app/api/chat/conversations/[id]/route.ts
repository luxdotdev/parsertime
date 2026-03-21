import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function getAuthedUser() {
  const session = await auth();
  if (!session?.user?.email) unauthorized();
  const userData = await getUser(session.user.email);
  if (!userData) unauthorized();
  return userData;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userData = await getAuthedUser();
  const { id } = await params;

  const conversation = await prisma.chatConversation.findFirst({
    where: { id, userId: userData.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userData = await getAuthedUser();
  const { id } = await params;
  const body = (await req.json()) as {
    title?: string;
    messages?: Record<string, unknown>[];
  };

  const conversation = await prisma.chatConversation.findFirst({
    where: { id, userId: userData.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Prisma.ChatConversationUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.messages !== undefined)
    data.messages = body.messages as unknown as Prisma.InputJsonValue;

  const updated = await prisma.chatConversation.update({
    where: { id },
    data,
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userData = await getAuthedUser();
  const { id } = await params;

  const conversation = await prisma.chatConversation.findFirst({
    where: { id, userId: userData.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chatConversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
