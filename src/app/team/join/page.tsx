"use client";

import { JoinTokenInput } from "@/components/team/join-token-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";

function toInviteToken(tokenArr: string[]) {
  // Join all parts into a single string
  const joinedString = tokenArr.join("");

  // Insert dashes at the appropriate positions to format the token correctly
  const formattedToken = [
    joinedString.slice(0, 5),
    joinedString.slice(5, 9),
    joinedString.slice(9, 14),
    joinedString.slice(14),
  ].join("-");

  return formattedToken;
}

export default function TeamJoinPage() {
  const t = useTranslations("teamPage.join");

  const [token, setToken] = useState<string[]>(Array(19).fill("")); // Initialize state with 19 empty strings
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const error = searchParams.get("error");

  if (error === "invalid-token") {
    toast({
      title: t("invalidToken.title"),
      description: t("invalidToken.description"),
      duration: 5000,
      variant: "destructive",
    });
    router.replace("/team/join");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const tokenString = toInviteToken(token);

    const res = await fetch(`/api/team/join-team?token=${tokenString}`, {
      method: "POST",
    });

    if (res.ok) {
      toast({
        title: t("handleSubmit.title"),
        description: t("handleSubmit.description"),
        duration: 5000,
      });
      router.push("/dashboard");
    } else {
      toast({
        title: t("handleSubmit.errorTitle"),
        description: t("handleSubmit.errorDescription", {
          error: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
        variant: "destructive",
      });
    }
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center">
      <div className="w-full max-w-6xl rounded-md p-6 shadow-md">
        <h1 className="mb-4 text-center text-3xl font-bold">
          {t("enterToken")}
        </h1>
        <form
          className="flex flex-col space-y-4"
          onSubmit={(e) => {
            startTransition(async () => {
              await handleSubmit(e);
            });
          }}
        >
          <div className="flex justify-center">
            <JoinTokenInput token={token} setToken={setToken} />
          </div>
          <div className="flex justify-center">
            <Button className="h-12 max-w-2xl" type="submit">
              {t("joinTeam")}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
