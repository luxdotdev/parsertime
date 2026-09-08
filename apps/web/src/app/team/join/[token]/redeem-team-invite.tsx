"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { authClient } from "@/lib/auth-client";
import {
  redeemTeamInvite,
  type RedeemTeamInviteFailure,
  type RedeemTeamInviteResult,
} from "@/lib/redeem-team-invite";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { JoinTokenSkeleton } from "./loading-skeleton";

export function RedeemTeamInvite({ token }: { token: string }) {
  const router = useRouter();
  const requestRef = useRef<Promise<RedeemTeamInviteResult> | null>(null);
  const [failure, setFailure] = useState<RedeemTeamInviteFailure | null>(null);

  useEffect(() => {
    // Reuse the same request if React replays the effect in development. Team
    // invite tokens are one-time use, so duplicate POSTs would race each other.
    requestRef.current ??= redeemTeamInvite(token);

    let active = true;
    void requestRef.current
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          router.replace("/team/join/success");
        } else if (result.reason === "unauthorized") {
          router.replace(`/sign-in?callbackUrl=/team/join/${token}`);
        } else {
          setFailure(result);
        }
      })
      .catch(() => {
        if (active) setFailure({ reason: "error" });
      });

    return () => {
      active = false;
    };
  }, [router, token]);

  if (!failure) return <JoinTokenSkeleton />;

  return <RedeemFailure failure={failure} token={token} />;
}

function RedeemFailure({
  failure,
  token,
}: {
  failure: RedeemTeamInviteFailure;
  token: string;
}) {
  const t = useTranslations("teamPage.join.error");
  const router = useRouter();
  const [switching, startSwitch] = useTransition();

  const key =
    failure.reason === "email_mismatch" ? "emailMismatch" : failure.reason;
  const description =
    failure.reason === "email_mismatch"
      ? t("emailMismatch.description", {
          invited: failure.invitedEmail,
          current: failure.currentEmail,
        })
      : t(`${key}.description`);

  function switchAccount() {
    startSwitch(async () => {
      // The token is untouched on a mismatch, so signing in as the invited
      // address and landing back here redeems it.
      await authClient.signOut();
      router.push(`/sign-in?callbackUrl=/team/join/${token}`);
    });
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Card className="max-w-md">
        <CardHeader className="scroll-m-20 text-xl font-semibold tracking-tight">
          {t(`${key}.title`)}
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{description}</p>
          <div className="flex flex-wrap gap-2">
            {failure.reason === "email_mismatch" && (
              <Button onClick={switchAccount} disabled={switching}>
                {switching ? t("switchingAccount") : t("switchAccount")}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/dashboard">{t("dashboard")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
