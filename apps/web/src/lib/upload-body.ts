/**
 * Transport for large JSON uploads (parsed Workshop logs).
 *
 * Vercel rejects any function request body over 4.5 MB with a platform-level
 * 413 before our code runs. A parsed log serialises to ~1.1x the raw file, so
 * a ~4 MB log already trips the limit even though the UI advertises 10 MB.
 * Gzip shrinks the JSON roughly 7x, comfortably under the cap for the largest
 * log we accept. The compressed body travels as an opaque octet stream with a
 * custom marker header, so no proxy in between tries to transcode it and the
 * platform limit applies to the compressed bytes.
 */

export const UPLOAD_ENCODING_HEADER = "x-upload-encoding";
const GZIP = "gzip";

/** Vercel's request body cap for functions, in bytes. */
export const MAX_FUNCTION_BODY_BYTES = 4_500_000;

export type EncodedUploadBody = {
  body: BodyInit;
  headers: Record<string, string>;
  /** Bytes that will go over the wire. */
  bytes: number;
  compressed: boolean;
};

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream(GZIP));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Serialise a JSON payload for upload, gzipping it when the browser supports
 * `CompressionStream` (every evergreen browser since 2023). Falls back to the
 * plain JSON body otherwise.
 */
export async function encodeUploadBody(
  payload: unknown
): Promise<EncodedUploadBody> {
  const json = new TextEncoder().encode(JSON.stringify(payload));

  if (typeof CompressionStream === "undefined") {
    return {
      body: json as BodyInit,
      headers: { "Content-Type": "application/json" },
      bytes: json.byteLength,
      compressed: false,
    };
  }

  const compressed = await gzip(json);
  return {
    body: compressed as BodyInit,
    headers: {
      "Content-Type": "application/octet-stream",
      [UPLOAD_ENCODING_HEADER]: GZIP,
    },
    bytes: compressed.byteLength,
    compressed: true,
  };
}

/**
 * Read a JSON request body produced by `encodeUploadBody`, transparently
 * inflating a gzipped one. Plain `application/json` requests (older clients,
 * tests, curl) keep working unchanged.
 */
export async function readUploadJson<T = unknown>(req: Request): Promise<T> {
  if (req.headers.get(UPLOAD_ENCODING_HEADER) !== GZIP || !req.body) {
    return (await req.json()) as T;
  }
  const inflated = req.body.pipeThrough(new DecompressionStream(GZIP));
  return (await new Response(inflated).json()) as T;
}
