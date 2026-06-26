import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { Card, CardDescription } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useNextStep } from "nextstepjs";
import { useEffect, useState } from "react";

async function setOnboardingFlag() {
  const res = await fetch("/api/user/update-onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ seenOnboarding: true }),
  });

  if (!res.ok) {
    throw new Error(`Failed to set onboarding flag: ${await res.text()}`);
  }

  return res.json();
}

export function EmptyScrimList({ isOnboarding }: { isOnboarding?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
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
    queryKey: ["finishOnboarding"],
    queryFn: setOnboardingFlag,
    enabled: !isNextStepVisible && hasStarted,
    staleTime: Infinity,
  });

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
    >
      <Card className="border-dashed">
        <CardDescription>
          <div className="flex h-[36rem] flex-col items-center justify-center space-y-2">
            <div className="text-center">
              <div id="docs-demo-step1">
                <h2 className="text-foreground text-2xl font-bold tracking-tight">
                  {t("title")}
                </h2>
                <p className="text-muted-foreground">
                  {t("emptyScrimList.description")}
                </p>
                <p className="text-muted-foreground p-2">
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
    </motion.div>
  );
}
