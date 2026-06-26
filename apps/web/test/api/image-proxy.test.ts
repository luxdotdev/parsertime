const download = vi.fn();
vi.mock("@/lib/r2", () => ({
  r2: { download: (key: string) => download(key) },
}));

import { GET } from "@/app/api/image/[type]/[id]/route";
import { beforeEach, describe, expect, it, vi } from "vitest";

function ctx(type: string, id: string) {
  return { params: Promise.resolve({ type, id }) };
}

describe("GET /api/image/[type]/[id]", () => {
  beforeEach(() => {
    download.mockReset();
  });

  it("streams the object with immutable cache headers", async () => {
    download.mockResolvedValue(Buffer.from([1, 2, 3]));
    const res = await GET(new Request("http://t/"), ctx("avatar", "user_1"));
    expect(download).toHaveBeenCalledWith("avatars/user_1.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable"
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    );
  });

  it("rejects unknown kinds with 400 and never touches R2", async () => {
    const res = await GET(new Request("http://t/"), ctx("map-images", "x"));
    expect(res.status).toBe(400);
    expect(download).not.toHaveBeenCalled();
  });

  it("rejects ids with path characters with 400", async () => {
    const res = await GET(new Request("http://t/"), ctx("avatar", "a/b"));
    expect(res.status).toBe(400);
    expect(download).not.toHaveBeenCalled();
  });

  it("returns 404 when the object is missing", async () => {
    download.mockRejectedValue(new Error("DownloadError"));
    const res = await GET(new Request("http://t/"), ctx("avatar", "missing"));
    expect(res.status).toBe(404);
  });
});
