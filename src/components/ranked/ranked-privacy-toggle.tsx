"use client";

import { setRankedStatsPublic } from "@/app/ranked/privacy-action";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type RankedPrivacyToggleProps = {
  initial: boolean;
};

export function RankedPrivacyToggle({ initial }: RankedPrivacyToggleProps) {
  const t = useTranslations("settings.ranked");
  const [checked, setChecked] = useState(initial);

  async function handleChange(next: boolean) {
    setChecked(next);
    const result = await setRankedStatsPublic(next);
    if (!result.success) {
      setChecked(!next);
      toast.error(t("toggleError"));
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{t("toggleLabel")}</p>
        <p className="text-muted-foreground text-sm">
          {t("toggleDescription")}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={handleChange} />
    </div>
  );
}
