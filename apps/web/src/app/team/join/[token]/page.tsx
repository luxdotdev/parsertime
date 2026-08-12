import { auth } from "@/lib/auth";
import type { PagePropsWithLocale } from "@/types/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JoinTokenSkeleton } from "./loading-skeleton";
import { RedeemTeamInvite } from "./redeem-team-invite";

export default function TokenPage(
  props: PagePropsWithLocale<"/team/join/[token]">
) {
  return (
    <Suspense fallback={<JoinTokenSkeleton />}>
      <TokenPageContent params={props.params} />
    </Suspense>
  );
}

async function TokenPageContent({
  params: paramsPromise,
}: {
  params: PagePropsWithLocale<"/team/join/[token]">["params"];
}) {
  const params = await paramsPromise;
  const session = await auth();
  const token = params.token;

  if (!session?.user?.email)
    redirect(`/sign-in?callbackUrl=/team/join/${token}`);

  // Rendering can happen speculatively during prefetching and more than once
  // under Cache Components. Keep the one-time mutation behind an explicit POST
  // that only runs after the destination page is mounted in the browser.
  return <RedeemTeamInvite token={token} />;
}
