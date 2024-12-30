import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { Card, CardDescription } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { useTranslations } from "next-intl";

export function EmptyScrimList() {
  const t = useTranslations("dashboard.emptyScrimList");

  return (
    <Card className="border-dashed">
      <CardDescription>
        <div className="flex h-[36rem] flex-col items-center justify-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            {t("title")}
          </h2>
          <p className="text-gray-500">{t("description")}</p>
          <p className="p-2 text-gray-500">
            {t("question")}{" "}
            <Link href="https://docs.parsertime.app" target="_blank" external>
              {t("documentation")}
            </Link>
          </p>
          <CreateScrimButton />
        </div>
      </CardDescription>
    </Card>
  );
}
