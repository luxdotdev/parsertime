import {
  httpErrorCounter,
  httpRequestCounter,
  httpRequestDuration,
} from "@/lib/axiom/metrics";
import { logger } from "@/lib/axiom/server";
import { FLAGS_CODE_HEADER, pageFlags } from "@/lib/flags-precompute";
import { transformMiddlewareRequest } from "@axiomhq/nextjs";
import { precompute } from "flags/next";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Paths that never read flags during render: API route handlers and server
 * actions evaluate flags live, and static/well-known endpoints don't use
 * them. Skipping avoids the identify DB reads on those requests.
 */
function shouldPrecomputeFlags(pathname: string): boolean {
  return !(
    pathname.startsWith("/api/") ||
    pathname.startsWith("/.well-known/") ||
    pathname.startsWith("/monitoring")
  );
}

/**
 * Evaluate all page flags exactly once per request and forward the signed
 * result to the app on a request header. Render code decodes it via
 * `getFlag`/`getAllFlags` — pure computation — so PPR's two prerender passes
 * always see identical flag values. (A live evaluation that transiently fails
 * in one pass silently flips to `defaultValue` and desyncs the passes'
 * `use cache` calls: the HANGING_PROMISE_REJECTION class.) On precompute
 * failure we forward WITHOUT the header: every reader then deterministically
 * falls back to false for this request.
 */
async function withPrecomputedFlags(
  request: NextRequest
): Promise<NextResponse> {
  if (!shouldPrecomputeFlags(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  try {
    const code = await precompute(pageFlags);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(FLAGS_CODE_HEADER, code);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    logger.warn("flags: precompute failed; falling back to defaults", {
      error,
    });
    return NextResponse.next();
  }
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const start = performance.now();

  logger.info(...transformMiddlewareRequest(request));

  const response = await withPrecomputedFlags(request);
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  httpRequestCounter.add(1, { route: pathname, method });
  httpRequestDuration.record(performance.now() - start, {
    route: pathname,
    method,
  });

  if (response.status >= 400) {
    httpErrorCounter.add(1, {
      route: pathname,
      method,
      status_code: String(response.status),
    });
  }

  event.waitUntil(logger.flush());
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - .well-known/workflow (Workflow SDK's internal queue handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.well-known/workflow/).*)",
  ],
};
