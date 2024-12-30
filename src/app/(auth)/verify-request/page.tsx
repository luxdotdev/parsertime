import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function VerifyRequestPage() {
  const t = await getTranslations("verifyRequest");

  return (
    <div className="flex h-[90vh] flex-col items-center justify-center space-y-6 p-6 text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>
      <Button className="mx-auto" asChild>
        <Link href="/">{t("back")}</Link>
      </Button>
    </div>
  );
}
