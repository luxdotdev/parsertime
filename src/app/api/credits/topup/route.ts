import { TOPUP_MIN_CENTS } from "@/lib/chat-pricing";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { createTopupCheckout } from "@/lib/stripe";
import type { NextRequest } from "next/server";
import { unauthorized } from "next/navigation";
import { z } from "zod";

const topupSchema = z.object({
  amountCents: z
    .number()
    .int()
    .min(
      TOPUP_MIN_CENTS,
      `Minimum top-up is $${(TOPUP_MIN_CENTS / 100).toFixed(2)}.`
    )
    .max(1_000_00, "Top-up cannot exceed $1,000.00."),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const parsed = topupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid amount" },
      { status: 400 }
    );
  }

  try {
    const checkoutSession = await createTopupCheckout(
      session,
      parsed.data.amountCents
    );
    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    Logger.error("failed to create topup checkout session", {
      userEmail: session.user.email,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
