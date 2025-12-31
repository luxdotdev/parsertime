import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

export function AddScrimCard() {
  const t = useTranslations("dashboard.addScrim");

  return (
    <Empty className="h-48 max-w-md border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PlusCircledIcon className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateScrimButton />
      </EmptyContent>
    </Empty>
  );
}
