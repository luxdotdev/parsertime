"use client";

import * as React from "react";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";

import { ClientOnly } from "@/lib/client-only";
import { EnvelopeOpenIcon } from "@radix-ui/react-icons";
import { track } from "@vercel/analytics";
import { useTranslations } from "next-intl";
import { z } from "zod";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    await signIn("email", { email });
  }

  const t = useTranslations("signInPage");

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <ClientOnly>
        <form onSubmit={onSubmit}>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                onChange={(e) => {
                  const email = z
                    .string()
                    .email()
                    .safeParse(e.target.value.toLowerCase());

                  if (email.success) {
                    setEmail(email.data);
                  } else {
                    setEmail("");
                  }
                }}
              />
            </div>
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => {
                React.startTransition(async () => {
                  track("Sign In", { location: "Auth form", method: "Email" });
                  await signIn("email", { email });
                });
              }}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
              {t("signInEmail")}
            </Button>
          </div>
        </form>
      </ClientOnly>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            {t("orContinueWith")}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={() => {
          React.startTransition(async () => {
            track("Sign In", { location: "Auth form", method: "GitHub" });
            await signIn("github");
          });
        }}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.gitHub className="mr-2 h-4 w-4" />
        )}{" "}
        Github
      </Button>
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={() => {
          React.startTransition(async () => {
            track("Sign In", { location: "Auth form", method: "Google" });
            await signIn("google");
          });
        }}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}{" "}
        Google
      </Button>
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={() => {
          React.startTransition(async () => {
            track("Sign In", { location: "Auth form", method: "Discord" });
            await signIn("discord");
          });
        }}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.discord className="mr-2 h-4 w-4 pl-2" />
        )}{" "}
        Discord
      </Button>
    </div>
  );
}
