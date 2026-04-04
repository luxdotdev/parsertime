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
      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
    >
      <span className="text-zinc-500">{t("workshopCode")}</span>
      <span className="font-mono font-semibold tracking-wider">{code}</span>
      {copied ? (
        <CheckIcon className="size-3 text-green-400" />
      ) : (
        <CopyIcon className="size-3" />
      )}
    </button>
  );
}
