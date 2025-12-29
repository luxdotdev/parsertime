import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { Card, CardDescription } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useNextStep } from "nextstepjs";
import { useEffect, useState } from "react";

async function setOnboardingFlag() {
  await fetch("/api/user/update-onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ seenOnboarding: true }),
  });
}

export function EmptyScrimList({ isOnboarding }: { isOnboarding?: boolean }) {
  const t = useTranslations("dashboard");
  const { startNextStep, isNextStepVisible } = useNextStep();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (isOnboarding) {
      startNextStep(`${t("tour.title")}`);
      setHasStarted(true);
    }
  }, [t, isOnboarding, startNextStep]);

  useQuery({
    queryKey: ["finishOnboard"],
    queryFn: () => setOnboardingFlag(),
    enabled: !isNextStepVisible && hasStarted,
    staleTime: Infinity,
  });

  return (
    <Card className="border-dashed">
      <CardDescription>
        <div className="flex h-[36rem] flex-col items-center justify-center space-y-2">
          <div className="text-center">
            <div id="docs-demo-step1">
              <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                {t("title")}
              </h2>
              <p className="text-gray-500">{t("emptyScrimList.description")}</p>
              <p className="p-2 text-gray-500">
                {t("emptyScrimList.question")}{" "}
                <Link
                  href="https://docs.parsertime.app"
                  target="_blank"
                  external
                >
                  {t("emptyScrimList.documentation")}
                </Link>
              </p>
            </div>
          </div>
          <div id="docs-demo-step2">
            <CreateScrimButton />
          </div>
        </div>
      </CardDescription>
    </Card>
  );
}
