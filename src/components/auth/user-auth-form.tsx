"use client";

import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/components/ui/link";
import { ClientOnly } from "@/lib/client-only";
import { cn } from "@/lib/utils";
import { EnvelopeOpenIcon } from "@radix-ui/react-icons";
import { track } from "@vercel/analytics";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import * as React from "react";
import { z } from "zod";

export function UserAuthForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const lastSignedInUsing = localStorage.getItem("lastSignedInUsing");

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    track("Sign In", { location: "Auth form", method: "Email" });
    localStorage.setItem("lastSignedInUsing", "email");
    await signIn("email", { email });
  }

  async function handleProviderSignIn(provider: string) {
    setIsLoading(true);
    track("Sign In", { location: "Auth form", method: provider });
    localStorage.setItem("lastSignedInUsing", provider);
    await signIn(provider);
  }

  const t = useTranslations("signInPage");

  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {pathname === "/sign-in" ? t("welcomeBack") : t("createAccount")}
          </CardTitle>
          <CardDescription>
            {pathname === "/sign-in"
              ? t("oauthSignIn")
              : t("enterEmailCreateAccount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientOnly>
            <form onSubmit={onSubmit}>
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    {lastSignedInUsing === "discord" && (
                      <div className="absolute -top-3 -right-2 z-10">
                        <Badge variant="default" className="text-xs">
                          {t("lastUsed")}
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderSignIn("discord")}
                    >
                      {isLoading ? (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.discord className="mr-2 h-4 w-4" />
                      )}
                      {t("loginWithDiscord")}
                    </Button>
                  </div>
                  <div className="relative">
                    {lastSignedInUsing === "google" && (
                      <div className="absolute -top-3 -right-2 z-10">
                        <Badge variant="default" className="text-xs">
                          {t("lastUsed")}
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderSignIn("google")}
                    >
                      {isLoading ? (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.google className="mr-2 h-4 w-4" />
                      )}
                      {t("loginWithGoogle")}
                    </Button>
                  </div>
                  <div className="relative">
                    {lastSignedInUsing === "github" && (
                      <div className="absolute -top-3 -right-2 z-10">
                        <Badge variant="default" className="text-xs">
                          {t("lastUsed")}
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderSignIn("github")}
                    >
                      {isLoading ? (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.gitHub className="mr-2 h-4 w-4" />
                      )}
                      {t("loginWithGitHub")}
                    </Button>
                  </div>
                </div>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    {t("orContinueWith")}
                  </span>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isLoading}
                      onChange={(e) => {
                        const email = z
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
                  <div className="relative">
                    {lastSignedInUsing === "email" && (
                      <div className="absolute -top-3 -right-2 z-10">
                        <Badge variant="default" className="text-xs">
                          {t("lastUsed")}
                        </Badge>
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || !email}
                    >
                      {isLoading && (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
                      {t("signInEmail")}
                    </Button>
                  </div>
                </div>
                <div className="text-center text-sm">
                  {pathname === "/sign-up"
                    ? t.rich("alreadyHaveAccount", {
                        signIn: (chunks) => (
                          <Link
                            href="/sign-in"
                            className="underline underline-offset-4"
                          >
                            {chunks}
                          </Link>
                        ),
                      })
                    : t.rich("dontHaveAccount", {
                        signUp: (chunks) => (
                          <Link
                            href="/sign-up"
                            className="underline underline-offset-4"
                          >
                            {chunks}
                          </Link>
                        ),
                      })}
                </div>
              </div>
            </form>
          </ClientOnly>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        {t.rich("byClickingContinue", {
          terms: (chunks) => <Link href="/terms-of-service">{chunks}</Link>,
          privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
        })}
      </div>
    </div>
  );
}
