import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { Card, CardDescription } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { useTranslations } from "next-intl";
import { useNextStep } from "nextstepjs";
import { useEffect } from "react";

export function EmptyScrimList() {
  const t = useTranslations("dashboard");
  const { startNextStep } = useNextStep();

  useEffect(() => {
    startNextStep(`${t("tour.title")}`);
  }, [startNextStep, t]);

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
