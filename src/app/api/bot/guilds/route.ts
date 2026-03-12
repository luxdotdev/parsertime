import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { context, propagation } from "@opentelemetry/api";

export async function GET() {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/guilds",
    method: "GET",
    timestamp: new Date().toISOString(),
  };
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      wideEvent.outcome = "unauthorized";
      wideEvent.status_code = 401;
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const botApiUrl = process.env.BOT_API_URL;
    const botSecret = process.env.BOT_SECRET;

    if (!botApiUrl || !botSecret) {
      wideEvent.outcome = "misconfigured";
      wideEvent.status_code = 503;
      return Response.json(
        { success: false, error: "Bot service not configured" },
        { status: 503 }
      );
    }

    const traceHeaders: Record<string, string> = {};
    propagation.inject(context.active(), traceHeaders);

    const response = await fetch(`${botApiUrl}/api/guilds`, {
      headers: {
        Authorization: `Bearer ${botSecret}`,
        ...traceHeaders,
      },
    });

    if (!response.ok) {
      wideEvent.outcome = "upstream_error";
      wideEvent.status_code = response.status;
      return Response.json(
        { success: false, error: "Failed to fetch guilds" },
        { status: response.status }
      );
    }

    const data = await response.json();

    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({ success: true, data });
  } catch (error) {
    wideEvent.outcome = "error";
    wideEvent.status_code = 500;
    wideEvent.error = {
      message: (error as Error).message,
      type: (error as Error).name,
    };
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
