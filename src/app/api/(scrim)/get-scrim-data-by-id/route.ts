import { getScrimDataById } from "@/lib/get-scrim-data";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const prisma = new PrismaClient();

  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return new Response("No id provided", {
      status: 400,
    });
  }

  const data = await getScrimDataById(prisma, parseInt(id));
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
    },
    status: 200,
  });
}
