import { getScrimDataById } from "@/lib/get-scrim-data";
import Logger from "@/lib/logger";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const token = req.headers.get("Authorization");

  if (token !== process.env.DEV_TOKEN) {
    Logger.log("Unauthorized request to get scrim data by id");
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  Logger.log("Authorized request with dev token to get scrim data by id");

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
