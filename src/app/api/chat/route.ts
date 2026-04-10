import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { systemPrompt } from "@/lib/ai/system-prompt";
import { chatTelemetry } from "@/lib/ai/telemetry";
import { buildTools } from "@/lib/ai/tools";
import { auth } from "@/lib/auth";
import { flagsToBaggage, setRequestContext } from "@/lib/axiom/baggage";
import { resolveAllFlags, toFlagValues } from "@/lib/flags-helpers";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { unauthorized } from "next/navigation";

export const maxDuration = 60;

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "ratelimit:ai-chat",
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) unauthorized();

  const { success } = await ratelimit.limit(userData.id);
  if (!success) {
    return new Response("Rate limit exceeded. Please wait a moment.", {
      status: 429,
    });
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const user = await prisma.user.findUnique({
    where: { id: userData.id },
    include: {
      teams: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  const userTeams = user?.teams ?? [];
  const allowedTeamIds = new Set(userTeams.map((t) => t.id));

  const flags = await resolveAllFlags();
  setRequestContext({
    user_id: userData.id,
    billing_plan: userData.billingPlan,
    team_ids: userTeams.map((t) => String(t.id)).join(","),
    flags: flagsToBaggage(toFlagValues(flags)),
  });

  const tools = buildTools({ userId: userData.id, allowedTeamIds, userTeams });

  const result = streamText({
    model: "openai/gpt-5.4",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    experimental_telemetry: {
      isEnabled: true,
      functionId: "parsertime-chat",
      recordInputs: true,
      recordOutputs: true,
      metadata: { userId: userData.id },
      integrations: [chatTelemetry(userData.id)],
    },
  });

  return result.toUIMessageStreamResponse();
}
