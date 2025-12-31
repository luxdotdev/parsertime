type VodRequestBody = {
  mapId: number;
  vodUrl: string;
};
export async function POST(req: Request) {
  const body = (await req.json()) as VodRequestBody;
  const { mapId, vodUrl } = body;

  // Validate input
  if (!mapId || !vodUrl) {
    return new Response("Missing mapId or vodUrl", { status: 400 });
  }
  const updatedVod = await prisma?.map.upsert({
    where: { id: mapId },
    update: { vod: vodUrl },
    create: { id: mapId, vod: vodUrl, name: `Map ${mapId}` },
  });
  return new Response(JSON.stringify(updatedVod), { status: 200 });
}
