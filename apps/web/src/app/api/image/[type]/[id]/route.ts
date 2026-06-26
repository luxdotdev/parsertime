import { imageKey, isImageKind } from "@/lib/avatar";
import { r2 } from "@/lib/r2";
import { NextResponse } from "next/server";

const ID_RE = /^[A-Za-z0-9_-]+$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
): Promise<NextResponse> {
  const { type, id } = await params;

  if (!isImageKind(type) || !ID_RE.test(id)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    const body = await r2.download(imageKey(type, id));
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
