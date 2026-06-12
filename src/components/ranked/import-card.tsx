"use client";

import { importRankedJson } from "@/app/ranked/import-action";
import { Button } from "@/components/ui/button";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function ImportCard() {
  const t = useTranslations("ranked.import");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);

  function onFile(file: File) {
    setFileName(file.name);
    void file.text().then((raw) => {
      startTransition(async () => {
        const result = await importRankedJson(raw);
        if (result.success) {
          toast.success(t("done", { imported: result.imported ?? 0 }));
        } else {
          toast.error(result.error ?? t("failed"));
        }
      });
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 text-sm font-medium">{t("title")}</p>
      <p className="text-muted-foreground mb-3 text-sm">{t("description")}</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? t("importing") : t("button")}
      </Button>
      {fileName ? (
        <span className="text-muted-foreground ml-3 text-sm">{fileName}</span>
      ) : null}
    </div>
  );
}
