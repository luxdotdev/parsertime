import { getScrimDataById } from "@/lib/get-scrim-data";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return new Response("No id provided", {
      status: 400,
    });
  }

  const data = await getScrimDataById(parseInt(id));
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
    },
    status: 200,
  });
}
