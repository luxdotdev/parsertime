import {
  httpErrorCounter,
  httpRequestCounter,
  httpRequestDuration,
} from "@/lib/axiom/metrics";
import { logger } from "@/lib/axiom/server";
import { transformMiddlewareRequest } from "@axiomhq/nextjs";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const start = performance.now();

  logger.info(...transformMiddlewareRequest(request));

  const response = NextResponse.next();
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
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
