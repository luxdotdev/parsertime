import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { createCheckout, getCustomerPortalUrl } from "@/lib/stripe";
import { $Enums } from "@/generated/prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const CheckoutQuerySchema = z.object({
  tier: z.enum(["Basic", "Premium"]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const parsed = CheckoutQuerySchema.safeParse({
    tier: req.nextUrl.searchParams.get("tier"),
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (user.billingPlan === $Enums.BillingPlan.FREE) {
    const checkout = await createCheckout(session, parsed.data.tier);
    if (!checkout.url) {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }
    return NextResponse.redirect(checkout.url);
  }

  return NextResponse.redirect(await getCustomerPortalUrl(user));
}
