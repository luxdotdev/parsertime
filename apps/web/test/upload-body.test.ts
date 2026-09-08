import { parseLogText } from "@/lib/parser/client";
import {
  encodeUploadBody,
  MAX_FUNCTION_BODY_BYTES,
  readUploadJson,
  UPLOAD_ENCODING_HEADER,
} from "@/lib/upload-body";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function requestFrom(encoded: Awaited<ReturnType<typeof encodeUploadBody>>) {
  return new Request("http://t/api/scrim/add-map-stream?id=1", {
    method: "POST",
    headers: encoded.headers,
    body: encoded.body,
  });
}

describe("upload body transport", () => {
  it("round-trips a payload through gzip", async () => {
    const payload = { map: { match_start: [[1, "a", "b"]] }, order: 3 };

    const encoded = await encodeUploadBody(payload);

    expect(encoded.compressed).toBe(true);
    expect(encoded.headers[UPLOAD_ENCODING_HEADER]).toBe("gzip");
    expect(encoded.headers["Content-Type"]).toBe("application/octet-stream");
    await expect(readUploadJson(requestFrom(encoded))).resolves.toEqual(
      payload
    );
  });

  it("still reads a plain JSON body from older clients", async () => {
    const req = new Request("http://t/api/scrim/add-map?id=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: 1 }),
    });

    await expect(readUploadJson(req)).resolves.toEqual({ order: 1 });
  });

  it("keeps a 10MB-class log under the platform request cap", async () => {
    // The reported failure: a 4.1MB log serialises to ~4.5MB of JSON, which
    // is exactly Vercel's function body limit. Inflate the sample log to the
    // advertised 10MB maximum and check the compressed body has headroom.
    const sample = readFileSync(
      "test/samples/Log-2026-04-02-17-21-48.txt",
      "utf8"
    );
    const lines = sample.split("\n");
    const target = 10_000_000;
    let text = sample;
    while (Buffer.byteLength(text) < target) {
      text += `\n${lines.slice(1).join("\n")}`;
    }
    const map = parseLogText(text);
    const json = Buffer.byteLength(JSON.stringify({ map, order: 0 }));
    expect(json).toBeGreaterThan(MAX_FUNCTION_BODY_BYTES);

    const encoded = await encodeUploadBody({ map, order: 0 });

    expect(encoded.bytes).toBeLessThan(MAX_FUNCTION_BODY_BYTES / 2);
    const decoded = await readUploadJson<{ map: typeof map }>(
      requestFrom(encoded)
    );
    expect(decoded.map.match_start).toEqual(map.match_start);
  });
});
