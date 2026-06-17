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
      className="border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]"
    >
      <span className="text-muted-foreground">{t("workshopCode")}</span>
      <span className="font-mono font-semibold tracking-wider">{code}</span>
      <span className="relative size-3">
        <CopyIcon
          className="absolute inset-0 size-3 transition-all duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
          style={{
            opacity: copied ? 0 : 1,
            transform: copied ? "scale(0.5)" : "scale(1)",
          }}
        />
        <CheckIcon
          className="absolute inset-0 size-3 text-green-500 transition-all duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
          style={{
            opacity: copied ? 1 : 0,
            transform: copied ? "scale(1)" : "scale(0.5)",
          }}
        />
      </span>
    </button>
  );
}
