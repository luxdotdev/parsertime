"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/lib/client-only";
import type { Scrim } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";

export function DangerZone({ scrim }: { scrim: Scrim }) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("scrimPage.editScrim");

  useEffect(() => {
    setDeleteEnabled(deleteInput === scrim.name);
  }, [deleteInput, scrim.name]);

  async function handleDelete() {
    setDeleteLoading(true);
    const res = await fetch(`/api/scrim/remove-scrim?id=${scrim.id}`, {
      method: "POST",
    });

    if (res.ok) {
      toast.success(t("deleteScrim.handleDelete.title"), {
        description: t("deleteScrim.handleDelete.description"),
        duration: 5000,
      });
      router.push("/dashboard");
    } else {
      toast.error(t("deleteScrim.handleDelete.errorTitle"), {
        description: t("deleteScrim.handleDelete.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
      });
    }

    setDeleteLoading(false);
  }

  return (
    <ClientOnly>
      <Card className="max-w-lg border-red-500 dark:border-red-700">
        <CardHeader>
          <CardTitle className="text-red-500 dark:text-red-700">
            {t("dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold">{t("deleteScrim.title")}</h3>
          <p className="pb-4">{t("deleteScrim.description")}</p>
          <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <AlertDialogTrigger>
              <Button variant="destructive">{t("deleteScrim.button")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <h2 className="text-lg font-semibold">
                  {t("deleteScrim.delete")}
                </h2>
              </AlertDialogHeader>
              <p>
                {t.rich("deleteScrim.deleteAlert", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                  scrim: scrim.name,
                })}
              </p>
              <p>
                {t.rich("deleteScrim.deleteConfirmation", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                  scrim: scrim.name,
                })}
              </p>
              <Input
                type="text"
                className="mt-4 w-full rounded border border-solid p-2"
                onChange={(e) => setDeleteInput(e.target.value)}
              />
              <div className="mt-4 flex justify-end space-x-4">
                <Button
                  variant="destructive"
                  disabled={!deleteEnabled || deleteLoading}
                  onClick={() =>
                    startTransition(async () => await handleDelete())
                  }
                >
                  {deleteLoading ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      {t("deleteScrim.deleting")}
                    </>
                  ) : (
                    t("deleteScrim.delete")
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  {t("deleteScrim.cancel")}
                </Button>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </ClientOnly>
  );
}
