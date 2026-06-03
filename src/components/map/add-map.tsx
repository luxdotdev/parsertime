"use client";

import { MapUploadList } from "@/components/map/bulk-upload/map-upload-list";
import {
  runSequentialUpload,
  uploadMapStream,
} from "@/components/map/bulk-upload/sequential-upload";
import { useBulkMapUpload } from "@/components/map/bulk-upload/use-bulk-map-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientOnly } from "@/lib/client-only";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function AddMapCard({
  scrimId,
  existingMapCount,
}: {
  scrimId: number;
  existingMapCount: number;
}) {
  const t = useTranslations("scrimPage.addMap");
  const tb = useTranslations("bulkUpload");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = useBulkMapUpload();
  const { pendingMaps, isParsing, failedCount, reset, patchMap } = upload;
  const baseOrderRef = useRef<number | null>(null);

  const usableMaps = pendingMaps.filter((m) => !m.parseFailed);

  async function handleSubmit() {
    if (usableMaps.length === 0) return;
    setBusy(true);
    baseOrderRef.current ??= existingMapCount;

    const { allSucceeded } = await runSequentialUpload({
      maps: usableMaps,
      patchMap,
      baseOrder: baseOrderRef.current,
      initialScrimId: scrimId,
      uploadMap: async (map, order, sid, reportProgress) => {
        await uploadMapStream(
          `/api/scrim/add-map-stream?id=${sid}`,
          {
            map: map.parsedData,
            order,
            heroBans: map.heroBans.length > 0 ? map.heroBans : undefined,
          },
          reportProgress
        );
        return sid!;
      },
    });

    setBusy(false);

    if (allSucceeded) {
      toast.success(tb("uploadedTitle"), {
        description: tb("uploadedCount", { count: usableMaps.length }),
      });
      setOpen(false);
      reset();
      baseOrderRef.current = null;
      router.refresh();
    } else {
      toast.error(tb("partialFailureTitle"), {
        description: tb("partialFailureDescription"),
      });
    }
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      // Persisted maps (if any) should now be visible; drop unsent state.
      const hadDone = pendingMaps.some((m) => m.status === "done");
      reset();
      baseOrderRef.current = null;
      if (hadDone) router.refresh();
    }
  }

  const submitLabel =
    failedCount > 0
      ? tb("retryFailed", { count: failedCount })
      : tb("uploadMaps", { count: usableMaps.length });

  return (
    <ClientOnly>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border hover:border-muted-foreground/30 hover:bg-muted/30 flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-5 py-6 text-left transition-colors"
      >
        <div className="bg-muted rounded-full p-2.5">
          <Upload className="text-muted-foreground h-4 w-4" />
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">{t("title")}</p>
          <p className="text-muted-foreground text-xs">
            {tb("addDescription")}
          </p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{tb("addTitle")}</DialogTitle>
            <DialogDescription>{tb("addDialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="-mx-1 flex-1 overflow-y-auto px-1 py-1">
            <MapUploadList upload={upload} busy={busy} />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={busy}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={busy || isParsing || usableMaps.length === 0}
            >
              {busy ? (
                <>
                  <ReloadIcon className="mr-2 size-4 animate-spin" />
                  {tb("uploading")}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientOnly>
  );
}
