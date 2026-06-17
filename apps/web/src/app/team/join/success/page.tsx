"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function TeamJoinSuccessPage() {
  const t = useTranslations("teamPage.join");

  const router = useRouter();

  // Show a success message if the user has successfully joined the team
  toast.success(t("handleSubmit.title"), {
    description: t("handleSubmit.description"),
    duration: 5000,
  });

  // Redirect the user to the dashboard after 5 seconds
  setTimeout(() => {
    router.push("/dashboard");
  }, 4900);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Card className="h-48 max-w-md">
        <CardHeader className="scroll-m-20 text-xl font-semibold tracking-tight">
          {t("success.title")}
        </CardHeader>
        <CardContent>
          <p>{t("success.description")}</p>
          <p>
            {t.rich("success.redirect", {
              link: (chunks) => (
                <Link href="/dashboard" className="underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
