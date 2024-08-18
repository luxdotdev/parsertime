"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { Scrim } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function DangerZone({ scrim }: { scrim: Scrim }) {
  const t = useTranslations("scrimPage");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDeleteEnabled(deleteInput === scrim.name);
  }, [deleteInput, scrim.name]);

  async function handleDelete() {
    setDeleteLoading(true);
    const res = await fetch(`/api/scrim/remove-scrim?id=${scrim.id}`, {
      method: "POST",
    });

    if (res.ok) {
      toast({
        title: t("editScrim.deleteScrim.handleDelete.title"),
        description: t("editScrim.deleteScrim.handleDelete.description"),
        duration: 5000,
      });
      router.push("/dashboard");
    } else {
      toast({
        title: t("editScrim.deleteScrim.handleDelete.errorTitle"),
        description: `${t("editScrim.deleteScrim.handleDelete.errorDescription")} ${await res.text()} (${res.status})`,
        duration: 5000,
        variant: "destructive",
      });
    }

    setDeleteLoading(false);
  }

  return (
    <ClientOnly>
      <Card className="max-w-lg border-red-500 dark:border-red-700">
        <CardHeader>
          <CardTitle className="text-red-500 dark:text-red-700">
            {t("editScrim.dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold">
            {t("editScrim.deleteScrim.title")}
          </h3>
          <p className="pb-4">{t("editScrim.deleteScrim.description")}</p>
          <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <AlertDialogTrigger>
              <Button variant="destructive">
                {t("editScrim.deleteScrim.button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <h2 className="text-lg font-semibold">
                  {t("editScrim.deleteScrim.title")}
                </h2>
              </AlertDialogHeader>
              <p>
                {t("editScrim.deleteScrim.delete1")}{" "}
                <strong>{scrim.name}</strong>
                {t("editScrim.deleteScrim.delete2")}
              </p>
              <p>
                {t("editScrim.deleteScrim.delete3")}{" "}
                <strong>{scrim.name}</strong>{" "}
                {t("editScrim.deleteScrim.delete4")}
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
                  onClick={handleDelete}
                >
                  {deleteLoading ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      {t("editScrim.deleteScrim.deleting")}
                    </>
                  ) : (
                    t("editScrim.deleteScrim.delete")
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  {t("editScrim.deleteScrim.cancel")}
                </Button>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </ClientOnly>
  );
}
