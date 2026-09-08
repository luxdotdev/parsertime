import { Logger } from "@/lib/logger";
import { encodeUploadBody, MAX_FUNCTION_BODY_BYTES } from "@/lib/upload-body";
import type { PendingMap } from "./types";

/**
 * Uploads one map. Reports fractional progress (0..1) for this map as the
 * server streams row-insert progress, and returns the scrim id to use for
 * every subsequent map (this is how "first map creates the scrim" hands the
 * new id down the chain).
 */
export type UploadMapFn = (
  map: PendingMap,
  /** Absolute display order: base offset + position in the full list. */
  order: number,
  /** Scrim id once known; null only before the first map of a create flow. */
  scrimId: number | null,
  reportProgress: (fraction: number) => void
) => Promise<number>;

type RunArgs = {
  maps: PendingMap[];
  patchMap: (id: string, patch: Partial<PendingMap>) => void;
  uploadMap: UploadMapFn;
  baseOrder: number;
  initialScrimId: number | null;
};

/**
 * Upload maps one at a time, in list order. Each map carries an explicit
 * `order` so a map failing and being retried later never changes the final
 * sequence. Already-uploaded ("done") maps are skipped, which makes this
 * double as the retry path.
 *
 * If the scrim does not exist yet (create flow) and the first map fails, we
 * stop: the remaining maps have nowhere to attach, and a zero-map scrim is not
 * a valid state. Once a scrim exists, a single failure is isolated and the
 * loop continues so good maps are still saved.
 */
export async function runSequentialUpload({
  maps,
  patchMap,
  uploadMap,
  baseOrder,
  initialScrimId,
}: RunArgs): Promise<{ scrimId: number | null; allSucceeded: boolean }> {
  let scrimId = initialScrimId;
  let allSucceeded = true;

  for (let i = 0; i < maps.length; i++) {
    const map = maps[i];
    if (map.status === "done") continue;

    patchMap(map.id, { status: "uploading", progress: 0, error: undefined });

    try {
      scrimId = await uploadMap(map, baseOrder + i, scrimId, (fraction) =>
        patchMap(map.id, { progress: Math.max(0, Math.min(1, fraction)) })
      );
      patchMap(map.id, { status: "done", progress: 1 });
    } catch (e) {
      allSucceeded = false;
      patchMap(map.id, {
        status: "failed",
        progress: 0,
        error: e instanceof Error ? e.message : String(e),
      });
      if (scrimId === null) break;
    }
  }

  return { scrimId, allSucceeded };
}

type StreamResult = { scrimId?: number; mapId?: number };

export type UploadMessages = {
  /** Shown when the encoded body would exceed the platform request cap. */
  tooLarge: string;
};

/**
 * POST a map to a streaming upload endpoint and surface its NDJSON progress.
 *
 * The body is gzipped client-side (see `encodeUploadBody`): Vercel rejects
 * function requests over 4.5 MB with a platform 413 before the route runs,
 * and a parsed log serialises to slightly more than its raw size.
 *
 * Validation failures arrive as an ordinary non-OK response (read as text);
 * once the stream starts, a "done" event resolves the upload and an "error"
 * event rejects it. Lines after "done" are ignored.
 */
export async function uploadMapStream(
  url: string,
  body: unknown,
  reportProgress: (fraction: number) => void,
  messages: UploadMessages
): Promise<StreamResult> {
  const startedAt = performance.now();
  const encoded = await encodeUploadBody(body);
  // One wide event per stream attempt. A stuck upload (the original "stuck
  // loading" report) never emits a terminal "done"/"error", so the telling
  // signature in the logs is a `started` event with no matching completion —
  // or a completion whose terminal_event is "closed_without_terminal".
  const wideEvent: Record<string, unknown> = {
    operation: "client_upload_map_stream",
    url,
    request_bytes: encoded.bytes,
    request_compressed: encoded.compressed,
    timestamp: new Date().toISOString(),
  };
  Logger.info({ ...wideEvent, phase: "started" });

  let progressEvents = 0;
  let streamedBytes = 0;
  let terminalEvent:
    | "done"
    | "error"
    | "closed_without_terminal"
    | "http_error"
    | "too_large" = "closed_without_terminal";

  try {
    // Fail before the network does: the platform 413 is an opaque HTML page
    // with no useful message for the user.
    if (encoded.bytes > MAX_FUNCTION_BODY_BYTES) {
      terminalEvent = "too_large";
      throw new Error(messages.tooLarge);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: encoded.headers,
      body: encoded.body,
    });
    wideEvent.http_status = res.status;

    if (res.status === 413) {
      terminalEvent = "too_large";
      throw new Error(messages.tooLarge);
    }

    if (!res.ok || !res.body) {
      terminalEvent = "http_error";
      const text = (await res.text()).trim();
      throw new Error(
        text.length > 0 ? `${text} (${res.status})` : `Error ${res.status}`
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: StreamResult = {};
    let failure: string | null = null;
    let finished = false;

    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      streamedBytes += value?.byteLength ?? 0;
      buffer += decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;

        const evt = JSON.parse(line) as {
          type: "progress" | "done" | "error";
          completed?: number;
          total?: number;
          scrimId?: number;
          mapId?: number;
          message?: string;
        };

        if (evt.type === "progress") {
          progressEvents += 1;
          if (evt.total && evt.total > 0) {
            reportProgress((evt.completed ?? 0) / evt.total);
          }
        } else if (evt.type === "done") {
          terminalEvent = "done";
          result = { scrimId: evt.scrimId, mapId: evt.mapId };
          reportProgress(1);
          finished = true;
          break;
        } else if (evt.type === "error") {
          terminalEvent = "error";
          failure = evt.message ?? "Upload failed";
          finished = true;
          break;
        }
      }
    }

    await reader.cancel().catch(() => undefined);

    if (failure) throw new Error(failure);

    wideEvent.outcome = "success";
    wideEvent.scrim_id = result.scrimId;
    wideEvent.map_id = result.mapId;
    return result;
  } catch (e) {
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: e instanceof Error ? e.message : String(e),
      type: e instanceof Error ? e.name : "UnknownError",
    };
    throw e;
  } finally {
    wideEvent.terminal_event = terminalEvent;
    wideEvent.progress_events = progressEvents;
    wideEvent.streamed_bytes = streamedBytes;
    wideEvent.duration_ms = Math.round(performance.now() - startedAt);
    Logger.info(wideEvent);
  }
}
