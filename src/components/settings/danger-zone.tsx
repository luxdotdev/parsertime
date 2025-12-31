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
import { Link } from "@/components/ui/link";
import { ClientOnly } from "@/lib/client-only";
import { ReloadIcon } from "@radix-ui/react-icons";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";

export function DangerZone({ url }: { url: Route }) {
  const t = useTranslations("settingsPage");
  const [firstDialogOpen, setFirstDialogOpen] = useState(false);

  return (
    <ClientOnly>
      <Card className="max-w-lg border-red-500 dark:border-red-700">
        <CardHeader>
          <CardTitle className="text-red-500 dark:text-red-700">
            {t("dangerZone.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold">{t("deleteAccount.title")}</h3>
          <p className="pb-4">
            {t.rich("deleteAccount.description", {
              link: (chunks) => (
                <Link href={url} className="text-sky-500" external>
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <FirstDialog
            url={url}
            firstDialogOpen={firstDialogOpen}
            setFirstDialogOpen={setFirstDialogOpen}
          />
        </CardContent>
      </Card>
    </ClientOnly>
  );
}

function FirstDialog({
  url,
  firstDialogOpen,
  setFirstDialogOpen,
}: {
  url: Route;
  firstDialogOpen: boolean;
  setFirstDialogOpen: (open: boolean) => void;
}) {
  const t = useTranslations("settingsPage.deleteAccount");

  return (
    <AlertDialog open={firstDialogOpen} onOpenChange={setFirstDialogOpen}>
      <AlertDialogTrigger>
        <Button variant="destructive">{t("title")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
        </AlertDialogHeader>
        <p>
          {t.rich("description", {
            link: (chunks) => (
              <Link href={url} className="text-sky-500" external>
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="mt-4 flex justify-end space-x-4">
          <SecondDialog setFirstDialogOpen={setFirstDialogOpen} />
          <Button variant="secondary" onClick={() => setFirstDialogOpen(false)}>
            {t("cancel")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SecondDialog({
  setFirstDialogOpen,
}: {
  setFirstDialogOpen: (open: boolean) => void;
}) {
  const t = useTranslations("settingsPage.deleteAccount");

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDeleteEnabled(deleteInput === t("deleteInput"));
  }, [deleteInput, t]);

  async function handleDelete() {
    setDeleteLoading(true);

    const res = await fetch("/api/user/delete-account", {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success(t("handleDelete.title"), {
        description: t("handleDelete.description"),
        duration: 5000,
      });
      setDeleteLoading(false);
      setModalOpen(false);
      router.push("/");
    } else {
      toast.error(t("handleDelete.errorTitle"), {
        description: t("handleDelete.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
      });
      setDeleteLoading(false);
    }
  }

  return (
    <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialogTrigger>
        <Button variant="destructive">{t("secondDialog.title")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <h2 className="text-lg font-semibold">{t("secondDialog.delete")}</h2>
        </AlertDialogHeader>
        <p>{t("secondDialog.description")}</p>
        <p>
          {t.rich("secondDialog.confirm", {
            deleteInput: t("deleteInput"),
            strong: (chunks) => <strong>{chunks}</strong>,
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
            onClick={() => startTransition(async () => await handleDelete())}
          >
            {deleteLoading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                {t("secondDialog.deleting")}
              </>
            ) : (
              t("secondDialog.delete")
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setModalOpen(false);
              setFirstDialogOpen(false);
            }}
          >
            {t("cancel")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
