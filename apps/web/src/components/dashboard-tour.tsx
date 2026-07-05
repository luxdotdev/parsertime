"use client";

import { CardStep } from "@/components/nextsteps/card-step";
import { useTranslations } from "next-intl";
import { NextStep, NextStepProvider } from "nextstepjs";
import type { Tour } from "nextstepjs";
import type { ReactNode } from "react";

// The onboarding tour reads translations to build its steps. Kept in a client
// component so `useTranslations` resolves from the NextIntlClientProvider
// context rather than the request locale — reading the locale in the server
// dashboard layout would block the route's prerender / instant navigation.
export function DashboardTour({ children }: { children: ReactNode }) {
  const t = useTranslations("dashboard.tour");
  const steps: Tour[] = [
    {
      tour: `${t("title")}`,
      steps: [
        {
          icon: <>👋</>,
          title: `${t("step1.title")}`,
          content: <>{t("step1.description")}</>,
          selector: "#docs-demo-step1",
          side: "top",
          showControls: true,
          showSkip: true,
          pointerPadding: 10,
          pointerRadius: 10,
        },
        {
          icon: <>🚀</>,
          title: `${t("step2.title")}`,
          content: <>{t("step2.description")}</>,
          selector: "#docs-demo-step2",
          side: "top",
          showControls: true,
          showSkip: true,
          pointerPadding: 10,
          pointerRadius: 10,
        },
        {
          icon: <>📝</>,
          title: `${t("step3.title")}`,
          content: (
            <>
              {t("step3.description")} <br />
            </>
          ),
          selector: "#docs-demo-step3",
          side: "bottom",
          showSkip: true,
          showControls: true,
        },
        {
          icon: <>👥</>,
          title: `${t("step4.title")}`,
          content: (
            <>
              {t("step4.description")} <br />
            </>
          ),
          selector: "#docs-demo-step4", // Target the Team Select dropdown
          side: "bottom",
          showSkip: true,
          showControls: true,
        },
        {
          icon: <>📅</>,
          title: `${t("step5.title")}`,
          content: <>{t("step5.description")}</>,
          selector: "#docs-demo-step5",
          showSkip: true,
          side: "bottom",
          showControls: true,
        },
        {
          icon: <>📊</>,
          title: `${t("step6.title")}`,
          content: <>{t("step6.description")}</>,
          selector: "#docs-demo-step6",
          side: "top",
          showControls: true,
          showSkip: true,
        },
        {
          icon: <>🚫</>,
          title: `${t("step7.title")}`,
          content: (
            <>
              {t("step7.description")} <br />
            </>
          ),
          selector: "#docs-demo-step7",
          side: "top",
          showControls: true,
          showSkip: true,
        },
        {
          icon: <>🚀</>,
          title: `${t("step8.title")}`,
          content: (
            <>
              {t("step8.description")} <br />
            </>
          ),
          selector: "#docs-demo-step8",
          side: "top",
          showSkip: true,
          showControls: true,
        },
      ],
    },
  ];

  return (
    <NextStepProvider>
      <NextStep steps={steps} cardComponent={CardStep}>
        {children}
      </NextStep>
    </NextStepProvider>
  );
}
