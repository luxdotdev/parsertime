import { getUser } from "@/data/user-dto";
import { systemPrompt } from "@/lib/ai/system-prompt";
import { buildTools } from "@/lib/ai/tools";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
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

  const userData = await getUser(session.user.email);
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

  const tools = buildTools({ allowedTeamIds, userTeams });

  const result = streamText({
    model: "openai/gpt-5.4",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
