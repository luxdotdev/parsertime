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

/**
 * POST a map to a streaming upload endpoint and surface its NDJSON progress.
 *
 * Validation failures arrive as an ordinary non-OK response (read as text);
 * once the stream starts, a "done" event resolves the upload and an "error"
 * event rejects it. Lines after "done" are ignored.
 */
export async function uploadMapStream(
  url: string,
  body: unknown,
  reportProgress: (fraction: number) => void
): Promise<StreamResult> {
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
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
        if (evt.total && evt.total > 0) {
          reportProgress((evt.completed ?? 0) / evt.total);
        }
      } else if (evt.type === "done") {
        result = { scrimId: evt.scrimId, mapId: evt.mapId };
        reportProgress(1);
        finished = true;
        break;
      } else if (evt.type === "error") {
        failure = evt.message ?? "Upload failed";
        finished = true;
        break;
      }
    }
  }

  await reader.cancel().catch(() => undefined);

  if (failure) throw new Error(failure);
  return result;
}
