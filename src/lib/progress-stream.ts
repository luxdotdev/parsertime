/**
 * Newline-delimited JSON (NDJSON) progress streaming for long-running upload
 * routes. Each emitted event is one JSON object on its own line:
 *
 *   {"type":"progress","completed":1234,"total":5000}
 *   {"type":"done","scrimId":42}
 *   {"type":"error","message":"Invalid Log Format"}
 *
 * Validation/auth still happen before the stream starts, so those failures
 * return ordinary 4xx responses. Only once work begins do we stream, which is
 * why a "done" or "error" event (not the HTTP status) signals the outcome.
 */
export type ProgressStreamEvent =
  | { type: "progress"; completed: number; total: number }
  | { type: "done"; scrimId?: number; mapId?: number }
  | { type: "error"; message: string };

export function createNdjsonStream(
  handler: (emit: (event: ProgressStreamEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function emit(event: ProgressStreamEvent) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      try {
        await handler(emit);
      } catch (e) {
        emit({
          type: "error",
          message: e instanceof Error ? e.message : "Internal Server Error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Disable proxy buffering so progress lines flush to the client promptly.
      "X-Accel-Buffering": "no",
    },
  });
}
