"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { track } from "@vercel/analytics";
import { signIn } from "next-auth/react";
import { startTransition } from "react";

export function DiscordLoginButton() {
  return (
    <Button
      type="button"
      onClick={() => {
        startTransition(async () => {
          track("Sign In", { location: "Settings", method: "Discord" });
          await signIn("discord");
        });
      }}
    >
      <Icons.discord className="mr-2 h-4 w-4 pl-2" />
      Sign In with Discord
    </Button>
  );
}
