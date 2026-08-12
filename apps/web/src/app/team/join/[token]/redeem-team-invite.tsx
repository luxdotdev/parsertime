"use client";

import { redeemTeamInvite } from "@/lib/redeem-team-invite";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { JoinTokenSkeleton } from "./loading-skeleton";

export function RedeemTeamInvite({ token }: { token: string }) {
  const router = useRouter();
  const requestRef = useRef<Promise<Response> | null>(null);

  useEffect(() => {
    // Reuse the same request if React replays the effect in development. Team
    // invite tokens are one-time use, so duplicate POSTs would race each other.
    requestRef.current ??= redeemTeamInvite(token);

    let active = true;
    void requestRef.current
      .then((response) => {
        if (!active) return;
        router.replace(
          response.ok ? "/team/join/success" : "/team/join?error=invalid-token"
        );
      })
      .catch(() => {
        if (active) router.replace("/team/join?error=invalid-token");
      });

    return () => {
      active = false;
    };
  }, [router, token]);

  return <JoinTokenSkeleton />;
}
