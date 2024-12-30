import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NoAuthCard() {
  const t = await getTranslations("noAuth");

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Card className="h-48 max-w-md">
        <CardHeader>{t("title")}</CardHeader>
        <CardContent>
          <p>{t("description")}</p>
        </CardContent>
        <CardFooter>
          <Link href="/sign-in" className="underline">
            <Button>{t("signIn")}</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
