import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { TOPUP_MIN_CENTS } from "@/lib/chat-pricing";
import { setAutoRefillConfig } from "@/lib/credits";
import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { unauthorized } from "next/navigation";
import { z } from "zod";

const configSchema = z
  .object({
    enabled: z.boolean().optional(),
    thresholdCents: z.number().int().min(0).max(10_000).optional(),
    amountCents: z.number().int().min(TOPUP_MIN_CENTS).max(10_000).optional(),
  })
  .refine(
    (data) =>
      data.enabled !== undefined ||
      data.thresholdCents !== undefined ||
      data.amountCents !== undefined,
    { message: "Provide at least one field to update." }
  );

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  const parsed = configSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const updated = await setAutoRefillConfig(user.id, parsed.data);
  return Response.json({
    autoRefillEnabled: updated.autoRefillEnabled,
    autoRefillThresholdCents: updated.autoRefillThresholdCents,
    autoRefillAmountCents: updated.autoRefillAmountCents,
  });
}
