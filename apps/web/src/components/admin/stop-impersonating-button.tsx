"use client";

import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

export function StopImpersonatingButton() {
  const t = useTranslations("dashboard.userNav");

  return (
    <button
      className="w-full p-0 text-left"
      type="button"
      onClick={async () => {
        await authClient.admin.stopImpersonating();
        window.location.href = "/dashboard";
      }}
    >
      {t("stopImpersonating")}
    </button>
  );
}
