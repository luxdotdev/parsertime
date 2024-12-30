import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

export function AddScrimCard() {
  const t = useTranslations("dashboard.addScrim");

  return (
    <Card className="flex h-48 max-w-md flex-col items-center justify-center border-dashed">
      <CardHeader className="text-center text-xl">
        <span className="inline-flex items-center justify-center space-x-2">
          <PlusCircledIcon className="h-6 w-6" /> <span>{t("title")}</span>
        </span>
      </CardHeader>
      <CardDescription className="pb-4">{t("description")}</CardDescription>
      <CardContent className="flex items-center justify-center">
        <CreateScrimButton />
      </CardContent>
    </Card>
  );
}
