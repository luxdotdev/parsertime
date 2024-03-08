"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { track } from "@vercel/analytics";
import { signIn } from "next-auth/react";

export function DiscordLoginButton() {
  return (
    <Button
      type="button"
      onClick={() => {
        track("Connect Discord", { location: "Settings" });
        signIn("discord");
      }}
    >
      <Icons.discord className="pl-2 mr-2 h-4 w-4" />
      Sign In with Discord
    </Button>
  );
}
