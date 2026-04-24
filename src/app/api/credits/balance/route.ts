import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { getOrInitUserCredits } from "@/lib/credits";
import { Effect } from "effect";
import { unauthorized } from "next/navigation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  const credits = await getOrInitUserCredits(user.id);

  return Response.json({
    balanceCents: credits.balanceCents,
    autoRefillEnabled: credits.autoRefillEnabled,
    autoRefillThresholdCents: credits.autoRefillThresholdCents,
    autoRefillAmountCents: credits.autoRefillAmountCents,
    hasPaymentMethod: credits.stripePaymentMethodId !== null,
  });
}
