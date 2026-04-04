"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function WorkshopCodePill({ code }: { code: string }) {
  const t = useTranslations("footer");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("copied"), {
      description: t("copiedDescription"),
      duration: 3000,
    });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
    >
      <span className="text-muted-foreground">{t("workshopCode")}</span>
      <span className="font-mono font-semibold tracking-wider">{code}</span>
      {copied ? (
        <CheckIcon className="size-3 text-green-400" />
      ) : (
        <CopyIcon className="size-3" />
      )}
    </button>
  );
}
